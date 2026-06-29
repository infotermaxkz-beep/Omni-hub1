export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const webhook = process.env.BITRIX24_WEBHOOK_URL;
  if (!webhook) return res.json({ ok:false, error:'BITRIX24_WEBHOOK_URL не задан' });

  const ADMIN_IDS = ['1','42','98'];

  try {
    let allUsers = [], start = 0;
    while (true) {
      const r = await fetch(`${webhook}user.get.json?ACTIVE=Y&start=${start}`);
      const d = await r.json();
      if (!d.result?.length) break;
      allUsers = allUsers.concat(d.result);
      if (!d.next) break;
      start = d.next;
    }

    const rows = allUsers.map(u => ({
      id:        String(u.ID),
      name:      [u.NAME, u.LAST_NAME].filter(Boolean).join(' '),
      dept:      u.WORK_POSITION || '',
      is_admin:  ADMIN_IDS.includes(String(u.ID)),
      synced_at: new Date().toISOString(),
    }));

    // Save to Supabase if configured
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_KEY;
    let saved = false;

    if (sbUrl && sbKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(sbUrl, sbKey, { auth:{ persistSession:false } });
      const { error } = await sb.from('b24_users').upsert(rows, { onConflict:'id' });
      if (!error) saved = true;
    }

    res.json({
      ok: true,
      synced: rows.length,
      saved_to_supabase: saved,
      admins:  rows.filter(r => r.is_admin).map(r => r.name),
      workers: rows.filter(r => !r.is_admin).map(r => r.name),
    });
  } catch(e) {
    res.status(500).json({ ok:false, error: e.message });
  }
}
