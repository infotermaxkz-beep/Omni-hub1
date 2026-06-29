/**
 * GET /api/b24/test
 * Открой в браузере после деплоя — покажет всех сотрудников и статус подключений
 */
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const webhook  = process.env.BITRIX24_WEBHOOK_URL;
  const domain   = process.env.BITRIX24_DOMAIN;
  const sb       = getSupabase();
  const kaspiKey = process.env.KASPI_API_KEY;
  const result   = { checks: {} };

  // 1. B24
  if (webhook) {
    try {
      const r = await fetch(`${webhook}user.current.json`);
      const d = await r.json();
      result.checks.bitrix24 = { ok:true, user:{ id:d.result?.ID, name:[d.result?.NAME,d.result?.LAST_NAME].filter(Boolean).join(' ') }, domain };
    } catch(e) { result.checks.bitrix24 = { ok:false, error:e.message }; }
  } else { result.checks.bitrix24 = { ok:false, error:'BITRIX24_WEBHOOK_URL не задан' }; }

  // 2. Supabase
  if (sb) {
    try {
      const { count } = await sb.from('b24_users').select('*',{count:'exact',head:true});
      result.checks.supabase = { ok:true, users_synced:count||0 };
    } catch(e) { result.checks.supabase = { ok:false, error:e.message }; }
  } else { result.checks.supabase = { ok:false, error:'SUPABASE_URL / SUPABASE_SERVICE_KEY не заданы' }; }

  // 3. Kaspi
  result.checks.kaspi = kaspiKey
    ? { ok:true, message:'KASPI_API_KEY задан' }
    : { ok:false, error:'KASPI_API_KEY не задан' };

  // 4. All users
  if (webhook) {
    try {
      let all=[], start=0;
      while(true){
        const r=await fetch(`${webhook}user.get.json?ACTIVE=Y&start=${start}`);
        const d=await r.json();
        if(!d.result?.length) break;
        all=all.concat(d.result);
        if(!d.next) break;
        start=d.next;
      }
      result.all_b24_users = all.map(u=>({ id:u.ID, name:[u.NAME,u.LAST_NAME].filter(Boolean).join(' '), dept:u.WORK_POSITION||'—' }));
    } catch(e) {}
  }

  const allOk = Object.values(result.checks).every(c=>c.ok);
  res.status(allOk?200:207).json({ status:allOk?'✅ Всё подключено':'⚠️ Есть проблемы', ...result });
}
