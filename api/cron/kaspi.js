/**
 * GET /api/cron/kaspi
 * Pulls new/updated orders from Kaspi Seller API → Supabase → OmniHub
 * Call every 5 min via cron-job.org
 *
 * Kaspi Seller API v2 docs: https://kaspi.kz/mp/documentation
 */
import { getSupabase } from '../lib/supabase.js';

const KASPI_BASE = 'https://kaspi.kz/mp/api/v2';

const STATUS_LABEL = {
  NEW:                  'Новый',
  ACCEPTED_BY_MERCHANT: 'Принят',
  COMPLETED:            'Выполнен',
  CANCELLED:            'Отменён',
  CANCELLING:           'Отмена',
  RETURN_REQUESTED:     'Возврат запрошен',
  RETURNED:             'Возврат',
};

async function kaspiGet(path, apiKey, merchantId) {
  const url = `${KASPI_BASE}${path}`;
  const r = await fetch(url, {
    headers: {
      'X-Auth-Token':  apiKey,
      'Content-Type':  'application/json',
    },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Kaspi ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey     = process.env.KASPI_API_KEY;
  const merchantId = process.env.KASPI_MERCHANT_ID;
  const supabase   = getSupabase();

  if (!apiKey || !merchantId) {
    return res.json({ ok: false, error: 'KASPI_API_KEY / KASPI_MERCHANT_ID не заданы' });
  }

  if (!supabase) {
    return res.json({ ok: false, error: 'Supabase не подключён' });
  }

  let newCount = 0;
  const errors = [];

  try {
    // Fetch orders: NEW + ACCEPTED_BY_MERCHANT
    const data = await kaspiGet(
      `/merchants/${merchantId}/orders?` +
      `page[number]=0&page[size]=50` +
      `&filter[orders][state]=NEW,ACCEPTED_BY_MERCHANT` +
      `&filter[orders][creationDate][ge]=${Date.now() - 7 * 24 * 3600 * 1000}`,
      apiKey,
      merchantId
    );

    const orders = data.data || [];

    for (const order of orders) {
      const attr   = order.attributes || {};
      const orderId = String(order.id);
      const status  = attr.status || 'NEW';
      const amount  = attr.totalPrice || 0;
      const name    = attr.customer?.name || 'Покупатель';
      const phone   = attr.customer?.cellPhone || '';
      const entries = attr.entries || [];

      // ── Already exists? ───────────────────────────────
      const { data: existing } = await supabase
        .from('conversations')
        .select('id, kaspi_order_status')
        .eq('kaspi_order_id', orderId)
        .single();

      if (existing) {
        // Update status if changed
        if (existing.kaspi_order_status !== status) {
          await supabase.from('conversations').update({
            kaspi_order_status: status,
            last_message: `Статус: ${STATUS_LABEL[status] || status}`,
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);

          await supabase.from('messages').insert({
            conversation_id: existing.id,
            from_type: 'system',
            text: `Kaspi статус → ${STATUS_LABEL[status] || status}`,
          });

          // Return notifications
          if (['RETURN_REQUESTED','RETURNED'].includes(status)) {
            const wh = process.env.BITRIX24_WEBHOOK_URL;
            if (wh) {
              const msg = `⚠️ ВОЗВРАТ KASPI\nЗаказ: #${orderId}\nКлиент: ${name}\nСумма: ${amount} ₸`;
              await Promise.all(['1','42','98'].map(uid =>
                fetch(`${wh}im.notify.system.add.json`, {
                  method: 'POST', headers: {'Content-Type':'application/json'},
                  body: JSON.stringify({ USER_ID: uid, MESSAGE: msg }),
                })
              ));
            }
          }
        }
        continue;
      }

      // ── New order ─────────────────────────────────────
      const items = entries.map(e =>
        `${e.offer?.name || 'Товар'} × ${e.quantity || 1}`
      ).join(', ');

      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          channel:             'kaspi',
          client_name:         name,
          client_phone:        phone,
          last_message:        `Заказ #${orderId} · ${Number(amount).toLocaleString('ru')} ₸`,
          unread_count:        1,
          status:              'open',
          funnel_stage:        'Оплата',
          deal_amount:         amount,
          kaspi_order_id:      orderId,
          kaspi_order_status:  status,
          kaspi_order_amount:  amount,
        })
        .select('id')
        .single();

      if (convErr) { errors.push(convErr.message); continue; }

      // System message
      await supabase.from('messages').insert({
        conversation_id: conv.id,
        from_type: 'system',
        text: `Новый заказ #${orderId} · ${Number(amount).toLocaleString('ru')} ₸\n${items}`,
      });

      // Kaspi orders detail table
      await supabase.from('kaspi_orders').upsert({
        id:              orderId,
        conversation_id: conv.id,
        status,
        amount,
        customer_name:   name,
        customer_phone:  phone,
        items:           JSON.stringify(entries),
        kaspi_created:   attr.creationDate ? new Date(attr.creationDate).toISOString() : null,
      });

      // Notify all 3 admins in B24
      const wh = process.env.BITRIX24_WEBHOOK_URL;
      if (wh) {
        const msg = `🛒 Новый заказ Kaspi!\n#${orderId}\nКлиент: ${name}${phone?'\n'+phone:''}\nСумма: ${Number(amount).toLocaleString('ru')} ₸\n${items}`;
        await Promise.all(['1','42','98'].map(uid =>
          fetch(`${wh}im.notify.system.add.json`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ USER_ID: uid, MESSAGE: msg }),
          })
        ));
      }

      newCount++;
    }

    res.json({
      ok: true,
      total:     orders.length,
      newOrders: newCount,
      errors:    errors.length ? errors : undefined,
    });

  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
