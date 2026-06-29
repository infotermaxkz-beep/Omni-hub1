export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const webhook = process.env.BITRIX24_WEBHOOK_URL;
  if (!webhook) return res.json({ ok:false, error:'BITRIX24_WEBHOOK_URL не задан' });

  try {
    // Get all users with pagination
    let allUsers = [], start = 0;
    while (true) {
      const r = await fetch(`${webhook}user.get.json?ACTIVE=Y&start=${start}`);
      const d = await r.json();
      if (!d.result?.length) break;
      allUsers = allUsers.concat(d.result);
      if (!d.next) break;
      start = d.next;
    }

    const ADMIN_IDS = ['1','42','98'];
    const users = allUsers.map(u => ({
      id:       String(u.ID),
      name:     [u.NAME, u.LAST_NAME].filter(Boolean).join(' '),
      dept:     u.WORK_POSITION || '—',
      is_admin: ADMIN_IDS.includes(String(u.ID)),
    }));

    res.json({
      ok: true,
      domain: process.env.BITRIX24_DOMAIN,
      total: users.length,
      admins:  users.filter(u => u.is_admin),
      workers: users.filter(u => !u.is_admin),
    });
  } catch(e) {
    res.status(500).json({ ok:false, error: e.message });
  }
}
