/**
 * POST /api/b24/return
 * Logs a return: CRM activity + notifies all 3 admins + creates return task.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { clientName, channel, reason, amount, leadId, contactId, dealId, adminId } = req.body;

  const webhook = process.env.BITRIX24_WEBHOOK_URL;
  const domain  = process.env.BITRIX24_DOMAIN || '';
  const chMap   = { whatsapp:'WhatsApp', instagram:'Instagram', kaspi:'Kaspi' };
  const chName  = chMap[channel] || channel;

  if (!webhook) {
    return res.json({
      configured: false,
      returnTaskId: 'mock-return-' + Date.now(),
      message: 'Тест-режим: возврат зафиксирован (mock)',
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
    const notifyMsg = [
      `⚠️ ВОЗВРАТ ТОВАРА`,
      `Клиент: ${clientName} (${chName})`,
      reason ? `Причина: ${reason}` : null,
      amount ? `Сумма возврата: ${amount} ₸` : null,
      leadId ? `Лид: #${leadId}` : null,
      dealId ? `Сделка: #${dealId}` : null,
    ].filter(Boolean).join('\n');

    // 1. Notify all 3 admins via B24 messenger
    const adminIds = [
      process.env.ADMIN_1_ID,
      process.env.ADMIN_2_ID,
      process.env.ADMIN_3_ID,
    ].filter(Boolean);

    await Promise.all(adminIds.map(uid =>
      post('im.notify.system.add', { USER_ID: uid, MESSAGE: notifyMsg })
    ));

    // 2. Create task "Оформить возврат" assigned to the admin who logged it
    const taskRes = await post('tasks.task.add', {
      fields: {
        TITLE: `↩ Возврат: ${clientName} (${chName})`,
        DESCRIPTION: notifyMsg,
        RESPONSIBLE_ID: adminId,
        PRIORITY: '2',  // High
        CREATED_BY: adminId,
        ...(leadId ? { UF_CRM_TASK: [`L_${leadId}`] } : {}),
      },
    });
    const returnTaskId = taskRes.result?.task?.id;

    // 3. Add CRM activity linked to lead/deal
    if (leadId || dealId) {
      const entityTypeId = dealId ? 2 : 1;   // 2=Deal, 1=Lead
      const entityId     = dealId || leadId;

      await post('crm.activity.add', {
        fields: {
          TYPE_ID: 2,
          SUBJECT: `↩ Возврат товара — ${clientName}`,
          DESCRIPTION: notifyMsg,
          ASSOCIATED_ENTITY_TYPE_ID: entityTypeId,
          ASSOCIATED_ENTITY_ID: entityId,
          COMPLETED: 'N',
          ASSIGNED_BY_ID: adminId,
        },
      });
    }

    const taskUrl = returnTaskId && adminId
      ? `https://${domain}/company/personal/user/${adminId}/tasks/task/view/${returnTaskId}/`
      : null;

    res.json({ configured: true, returnTaskId, taskUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
