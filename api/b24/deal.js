/**
 * POST /api/b24/deal
 * Closes the deal: creates Deal in CRM (or converts existing Lead),
 * marks all tasks as completed context, notifies all 3 admins.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { clientName, channel, amount, leadId, contactId, adminId, taskIds } = req.body;

  const webhook = process.env.BITRIX24_WEBHOOK_URL;
  const domain  = process.env.BITRIX24_DOMAIN || '';
  const chMap   = { whatsapp:'WhatsApp', instagram:'Instagram', kaspi:'Kaspi' };
  const chName  = chMap[channel] || channel;

  if (!webhook) {
    return res.json({
      configured: false,
      dealId: 'mock-deal-' + Date.now(),
      message: 'Тест-режим: сделка закрыта (mock)',
    });
  }

  const post = async (method, body) => {
    const r = await fetch(`${webhook}${method}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.json();
  };

  try {
    // 1. Create Deal
    const dealRes = await post('crm.deal.add', {
      fields: {
        TITLE: `${chName} — ${clientName}`,
        CONTACT_ID: contactId || undefined,
        LEAD_ID: leadId || undefined,
        ASSIGNED_BY_ID: adminId,
        STAGE_ID: 'WON',
        CURRENCY_ID: 'KZT',
        OPPORTUNITY: amount ? parseFloat(String(amount).replace(/\D/g,'')) : 0,
        SOURCE_ID: 'WEB',
        SOURCE_DESCRIPTION: `OmniHub — ${chName}`,
        COMMENTS: `Сделка закрыта через OmniHub.\nКлиент: ${clientName}\nКанал: ${chName}`,
      },
    });
    const dealId = dealRes.result;

    // 2. Convert lead to deal if leadId exists
    if (leadId) {
      await post('crm.lead.update', {
        id: leadId,
        fields: { STATUS_ID: 'CONVERTED', OPPORTUNITY: amount || 0 },
      });
    }

    // 3. Notify all 3 admins
    const adminIds = [
      process.env.ADMIN_1_ID,
      process.env.ADMIN_2_ID,
      process.env.ADMIN_3_ID,
    ].filter(Boolean);

    const msg = `✅ Сделка закрыта!\nКлиент: ${clientName} (${chName})\nСумма: ${amount || '—'} ₸\nDeal #${dealId} создан в CRM`;

    await Promise.all(adminIds.map(uid =>
      post('im.notify.system.add', { USER_ID: uid, MESSAGE: msg })
    ));

    res.json({
      configured: true,
      dealId,
      dealUrl: `https://${domain}/crm/deal/details/${dealId}/`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
