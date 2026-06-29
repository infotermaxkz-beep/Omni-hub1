/**
 * GET /api/b24/users
 * Returns users from Supabase (synced). Falls back to B24 live → mock.
 */
import { getSupabase } from '../lib/supabase.js';

const ADMIN_IDS  = ['1','42','98'];
const ADMIN_DATA = [
  { id:'1',  name:'Бийболатов Марат', dept:'Управление', is_admin:true },
  { id:'42', name:'Сулейманов Наиль', dept:'Менеджмент', is_admin:true },
  { id:'98', name:'Пименов Алексей',  dept:'Менеджмент', is_admin:true },
];
const MOCK_WORKERS = [
  { id:'2', name:'Асель Байжанова',      dept:'Логистика',   is_admin:false },
  { id:'4', name:'Бекзат Нурмагамбетов', dept:'Склад',       is_admin:false },
  { id:'6', name:'Гульнар Кожахметова',  dept:'Доставка',    is_admin:false },
  { id:'7', name:'Расул Сейтжанов',      dept:'Бухгалтерия', is_admin:false },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  if (req.method==='OPTIONS') return res.status(200).end();

  const sb      = getSupabase();
  const webhook = process.env.BITRIX24_WEBHOOK_URL;

  // 1. Supabase cache (fastest)
  if (sb) {
    const { data } = await sb.from('b24_users').select('*').order('name');
    if (data?.length) {
      return res.json({
        configured:true, source:'supabase',
        admins:  data.filter(u=>u.is_admin),
        workers: data.filter(u=>!u.is_admin),
        total:   data.length,
      });
    }
  }

  // 2. Live B24 fetch + save to Supabase
  if (webhook) {
    try {
      let allUsers=[], start=0;
      while(true){
        const r=await fetch(`${webhook}user.get.json?ACTIVE=Y&start=${start}`);
        const d=await r.json();
        if(!d.result?.length) break;
        allUsers=allUsers.concat(d.result);
        if(!d.next) break;
        start=d.next;
      }
      const rows=allUsers.map(u=>({
        id:       String(u.ID),
        name:     [u.NAME,u.LAST_NAME].filter(Boolean).join(' '),
        dept:     u.WORK_POSITION||'',
        is_admin: ADMIN_IDS.includes(String(u.ID)),
        synced_at:new Date().toISOString(),
      }));
      if(sb&&rows.length) await sb.from('b24_users').upsert(rows,{onConflict:'id'});
      return res.json({
        configured:true, source:'bitrix24',
        admins:  rows.filter(r=>r.is_admin),
        workers: rows.filter(r=>!r.is_admin),
        total:   rows.length,
      });
    } catch(e){ console.error('B24 fetch:',e.message); }
  }

  // 3. Mock
  return res.json({
    configured:false, source:'mock',
    admins: ADMIN_DATA, workers: MOCK_WORKERS,
    total: ADMIN_DATA.length+MOCK_WORKERS.length,
  });
}
