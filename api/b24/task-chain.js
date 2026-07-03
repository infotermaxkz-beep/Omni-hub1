export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};

const DIRECTOR_ID = '42'; // Сулейманов Наиль — постановщик задач

/** Upload files to B24 Disk → OmniHub folder */
async function uploadFiles(webhook, adminId, files) {
  if (!files?.length) return [];
  const post = (method, body) =>
    fetch(`${webhook}${method}.json`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }).then(r => r.json());

  try {
    const storageRes = await fetch(`${webhook}disk.storage.getforuser.json?USER_ID=${adminId}`);
    const storageData = await storageRes.json();
    const rootId = storageData.result?.ROOT_OBJECT?.ID;
    if (!rootId) return [];

    const childData = await fetch(`${webhook}disk.folder.getchildren.json?id=${rootId}`).then(r => r.json());
    let folderId = (childData.result || []).find(f => f.NAME === 'OmniHub')?.ID;
    if (!folderId) {
      const mk = await post('disk.folder.addsubfolder', { id:rootId, data:{ NAME:'OmniHub' } });
      folderId = mk.result?.ID;
    }
    if (!folderId) return [];

    const ids = [];
    for (const file of files) {
      try {
        const up = await post('disk.folder.uploadfile', { id:folderId, data:{ NAME:file.name }, fileContent:[file.name, file.base64] });
        if (up.result?.ID) ids.push(`n${up.result.ID}`);
      } catch (e) { console.error('Upload:', file.name, e.message); }
    }
    return ids;
  } catch (e) { console.error('Disk upload:', e.message); return []; }
}

