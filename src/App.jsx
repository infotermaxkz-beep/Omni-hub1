import { useState, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ─── Channel config ─────────────────────────────── */
const CC = { whatsapp:"#25D366", instagram:"#C13584", kaspi:"#EF3124" };
const CB = { whatsapp:"#e6f9ee", instagram:"#fce8f3", kaspi:"#fdecea" };
const CN = { whatsapp:"WhatsApp", instagram:"Instagram", kaspi:"Kaspi" };

/* ─── 3 Ответственных ────────────────────────────── */
const ADMIN_USERS = [
  { id:"1",  name:"Бийболатов Марат",  dept:"Управление",  color:"#5c67e5" },
  { id:"42", name:"Сулейманов Наиль",  dept:"Менеджмент",  color:"#0891b2" },
  { id:"98", name:"Пименов Алексей",   dept:"Менеджмент",  color:"#16a34a" },
];

/* ─── Mock conversation data ─────────────────────── */
const INIT_CONVS = [
  { id:1, ch:"whatsapp",  name:"Айгерим Сейткали",   ini:"АС", lastMsg:"Когда будет доставка?",   time:"14:32", unread:2, order:null,
    msgs:[{f:"client",t:"Здравствуйте! Оформила заказ — когда ждать доставку?",ts:"14:28"},{f:"client",t:"Когда будет доставка?",ts:"14:32"}] },
  { id:2, ch:"instagram", name:"Дамир Абенов",        ini:"ДА", lastMsg:"Есть ли красный цвет?",   time:"13:15", unread:1, order:null,
    msgs:[{f:"client",t:"Привет! Есть красный в наличии?",ts:"13:15"}] },
  { id:3, ch:"kaspi",     name:"Нурлан Жаксыбеков",  ini:"НЖ", lastMsg:"Подтвердите отправку",     time:"12:44", unread:0,
    order:{ id:"KSP-7832", status:"confirmed", label:"Подтверждён", amount:"45 000 ₸" },
    msgs:[{f:"sys",t:"Новый заказ #KSP-7832 · 45 000 ₸",ts:"12:44"},{f:"client",t:"Вы отправите сегодня?",ts:"12:50"}] },
  { id:4, ch:"whatsapp",  name:"Салтанат Ержанова",  ini:"СЕ", lastMsg:"Спасибо большое!",         time:"11:05", unread:0, order:null,
    msgs:[{f:"client",t:"Товар получила, всё отлично!",ts:"11:00"},{f:"me",t:"Рады слышать! Спасибо 🙏",ts:"11:03"},{f:"client",t:"Спасибо большое!",ts:"11:05"}] },
  { id:5, ch:"kaspi",     name:"Зарина Мухамедова",  ini:"ЗМ", lastMsg:"Есть ли размер S?",        time:"10:30", unread:3,
    order:{ id:"KSP-7891", status:"pending", label:"Ожидает отправки", amount:"12 500 ₸" },
    msgs:[{f:"sys",t:"Новый заказ #KSP-7891 · 12 500 ₸",ts:"10:30"},{f:"client",t:"Есть размер S?",ts:"10:35"},{f:"client",t:"Или только M?",ts:"10:36"}] },
];

const TEMPLATES = [
  { name:"Приветствие",    txt:"Здравствуйте! Спасибо за обращение. Чем можем помочь?",             chs:["whatsapp","instagram","kaspi"] },
  { name:"Статус заказа",  txt:"Ваш заказ #{order_id} в обработке. Доставка: {date}.",              chs:["kaspi","whatsapp"] },
  { name:"Отправка",       txt:"Заказ отправлен! Трек: {track}. Ожидайте 1–3 дня.",                 chs:["kaspi","whatsapp","instagram"] },
  { name:"Нет в наличии",  txt:"Выбранный размер временно отсутствует. Уведомим при поступлении.", chs:["instagram","whatsapp"] },
  { name:"Благодарность",  txt:"Спасибо за покупку! Будем рады видеть вас снова 🎉",                chs:["whatsapp","instagram","kaspi"] },
  { name:"Возврат/обмен",  txt:"Для возврата укажите номер заказа и причину — разберёмся за 24 ч.",chs:["kaspi","whatsapp","instagram"] },
];

const ANALYTICS = [
  { day:"Пн", whatsapp:12, instagram:8,  kaspi:5  },
  { day:"Вт", whatsapp:18, instagram:11, kaspi:9  },
  { day:"Ср", whatsapp:15, instagram:14, kaspi:12 },
  { day:"Чт", whatsapp:22, instagram:9,  kaspi:15 },
  { day:"Пт", whatsapp:28, instagram:17, kaspi:18 },
  { day:"Сб", whatsapp:35, instagram:22, kaspi:24 },
  { day:"Вс", whatsapp:20, instagram:13, kaspi:11 },
];

const STAGES      = ["Новый","Консультация","Оффер","Оплата","Завершён"];
const STAGE_COLOR = { "Новый":"#5c67e5","Консультация":"#0891b2","Оффер":"#d97706","Оплата":"#16a34a","Завершён":"#6b7280" };

const INIT_CARDS = [
  { id:1, ini:"АС", name:"Айгерим Сейткали",     ch:"whatsapp",  amount:"25 000 ₸", stage:"Консультация", time:"14:32" },
  { id:2, ini:"ДА", name:"Дамир Абенов",          ch:"instagram", amount:"8 500 ₸",  stage:"Новый",        time:"13:15" },
  { id:3, ini:"НЖ", name:"Нурлан Жаксыбеков",    ch:"kaspi",     amount:"45 000 ₸", stage:"Оплата",        time:"12:44" },
  { id:4, ini:"СЕ", name:"Салтанат Ержанова",    ch:"whatsapp",  amount:"15 000 ₸", stage:"Завершён",      time:"11:05" },
  { id:5, ini:"ЗМ", name:"Зарина Мухамедова",    ch:"kaspi",     amount:"12 500 ₸", stage:"Оффер",         time:"10:30" },
  { id:6, ini:"БН", name:"Бекзат Нурмагамбетов", ch:"instagram", amount:"5 000 ₸",  stage:"Новый",         time:"09:12" },
  { id:7, ini:"ГК", name:"Гульнар Кожахметова",  ch:"whatsapp",  amount:"32 000 ₸", stage:"Консультация",  time:"08:55" },
];

const STATUS_STYLE = {
  confirmed:{ label:"Подтверждён",      bg:"#e6f9ee", color:"#1a7a3e" },
  pending:  { label:"Ожидает отправки", bg:"#fff3e0", color:"#e65100" },
  shipped:  { label:"Отправлен",        bg:"#e3f2fd", color:"#0277bd" },
};

const MOCK_WORKERS = [
  { id:"2",  name:"Асель Байжанова",       dept:"Логистика"   },
  { id:"4",  name:"Бекзат Нурмагамбетов",  dept:"Склад"       },
  { id:"6",  name:"Гульнар Кожахметова",   dept:"Доставка"    },
  { id:"7",  name:"Расул Сейтжанов",       dept:"Бухгалтерия" },
  { id:"8",  name:"Зарина Абенова",        dept:"Поддержка"   },
];

/* ─── Helpers ────────────────────────────────────── */
const getTomorrow = () => {
  const d = new Date(); d.setDate(d.getDate()+1);
  return d.toISOString().split("T")[0];
};
const newStep = () => ({ id:Date.now()+Math.random(), assigneeId:"", title:"", desc:"", deadline:getTomorrow(), priority:"1" });
const initials = (name="") => name.split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase();

/* ─── SVG Icons ──────────────────────────────────── */
const ChIcon = ({ ch, size=13 }) => ({
  whatsapp:(
    <svg width={size} height={size} viewBox="0 0 24 24" fill={CC.whatsapp}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M11.99 2C6.472 2 2 6.472 2 11.99c0 1.71.448 3.314 1.232 4.707L2 22l5.49-1.21A9.947 9.947 0 0011.99 22C17.507 22 22 17.528 22 12.01 22 6.472 17.507 2 11.99 2z"/>
    </svg>),
  instagram:(
    <svg width={size} height={size} viewBox="0 0 24 24" fill={CC.instagram}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>),
  kaspi:(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={CC.kaspi} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
    </svg>),
}[ch] || null);

/* ─── Toast ──────────────────────────────────────── */
const Toast = ({ toast, onClose }) => {
  if (!toast) return null;
  const styles = {
    success:{ bg:"#ecfdf5", border:"#6ee7b7", text:"#065f46" },
    error:  { bg:"#fef2f2", border:"#fca5a5", text:"#991b1b" },
    warn:   { bg:"#fffbeb", border:"#fcd34d", text:"#78350f" },
  };
  const s = styles[toast.type] || styles.success;
  return (
    <div style={{position:"fixed",top:16,right:16,zIndex:9999,maxWidth:360,
      background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:12,
      padding:"12px 16px",boxShadow:"0 4px 24px rgba(0,0,0,0.13)"}}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:s.text,marginBottom:4}}>{toast.message}</div>
          {toast.urls?.map((u,i)=>(
            <a key={i} href={u.url} target="_blank" rel="noreferrer"
              style={{fontSize:11,color:s.text,display:"block",textDecoration:"underline",marginTop:2}}>
              {u.label} →
            </a>
          ))}
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:s.text,lineHeight:1,flexShrink:0}}>×</button>
      </div>
    </div>
  );
};

