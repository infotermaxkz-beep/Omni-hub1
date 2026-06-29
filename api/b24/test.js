/**
 * GET /api/b24/test
 * Проверка подключения к Bitrix24 — открой в браузере после деплоя
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const webhook = process.env.BITRIX24_WEBHOOK_URL;

  if (!webhook) {
    return res.json({ ok: false, error: 'BITRIX24_WEBHOOK_URL не задан в Vercel env vars' });
  }

  try {
    const [profileRes, usersRes] = await Promise.all([
      fetch(`${webhook}user.current.json`),
      fetch(`${webhook}user.get.json?ACTIVE=Y`),
    ]);
    const profile = await profileRes.json();
    const users   = await usersRes.json();

    res.json({
      ok: true,
      domain: process.env.BITRIX24_DOMAIN,
      currentUser: {
        id:   profile.result?.ID,
        name: [profile.result?.NAME, profile.result?.LAST_NAME].filter(Boolean).join(' '),
        dept: profile.result?.WORK_POSITION,
      },
      allUsers: (users.result || []).map(u => ({
        id:   u.ID,
        name: [u.NAME, u.LAST_NAME].filter(Boolean).join(' '),
        dept: u.WORK_POSITION || '—',
      })),
      adminIds: [
        process.env.ADMIN_1_ID,
        process.env.ADMIN_2_ID,
        process.env.ADMIN_3_ID,
      ].filter(Boolean),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
