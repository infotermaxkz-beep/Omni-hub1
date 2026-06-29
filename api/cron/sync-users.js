/**
 * GET /api/cron/sync-users
 * Syncs ALL active Bitrix24 users into Supabase b24_users table.
 * Called: daily via Vercel Cron OR hit manually after new hire.
 *
 * To trigger manually: open https://your-app.vercel.app/api/cron/sync-users
 */
import { getSupabase } from '../lib/supabase.js';

const ADMIN_IDS = ['1', '42', '98']; // Бийболатов, Сулейманов, Пименов

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const webhook  = process.env.BITRIX24_WEBHOOK_URL;
  const supabase = getSupabase();

  if (!webhook) return res.json({ ok: false, error: 'BITRIX24_WEBHOOK_URL not set' });
  if (!supabase) return res.json({ ok: false, error: 'Supabase not configured' });

  try {
    // Fetch ALL active users from B24 (handles pagination)
    let allUsers = [];
    let start = 0;
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

    // Upsert — new employees appear, old ones update, nobody deleted
    const { error } = await supabase
      .from('b24_users')
      .upsert(rows, { onConflict: 'id' });

    if (error) throw error;

    res.json({
      ok: true,
      synced: rows.length,
      admins: rows.filter(r => r.is_admin).map(r => r.name),
      workers: rows.filter(r => !r.is_admin).length,
      message: `Синхронизировано ${rows.length} пользователей из tootmx.bitrix24.kz`,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