/* ─── Admin Login ────────────────────────────────── */
const AdminLogin = ({ onLogin }) => (
  <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
    background:"linear-gradient(135deg,#f0f2ff 0%,#f5f5f7 100%)"}}>
    <div style={{background:"#fff",borderRadius:20,padding:"40px 36px",width:380,
      boxShadow:"0 8px 40px rgba(0,0,0,0.10)"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:36,marginBottom:10}}>⚡</div>
        <div style={{fontSize:22,fontWeight:800,color:"#111",letterSpacing:"-0.5px"}}>OmniHub KZ</div>
        <div style={{fontSize:13,color:"#aaa",marginTop:4}}>tootmx.bitrix24.kz</div>
      </div>
      <div style={{fontSize:13,fontWeight:600,color:"#555",marginBottom:14,textAlign:"center"}}>
        Кто работает с системой?
      </div>
      {ADMIN_USERS.map(a => (
        <button key={a.id} onClick={() => onLogin(a)}
          onMouseEnter={e => { e.currentTarget.style.background="#f0f2ff"; e.currentTarget.style.borderColor=a.color; }}
          onMouseLeave={e => { e.currentTarget.style.background="#f8f9ff"; e.currentTarget.style.borderColor="#e8eaf0"; }}
          style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"13px 16px",
            background:"#f8f9ff",border:"1.5px solid #e8eaf0",borderRadius:12,
            cursor:"pointer",marginBottom:10,textAlign:"left",transition:"all .15s"}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:a.color+"18",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:14,fontWeight:700,color:a.color,flexShrink:0}}>
            {initials(a.name)}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"#111"}}>{a.name}</div>
            <div style={{fontSize:11,color:"#888",marginTop:1}}>ID: {a.id} · {a.dept}</div>
          </div>
          <span style={{fontSize:18,color:"#ccc"}}>→</span>
        </button>
      ))}
      <div style={{textAlign:"center",fontSize:11,color:"#ccc",marginTop:16}}>
        Доступ только для 3 ответственных
      </div>
    </div>
  </div>
);

