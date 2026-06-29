/**
 * GET /api/cron/kaspi
 * Pulls new/updated orders from Kaspi Business API → saves to Supabase.
 * Set up on cron-job.org (free) to call this URL every 5 minutes.
 *
 * Kaspi Seller API docs: https://kaspi.kz/mp/documentation
 */
import { getSupabase } from '../lib/supabase.js';

const KASPI_API  = 'https://kaspi.kz/mp/api/v1';
const STATUS_MAP = {
  NEW:             'Новый заказ',
  ACCEPTED_BY_MERCHANT: 'Принят магазином',
  COMPLETED:       'Выполнен',
  CANCELLED:       'Отменён',
  CANCELLING:      'Отмена в процессе',
  RETURN_REQUESTED:'Запрос возврата',
  RETURNED:        'Возврат',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey      = process.env.KASPI_API_KEY;
  const merchantId  = process.env.KASPI_MERCHANT_ID;
  const supabase    = getSupabase();

  // ── MOCK MODE (no Kaspi key yet) ─────────────────────────
  if (!apiKey || !merchantId) {
    return res.json({
      ok: true,
      mode: 'mock',
      message: 'KASPI_API_KEY / KASPI_MERCHANT_ID не заданы — добавь в Vercel env vars',
      newOrders: 0,
    });
  }

  if (!supabase) {
    return res.json({ ok: false, error: 'Supabase not configured' });
  }

  try {
    // Fetch NEW orders from Kaspi
    const kaspiRes = await fetch(
      `${KASPI_API}/orders?page[number]=0&page[size]=50&filter[orders][state]=NEW,ACCEPTED_BY_MERCHANT`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Auth-Token':  apiKey,
          'Content-Type':  'application/json',
        },
      }
    );

    if (!kaspiRes.ok) {
      const errText = await kaspiRes.text();
      throw new Error(`Kaspi API ${kaspiRes.status}: ${errText}`);
    }

    const kaspiData = await kaspiRes.json();
    const orders = kaspiData.data || [];
    let newCount = 0;

    for (const order of orders) {
      const attr     = order.attributes || order;
      const orderId  = String(order.id || attr.code);
      const customer = attr.customer || {};
      const status   = attr.status || 'NEW';
      const amount   = attr.totalPrice || attr.price || 0;
      const name     = customer.name || customer.firstName || 'Клиент Kaspi';
      const phone    = customer.cellPhone || customer.phone || '';
      const items    = attr.entries || attr.orderItems || [];

      // Check if already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id, kaspi_order_status')
        .eq('kaspi_order_id', orderId)
        .single();

      if (existing) {
        // Update status if changed
        if (existing.kaspi_order_status !== status) {
          await supabase
            .from('conversations')
            .update({
              kaspi_order_status: status,
              last_message: `Статус заказа: ${STATUS_MAP[status] || status}`,
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          // Add system message about status change
          await supabase.from('messages').insert({
            conversation_id: existing.id,
            from_type: 'system',
            text: `Статус Kaspi изменён: ${STATUS_MAP[status] || status}`,
          });

          // If return requested — create B24 notification
          if (status === 'RETURN_REQUESTED' || status === 'RETURNED') {
            const webhook = process.env.BITRIX24_WEBHOOK_URL;
            if (webhook) {
              const adminIds = ['1', '42', '98'];
              const msg = `⚠️ ВОЗВРАТ KASPI\nЗаказ: #${orderId}\nКлиент: ${name}\nСумма: ${amount} ₸\nСтатус: ${STATUS_MAP[status]}`;
              await Promise.all(adminIds.map(uid =>
                fetch(`${webhook}im.notify.system.add.json`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ USER_ID: uid, MESSAGE: msg }),
                })
              ));
            }
          }
        }
        continue;
      }

      // Create new conversation
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          channel:             'kaspi',
          client_name:         name,
          client_phone:        phone,
          last_message:        `Новый заказ #${orderId} · ${amount} ₸`,
          unread_count:        1,
          status:              'open',
          kaspi_order_id:      orderId,
          kaspi_order_status:  status,
          kaspi_order_amount:  amount,
        })
        .select('id')
        .single();

      if (convErr) throw convErr;

      // Add system message
      await supabase.from('messages').insert({
        conversation_id: conv.id,
        from_type: 'system',
        text: `Новый заказ #${orderId} · ${amount} ₸ · ${STATUS_MAP[status] || status}`,
      });

      // Save order details
      await supabase.from('kaspi_orders').upsert({
        id:              orderId,
        conversation_id: conv.id,
        status,
        amount,
        customer_name:   name,
        customer_phone:  phone,
        items:           JSON.stringify(items),
        kaspi_created:   attr.creationDate ? new Date(attr.creationDate).toISOString() : null,
      });

      // Notify B24 admins about new order
      const webhook = process.env.BITRIX24_WEBHOOK_URL;
      if (webhook) {
        const adminIds = ['1', '42', '98'];
        const msg = `🛒 Новый заказ Kaspi!\n#${orderId}\nКлиент: ${name}\nСумма: ${amount} ₸`;
        await Promise.all(adminIds.map(uid =>
          fetch(`${webhook}im.notify.system.add.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ USER_ID: uid, MESSAGE: msg }),
          })
        ));
      }

      newCount++;
    }

    res.json({ ok: true, total: orders.length, newOrders: newCount });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
