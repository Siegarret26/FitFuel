/* FitFuel — Workout planner calendar and progress tracker
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── WORKOUT PLANNER (V3.6) ─────────────────────── */
function AddActivityModal({dateKey,editing,onClose,onSave,aiWorkouts,presetType}){
  const [type,setType]=useState(editing?.type||presetType||"workout");
  const [workoutId,setWorkoutId]=useState(editing?.workoutId||"");
  const [title,setTitle]=useState(editing?.title||"");
  const [time,setTime]=useState(editing?.time||"");
  const [notes,setNotes]=useState(editing?.notes||"");
  const [distance,setDistance]=useState(editing?.distanceKm||"");
  const [recurrence,setRecurrence]=useState(editing?"none":"none");
  const [weekdays,setWeekdays]=useState([]);
  const [q,setQ]=useState("");
  const all=[...workoutsData,...aiWorkouts];
  const matches=q.trim()?all.filter(w=>w.name.toLowerCase().includes(q.toLowerCase())).slice(0,8):all.slice(0,8);
  const chosen=all.find(w=>String(w.id)===String(workoutId));
  const canSave=type==="workout"?!!workoutId:type==="run"?true:true;

  const save=()=>{
    const base={
      type, time:time||null, notes:notes.trim()||null,
      workoutId:type==="workout"?workoutId:null,
      title:type==="workout"?(chosen?.name||"Workout")
        :type==="run"?(distance?`${distance} km run`:"Run")
        :type==="rest"?"Rest day"
        :(title.trim()||PLAN_TYPES[type].label),
      distanceKm:type==="run"&&distance?+distance:null,
      durationMin:type==="workout"&&chosen?Math.round(estimateWorkoutSeconds(chosen)/60):null,
    };
    onSave(base,{recurrence,weekdays});
  };

  return(
    <div className="nt-picker" onClick={onClose} role="dialog" aria-modal="true">
      <div className="nt-picker-card" onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:17,fontWeight:800,margin:0,color:"var(--text)"}}>
            {editing?"Edit activity":"Add to"} {new Date(dateKey+"T00:00:00").toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}
          </h3>
          <button className="nt-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={{overflowY:"auto",display:"flex",flexDirection:"column",gap:16}}>
          <div className="pl-type-grid">
            {Object.entries(PLAN_TYPES).map(([k,v])=>(
              <button key={k} className={"pl-type"+(type===k?" on":"")} onClick={()=>setType(k)}>
                <i>{v.icon}</i><span>{v.label}</span>
              </button>
            ))}
          </div>

          {type==="workout"&&(
            <div className="pl-field">
              <label>Choose a workout</label>
              <input className="search-input" style={{padding:"10px 13px",marginBottom:8}}
                placeholder="Search your library…" value={q} onChange={e=>setQ(e.target.value)}/>
              <div style={{maxHeight:190,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
                {matches.map(w=>(
                  <button key={w.id} className={"nt-pick"+(String(workoutId)===String(w.id)?" on":"")}
                    style={String(workoutId)===String(w.id)?{background:"var(--accent-tint-1)",borderColor:"var(--accent)"}:undefined}
                    onClick={()=>setWorkoutId(w.id)}>
                    <span style={{fontSize:18}}>{w.emoji||"🏋️"}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13.5,fontWeight:700,color:"var(--text)"}}>{w.name}</div>
                      <div style={{fontSize:11,color:"var(--text-light)"}}>{w.diff} · ~{Math.round(estimateWorkoutSeconds(w)/60)} min</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {type==="run"&&(
            <div className="pl-field">
              <label>Target distance (optional)</label>
              <input className="search-input" style={{padding:"10px 13px"}} type="number" placeholder="e.g. 5"
                value={distance} onChange={e=>setDistance(e.target.value)}/>
            </div>
          )}

          {(type==="other"||type==="recovery")&&(
            <div className="pl-field">
              <label>What are you planning?</label>
              <input className="search-input" style={{padding:"10px 13px"}} placeholder="e.g. Swimming, stretching"
                value={title} onChange={e=>setTitle(e.target.value)}/>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>
            <div className="pl-field">
              <label>Start time (optional)</label>
              <input className="search-input" style={{padding:"10px 13px"}} type="time"
                value={time||""} onChange={e=>setTime(e.target.value)}/>
            </div>
            {!editing&&(
              <div className="pl-field">
                <label>Repeat</label>
                <select className="search-input" style={{padding:"10px 13px",cursor:"pointer"}}
                  value={recurrence} onChange={e=>setRecurrence(e.target.value)}>
                  <option value="none">Just this day</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Weekly</option>
                  <option value="weekdays">Selected weekdays</option>
                </select>
              </div>
            )}
          </div>

          {recurrence==="weekdays"&&!editing&&(
            <div className="pl-field">
              <label>Which days?</label>
              <div className="pl-wk">
                {["M","T","W","T","F","S","S"].map((d,i)=>(
                  <button key={i} className={weekdays.includes(i)?"on":""}
                    onClick={()=>setWeekdays(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i])}>{d}</button>
                ))}
              </div>
            </div>
          )}

          <div className="pl-field">
            <label>Notes (optional)</label>
            <textarea className="search-input" style={{padding:"10px 13px",minHeight:64,resize:"vertical",fontFamily:"inherit"}}
              placeholder="e.g. Try to increase weight slightly this week."
              value={notes} onChange={e=>setNotes(e.target.value)}/>
          </div>

          <button className="btn-primary" onClick={save} disabled={!canSave}
            style={{padding:13,fontSize:14,opacity:canSave?1:.5}}>
            {editing?"Save changes":"Schedule it"}
          </button>
          {recurrence!=="none"&&!editing&&(
            <p style={{fontSize:12,color:"var(--text-light)",margin:0,textAlign:"center"}}>
              Creates entries for the next 12 weeks. Each one can be edited or deleted on its own.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkoutPlanner({planned,onSave,onUpdate,onDelete,aiWorkouts=[],onStartWorkout,setPage}){
  const today=ymd(new Date());
  const [cursor,setCursor]=useState(()=>{ const d=new Date(); return {y:d.getFullYear(),m:d.getMonth()}; });
  const [selected,setSelected]=useState(today);
  const [modal,setModal]=useState(null);
  const [confirmDel,setConfirmDel]=useState(null);
  const [view,setView]=useState("month");
  const [dragId,setDragId]=useState(null);
  const [dropKey,setDropKey]=useState(null);
  const [dayModal,setDayModal]=useState(null);

  const grid=useMemo(()=>buildMonthGrid(cursor.y,cursor.m),[cursor]);
  const byDate=useMemo(()=>{
    const m={};
    planned.forEach(a=>{ (m[a.date]=m[a.date]||[]).push(a); });
    Object.values(m).forEach(list=>list.sort((a,b)=>(a.time||"99").localeCompare(b.time||"99")));
    return m;
  },[planned]);
  const monthLabel=new Date(cursor.y,cursor.m,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});
  const inMonth=a=>{ const d=new Date(a.date+"T00:00:00"); return d.getFullYear()===cursor.y&&d.getMonth()===cursor.m; };
  const summary=useMemo(()=>summarisePlan(planned,inMonth),[planned,cursor]);
  // Week containing the selected day, Monday-first
  const weekKeys=useMemo(()=>{
    const d=new Date(selected+"T00:00:00");
    const start=new Date(d); start.setDate(d.getDate()-((d.getDay()+6)%7));
    return Array.from({length:7},(_,i)=>{ const x=new Date(start); x.setDate(start.getDate()+i); return ymd(x); });
  },[selected]);
  const weekSummary=useMemo(()=>summarisePlan(planned,a=>weekKeys.includes(a.date)),[planned,weekKeys]);

  const shift=n=>setCursor(c=>{ const d=new Date(c.y,c.m+n,1); return {y:d.getFullYear(),m:d.getMonth()}; });
  const goToday=()=>{ const d=new Date(); setCursor({y:d.getFullYear(),m:d.getMonth()}); setSelected(today); };
  const dayActs=byDate[selected]||[];

  const handleSave=(base,rec)=>{
    if(modal?.editing){ onUpdate({...modal.editing,...base,updatedAt:new Date().toISOString()}); }
    else{
      const dates=expandRecurrence({baseDate:modal.dateKey,recurrence:rec.recurrence,weekdays:rec.weekdays});
      const stamp=new Date().toISOString();
      dates.forEach((d,i)=>onSave({
        id:"pa_"+Date.now()+"_"+i, date:d, status:"planned",
        recurrence:rec.recurrence==="none"?null:rec.recurrence,
        createdAt:stamp, updatedAt:stamp, ...base,
      }));
    }
    setModal(null);
  };
  const reschedule=(act,newDate)=>onUpdate({...act,date:newDate,status:"planned",updatedAt:new Date().toISOString()});

  return(
    <div className="card mb-24 fade-up" style={{padding:24}}>
      {modal&&<AddActivityModal dateKey={modal.dateKey} editing={modal.editing} presetType={modal.presetType}
        aiWorkouts={aiWorkouts} onClose={()=>setModal(null)} onSave={handleSave}/>}
      {dayModal&&!modal&&<DayDetailModal dateKey={dayModal} acts={byDate[dayModal]||[]} today={today}
        allWorkouts={[...workoutsData,...aiWorkouts]}
        onClose={()=>setDayModal(null)}
        onQuickAdd={kind=>{ if(kind==="summary"){ setDayModal(null); return; } setModal({dateKey:dayModal,presetType:kind}); }}
        onAdd={()=>{ setModal({dateKey:dayModal}); }}
        onEdit={a=>{ setModal({dateKey:a.date,editing:a}); }}
        onStartWorkout={id=>{ setDayModal(null); onStartWorkout&&onStartWorkout(id); }}
        onStartRun={()=>{ setDayModal(null); setPage&&setPage("Activity"); }}
        onUpdate={onUpdate} onDelete={onDelete} onReschedule={reschedule}/>}

      <div className="pl-head">
        <div>
          <h3 className="ff-heading" style={{fontSize:16,color:"var(--text)",marginBottom:4}}>Workout Planner</h3>
          <div className="pl-month">{monthLabel}</div>
        </div>
        <div className="pl-nav">
          <Seg options={[{v:"month",l:"Month"},{v:"week",l:"Week"}]} value={view} onChange={setView}/>
          <button onClick={()=>shift(-1)} aria-label="Previous month">←</button>
          <button onClick={goToday}>Today</button>
          <button onClick={()=>shift(1)} aria-label="Next month">→</button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="pl-summary" style={{marginBottom:18}}>
        <div className="pl-sum-item"><b>{summary.total}</b><span>Planned</span></div>
        <div className="pl-sum-item"><b>{summary.completed}</b><span>Completed</span></div>
        <div className="pl-sum-item"><b>{summary.missed}</b><span>Missed</span></div>
        <div className="pl-sum-item"><b>{summary.rest}</b><span>Rest days</span></div>
        <div className="pl-sum-item"><b>{summary.rate}%</b><span>Completion</span></div>
      </div>

      {view==="month"?(
        <>
          <div className="pl-dow">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d,i)=><span key={i}>{d}</span>)}</div>
          <div className="pl-grid">
            {grid.map(cell=>{
              const acts=byDate[cell.key]||[];
              return(
                <button key={cell.key}
                  className={"pl-cell"+(cell.inMonth?"":" dim")+(cell.key===today?" today":"")+(cell.key===selected?" sel":"")+(dropKey===cell.key?" drop":"")}
                  onClick={()=>{ setSelected(cell.key); setDayModal(cell.key); }}
                  onDragOver={e=>{ if(dragId){ e.preventDefault(); setDropKey(cell.key); } }}
                  onDragLeave={()=>setDropKey(k=>k===cell.key?null:k)}
                  onDrop={e=>{
                    e.preventDefault();
                    const act=planned.find(a=>a.id===dragId);
                    if(act&&act.date!==cell.key) reschedule(act,cell.key);
                    setDragId(null); setDropKey(null);
                  }}>
                  <span className="pl-daynum">{new Date(cell.key+"T00:00:00").getDate()}</span>
                  {acts.slice(0,2).map(a=>{
                    const st=derivedStatus(a);
                    return(
                      <span key={a.id} className={"pl-chip "+st} draggable
                        onDragStart={()=>setDragId(a.id)} onDragEnd={()=>{setDragId(null);setDropKey(null);}}
                        title={a.title}>
                        {st==="completed"?"✅":PLAN_TYPES[a.type].icon} {a.title}
                      </span>
                    );
                  })}
                  {acts.length>2&&<span className="pl-more">+{acts.length-2} more</span>}
                </button>
              );
            })}
          </div>
        </>
      ):(
        <>
          <div className="pl-summary" style={{marginBottom:14}}>
            <div className="pl-sum-item"><b>{weekSummary.total}</b><span>This week</span></div>
            <div className="pl-sum-item"><b>{weekSummary.completed}</b><span>Done</span></div>
            <div className="pl-sum-item"><b>{weekSummary.runs}</b><span>Runs</span></div>
            <div className="pl-sum-item"><b>{weekSummary.rest}</b><span>Rest</span></div>
            <div className="pl-sum-item"><b>{weekSummary.rate}%</b><span>Rate</span></div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {weekKeys.map(k=>{
              const acts=byDate[k]||[];
              const d=new Date(k+"T00:00:00");
              return(
                <button key={k} onClick={()=>{ setSelected(k); setDayModal(k); }}
                  style={{display:"flex",gap:12,alignItems:"center",padding:"11px 14px",borderRadius:13,
                    background:k===selected?"var(--accent-tint-1)":"var(--bg3)",cursor:"pointer",textAlign:"left",
                    border:"1px solid "+(k===today?"var(--accent)":"var(--border)"),fontFamily:"inherit"}}>
                  <div style={{minWidth:52}}>
                    <div style={{fontSize:11,color:"var(--text-light)",fontWeight:700,textTransform:"uppercase"}}>{d.toLocaleDateString(undefined,{weekday:"short"})}</div>
                    <div style={{fontSize:16,fontWeight:800,color:"var(--text)"}}>{d.getDate()}</div>
                  </div>
                  <div style={{flex:1,display:"flex",gap:6,flexWrap:"wrap"}}>
                    {acts.length===0
                      ? <span style={{fontSize:12.5,color:"var(--text-light)"}}>Nothing planned</span>
                      : acts.map(a=><span key={a.id} className={"pl-chip "+derivedStatus(a)}>
                          {derivedStatus(a)==="completed"?"✅":PLAN_TYPES[a.type].icon} {a.title}
                        </span>)}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* DAY DETAIL */}
      <div className="pl-day-panel">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:10}}>
          <h4 style={{fontSize:14.5,fontWeight:800,color:"var(--text)",margin:0}}>
            {new Date(selected+"T00:00:00").toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}
            {selected===today&&<span style={{color:"var(--accent)",fontSize:12,marginLeft:8}}>Today</span>}
          </h4>
          <button className="btn-primary" style={{padding:"7px 16px",fontSize:12.5}}
            onClick={()=>setModal({dateKey:selected})}>+ Add activity</button>
        </div>

        {dayActs.length===0
          ? <p style={{fontSize:13,color:"var(--text-light)",margin:0}}>Nothing planned. Add a workout, run, or rest day.</p>
          : dayActs.map(a=>{
              const st=derivedStatus(a);
              return(
                <div className="pl-act" key={a.id}>
                  <span className="pl-act-ico">{st==="completed"?"✅":PLAN_TYPES[a.type].icon}</span>
                  <div className="pl-act-body">
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span className="pl-act-title">{a.title}</span>
                      <span className={"pl-status "+st}>{st}</span>
                    </div>
                    <div className="pl-act-meta">
                      {[a.time&&`at ${a.time}`,a.durationMin&&`~${a.durationMin} min`,a.distanceKm&&`${a.distanceKm} km`,a.recurrence&&`repeats ${a.recurrence}`].filter(Boolean).join(" · ")||PLAN_TYPES[a.type].label}
                    </div>
                    {a.notes&&<div className="pl-act-note">"{a.notes}"</div>}
                    <div className="pl-act-btns">
                      {a.type==="workout"&&st!=="completed"&&a.workoutId&&(
                        <button className="go" onClick={()=>onStartWorkout&&onStartWorkout(a.workoutId)}>▶ Start workout</button>
                      )}
                      {a.type==="run"&&st!=="completed"&&(
                        <button className="go" onClick={()=>setPage&&setPage("Activity")}>▶ Start run</button>
                      )}
                      {st!=="completed"&&<button onClick={()=>onUpdate({...a,status:"completed",completedAt:new Date().toISOString()})}>Mark done</button>}
                      <button onClick={()=>setModal({dateKey:a.date,editing:a})}>Edit</button>
                      {st==="missed"&&<button onClick={()=>reschedule(a,today)}>Move to today</button>}
                      {st!=="cancelled"&&st!=="completed"&&<button onClick={()=>onUpdate({...a,status:"cancelled"})}>Cancel</button>}
                      <button onClick={()=>setConfirmDel(a)}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}

        {confirmDel&&(
          <div style={{marginTop:14,padding:"13px 15px",borderRadius:13,background:"var(--accent-tint-1)",border:"1px solid color-mix(in srgb, var(--accent) 34%, transparent)"}}>
            <p style={{fontSize:13.5,color:"var(--text)",margin:"0 0 10px"}}>Delete "{confirmDel.title}" from this day?</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn-secondary" style={{padding:"7px 14px",fontSize:12.5}} onClick={()=>setConfirmDel(null)}>Cancel</button>
              <button className="btn-primary" style={{padding:"7px 14px",fontSize:12.5}} onClick={()=>{onDelete(confirmDel.id);setConfirmDel(null);}}>Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── PROGRESS PAGE ─────────────────────────────── */
function ProgressPage({tracker,onUpdateTracker,workoutSessions=[],onDeleteSession,onClearHistory,plannedActivities=[],onSavePlanned,onUpdatePlanned,onDeletePlanned,aiWorkouts=[],onStartWorkout,setPage}){
  const [confirmClear,setConfirmClear]=useState(false);
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const {done,water,sleep,mood,wkCt}=tracker;
  const setDone=fn=>onUpdateTracker({done:fn(done)});
  const setWater=v=>onUpdateTracker({water:v});
  const setSleep=v=>onUpdateTracker({sleep:v});
  const setMood=v=>onUpdateTracker({mood:v});
  const setWkCt=v=>onUpdateTracker({wkCt:v});
  const streak=done.filter(Boolean).length;
  const moods=["😞","😕","😐","🙂","😄"];
  const moodLabels=["Not great","Could be better","Neutral","Pretty good","Amazing!"];
  const achievements=[
    {icon:"🏆",color:"rgba(234,179,8,0.2)",iconBg:"#EAB308",label:"Streak Starter",desc:streak>=1?"Completed at least 1 day!":"Log your first workout day",earned:streak>=1},
    {icon:"🔥",color:"var(--accent-tint-2)",iconBg:"var(--accent)",label:"3-Day Momentum",desc:streak>=3?"3 days strong!":"Train 3 days this week",earned:streak>=3},
    {icon:"💧",color:"rgba(77,163,255,0.15)",iconBg:"var(--blue)",label:"Hydration Hero",desc:water>=6?"Drinking well!":"Reach 6 glasses of water",earned:water>=6},
    {icon:"😴",color:"rgba(155,92,255,0.15)",iconBg:"var(--purple)",label:"Rest & Recover",desc:sleep>=7?"Great sleep!":"Sleep at least 7 hrs",earned:sleep>=7},
  ];
  return(
    <div className="page-wrap">
      <div className="page-header fade-up">
        <h1 className="page-title">Progress Tracker</h1>
        <p className="page-sub">Keep the streak alive — every day counts.</p>
      </div>

      <WorkoutPlanner planned={plannedActivities} onSave={onSavePlanned} onUpdate={onUpdatePlanned}
        onDelete={onDeletePlanned} aiWorkouts={aiWorkouts} onStartWorkout={onStartWorkout} setPage={setPage}/>

      {/* WORKOUT HISTORY — every completed session, most recent first */}
      <div className="card mb-24 fade-up" style={{padding:26}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",flexWrap:"wrap",gap:10,marginBottom:18}}>
          <h3 className="ff-heading" style={{fontSize:16,color:"var(--text)"}}>Workout History</h3>
          {workoutSessions.length>0&&(
            <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <span style={{fontSize:12,color:"var(--text-mid)"}}>
                {workoutSessions.length} session{workoutSessions.length===1?"":"s"} ·{" "}
                {workoutSessions.reduce((t,s)=>t+(s.calories||0),0).toLocaleString()} kcal total
              </span>
              <button className="nt-x" style={{fontSize:12,fontWeight:700,padding:"4px 10px",borderRadius:8}}
                onClick={()=>setConfirmClear(true)}>Clear all</button>
            </div>
          )}
        </div>
        {confirmClear&&(
          <div style={{padding:"14px 16px",borderRadius:14,background:"var(--accent-tint-1)",border:"1px solid color-mix(in srgb, var(--accent) 34%, transparent)",marginBottom:16}}>
            <p style={{fontSize:13.5,color:"var(--text)",margin:"0 0 12px",lineHeight:1.55}}>
              Delete all {workoutSessions.length} workout sessions? This can't be undone, and your streak and weekly counts won't be recalculated.
            </p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn-secondary" style={{padding:"8px 16px",fontSize:12.5}} onClick={()=>setConfirmClear(false)}>Cancel</button>
              <button className="btn-primary" style={{padding:"8px 16px",fontSize:12.5}} onClick={()=>{onClearHistory&&onClearHistory();setConfirmClear(false);}}>Delete everything</button>
            </div>
          </div>
        )}
        {workoutSessions.length===0
          ? <p style={{fontSize:13.5,color:"var(--text-mid)",margin:0,lineHeight:1.6}}>
              No workouts logged yet. Finish one from the Workouts page and it'll show up here with your time, calories, and records.
            </p>
          : <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {workoutSessions.slice(0,12).map(s=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 15px",borderRadius:14,background:"var(--bg3)",flexWrap:"wrap"}}>
                  <div style={{fontSize:20}}>{s.completed?"✅":"⏸"}</div>
                  <div style={{flex:1,minWidth:150}}>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{s.name}</div>
                    <div style={{fontSize:11.5,color:"var(--text-light)",marginTop:2}}>
                      {new Date(s.date).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})}
                      {" · "}{s.diff}
                      {!s.completed&&` · ${s.completionPct}% done`}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:14,fontWeight:800,color:"var(--text)"}}>{fmtClock(s.durationSec)}</div>
                      <div style={{fontSize:10.5,color:"var(--text-light)",letterSpacing:"0.05em",textTransform:"uppercase"}}>Time</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:14,fontWeight:800,color:"var(--text)"}}>{s.calories}</div>
                      <div style={{fontSize:10.5,color:"var(--text-light)",letterSpacing:"0.05em",textTransform:"uppercase"}}>kcal</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:14,fontWeight:800,color:"var(--text)"}}>{s.exercisesCompleted}/{s.totalExercises}</div>
                      <div style={{fontSize:10.5,color:"var(--text-light)",letterSpacing:"0.05em",textTransform:"uppercase"}}>Done</div>
                    </div>
                    <button className="nt-x" onClick={()=>onDeleteSession&&onDeleteSession(s.id)}
                      aria-label={`Delete ${s.name} session`} title="Delete this session">✕</button>
                  </div>
                </div>
              ))}
              {workoutSessions.length>12&&(
                <p style={{fontSize:12,color:"var(--text-light)",textAlign:"center",margin:"4px 0 0"}}>
                  Showing your 12 most recent of {workoutSessions.length}.
                </p>
              )}
            </div>
        }
      </div>

      <div className="grid-3 mb-24">
        {/* STREAK CARD */}
        <div className="streak-card fade-up">
          <div className="streak-bg-glow"/>
          <div style={{fontSize:11,fontWeight:700,color:"var(--streak-label)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Current Streak</div>
          <div className="streak-num">{streak}</div>
          <div style={{fontSize:15,color:"var(--streak-text)",marginBottom:12}}>days in a row</div>
          <div style={{fontSize:13,color:"var(--streak-sub)",lineHeight:1.6}}>
            {streak>=5?"You're on fire! Keep going 💪":streak>=3?"Great momentum — don't stop!":"Build the habit, one day at a time."}
          </div>
        </div>

        {/* WEEKLY DAYS */}
        <div className="card fade-up-2" style={{padding:26}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16}}>This Week — tap to toggle</div>
          <div className="week-day-grid">
            {days.map((d,i)=>(
              <div key={d} className={"week-day"+(done[i]?" done":"")} onClick={()=>setDone(prev=>{const n=[...prev];n[i]=!n[i];return n;})}>
                <div className="week-day-check">{done[i]?"✓":""}</div>
                <div className="week-day-label">{d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="card fade-up-3" style={{padding:26}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16}}>Quick Stats</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[{icon:"💪",label:"Workouts",val:wkCt,col:"var(--accent)"},{icon:"🔥",label:"Days Active",val:streak,col:"#FF6B35"},{icon:"🥗",label:"Meals",val:14,col:"#38D978"},{label:"Water",val:water,col:"var(--blue)"}].map(s=>(
              <div key={s.label} className="stat-card">
                <div className="stat-card-icon">{s.icon}</div>
                <div className="stat-card-val" style={{color:s.col}}>{s.val}</div>
                <div className="stat-card-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2 mb-24">
        {/* DAILY HABITS */}
        <div className="card" style={{padding:28}}>
          <h3 className="ff-heading mb-24" style={{fontSize:18,color:"var(--text)"}}>Daily Habits</h3>
          {[
            {label:"💧 Water",val:water,set:setWater,max:8,col:"var(--blue)"},
            {label:"😴 Sleep",val:sleep,set:setSleep,max:9,col:"var(--purple)"},
            {label:"💪 Workouts",val:wkCt,set:setWkCt,max:5,col:"var(--accent)"},
          ].map(h=>(
            <div key={h.label} className="habit-row">
              <div className="habit-row-head">
                <span className="habit-label">{h.label} — {h.val}/{h.max}</span>
                <span className="habit-pct" style={{color:h.col}}>{Math.round((h.val/h.max)*100)}%</span>
              </div>
              <ProgressBar val={h.val} max={h.max} col={h.col}/>
              <input type="range" min={0} max={h.max} value={h.val} onChange={e=>h.set(Number(e.target.value))} style={{width:"100%",accentColor:h.col,marginTop:10}} aria-label={`Adjust ${h.label}`}/>
            </div>
          ))}
        </div>

        {/* MOOD CHECK-IN */}
        <div className="card" style={{padding:28}}>
          <h3 className="ff-heading mb-24" style={{fontSize:18,color:"var(--text)"}}>Today's Check-In</h3>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:14,color:"var(--text-mid)",marginBottom:14,fontWeight:500}}>How are you feeling today?</div>
            <div style={{display:"flex",gap:8}}>
              {moods.map((m,i)=>(
                <button key={i} className={"mood-btn"+(mood===i?" active":"")} onClick={()=>setMood(i)}>{m}</button>
              ))}
            </div>
            <div style={{textAlign:"center",marginTop:12,fontSize:14,fontWeight:600,color:"var(--text-mid)"}}>{moodLabels[mood]}</div>
          </div>
          <div style={{background:"var(--bg3)",borderRadius:16,padding:20,textAlign:"center",border:"1px solid var(--border)"}}>
            <div style={{fontSize:36,marginBottom:10}}>{streak>=5?"🏆":streak>=3?"⭐":"💫"}</div>
            <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:6}}>{streak>=5?"Consistency Champion!":streak>=3?"Building Momentum!":"Every day is a win!"}</div>
            <div style={{fontSize:13,color:"var(--text-mid)"}}>{streak>=5?`${streak} days — unstoppable!`:streak>=3?"Keep showing up!":"Start your streak today!"}</div>
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS */}
      <h3 className="ff-heading mb-16" style={{fontSize:20,color:"var(--text)"}}>Achievements</h3>
      <div className="grid-2">
        {achievements.map(a=>(
          <div key={a.label} className="achievement-card" style={{opacity:a.earned?1:0.45}}>
            <div className="achievement-icon" style={{background:a.color,border:`1px solid ${a.color}`}}>
              <span style={{filter:a.earned?"none":"grayscale(1)"}}>{a.icon}</span>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,color:a.earned?"var(--text)":"var(--text-mid)",marginBottom:3}}>{a.label}</div>
              <div style={{fontSize:12,color:"var(--text-mid)"}}>{a.desc}</div>
            </div>
            {a.earned&&<div style={{fontSize:12,fontWeight:700,color:"#38D978",background:"rgba(56,217,120,0.12)",padding:"4px 12px",borderRadius:20,whiteSpace:"nowrap"}}>✓ Earned</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
