/* FitFuel — Logo, form controls and navigation
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── LOGO ─────────────────────────────────────────── */
function FitFuelLogoMark({size=24, height}){
  /* size = width in px; the mark is a wide monogram, not a square */
  const h = height || Math.round(size/2.703);
  return <span className="ff-mark" style={{width:size, height:h}} role="img" aria-label="FitFuel"/>;
}

/* ─── COMPONENTS ─────────────────────────────────── */
function Toggle({checked,onChange}){
  return <label className="toggle"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span className="toggle-slider"/></label>;
}
function Seg({options,value,onChange}){
  return <div className="seg">{options.map(o=><button key={o.v} className={value===o.v?"act":""} onClick={()=>onChange(o.v)}>{o.l}</button>)}</div>;
}
function FilterBar({options,value,onChange}){
  return <div className="filter-bar">{options.map(o=><button key={o} className={"filter-chip"+(value===o?" active":"")} onClick={()=>onChange(o)}>{o}</button>)}</div>;
}
function ProgressBar({val,max,col}){
  const pct = Math.min(100, Math.round((val/max)*100));
  return <div className="progress-track"><div className="progress-fill" style={{width:`${pct}%`, background:col||"var(--accent)"}}/></div>;
}

/* ─── NAV ───────────────────────────────────────── */
function Nav({page,setPage,user,onLogout}){
  const pages=["Home","Workouts","Activity","Coach","Meals","Nutrition","Progress","Profile","Settings"];
  const icons={Home:"🏠",Workouts:"💪",Activity:"🏃",Coach:"🤖",Meals:"🥗",Nutrition:"🍎",Progress:"📊",Profile:"👤",Settings:"⚙️"};
  return(
    <>
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={()=>setPage("Home")} role="button" aria-label="Go to Home">
            <div className="nav-logomark"><FitFuelLogoMark size={70}/></div>
            <span className="nav-wordmark">FitFuel</span>
          </div>
          <div className="nav-links">
            {pages.map(p=>(
              <button key={p} onClick={()=>setPage(p)} className={"nav-link"+(page===p?" active":"")}>
                <span>{icons[p]}</span>{p}
              </button>
            ))}
          </div>
          <div className="nav-right">
            {user&&<>
              <div className="nav-avatar" onClick={()=>setPage("Profile")} role="button" aria-label="My Profile">{user.avatar}</div>
              <button className="nav-logout" onClick={onLogout}>Log out</button>
            </>}
          </div>
        </div>
      </nav>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <div className="mobile-nav-inner">
          {pages.map(p=>(
            <button key={p} className={"mobile-nav-btn"+(page===p?" active":"")} onClick={()=>setPage(p)}>
              <span className="mnav-icon">{icons[p]}</span>
              {p}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

function WorkoutCompleteScreen({session,prs,achievements,onClose,onHome,onProgress,onAnother}){
  const reduce=typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const confetti=useMemo(()=>{
    if(reduce) return [];
    const colors=["#FF3B3B","#38D978","#FFC53B","#4B9EFF","#FFFFFF"];
    return Array.from({length:44},(_,i)=>({
      left:Math.random()*100,
      delay:Math.random()*1.4,
      dur:2.4+Math.random()*1.8,
      color:colors[i%colors.length],
      w:5+Math.random()*5,
    }));
  },[reduce]);
  const mins=Math.floor(session.durationSec/60), secs=session.durationSec%60;
  const timeText=mins>0?`${mins} minute${mins===1?"":"s"} and ${secs} second${secs===1?"":"s"}`:`${secs} seconds`;
  return(
    <div className="wc-overlay" role="dialog" aria-modal="true" aria-label="Workout complete" onClick={onClose}>
      <div className="wc-card" onClick={e=>e.stopPropagation()}>
        <div className="wc-confetti" aria-hidden="true">
          {confetti.map((c,i)=>(
            <i key={i} style={{left:`${c.left}%`,width:c.w,background:c.color,
              animationDelay:`${c.delay}s`,animationDuration:`${c.dur}s`}}/>
          ))}
        </div>
        <span className="wc-emoji">{session.completed?"🎉":"💪"}</span>
        <h2 className="wc-title">{session.completed?"Workout complete!":"Session saved"}</h2>
        <p className="wc-lede">
          {session.completed
            ? <>You finished {session.name} in {timeText}. Keep up the consistency!</>
            : <>You did {session.exercisesCompleted} of {session.totalExercises} exercises in {timeText}. Every bit counts.</>}
        </p>

        <div className="wc-stats">
          <div className="wc-stat"><b>{fmtClock(session.durationSec)}</b><span>Total time</span></div>
          <div className="wc-stat"><b>{session.exercisesCompleted}/{session.totalExercises}</b><span>Exercises</span></div>
          <div className="wc-stat"><b>{session.completionPct}%</b><span>Completed</span></div>
          <div className="wc-stat"><b>{session.calories}</b><span>Calories burned</span></div>
        </div>

        <div className="wc-meta">
          <span>{new Date(session.date).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})}</span>
          <span>{session.diff}</span>
          {(session.muscles||[]).slice(0,3).map(m=><span key={m}>{m}</span>)}
        </div>

        {prs.length>0&&<>
          <p className="wc-section-label">New personal best</p>
          {prs.map((pr,i)=><div className="wc-pr" key={i}><span className="wc-pr-icon">{pr.icon}</span><b>{pr.label}</b></div>)}
        </>}

        {achievements.length>0&&<>
          <p className="wc-section-label" style={{marginTop:16}}>Achievements</p>
          <div className="wc-meta">
            {achievements.map((a,i)=><span key={i}>{a.icon} {a.label}</span>)}
          </div>
        </>}

        <div className="wc-btns">
          <button className="btn-primary" onClick={onAnother}>Start another workout</button>
          <button className="btn-secondary" onClick={onProgress}>View progress</button>
          <button className="btn-secondary" onClick={onHome}>Return home</button>
        </div>
      </div>
    </div>
  );
}
function fmtClock(s){
  const m=Math.floor(s/60), sec=Math.floor(s%60);
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}
