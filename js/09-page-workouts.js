/* FitFuel — Workout library and guided sessions
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── WORKOUTS PAGE ──────────────────────────────── */
function WorkoutsPage({aiWorkouts=[],settings={},favoriteWorkouts=[],onToggleFavoriteWorkout,pendingWorkoutStart,onConsumePendingWorkoutStart,workoutSessions=[],onSaveWorkoutSession,setPage}){
  const cats=["All","Favorites","No Equipment","Dumbbells","Yoga Mat","Pull-up Bar","Barbell","Strength","Cardio","Bodyweight","Core","Flexibility","Mobility","Recovery","Fat Loss","Muscle Gain","Endurance","Beginner","Intermediate","Advanced"];
  /* Equipment chips map onto the equipment arrays already on each workout. */
  const EQUIP_FILTERS={
    "No Equipment":w=>!w.equipment||w.equipment.length===0||w.equipment.every(e=>e==="None"),
    "Dumbbells":w=>(w.equipment||[]).includes("Dumbbells"),
    "Yoga Mat":w=>(w.equipment||[]).includes("Yoga Mat"),
    "Pull-up Bar":w=>(w.equipment||[]).includes("Pull-up Bar"),
    "Barbell":w=>(w.equipment||[]).includes("Barbell"),
  };
  const [cat,setCat]=useState("All");
  const [search,setSearch]=useState("");
  const [aiFilterIds,setAiFilterIds]=useState(null);
  const [aiSearchLoading,setAiSearchLoading]=useState(false);
  const [aiSearchError,setAiSearchError]=useState("");
  const [active,setActive]=useState(null);
  const [elapsed,setElapsed]=useState(0);
  const [running,setRunning]=useState(false);
  const [doneSteps,setDoneSteps]=useState([]);
  const [rest,setRest]=useState(null);
  const [restPaused,setRestPaused]=useState(false);
  const [finishedSession,setFinishedSession]=useState(null);
  const [confirmFinish,setConfirmFinish]=useState(false);
  const [detailWorkout,setDetailWorkout]=useState(null);
  const intv=useRef(null);
  const bannerRef=useRef(null);
  const [sessionTick,setSessionTick]=useState(0);
  const allWorkouts=[...workoutsData,...aiWorkouts];
  const filtered=allWorkouts.filter(w=>
    (cat==="All"
      ? true
      : cat==="Favorites" ? favoriteWorkouts.includes(w.id)
      : EQUIP_FILTERS[cat] ? EQUIP_FILTERS[cat](w)
      : (w.cat===cat||w.diff===cat))&&(
    aiFilterIds
      ? aiFilterIds.map(String).includes(String(w.id))
      : (w.name.toLowerCase().includes(search.toLowerCase())||w.desc.toLowerCase().includes(search.toLowerCase()))
  ));
  const runSmartSearch=async()=>{
    if(!search.trim()){ setAiFilterIds(null); return; }
    if(!settings.aiApiKey){ setAiSearchError("Add a Gemini API key in Settings → AI Coach to use AI search."); return; }
    setAiSearchLoading(true); setAiSearchError("");
    try{
      const catalog=allWorkouts.map(w=>({id:w.id,name:w.name,cat:w.cat,diff:w.diff,duration:w.duration,equipment:w.equipment,muscles:w.muscles,calories:w.calories}));
      const sys=`You help filter a workout catalog by user intent. Respond with strict JSON only: {"ids":[...matching id values from the catalog...]}. Only include ids that exist in the given catalog. Return an empty array if nothing matches well.`;
      const data=await completeGeminiJSON({apiKey:settings.aiApiKey,model:settings.aiModel,messages:[
        {role:"system",content:sys},
        {role:"user",content:`Catalog: ${JSON.stringify(catalog)}\n\nQuery: "${search}"`},
      ]});
      setAiFilterIds(Array.isArray(data.ids)?data.ids:[]);
    }catch(err){ setAiSearchError(err.message||"AI search failed."); }
    finally{ setAiSearchLoading(false); }
  };
  /* Keeps the in-progress session on disk so a refresh, accidental back-navigation,
     or the browser reclaiming the tab mid-workout doesn't throw the session away. */
  useEffect(()=>{
    if(!active||finishedSession){ localStorage.removeItem("ff_active_session"); return; }
    saveLS("ff_active_session",{workoutId:active.id,elapsed,doneSteps,running,startedAt:Date.now()});
  },[active,elapsed,doneSteps,running,finishedSession]);
  /* Restore on mount. Elapsed is rebuilt from the wall clock so time spent away
     from the page still counts, which is what the person actually experienced. */
  useEffect(()=>{
    const saved=loadLS("ff_active_session",null);
    if(!saved||!saved.workoutId) return;
    const w=[...workoutsData,...aiWorkouts].find(x=>String(x.id)===String(saved.workoutId));
    if(!w){ localStorage.removeItem("ff_active_session"); return; }
    const away=saved.running&&saved.startedAt?Math.floor((Date.now()-saved.startedAt)/1000):0;
    setActive(w);
    setElapsed((saved.elapsed||0)+Math.min(away,60*60));
    setDoneSteps(saved.doneSteps||[]);
    setRunning(!!saved.running);
    // eslint-disable-next-line
  },[]);

  /* V3.4 — the timer now counts elapsed time up rather than a fixed duration down,
     because the session's real length is what gets saved and compared for records. */
  useEffect(()=>{
    if(running&&!finishedSession){ intv.current=setInterval(()=>setElapsed(t=>t+1),1000); }
    else clearInterval(intv.current);
    return()=>clearInterval(intv.current);
  },[running,finishedSession]);
  /* Rest countdown runs independently of the main clock and auto-advances. */
  useEffect(()=>{
    if(rest==null||restPaused||!running) return;
    if(rest<=0){ setRest(null); return; }
    const id=setInterval(()=>setRest(r=>(r==null?null:r-1)),1000);
    return()=>clearInterval(id);
  },[rest,restPaused,running]);
  const fmt=fmtClock;
  const startW=w=>{
    setActive(w); setElapsed(0); setRunning(true); setDoneSteps([]);
    setFinishedSession(null); setRest(null); setRestPaused(false);
    setSessionTick(t=>t+1);
  };
  useEffect(()=>{
    if(!pendingWorkoutStart) return;
    const match=allWorkouts.find(w=>String(w.id)===String(pendingWorkoutStart));
    if(match) startW(match);
    onConsumePendingWorkoutStart&&onConsumePendingWorkoutStart();
    // eslint-disable-next-line
  },[pendingWorkoutStart]);

  const required=active?requiredExerciseIndexes(active):[];
  const doneRequired=doneSteps.filter(i=>required.includes(i));
  const allDone=required.length>0&&doneRequired.length===required.length;
  const estimateSec=active?estimateWorkoutSeconds(active):0;
  const progressPct=required.length?Math.round((doneRequired.length/required.length)*100):0;
  const remainingSec=Math.max(0,Math.round(estimateSec*(1-progressPct/100)));

  /* Builds and persists the session. Called by auto-completion and by finishing early. */
  const finishWorkout=useCallback((workout,secs,done,wasCompleted)=>{
    const req=requiredExerciseIndexes(workout);
    const doneCount=done.filter(i=>req.includes(i)).length;
    const session={
      id:"ws_"+Date.now(),
      workoutId:workout.id, name:workout.name, cat:workout.cat, diff:workout.diff,
      muscles:workout.muscles||[], date:new Date().toISOString(),
      durationSec:secs, estimateSec:estimateWorkoutSeconds(workout),
      exercisesCompleted:doneCount, totalExercises:req.length,
      completionPct:req.length?Math.round((doneCount/req.length)*100):0,
      calories:estimateWorkoutCalories(workout,secs,doneCount,req.length),
      completed:!!wasCompleted,
    };
    const prs=detectWorkoutPRs(session,workoutSessions);
    onSaveWorkoutSession&&onSaveWorkoutSession(session);
    const achievements=detectAchievements([session,...workoutSessions]);
    setRunning(false); setRest(null);
    clearInterval(intv.current);
    setFinishedSession({session,prs,achievements});
  },[workoutSessions,onSaveWorkoutSession]);

  /* Auto-completion: the moment every required exercise is ticked, the session ends
     itself — no separate "finish" tap, and the clock stops immediately. */
  useEffect(()=>{
    if(active&&allDone&&!finishedSession){
      finishWorkout(active,elapsed,doneSteps,true);
    }
    // eslint-disable-next-line
  },[allDone,active,finishedSession]);

  const toggleStep=i=>{
    if(finishedSession) return; // locked once the session is saved
    setDoneSteps(prev=>{
      const next=prev.includes(i)?prev.filter(x=>x!==i):[...prev,i];
      // Ticking an exercise that's followed by a rest block starts that rest automatically
      if(!prev.includes(i)&&active){
        const nextEx=active.exercises[i+1];
        if(nextEx&&nextEx.rest){
          const secs=parseRestSeconds(nextEx.detail)||30;
          setRest(secs); setRestPaused(false);
        }
      }
      return next;
    });
  };
  const requestFinish=()=>{
    if(!active) return;
    if(allDone) return;
    setConfirmFinish(true);
  };
  const closeSession=()=>{
    setActive(null); setRunning(false); setDoneSteps([]);
    setFinishedSession(null); setRest(null); setElapsed(0);
    clearInterval(intv.current);
  };
  /* Feature 4 — auto-scroll to the Active Workout tracker every time a workout is (re)started */
  useEffect(()=>{
    if(sessionTick>0&&bannerRef.current){
      bannerRef.current.scrollIntoView({behavior:"smooth",block:"start"});
    }
  },[sessionTick]);
  return(
    <div className="page-wrap">
      {detailWorkout&&<WorkoutDetailModal w={detailWorkout} onClose={()=>setDetailWorkout(null)} onStart={startW}/>}
      {finishedSession&&<WorkoutCompleteScreen
        session={finishedSession.session}
        prs={finishedSession.prs}
        achievements={finishedSession.achievements}
        onClose={closeSession}
        onHome={()=>{closeSession();setPage&&setPage("Home");}}
        onProgress={()=>{closeSession();setPage&&setPage("Progress");}}
        onAnother={()=>{closeSession();window.scrollTo({top:0,behavior:"smooth"});}}
      />}
      {confirmFinish&&active&&(
        <div className="wc-overlay" role="dialog" aria-modal="true" onClick={()=>setConfirmFinish(false)}>
          <div className="wc-card" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <h2 className="wc-title" style={{fontSize:30}}>Finish early?</h2>
            <p className="wc-lede">
              You still have {required.length-doneRequired.length} exercise{required.length-doneRequired.length===1?"":"s"} to go.
              We'll save what you've done so far.
            </p>
            <div className="wc-btns">
              <button className="btn-primary" onClick={()=>setConfirmFinish(false)}>Continue workout</button>
              <button className="btn-secondary" onClick={()=>{setConfirmFinish(false);finishWorkout(active,elapsed,doneSteps,false);}}>Finish anyway</button>
            </div>
          </div>
        </div>
      )}
      <div className="page-header fade-up">
        <h1 className="page-title">Workouts</h1>
        <p className="page-sub">{allWorkouts.length} workouts across strength, cardio, bodyweight, and more.</p>
      </div>
      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input className="search-input" value={search} onChange={e=>{setSearch(e.target.value);setAiFilterIds(null);setAiSearchError("");}} onKeyDown={e=>e.key==="Enter"&&runSmartSearch()} placeholder="Search workouts, or ask AI in plain English…" aria-label="Search workouts"/>
        <button className="smart-search-btn" onClick={runSmartSearch} disabled={aiSearchLoading} title="Ask AI to interpret this search">{aiSearchLoading?"…":"✨"}</button>
      </div>
      {aiSearchError&&<p style={{fontSize:12,color:"var(--accent)",marginTop:-8,marginBottom:16}}>{aiSearchError}</p>}
      {aiFilterIds!==null&&!aiSearchError&&<p style={{fontSize:12,color:"var(--text-mid)",marginTop:-8,marginBottom:16}}>✨ Showing AI matches for "{search}" — <span style={{color:"var(--accent)",cursor:"pointer"}} onClick={()=>setAiFilterIds(null)}>clear</span></p>}
      <FilterBar options={cats} value={cat} onChange={setCat}/>

      {/* ACTIVE SESSION */}
      {active&&(
        <div ref={bannerRef} className="active-workout-banner scale-in" style={{marginBottom:32,scrollMarginTop:"calc(var(--nav-h) + 20px)"}}>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"stretch"}}>

            {/* STATIC IMAGE — original layout */}
            <div style={{width:120,flexShrink:0,borderRadius:14,overflow:"hidden"}}>
              <img src={active.image} alt={active.imageAlt} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
            </div>

            {/* WORKOUT INFO */}
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--banner-label)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Active Workout</div>
              <h2 style={{fontSize:20,fontWeight:800,color:"var(--banner-heading)",marginBottom:8}}>{active.name}</h2>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                <span className={"tag "+({"Beginner":"tag-diff-beginner","Intermediate":"tag-diff-intermediate","Advanced":"tag-diff-advanced"}[active.diff]||"tag-diff-beginner")}>{active.diff}</span>
                <span className="workout-dur-chip">⏱ Est. {formatEstimateRange(estimateSec)}</span>
                {active.muscles&&<span className="workout-dur-chip">🎯 {active.muscles.slice(0,2).join(", ")}</span>}
              </div>

              {/* LIVE PROGRESS */}
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                  <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--banner-label)"}}>Progress</span>
                  <span style={{fontSize:13,fontWeight:800,color:"var(--banner-heading)"}}>{progressPct}%</span>
                </div>
                <div className="ws-progress-track">
                  <div className="ws-progress-fill" style={{width:`${progressPct}%`}}/>
                </div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:8,fontSize:12,color:"var(--banner-pill-text)",opacity:.85}}>
                  <span><strong>{doneRequired.length}/{required.length}</strong> exercises</span>
                  <span><strong>{fmt(elapsed)}</strong> elapsed</span>
                  {!allDone&&<span><strong>~{Math.max(1,Math.round(remainingSec/60))} min</strong> left</span>}
                </div>
              </div>

              {/* INTERACTIVE EXERCISE CHECKLIST — each row expands for technique info */}
              <div className="exercise-list active-session-list">
                {active.exercises.map((ex,i)=>(
                  <ExerciseRow key={i} name={ex.name} detail={ex.detail} rest={ex.rest}
                    showCheckbox={!ex.rest} done={doneSteps.includes(i)} onToggleDone={()=>toggleStep(i)}/>
                ))}
              </div>

              {/* REST TIMER */}
              {rest!=null&&(
                <div className="ws-rest">
                  <div>
                    <div className="ws-rest-label">Rest</div>
                    <div className="ws-rest-time">{fmt(rest)}</div>
                  </div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap",marginLeft:"auto"}}>
                    <button onClick={()=>setRestPaused(p=>!p)}>{restPaused?"Resume":"Pause"}</button>
                    <button onClick={()=>setRest(r=>(r||0)+15)}>+15s</button>
                    <button onClick={()=>setRest(null)}>Skip</button>
                  </div>
                </div>
              )}
            </div>

            {/* TIMER */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,minWidth:150}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--banner-label)"}}>Elapsed</div>
              <div className="timer-display">{fmt(elapsed)}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                <button className="btn-primary" onClick={()=>setRunning(!running)} style={{padding:"9px 20px",fontSize:14}}>
                  {running?"⏸ Pause":"▶ Resume"}
                </button>
                <button onClick={closeSession} style={{background:"var(--banner-btn-bg)",border:"1px solid var(--banner-btn-border)",borderRadius:50,padding:"9px 14px",cursor:"pointer",color:"var(--banner-heading)",fontSize:14}} aria-label="Close workout">✕</button>
              </div>
              <button className="btn-secondary" onClick={requestFinish} style={{padding:"9px 18px",fontSize:13,width:"100%"}}>Finish workout</button>
            </div>

          </div>
        </div>
      )}

      {filtered.length===0
        ? <div style={{textAlign:"center",padding:"60px 0",color:"var(--text-mid)"}}>
            {cat==="Favorites"?"No favorited workouts yet — tap the heart on any workout to save it here.":"No workouts found. Try clearing your search."}
          </div>
        : <div className="grid-auto-fit">
            {filtered.map(w=><WorkoutCard key={w.id} w={w} onStart={startW} isActive={active?.id===w.id} onOpenDetail={setDetailWorkout} onToggleFavorite={onToggleFavoriteWorkout} favorited={favoriteWorkouts.includes(w.id)}/>)}
          </div>
      }
    </div>
  );
}