/* ─── Task Step ──────────────────────────────────── */
const TaskStep = ({ step, idx, total, workers, onChange, onRemove }) => (
  <div style={{background:"#fff",border:"1.5px solid #e8eaf0",borderRadius:12,padding:14,position:"relative"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:24,height:24,borderRadius:"50%",background:"#3d4de0",color:"#fff",
          fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {idx+1}
        </div>
        <span style={{fontSize:12,fontWeight:700,color:"#111"}}>Шаг {idx+1}</span>
        {idx === 0
          ? <span style={{fontSize:9,background:"#e6f9ee",color:"#166534",padding:"1px 7px",borderRadius:4,fontWeight:600}}>Сразу</span>
          : <span style={{fontSize:9,background:"#eff3ff",color:"#3d4de0",padding:"1px 7px",borderRadius:4,fontWeight:600}}>После шага {idx}</span>
        }
      </div>
      {total > 1 && (
        <button onClick={onRemove} style={{width:20,height:20,borderRadius:"50%",background:"#fee2e2",
          border:"none",color:"#dc2626",cursor:"pointer",fontSize:14,display:"flex",
          alignItems:"center",justifyContent:"center"}}>×</button>
      )}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
      <div>
        <div style={{fontSize:10,fontWeight:600,color:"#666",marginBottom:3}}>Кому назначить</div>
        <select value={step.assigneeId} onChange={e => onChange("assigneeId", e.target.value)}
          style={{width:"100%",border:`1.5px solid ${step.assigneeId?"#3d4de0":"#fcd34d"}`,
            borderRadius:6,padding:"6px 8px",fontSize:12,background:step.assigneeId?"#fff":"#fffbf0",outline:"none"}}>
          <option value="">— Выбрать сотрудника —</option>
          <optgroup label="Ответственные">
            {ADMIN_USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </optgroup>
          <optgroup label="Сотрудники B24">
            {workers.map(u => <option key={u.id} value={u.id}>{u.name} · {u.dept}</option>)}
          </optgroup>
        </select>
      </div>
      <div>
        <div style={{fontSize:10,fontWeight:600,color:"#666",marginBottom:3}}>Срок выполнения</div>
        <input type="date" value={step.deadline} onChange={e => onChange("deadline", e.target.value)}
          style={{width:"100%",border:"1.5px solid #e0e0e8",borderRadius:6,padding:"6px 8px",fontSize:12,outline:"none"}}/>
      </div>
    </div>

    <div style={{marginBottom:8}}>
      <div style={{fontSize:10,fontWeight:600,color:"#666",marginBottom:3}}>Что нужно сделать</div>
      <input value={step.title} onChange={e => onChange("title", e.target.value)}
        placeholder="Краткое название задачи…"
        style={{width:"100%",border:"1.5px solid #e0e0e8",borderRadius:6,padding:"7px 10px",fontSize:12,
          boxSizing:"border-box",outline:"none"}}/>
    </div>

    <div style={{marginBottom:10}}>
      <div style={{fontSize:10,fontWeight:600,color:"#666",marginBottom:3}}>Детали / инструкция</div>
      <textarea value={step.desc} onChange={e => onChange("desc", e.target.value)}
        placeholder="Подробно опишите что сделать…" rows={2}
        style={{width:"100%",border:"1.5px solid #e0e0e8",borderRadius:6,padding:"7px 10px",
          fontSize:12,resize:"vertical",boxSizing:"border-box",outline:"none"}}/>
    </div>

    <div style={{display:"flex",gap:12,alignItems:"center"}}>
      <span style={{fontSize:10,fontWeight:600,color:"#666"}}>Приоритет:</span>
      {[["0","Низкий","#6b7280"],["1","Обычный","#0891b2"],["2","Высокий","#dc2626"]].map(([val,label,cl]) => (
        <label key={val} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:11}}>
          <input type="radio" name={`prio-${step.id}`} value={val}
            checked={step.priority===val} onChange={() => onChange("priority",val)}
            style={{accentColor:cl}}/>
          <span style={{color:step.priority===val?cl:"#888",fontWeight:step.priority===val?700:400}}>{label}</span>
        </label>
      ))}
    </div>
  </div>
);

/* ─── B24 Panel ──────────────────────────────────── */
const B24Panel = ({ conv, admin, workers, onToast }) => {
  const [chain,        setChain]        = useState([newStep()]);
  const [loading,      setLoading]      = useState(false);
  const [launched,     setLaunched]     = useState(null);
  const [dealDone,     setDealDone]     = useState(false);
  const [returnOpen,   setReturnOpen]   = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [amount,       setAmount]       = useState(conv.order?.amount?.replace(/[^\d]/g,"") || "");

  const lastClientMsg = conv.msgs.filter(m => m.f==="client").slice(-1)[0]?.t || "";

  const updateStep = (idx, field, val) =>
    setChain(prev => prev.map((s,i) => i===idx ? {...s,[field]:val} : s));

  const launchChain = async () => {
    const missing = chain.find(s => !s.assigneeId || !s.title);
    if (missing) return onToast({ type:"warn", message:"⚠️ Заполните исполнителя и задачу для каждого шага" });
    setLoading(true);
    try {
      const r = await fetch("/api/b24/task-chain", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          tasks: chain.map(s => ({ assigneeId:s.assigneeId, title:s.title, desc:s.desc, deadline:s.deadline, priority:s.priority })),
          clientName: conv.name, channel: conv.ch,
          lastMessage: lastClientMsg, kaspiOrderId: conv.order?.id || null,
          adminId: admin.id, createCRM: true,
        }),
      });
      const d = await r.json();
      setLaunched(d);
      onToast({
        type:"success",
        message: d.configured
          ? `✅ Запущено в Bitrix24! ${chain.length} задач${chain.length>1?"и":""}. Лид #${d.leadId} создан.`
          : `✅ Тест-режим: ${chain.length} шагов создано (подключите B24)`,
        urls: d.taskUrls?.map((u,i) => ({ label:`Шаг ${i+1}: ${chain[i]?.title}`, url:u })),
      });
    } catch(e) { onToast({ type:"error", message:"Ошибка: "+e.message }); }
    setLoading(false);
  };

  const closeDeal = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/b24/deal", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          clientName: conv.name, channel: conv.ch,
          amount: amount ? amount+" ₸" : "",
          leadId: launched?.leadId, contactId: launched?.contactId,
          adminId: admin.id,
        }),
      });
      const d = await r.json();
      setDealDone(true);
      onToast({
        type:"success",
        message: d.configured ? `🏆 Сделка закрыта! Deal #${d.dealId} в Bitrix24` : "🏆 Сделка закрыта (тест-режим)",
        urls: d.dealUrl ? [{ label:"Открыть сделку в B24", url:d.dealUrl }] : [],
      });
    } catch(e) { onToast({ type:"error", message:"Ошибка: "+e.message }); }
    setLoading(false);
  };

  const logReturn = async () => {
    if (!returnReason.trim()) return onToast({ type:"warn", message:"Укажите причину возврата" });
    setLoading(true);
    try {
      const r = await fetch("/api/b24/return", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          clientName: conv.name, channel: conv.ch,
          reason: returnReason, amount: amount ? amount+" ₸" : "",
          leadId: launched?.leadId, adminId: admin.id,
        }),
      });
      const d = await r.json();
      setReturnOpen(false); setReturnReason("");
      onToast({
        type:"warn",
        message: "↩ Возврат зафиксирован. Бийболатов, Сулейманов, Пименов уведомлены в B24.",
        urls: d.taskUrl ? [{ label:"Задача на возврат", url:d.taskUrl }] : [],
      });
    } catch(e) { onToast({ type:"error", message:"Ошибка: "+e.message }); }
    setLoading(false);
  };

  return (
    <div style={{background:"#f8f9ff",borderTop:"2.5px solid #3d4de0",overflowY:"auto",maxHeight:460}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 8px",borderBottom:"1px solid #e8eaf0"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,fontWeight:800,color:"#3d4de0"}}>🏢 Bitrix24</span>
          <span style={{fontSize:11,color:"#888"}}>tootmx.bitrix24.kz</span>
          <span style={{fontSize:10,color:"#888",background:"#f0f2ff",padding:"1px 7px",borderRadius:4}}>
            {admin.name}
          </span>
          {launched && <span style={{fontSize:9,background:"#e6f9ee",color:"#166534",padding:"2px 7px",borderRadius:4,fontWeight:700}}>✓ В B24</span>}
        </div>
        {/* Amount */}
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:10,color:"#888"}}>Сумма:</span>
          <input value={amount} onChange={e=>setAmount(e.target.value.replace(/\D/g,""))}
            placeholder="0"
            style={{width:90,border:"1px solid #e0e0e8",borderRadius:6,padding:"3px 7px",fontSize:12,textAlign:"right"}}/>
          <span style={{fontSize:11,color:"#888"}}>₸</span>
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {/* Chain */}
        {chain.map((step, idx) => (
          <div key={step.id}>
            <TaskStep step={step} idx={idx} total={chain.length} workers={workers}
              onChange={(f,v) => updateStep(idx,f,v)}
              onRemove={() => setChain(prev => prev.filter((_,i) => i!==idx))}/>
            {idx < chain.length-1 && (
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0"}}>
                <div style={{flex:1,height:1.5,background:"#e0e4f0"}}/>
                <span style={{fontSize:9,background:"#eff3ff",color:"#3d4de0",padding:"3px 10px",
                  borderRadius:10,fontWeight:700,whiteSpace:"nowrap"}}>
                  ↓ после выполнения шага {idx+1}
                </span>
                <div style={{flex:1,height:1.5,background:"#e0e4f0"}}/>
              </div>
            )}
          </div>
        ))}

        {/* Add step */}
        <button onClick={() => setChain(prev => [...prev, newStep()])}
          style={{width:"100%",marginTop:10,padding:"9px",border:"2px dashed #3d4de0",
            borderRadius:8,background:"#eff3ff",color:"#3d4de0",fontSize:12,fontWeight:700,cursor:"pointer"}}>
          + Добавить следующий шаг
        </button>

        {/* Actions */}
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:8,marginTop:10}}>
          <button onClick={launchChain} disabled={loading || !!launched}
            style={{padding:"10px 0",background:launched?"#6b7280":"#3d4de0",color:"#fff",
              border:"none",borderRadius:8,cursor:launched?"not-allowed":"pointer",
              fontSize:12,fontWeight:700,opacity:loading?0.7:1}}>
            {loading ? "Создаём…" : launched ? "✓ Запущено" : `🚀 В Bitrix24 (${chain.length} шаг${chain.length>1?"а":""})`}
          </button>

          <button onClick={closeDeal} disabled={loading || dealDone}
            style={{padding:"10px 0",background:dealDone?"#6b7280":"#16a34a",color:"#fff",
              border:"none",borderRadius:8,cursor:dealDone?"not-allowed":"pointer",
              fontSize:12,fontWeight:700,opacity:loading?0.7:1}}>
            {dealDone ? "✓ Сделка" : "✅ Сделка"}
          </button>

          <button onClick={() => setReturnOpen(!returnOpen)}
            style={{padding:"10px 0",background:"#fee2e2",color:"#dc2626",
              border:"1.5px solid #fca5a5",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
            ↩ Возврат
          </button>
        </div>

        {/* Return form */}
        {returnOpen && (
          <div style={{marginTop:10,background:"#fff5f5",border:"1.5px solid #fca5a5",borderRadius:10,padding:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"#dc2626",marginBottom:8}}>
              ↩ Возврат — уведомление уйдёт всем троим
            </div>
            <div style={{fontSize:10,color:"#888",marginBottom:6}}>
              Бийболатов Марат · Сулейманов Наиль · Пименов Алексей
            </div>
            <textarea value={returnReason} onChange={e=>setReturnReason(e.target.value)}
              placeholder="Причина возврата…" rows={2}
              style={{width:"100%",border:"1px solid #fca5a5",borderRadius:6,padding:"7px 10px",
                fontSize:12,resize:"none",boxSizing:"border-box",marginBottom:8}}/>
            <div style={{display:"flex",gap:6}}>
              <button onClick={() => { setReturnOpen(false); setReturnReason(""); }}
                style={{flex:1,padding:"7px",border:"1px solid #ddd",borderRadius:6,cursor:"pointer",fontSize:12,background:"#fff"}}>
                Отмена
              </button>
              <button onClick={logReturn} disabled={loading}
                style={{flex:2,padding:"7px",background:"#dc2626",color:"#fff",border:"none",
                  borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700}}>
                {loading ? "Фиксируем…" : "Зафиксировать и уведомить B24"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════ MAIN APP ══════════════════════════ */
export default function OmniHub() {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("omni_admin")); } catch { return null; }
  });
  const handleLogin  = a => { sessionStorage.setItem("omni_admin", JSON.stringify(a)); setAdmin(a); };
  const handleLogout = () => { sessionStorage.removeItem("omni_admin"); setAdmin(null); };
  if (!admin) return <AdminLogin onLogin={handleLogin} />;
  return <MainApp admin={admin} onLogout={handleLogout} />;
}

function MainApp({ admin, onLogout }) {
  const [tab,      setTab]      = useState("chats");
  const [convs,    setConvs]    = useState(INIT_CONVS);
  const [cur,      setCur]      = useState(INIT_CONVS[0]);
  const [filt,     setFilt]     = useState("all");
  const [input,    setInput]    = useState("");
  const [tmplOpen, setTmplOpen] = useState(false);
  const [b24Open,  setB24Open]  = useState(false);
  const [workers,  setWorkers]  = useState(MOCK_WORKERS);
  const [toast,    setToast]    = useState(null);
  const [cards,    setCards]    = useState(INIT_CARDS);
  const [dragCard, setDragCard] = useState(null);
  const msgsEnd = useRef(null);

  useEffect(() => { msgsEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [cur?.msgs]);
  useEffect(() => {
    fetch("/api/b24/users").then(r=>r.json()).then(d=>{ if(d.workers?.length) setWorkers(d.workers); }).catch(()=>{});
  }, []);
  useEffect(() => { if (toast) { const t = setTimeout(()=>setToast(null),5500); return ()=>clearTimeout(t); } }, [toast]);

  const totalUnread = convs.reduce((a,c)=>a+c.unread,0);
  const filtered    = filt==="all" ? convs : convs.filter(c=>c.ch===filt);
  const totalRevenue = cards.filter(c=>c.stage==="Завершён").reduce((a,c)=>a+parseInt(c.amount.replace(/\D/g,"")),0);

  function selectConv(id) {
    const upd = convs.map(c=>c.id===id?{...c,unread:0}:c);
    setConvs(upd); setCur(upd.find(c=>c.id===id));
    setTmplOpen(false); setInput(""); setB24Open(false);
  }

  function sendMsg() {
    const text = input.trim(); if (!text) return;
    const ts = new Date().toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"});
    const upd = convs.map(c=>c.id===cur.id?{...c,msgs:[...c.msgs,{f:"me",t:text,ts}],lastMsg:text}:c);
    setConvs(upd); setCur(upd.find(c=>c.id===cur.id));
    setInput(""); setTmplOpen(false);
  }

  const chTmpls = TEMPLATES.filter(t=>t.chs.includes(cur?.ch));

  const TABS = [
    { id:"chats",     label:"Чаты",     badge:totalUnread },
    { id:"templates", label:"Шаблоны"   },
    { id:"analytics", label:"Аналитика" },
    { id:"funnel",    label:"Воронка"   },
  ];

  return (
    <div style={{fontFamily:"system-ui,sans-serif",background:"#f5f5f7",height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <Toast toast={toast} onClose={()=>setToast(null)}/>

      {/* ── Top bar ── */}
      <div style={{background:"#fff",borderBottom:"1px solid #e8e8ec",display:"flex",alignItems:"center",
        gap:2,padding:"0 14px",height:50,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginRight:14,flexShrink:0}}>
          <div style={{width:26,height:26,background:"#eff3ff",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚡</div>
          <span style={{fontWeight:800,fontSize:15,color:"#111",letterSpacing:"-0.4px"}}>OmniHub</span>
          <span style={{fontSize:10,color:"#5c67e5",background:"#eff3ff",padding:"2px 7px",borderRadius:4,fontWeight:600}}>KZ</span>
        </div>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            background:tab===t.id?"#f0f2ff":"transparent",
            color:tab===t.id?"#3d4de0":"#666",
            border:"none",padding:"5px 11px",borderRadius:7,cursor:"pointer",
            fontSize:12,fontWeight:tab===t.id?700:400,
            display:"flex",alignItems:"center",gap:5,flexShrink:0,whiteSpace:"nowrap"}}>
            {t.label}
            {t.badge>0 && <span style={{background:tab===t.id?"#3d4de0":"#e5e7eb",color:tab===t.id?"#fff":"#555",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:10}}>{t.badge}</span>}
          </button>
        ))}
        {/* Admin badge */}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:7,background:"#f8f9ff",
            border:"1px solid #e8eaf0",borderRadius:20,padding:"4px 12px 4px 6px"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:admin.color+"22",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:9,fontWeight:700,color:admin.color}}>
              {initials(admin.name)}
            </div>
            <span style={{fontSize:12,fontWeight:600,color:"#111"}}>{admin.name}</span>
          </div>
          <button onClick={onLogout} title="Сменить пользователя"
            style={{background:"none",border:"none",color:"#bbb",cursor:"pointer",fontSize:17,padding:4}}>⇠</button>
        </div>
      </div>

      {/* ════ ЧАТЫ ════ */}
      {tab==="chats" && (
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* Sidebar */}
          <div style={{width:252,background:"#fff",borderRight:"1px solid #e8e8ec",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"9px 10px",borderBottom:"1px solid #e8e8ec",display:"flex",flexWrap:"wrap",gap:5}}>
              {["all","whatsapp","instagram","kaspi"].map(ch=>(
                <button key={ch} onClick={()=>setFilt(ch)} style={{
                  background:filt===ch?(ch==="all"?"#3d4de0":CC[ch]):"#f4f4f6",
                  color:filt===ch?"#fff":"#555",border:"none",padding:"4px 10px",
                  borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:4}}>
                  {ch==="all"?"Все":<><ChIcon ch={ch} size={11}/>{CN[ch]}</>}
                </button>
              ))}
            </div>
            <div style={{flex:1,overflowY:"auto"}}>
              {filtered.map(c=>(
                <div key={c.id} onClick={()=>selectConv(c.id)} style={{
                  padding:"11px 13px",borderBottom:"1px solid #f0f0f4",cursor:"pointer",
                  display:"flex",gap:9,
                  background:cur?.id===c.id?"#f7f8ff":"#fff",
                  borderLeft:`3px solid ${cur?.id===c.id?CC[c.ch]:"transparent"}`}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:CB[c.ch],display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:CC[c.ch],flexShrink:0}}>{c.ini}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:13,fontWeight:600,color:"#111"}}>{c.name}</span>
                      <span style={{fontSize:10,color:"#aaa"}}>{c.time}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:2}}>
                      <span style={{fontSize:11,color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:138}}>{c.lastMsg}</span>
                      {c.unread>0&&<span style={{background:CC[c.ch],color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:10,flexShrink:0}}>{c.unread}</span>}
                    </div>
                    <div style={{marginTop:3,display:"flex",alignItems:"center",gap:3}}>
                      <ChIcon ch={c.ch} size={10}/>
                      <span style={{fontSize:9,fontWeight:700,color:CC[c.ch],textTransform:"uppercase",letterSpacing:"0.4px"}}>{CN[c.ch]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          {cur && (
            <div style={{flex:1,display:"flex",flexDirection:"column",background:"#f9f9fb",minWidth:0}}>
              {/* Header */}
              <div style={{padding:"10px 16px",background:"#fff",borderBottom:"1px solid #e8e8ec",
                display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:CB[cur.ch],display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:CC[cur.ch]}}>{cur.ini}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:"#111"}}>{cur.name}</div>
                    <div style={{fontSize:11,color:CC[cur.ch],display:"flex",alignItems:"center",gap:3,fontWeight:600}}><ChIcon ch={cur.ch} size={11}/>{CN[cur.ch]}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {cur.order && (
                    <div style={{background:STATUS_STYLE[cur.order.status]?.bg,borderRadius:8,padding:"5px 12px",display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:CC.kaspi}}>#{cur.order.id}</span>
                      <span style={{fontSize:11,fontWeight:600,color:STATUS_STYLE[cur.order.status]?.color}}>{cur.order.label}</span>
                      <span style={{fontSize:12,color:"#555"}}>{cur.order.amount}</span>
                    </div>
                  )}
                  <button onClick={()=>setB24Open(!b24Open)} style={{
                    background:b24Open?"#3d4de0":"#eff3ff",color:b24Open?"#fff":"#3d4de0",
                    border:"none",padding:"7px 13px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
                    🏢 {b24Open?"Закрыть":"Назначить задачу"}
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                {cur.msgs.map((m,i)=>(
                  m.f==="sys"
                    ?<div key={i} style={{textAlign:"center"}}>
                       <span style={{fontSize:11,color:"#888",background:"#eee",padding:"4px 12px",borderRadius:20,display:"inline-flex",alignItems:"center",gap:5}}>
                         <ChIcon ch="kaspi" size={11}/>{m.t}
                       </span>
                     </div>
                    :<div key={i} style={{display:"flex",justifyContent:m.f==="me"?"flex-end":"flex-start"}}>
                       <div style={{maxWidth:"66%",background:m.f==="me"?CC[cur.ch]:"#fff",
                         padding:"8px 12px",boxShadow:"0 1px 3px rgba(0,0,0,.07)",
                         borderRadius:m.f==="me"?"14px 14px 4px 14px":"14px 14px 14px 4px"}}>
                         <div style={{fontSize:13,color:m.f==="me"?"#fff":"#222",lineHeight:1.5}}>{m.t}</div>
                         <div style={{fontSize:10,color:m.f==="me"?"rgba(255,255,255,.6)":"#bbb",marginTop:3,textAlign:"right"}}>{m.ts}</div>
                       </div>
                     </div>
                ))}
                <div ref={msgsEnd}/>
              </div>

              {/* B24 Panel */}
              {b24Open && <B24Panel conv={cur} admin={admin} workers={workers} onToast={setToast}/>}

              {/* Templates */}
              {tmplOpen && (
                <div style={{background:"#fff",borderTop:"1px solid #e8e8ec",maxHeight:170,overflowY:"auto"}}>
                  {chTmpls.map((t,i)=>(
                    <div key={i} onClick={()=>{setInput(t.txt);setTmplOpen(false);}}
                      style={{padding:"8px 16px",cursor:"pointer",borderBottom:"1px solid #f4f4f6"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f7f8ff"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{fontSize:12,fontWeight:600,color:"#3d4de0"}}>{t.name}</div>
                      <div style={{fontSize:11,color:"#888",marginTop:1}}>{t.txt.substring(0,64)}…</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Input */}
              <div style={{padding:"10px 14px",background:"#fff",borderTop:"1px solid #e8e8ec",
                display:"flex",gap:7,alignItems:"center",flexShrink:0}}>
                <button onClick={()=>setTmplOpen(!tmplOpen)} style={{width:34,height:34,
                  border:"1px solid #e0e0e8",borderRadius:8,
                  background:tmplOpen?"#3d4de0":"#fff",cursor:"pointer",flexShrink:0,
                  fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
                  color:tmplOpen?"#fff":"#666"}}>⚡</button>
                <input value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&sendMsg()}
                  placeholder="Введите сообщение…"
                  style={{flex:1,height:34,border:"1px solid #e0e0e8",borderRadius:8,
                    padding:"0 12px",fontSize:13,outline:"none",background:"#fafafa"}}/>
                <button onClick={sendMsg} style={{height:34,padding:"0 16px",background:CC[cur.ch],
                  color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0}}>
                  Отправить
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ ШАБЛОНЫ ════ */}
      {tab==="templates" && (
        <div style={{flex:1,overflowY:"auto",padding:20}}>
          <div style={{fontSize:17,fontWeight:700,color:"#111",marginBottom:16}}>Шаблоны ответов</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
            {TEMPLATES.map((t,i)=>(
              <div key={i} style={{background:"#fff",border:"1px solid #eaecf0",borderRadius:12,padding:16}}>
                <div style={{fontWeight:600,fontSize:14,color:"#111",marginBottom:7}}>{t.name}</div>
                <div style={{fontSize:13,color:"#666",lineHeight:1.6,marginBottom:12}}>{t.txt}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {t.chs.map(ch=>(
                    <span key={ch} style={{fontSize:10,fontWeight:700,color:CC[ch],background:CB[ch],
                      padding:"2px 8px",borderRadius:5,display:"flex",alignItems:"center",gap:3}}>
                      <ChIcon ch={ch} size={10}/>{CN[ch]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ АНАЛИТИКА ════ */}
      {tab==="analytics" && (
        <div style={{flex:1,overflowY:"auto",padding:20}}>
          <div style={{fontSize:17,fontWeight:700,color:"#111",marginBottom:4}}>Аналитика касаний</div>
          <div style={{fontSize:12,color:"#888",marginBottom:16}}>Последние 7 дней · tootmx.bitrix24.kz</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16}}>
            {[{ch:"whatsapp",total:150,change:"+12%",deals:8},{ch:"instagram",total:94,change:"+8%",deals:3},{ch:"kaspi",total:94,change:"+31%",deals:14}].map(({ch,total,change,deals})=>(
              <div key={ch} style={{background:"#fff",border:`1px solid ${CC[ch]}33`,borderRadius:12,padding:16}}>
                <div style={{fontSize:12,color:CC[ch],fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:5}}><ChIcon ch={ch} size={13}/>{CN[ch]}</div>
                <div style={{fontSize:28,fontWeight:700,color:"#111"}}>{total}</div>
                <div style={{fontSize:11,color:"#888"}}>касаний</div>
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #f0f0f4",display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:11,color:"#27ae60",fontWeight:600}}>{change}</span>
                  <span style={{fontSize:11,color:"#555"}}>{deals} сделок</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:"#fff",border:"1px solid #eaecf0",borderRadius:14,padding:20}}>
            <div style={{fontSize:14,fontWeight:600,color:"#111",marginBottom:14}}>Касания по дням</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ANALYTICS} barSize={12} barGap={2}>
                <XAxis dataKey="day" tick={{fill:"#aaa",fontSize:12}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"#aaa",fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"#fff",border:"1px solid #eee",borderRadius:8,fontSize:12}} cursor={{fill:"#f7f7fb"}}/>
                <Bar dataKey="whatsapp" name="WhatsApp" fill={CC.whatsapp} radius={[3,3,0,0]}/>
                <Bar dataKey="instagram" name="Instagram" fill={CC.instagram} radius={[3,3,0,0]}/>
                <Bar dataKey="kaspi" name="Kaspi" fill={CC.kaspi} radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ════ ВОРОНКА ════ */}
      {tab==="funnel" && (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{background:"#fff",borderBottom:"1px solid #e8e8ec",padding:"10px 20px",
            display:"flex",gap:20,alignItems:"center",flexShrink:0}}>
            <div><div style={{fontSize:11,color:"#888"}}>В работе</div><div style={{fontSize:18,fontWeight:700,color:"#111"}}>{cards.filter(c=>c.stage!=="Завершён").length}</div></div>
            <div style={{width:1,height:32,background:"#e8e8ec"}}/>
            <div><div style={{fontSize:11,color:"#888"}}>Закрыто</div><div style={{fontSize:18,fontWeight:700,color:"#16a34a"}}>{cards.filter(c=>c.stage==="Завершён").length}</div></div>
            <div style={{width:1,height:32,background:"#e8e8ec"}}/>
            <div><div style={{fontSize:11,color:"#888"}}>Выручка</div><div style={{fontSize:18,fontWeight:700}}>{totalRevenue.toLocaleString("ru")} ₸</div></div>
          </div>
          <div style={{flex:1,overflowX:"auto",overflowY:"hidden",display:"flex"}}>
            {STAGES.map(stage=>{
              const sc = cards.filter(c=>c.stage===stage);
              const tot = sc.reduce((a,c)=>a+parseInt(c.amount.replace(/\D/g,"")),0);
              return (
                <div key={stage} onDragOver={e=>e.preventDefault()}
                  onDrop={()=>dragCard&&setCards(cards.map(c=>c.id===dragCard?{...c,stage}:c))}
                  style={{minWidth:190,flex:1,background:"#f5f5f7",borderRight:"1px solid #e8e8ec",display:"flex",flexDirection:"column"}}>
                  <div style={{padding:"10px 12px",borderBottom:"1px solid #e8e8ec",background:"#fff",flexShrink:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:STAGE_COLOR[stage],display:"inline-block"}}/>
                      <span style={{fontSize:12,fontWeight:700,color:"#111"}}>{stage}</span>
                      <span style={{fontSize:11,background:"#f0f0f4",color:"#666",padding:"1px 7px",borderRadius:10,fontWeight:600}}>{sc.length}</span>
                    </div>
                    {tot>0&&<div style={{fontSize:10,color:"#888",marginTop:2}}>{tot.toLocaleString("ru")} ₸</div>}
                  </div>
                  <div style={{flex:1,overflowY:"auto",padding:8}}>
                    {sc.map(card=>(
                      <div key={card.id} draggable onDragStart={()=>setDragCard(card.id)} onDragEnd={()=>setDragCard(null)}
                        style={{background:"#fff",borderRadius:10,padding:"10px 12px",marginBottom:8,
                          border:"1px solid #eaecf0",cursor:"grab",userSelect:"none",
                          boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                          <div style={{width:28,height:28,borderRadius:"50%",background:CB[card.ch],display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:CC[card.ch],flexShrink:0}}>{card.ini}</div>
                          <span style={{fontSize:12,fontWeight:600,color:"#111"}}>{card.name}</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <span style={{fontSize:13,fontWeight:700,color:"#111"}}>{card.amount}</span>
                          <div style={{display:"flex",alignItems:"center",gap:3}}><ChIcon ch={card.ch} size={11}/></div>
                        </div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {STAGES.filter(s=>s!==stage).slice(0,2).map(s=>(
                            <button key={s} onClick={()=>setCards(cards.map(c=>c.id===card.id?{...c,stage:s}:c))}
                              style={{fontSize:9,color:STAGE_COLOR[s],background:`${STAGE_COLOR[s]}15`,
                                border:`1px solid ${STAGE_COLOR[s]}44`,padding:"2px 6px",borderRadius:4,cursor:"pointer",fontWeight:600}}>
                              →{s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {sc.length===0&&<div style={{textAlign:"center",padding:"20px 0",fontSize:12,color:"#ccc"}}>Нет сделок</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