/** Add checklist items to a task */
async function addChecklist(webhook, taskId, items) {
  if (!items?.length) return;
  for (const item of items) {
    try {
      await fetch(`${webhook}task.checklistitem.add.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ TASKID: taskId, FIELDS: { TITLE: item.text, IS_COMPLETE: item.done ? 'Y' : 'N' } }),
      });
    } catch (e) { console.error('Checklist item:', item.text, e.message); }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { tasks, clientName, clientPhone, channel, lastMessage, kaspiOrderId, adminId, createCRM, projectId } = req.body || {};
  if (!Array.isArray(tasks) || !tasks.length) return res.status(400).json({ error:'tasks пустой' });

  const webhook = process.env.BITRIX24_WEBHOOK_URL;
  const domain  = process.env.BITRIX24_DOMAIN || '';
  const chMap   = { whatsapp:'WhatsApp', instagram:'Instagram', kaspi:'Kaspi' };
  const chName  = chMap[channel] || channel || 'OmniHub';

  if (!webhook) {
    return res.json({ configured:false, taskIds:tasks.map((_,i)=>1000+i), taskUrls:[], leadId:null, contactId:null });
  }

  const post = async (method, body) => {
    const r = await fetch(`${webhook}${method}.json`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const json = await r.json();
    if (json.error) throw new Error(`${method}: ${json.error_description || json.error}`);
    return json;
  };

  const warnings = [];
  let leadId = null, contactId = null;

  // ── Contact ────────────────────────────────────────────
  if (createCRM && clientName) {
    try {
      const [fn, ...ln] = clientName.split(' ');
      const c = await post('crm.contact.add', { fields:{ NAME:fn, LAST_NAME:ln.join(' '), SOURCE_ID:'WEB', SOURCE_DESCRIPTION:`OmniHub — ${chName}`, ASSIGNED_BY_ID:DIRECTOR_ID, ...(clientPhone?{PHONE:[{VALUE:clientPhone,VALUE_TYPE:'MOBILE'}]}:{}) } });
      contactId = c.result;
    } catch (e) { warnings.push(`Контакт: ${e.message}`); }
  }

  // ── Lead ────────────────────────────────────────────────
  if (createCRM && clientName) {
    try {
      const [fn, ...ln] = clientName.split(' ');
      const comments = [`Канал: ${chName}`, kaspiOrderId?`Kaspi #${kaspiOrderId}`:null, lastMessage?`Сообщение: ${lastMessage}`:null].filter(Boolean).join('\n');
      const l = await post('crm.lead.add', { fields:{ TITLE:`${chName} — ${clientName}`, NAME:fn, LAST_NAME:ln.join(' '), SOURCE_ID:'WEB', SOURCE_DESCRIPTION:`OmniHub — ${chName}`, COMMENTS:comments, ASSIGNED_BY_ID:DIRECTOR_ID, STATUS_ID:'NEW', CONTACT_ID:contactId } });
      leadId = l.result;
    } catch (e) { warnings.push(`Лид: ${e.message}`); }
  }

  // ── Tasks chain ─────────────────────────────────────────
  const taskIds  = [];
  const taskUrls = [];

  try {
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (!t.assigneeId || !t.title) throw new Error(`Шаг ${i+1}: не указан исполнитель или название`);

      const prev        = i > 0 ? taskIds[i-1] : null;
      const diskFileIds = await uploadFiles(webhook, DIRECTOR_ID, t.files || []);
      const stepSuffix  = tasks.length > 1 ? ` (Шаг ${i+1}/${tasks.length})` : '';
      const nextNote    = i < tasks.length-1 ? `\n\n⏭ Следующий шаг ${i+2}: ${tasks[i+1]?.title}` : '\n\n✅ Последний шаг.';

      const fields = {
        TITLE:          t.title + stepSuffix,
        DESCRIPTION:    (t.desc||'') + nextNote + (leadId?`\n\nCRM Лид #${leadId}`:'') + `\n\nПостановщик через OmniHub · ТЕРMAX`,
        RESPONSIBLE_ID: String(t.assigneeId),
        CREATED_BY:     DIRECTOR_ID,
        PRIORITY:       t.priority || '1',
        ...(t.deadline    ? { DEADLINE: new Date(t.deadline+'T18:00:00').toISOString() } : {}),
        ...(prev          ? { DEPENDS_ON: [prev] }            : {}),
        ...(leadId        ? { UF_CRM_TASK: [`L_${leadId}`] }  : {}),
        ...(diskFileIds.length ? { UF_TASK_WEBDAV_FILES: diskFileIds } : {}),
        ...(t.projectId || projectId ? { GROUP_ID: t.projectId || projectId } : {}),
      };

      const tRes   = await post('tasks.task.add', { fields });
      const taskId = tRes.result?.task?.id;
      if (!taskId) throw new Error(`Шаг ${i+1}: B24 не вернул ID — ${JSON.stringify(tRes).slice(0,200)}`);

      // Add checklist items
      if (t.checklist?.length) {
        await addChecklist(webhook, taskId, t.checklist);
      }

      taskIds.push(taskId);
      taskUrls.push(`https://${domain}/company/personal/user/${t.assigneeId}/tasks/task/view/${taskId}/`);

      // Notify assignee
      const filesNote = diskFileIds.length ? `\n📎 Файлов: ${diskFileIds.length}` : '';
      const checkNote = t.checklist?.length ? `\n📋 Чеклист: ${t.checklist.length} пунктов` : '';
      try {
        await post('im.notify.system.add', {
          USER_ID: t.assigneeId,
          MESSAGE: [`📋 Новая задача · ТЕРMAX`, `Постановщик: Сулейманов Наиль (директор)`, clientName?`Клиент: ${clientName} (${chName})`:`Задача: ${t.title}`, `Шаг ${i+1}: ${t.title}`, t.desc?`Инструкция: ${t.desc}`:null, i>0?`⚠️ Стартует после шага ${i}`:null, filesNote||null, checkNote||null].filter(Boolean).join('\n'),
        });
      } catch (e) { warnings.push(`Уведомление шага ${i+1}: ${e.message}`); }
    }
  } catch (e) {
    return res.status(500).json({ error: e.message, partial:{ taskIds, taskUrls, leadId, contactId, warnings } });
  }

  res.json({ configured:true, taskIds, taskUrls, leadId, contactId, warnings });
}
