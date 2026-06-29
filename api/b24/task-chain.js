/**
 * POST /api/b24/task-chain
 * Creates a chain of tasks where each task depends on the previous one.
 * Also creates Lead + Contact in CRM, linked to all tasks.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const {
    tasks,          // [{assigneeId, title, desc, deadline, priority}]
    clientName,
    clientPhone,
    channel,
    lastMessage,
    kaspiOrderId,
    adminId,
    createCRM,      // boolean
  } = req.body;

  const webhook = process.env.BITRIX24_WEBHOOK_URL;
  const domain  = process.env.BITRIX24_DOMAIN || '';
  const chMap   = { whatsapp:'WhatsApp', instagram:'Instagram', kaspi:'Kaspi' };
  const chName  = chMap[channel] || channel;

  // ── MOCK MODE ──────────────────────────────────────────────
  if (!webhook) {
    const mockIds = tasks.map((_, i) => 1000 + i);
    return res.json({
      configured: false,
      taskIds: mockIds,
      taskUrls: mockIds.map(id => `#mock-task-${id}`),
      leadId: 'mock-lead-1',
      contactId: 'mock-contact-1',
      message: 'Тест-режим: B24 не подключён',
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
    let leadId = null;
    let contactId = null;

    // ── 1. Create Contact ──────────────────────────────────
    if (createCRM) {
      const [firstName, ...rest] = (clientName || 'Клиент').split(' ');
      const contactRes = await post('crm.contact.add', {
        fields: {
          NAME: firstName,
          LAST_NAME: rest.join(' '),
          SOURCE_ID: 'WEB',
          SOURCE_DESCRIPTION: `OmniHub — ${chName}`,
          ASSIGNED_BY_ID: adminId,
          ...(clientPhone ? { PHONE: [{ VALUE: clientPhone, VALUE_TYPE: 'MOBILE' }] } : {}),
        },
      });
      contactId = contactRes.result;
    }

    // ── 2. Create Lead ─────────────────────────────────────
    if (createCRM) {
      const [firstName, ...rest] = (clientName || 'Клиент').split(' ');
      const comments = [
        `Канал: ${chName}`,
        kaspiOrderId ? `Заказ Kaspi: #${kaspiOrderId}` : null,
        lastMessage ? `Сообщение: ${lastMessage}` : null,
      ].filter(Boolean).join('\n');

      const leadRes = await post('crm.lead.add', {
        fields: {
          TITLE: `${chName} — ${clientName}`,
          NAME: firstName,
          LAST_NAME: rest.join(' '),
          SOURCE_ID: 'WEB',
          SOURCE_DESCRIPTION: `OmniHub — ${chName}`,
          COMMENTS: comments,
          ASSIGNED_BY_ID: adminId,
          STATUS_ID: 'NEW',
          CONTACT_ID: contactId,
          ...(clientPhone ? { PHONE: [{ VALUE: clientPhone, VALUE_TYPE: 'MOBILE' }] } : {}),
        },
      });
      leadId = leadRes.result;
    }

    // ── 3. Create Tasks in chain ───────────────────────────
    const taskIds = [];
    const taskUrls = [];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const prevId = i > 0 ? taskIds[i - 1] : null;

      const stepLabel = tasks.length > 1 ? ` (Шаг ${i + 1} из ${tasks.length})` : '';
      const nextNote  = i < tasks.length - 1
        ? `\n\n⏭ После выполнения: Шаг ${i + 2} — ${tasks[i + 1]?.title || ''}`
        : '\n\n✅ Последний шаг в цепочке.';

      const fields = {
        TITLE: t.title + stepLabel,
        DESCRIPTION: (t.desc || '') + nextNote + (leadId ? `\n\nCRM Лид: #${leadId}` : ''),
        RESPONSIBLE_ID: t.assigneeId,
        PRIORITY: t.priority || '1',
        CREATED_BY: adminId,
        ...(t.deadline ? { DEADLINE: new Date(t.deadline).toISOString() } : {}),
        ...(prevId ? { DEPENDS_ON: [prevId] } : {}),
        ...(leadId ? { UF_CRM_TASK: [`L_${leadId}`] } : {}),
      };

      const taskRes = await post('tasks.task.add', { fields });
      const taskId  = taskRes.result?.task?.id;
      if (!taskId) throw new Error(`Task ${i + 1} failed: ${JSON.stringify(taskRes)}`);

      taskIds.push(taskId);
      taskUrls.push(`https://${domain}/company/personal/user/${t.assigneeId}/tasks/task/view/${taskId}/`);
    }

    // ── 4. Notify each assignee via B24 messenger ─────────
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const msg = [
        `📋 Новая задача от OmniHub`,
        `Клиент: ${clientName} (${chName})`,
        `Шаг ${i + 1}: ${t.title}`,
        t.desc ? `Детали: ${t.desc}` : null,
        i > 0 ? `⚠️ Ожидает завершения Шага ${i}` : null,
      ].filter(Boolean).join('\n');

      await post('im.notify.system.add', {
        USER_ID: t.assigneeId,
        MESSAGE: msg,
      });
    }

    res.json({ configured: true, taskIds, taskUrls, leadId, contactId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
