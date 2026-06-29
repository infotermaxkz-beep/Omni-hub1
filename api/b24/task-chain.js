export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};

/** Upload files to B24 Disk → OmniHub folder, return ["nFILE_ID", ...] */
async function uploadFiles(webhook, adminId, files) {
  if (!files?.length) return [];

  const post = async (method, body) => {
    const r = await fetch(`${webhook}${method}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.json();
  };

  // 1. Get user's personal storage root folder
  const storageRes = await fetch(
    `${webhook}disk.storage.getforuser.json?USER_ID=${adminId}`
  );
  const storageData = await storageRes.json();
  const rootId = storageData.result?.ROOT_OBJECT?.ID;
  if (!rootId) return [];

  // 2. Find or create "OmniHub" subfolder
  const childRes = await fetch(
    `${webhook}disk.folder.getchildren.json?id=${rootId}`
  );
  const childData = await childRes.json();
  let folderId = (childData.result || []).find(f => f.NAME === 'OmniHub')?.ID;

  if (!folderId) {
    const mkRes = await post('disk.folder.addsubfolder', {
      id: rootId,
      data: { NAME: 'OmniHub' },
    });
    folderId = mkRes.result?.ID;
  }
  if (!folderId) return [];

  // 3. Upload each file
  const ids = [];
  for (const file of files) {
    try {
      const up = await post('disk.folder.uploadfile', {
        id: folderId,
        data: { NAME: file.name },
        fileContent: [file.name, file.base64],
      });
      const fileId = up.result?.ID;
      if (fileId) ids.push(`n${fileId}`);
    } catch (e) {
      console.error('Upload failed:', file.name, e.message);
    }
  }
  return ids;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const {
    tasks, clientName, clientPhone, channel,
    lastMessage, kaspiOrderId, adminId, createCRM,
  } = req.body;

  const webhook = process.env.BITRIX24_WEBHOOK_URL;
  const domain  = process.env.BITRIX24_DOMAIN || '';
  const chMap   = { whatsapp:'WhatsApp', instagram:'Instagram', kaspi:'Kaspi' };
  const chName  = chMap[channel] || channel;

  // ── MOCK MODE ───────────────────────────────────────────
  if (!webhook) {
    const mockIds = tasks.map((_, i) => 1000 + i);
    return res.json({
      configured: false,
      taskIds: mockIds,
      taskUrls: mockIds.map(id => `#mock-task-${id}`),
      leadId: 'mock-lead-1',
      contactId: 'mock-contact-1',
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
    let leadId = null, contactId = null;

    // ── 1. Contact ───────────────────────────────────────
    if (createCRM) {
      const [fn, ...ln] = (clientName || 'Клиент').split(' ');
      const cRes = await post('crm.contact.add', {
        fields: {
          NAME: fn, LAST_NAME: ln.join(' '),
          SOURCE_ID: 'WEB',
          SOURCE_DESCRIPTION: `OmniHub — ${chName}`,
          ASSIGNED_BY_ID: adminId,
          ...(clientPhone ? { PHONE: [{ VALUE: clientPhone, VALUE_TYPE: 'MOBILE' }] } : {}),
        },
      });
      contactId = cRes.result;
    }

    // ── 2. Lead ──────────────────────────────────────────
    if (createCRM) {
      const [fn, ...ln] = (clientName || 'Клиент').split(' ');
      const comments = [
        `Канал: ${chName}`,
        kaspiOrderId ? `Заказ Kaspi: #${kaspiOrderId}` : null,
        lastMessage   ? `Сообщение: ${lastMessage}` : null,
      ].filter(Boolean).join('\n');

      const lRes = await post('crm.lead.add', {
        fields: {
          TITLE: `${chName} — ${clientName}`,
          NAME: fn, LAST_NAME: ln.join(' '),
          SOURCE_ID: 'WEB',
          SOURCE_DESCRIPTION: `OmniHub — ${chName}`,
          COMMENTS: comments,
          ASSIGNED_BY_ID: adminId,
          STATUS_ID: 'NEW',
          CONTACT_ID: contactId,
        },
      });
      leadId = lRes.result;
    }

    // ── 3. Tasks (with files & dependencies) ────────────
    const taskIds  = [];
    const taskUrls = [];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const prev = i > 0 ? taskIds[i - 1] : null;

      // Upload files for this step to B24 Disk
      const diskFileIds = await uploadFiles(webhook, adminId, t.files || []);

      const stepSuffix = tasks.length > 1 ? ` (Шаг ${i + 1}/${tasks.length})` : '';
      const nextNote   = i < tasks.length - 1
        ? `\n\n⏭ Следующий шаг ${i + 2}: ${tasks[i + 1]?.title}`
        : '\n\n✅ Последний шаг.';

      const fields = {
        TITLE:         t.title + stepSuffix,
        DESCRIPTION:   (t.desc || '') + nextNote + (leadId ? `\n\nCRM Лид #${leadId}` : ''),
        RESPONSIBLE_ID: t.assigneeId,
        PRIORITY:       t.priority || '1',
        CREATED_BY:     adminId,
        ...(t.deadline ? { DEADLINE: new Date(t.deadline).toISOString() } : {}),
        ...(prev        ? { DEPENDS_ON: [prev] } : {}),
        ...(leadId      ? { UF_CRM_TASK: [`L_${leadId}`] } : {}),
        ...(diskFileIds.length ? { UF_TASK_WEBDAV_FILES: diskFileIds } : {}),
      };

      const tRes  = await post('tasks.task.add', { fields });
      const taskId = tRes.result?.task?.id;
      if (!taskId) throw new Error(`Шаг ${i + 1} не создан: ${JSON.stringify(tRes)}`);

      taskIds.push(taskId);
      taskUrls.push(
        `https://${domain}/company/personal/user/${t.assigneeId}/tasks/task/view/${taskId}/`
      );

      // Notify assignee
      const filesNote = diskFileIds.length
        ? `\n📎 Прикреплено файлов: ${diskFileIds.length}`
        : '';

      await post('im.notify.system.add', {
        USER_ID: t.assigneeId,
        MESSAGE: [
          `📋 Новая задача от OmniHub`,
          `Клиент: ${clientName} (${chName})`,
          `Шаг ${i + 1}: ${t.title}`,
          t.desc ? `Инструкция: ${t.desc}` : null,
          i > 0 ? `⚠️ Стартует после шага ${i}` : null,
          filesNote || null,
        ].filter(Boolean).join('\n'),
      });
    }

    res.json({ configured: true, taskIds, taskUrls, leadId, contactId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
