import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = (() => {
  const u = import.meta.env.VITE_SUPABASE_URL;
  const k = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return u && k ? createClient(u, k) : null;
})();

const B24_WEBHOOK = import.meta.env.VITE_B24_WEBHOOK ||
  "https://tootmx.bitrix24.kz/rest/98/xx8dwokqi6r48mwu/";

/* ── Web Audio beep (no file needed) ─────────── */
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[0, 660], [0.3, 660], [0.55, 880]].forEach(([t, freq]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "sine";
      gain.gain.setValueAtTime(0.5, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.28);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
  } catch (_) {}
}

const CYCLE_MS    = 120_000; // 2 минуты
const NOTIFY_MS   =   8_000; // 8 сек показ уведомления
const REFRESH_MS  =  60_000; // обновлять задачи раз в минуту

const PRIO_COLOR  = { "2": "#e63946", "1": "#f0f0f0", "0": "#888" };

export default function TVDisplay() {
  const [employees, setEmployees] = useState([]);
  const [curIdx,    setCurIdx]    = useState(0);
  const [tasks,     setTasks]     = useState([]);
  const [loadingT,  setLoadingT]  = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [clock,     setClock]     = useState("");
  const [notify,    setNotify]    = useState(null); // {name, task, dept}
  const knownTasks  = useRef(new Set());
  const cycleStart  = useRef(Date.now());
  const cycleRef    = useRef(null);
  const idxRef      = useRef(0);

  /* ── Clock ── */
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString("ru", {hour:"2-digit",minute:"2-digit",second:"2-digit"})), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Load employees ── */
  useEffect(() => {
    if (!sb) return;
    sb.from("b24_users").select("*").order("name").then(({ data }) => {
      if (data?.length) setEmployees(data);
    });
  }, []);

  /* ── Load tasks for current employee ── */
  const loadTasks = useCallback(async (empId) => {
    setLoadingT(true);
    try {
      const r = await fetch(`/api/b24/tasks-active?userId=${empId}`);
      const d = await r.json();
      setTasks(d.tasks || []);
      (d.tasks || []).forEach(t => knownTasks.current.add(t.ID));
    } catch (_) { setTasks([]); }
    setLoadingT(false);
  }, []);

  /* ── Cycle employees ── */
  const gotoEmployee = useCallback((idx, emps) => {
    const list = emps || employees;
    if (!list.length) return;
    const i = ((idx % list.length) + list.length) % list.length;
    idxRef.current = i;
    setCurIdx(i);
    cycleStart.current = Date.now();
    setProgress(0);
    loadTasks(list[i].id);
  }, [employees, loadTasks]);

  /* ── Start cycling when employees load ── */
  useEffect(() => {
    if (!employees.length) return;
    gotoEmployee(0, employees);
    if (cycleRef.current) clearInterval(cycleRef.current);
    cycleRef.current = setInterval(() => {
      gotoEmployee(idxRef.current + 1, employees);
    }, CYCLE_MS);
    return () => clearInterval(cycleRef.current);
  }, [employees]); // eslint-disable-line

  /* ── Progress bar ── */
  useEffect(() => {
    const t = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - cycleStart.current) / CYCLE_MS) * 100);
      setProgress(pct);
    }, 200);
    return () => clearInterval(t);
  }, []);

  /* ── Periodic task refresh ── */
  useEffect(() => {
    if (!employees.length) return;
    const t = setInterval(() => loadTasks(employees[idxRef.current]?.id), REFRESH_MS);
    return () => clearInterval(t);
  }, [employees, loadTasks]);

  /* ── Supabase Realtime — new task_chain ── */
  useEffect(() => {
    if (!sb || !employees.length) return;
    const sub = sb.channel("tv-tasks-live")
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"task_chains" }, payload => {
        const chain = payload.new;
        const steps = chain.steps || [];
        const firstStep = steps[0];
        if (!firstStep?.assigneeId) return;
        const emp = employees.find(e => String(e.id) === String(firstStep.assigneeId));
        if (!emp) return;
        playBeep();
        setNotify({ name: emp.name, dept: emp.dept||"", task: firstStep.title||"Новая задача" });
        setTimeout(() => setNotify(null), NOTIFY_MS);
        // Jump to that employee
        const idx = employees.findIndex(e => String(e.id) === String(firstStep.assigneeId));
        if (idx !== -1) {
          clearInterval(cycleRef.current);
          gotoEmployee(idx, employees);
          cycleRef.current = setInterval(() => {
            gotoEmployee(idxRef.current + 1, employees);
          }, CYCLE_MS);
        }
      })
      .subscribe();
    return () => sub.unsubscribe();
  }, [employees, gotoEmployee]);

  const cur  = employees[curIdx];
  const next = employees[(curIdx + 1) % Math.max(employees.length, 1)];

  return (
    <div style={{
      background:"#07070f", color:"#fff", height:"100dvh", overflow:"hidden",
      fontFamily:"'Arial Black', 'Arial', sans-serif", display:"flex", flexDirection:"column",
      userSelect:"none",
    }}>

      {/* Header */}
      <div style={{
        background:"#0e0e1a", borderBottom:"3px solid #e63946",
        padding:"10px 32px", display:"flex", alignItems:"center", justifyContent:"space-between",
        flexShrink:0,
      }}>
        <div style={{display:"flex", alignItems:"center", gap:14}}>
          <span style={{fontSize:28, fontWeight:900, color:"#e63946", letterSpacing:2}}>⚙ ТЕРMAX</span>
          <span style={{fontSize:18, color:"#444", fontWeight:400}}>· Производственный цех</span>
        </div>
        <div style={{fontSize:26, color:"#666", fontFamily:"monospace"}}>{clock}</div>
      </div>

      {/* Main content */}
      <div style={{flex:1, display:"flex", overflow:"hidden", padding:"30px 48px", gap:48}}>

        {/* Left — employee */}
        <div style={{width:340, display:"flex", flexDirection:"column", flexShrink:0}}>
          <div style={{
            width:120, height:120, borderRadius:"50%",
            background:"#e63946", display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:46, fontWeight:900, marginBottom:20, flexShrink:0,
          }}>
            {cur ? (cur.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2) : "?"}
          </div>
          <div style={{fontSize:42, fontWeight:900, lineHeight:1.1, marginBottom:8}}>
            {cur?.name || "Загрузка…"}
          </div>
          <div style={{fontSize:18, color:"#888", marginBottom:32}}>
            {cur?.dept || "Сотрудник"}
          </div>

          {/* Next employee */}
          <div style={{marginTop:"auto", borderTop:"1px solid #1e1e2e", paddingTop:16}}>
            <div style={{fontSize:12, color:"#333", letterSpacing:2, textTransform:"uppercase", marginBottom:6}}>
              Следующий
            </div>
            <div style={{fontSize:20, color:"#555"}}>{next?.name || "—"}</div>
          </div>
        </div>

        {/* Right — tasks */}
        <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>
          <div style={{
            fontSize:13, letterSpacing:3, color:"#e63946",
            textTransform:"uppercase", marginBottom:20, fontWeight:700,
          }}>
            Активные задачи {!loadingT && tasks.length > 0 && <span style={{color:"#444"}}>· {tasks.length}</span>}
          </div>

          {loadingT && (
            <div style={{fontSize:22, color:"#333"}}>Загрузка…</div>
          )}

          {!loadingT && tasks.length === 0 && (
            <div style={{fontSize:28, color:"#2a2a3a", marginTop:20}}>
              ✓ Нет активных задач
            </div>
          )}

          <div style={{flex:1, overflowY:"hidden", display:"flex", flexDirection:"column", gap:0}}>
            {tasks.slice(0, 7).map((t, i) => (
              <div key={t.ID} style={{
                display:"flex", alignItems:"flex-start", gap:20,
                padding:"14px 0", borderBottom:"1px solid #111",
                animation:"fadeIn 0.3s ease",
              }}>
                <span style={{fontSize:20, color:"#333", minWidth:32, fontFamily:"monospace"}}>
                  {i + 1}.
                </span>
                <div style={{flex:1}}>
                  <div style={{
                    fontSize:24, lineHeight:1.35,
                    color: PRIO_COLOR[t.PRIORITY] || "#f0f0f0",
                    fontWeight: t.PRIORITY === "2" ? 700 : 400,
                  }}>
                    {t.TITLE}
                    {t.PRIORITY === "2" && <span style={{marginLeft:8, fontSize:16}}>🔴</span>}
                  </div>
                  {t.DEADLINE && (
                    <div style={{fontSize:13, color:"#444", marginTop:4}}>
                      Срок: {new Date(t.DEADLINE).toLocaleDateString("ru", {day:"2-digit",month:"2-digit"})}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{height:5, background:"#111", flexShrink:0}}>
        <div style={{height:5, background:"#e63946", width:`${progress}%`, transition:"width 0.2s linear"}}/>
      </div>

      {/* New task notification overlay */}
      {notify && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(230,57,70,0.96)",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          zIndex:999, animation:"pulse 0.4s ease",
        }}>
          <div style={{fontSize:16, letterSpacing:6, color:"rgba(255,255,255,0.6)", marginBottom:20, textTransform:"uppercase"}}>
            📋 Новая задача
          </div>
          <div style={{fontSize:64, fontWeight:900, textAlign:"center", marginBottom:16}}>
            {notify.name}
          </div>
          {notify.dept && (
            <div style={{fontSize:22, color:"rgba(255,255,255,0.6)", marginBottom:24}}>{notify.dept}</div>
          )}
          <div style={{
            fontSize:32, textAlign:"center", maxWidth:"70%", lineHeight:1.4,
            background:"rgba(0,0,0,0.2)", borderRadius:12, padding:"16px 32px",
          }}>
            {notify.task}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%   { transform:scale(1.01); } 100% { transform:scale(1); } }
      `}</style>
    </div>
  );
}
