/* FitFuel — Nutrition and hydration tracker
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── NUTRITION TRACKER (V3.5) ─────────────────── */
/* Every calculated nutrition value gets one of these, so the basis for the number
   is always one tap away rather than buried in a disclaimer. A tiny shared bus
   keeps only one open at a time — otherwise opening a second leaves the first
   stranded on screen, overlapping its neighbours. */
const _infoDotBus=new Set();
let _infoDotSeq=0;
function InfoDot({text,label}){
  const idRef=useRef(null);
  if(idRef.current===null) idRef.current=++_infoDotSeq;
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    const onOther=id=>{ if(id!==idRef.current) setOpen(false); };
    _infoDotBus.add(onOther);
    return ()=>{ _infoDotBus.delete(onOther); };
  },[]);
  useEffect(()=>{
    if(!open) return;
    const close=()=>setOpen(false);
    window.addEventListener("click",close);
    window.addEventListener("scroll",close,{passive:true});
    return ()=>{ window.removeEventListener("click",close); window.removeEventListener("scroll",close); };
  },[open]);
  const toggle=e=>{
    e.stopPropagation();
    setOpen(prev=>{
      const next=!prev;
      if(next) _infoDotBus.forEach(fn=>fn(idRef.current));
      return next;
    });
  };
  return(
    <span className={"nt-info"+(open?" open":"")}>
      <button className="nt-info-btn" aria-expanded={open} aria-label={`What is ${label}?`}
        onClick={toggle}>i</button>
      {open&&<span className="nt-info-pop" role="tooltip" onClick={e=>e.stopPropagation()}>{text}</span>}
    </span>
  );
}
const NUTRITION_INFO={
  bmr:"Basal Metabolic Rate — roughly the energy your body uses at rest just to keep you alive. Estimated from your age, height, weight and gender using the Mifflin-St Jeor equation. It's an estimate; real metabolism varies between people.",
  tdee:"Your estimated total daily energy use — your resting rate multiplied by an activity factor from your workout frequency. This is a general estimate, not a measurement of what you actually burned.",
  calories:"Your daily calorie target: estimated daily energy use, adjusted conservatively for your goal. An estimate, not a guarantee of any particular weight change.",
  protein:"Set from your bodyweight and goal. Protein supports muscle repair and growth. Individual needs vary.",
  carbs:"Calculated from whatever calories remain after protein and fat, so all three add up to your calorie target. Carbohydrates are your main training fuel.",
  fat:"Set as a share of your calorie target. Dietary fat supports hormone production and vitamin absorption.",
  fibre:"Around 14g per 1000 calories, a common general guideline. Fibre supports digestion and keeps you full. Values for FitFuel meals are estimated from their ingredients.",
  water:"A general guide based on your bodyweight. You'll need more in hot weather or around hard training — thirst is a reasonable guide.",
  exercise:"Calories estimated from workouts and GPS activities you've logged today. Separate from your baseline daily burn above, which already assumes some regular activity.",
};
/* Only the inputs that actually feed the calculation — so cosmetic profile edits
   (name, avatar) don't trigger a pointless recalculation prompt. */
function nutritionProfileFingerprint(user){
  return [user?.weight,user?.height,user?.age,
    user?.gender||user?.sex||user?.onboarding?.gender,
    user?.onboarding?.activityLevel||user?.onboarding?.exerciseFrequency,
    (user?.onboarding?.primaryGoals||user?.goals||[]).join("|"),
  ].join("~");
}
function NutritionRing({value,goal,label,unit,color,info}){
  const pct=goal>0?Math.min(100,(value/goal)*100):0;
  const R=40, C=2*Math.PI*R;
  return(
    <div className="nt-ring-card">
      <div className="nt-ring-wrap">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle className="nt-ring-bg" cx="48" cy="48" r={R} fill="none" strokeWidth="9"/>
          <circle className="nt-ring-fg" cx="48" cy="48" r={R} fill="none" strokeWidth="9"
            stroke={color} strokeDasharray={C} strokeDashoffset={C-(C*pct)/100}/>
        </svg>
        <div className="nt-ring-mid">
          <div style={{textAlign:"center"}}>
            <b>{Math.round(pct)}%</b>
            <span style={{display:"block"}}>{Math.round(value)}{unit}</span>
          </div>
        </div>
      </div>
      <div className="nt-ring-label">{label}{info&&<InfoDot text={info} label={label}/>}</div>
      <div className="nt-ring-sub">{Math.round(value)} / {goal}{unit}</div>
    </div>
  );
}

function FoodPicker({onClose,onAdd,aiMeals,savedMeals,recent,slot,settings={}}){
  const [tab,setTab]=useState("all");
  const [q,setQ]=useState("");
  const [custom,setCustom]=useState({name:"",cal:"",protein:"",carbs:"",fat:"",fibre:""});
  const [aiText,setAiText]=useState("");
  const [aiResult,setAiResult]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiError,setAiError]=useState("");
  const [askedOnce,setAskedOnce]=useState(null);
  const apiKey=settings.aiApiKey, model=settings.aiModel;

  const runAnalyse=async()=>{
    if(!aiText.trim()||aiLoading) return;
    setAiLoading(true); setAiError(""); 
    try{
      const res=await analyseFoodDescription({apiKey,model,text:aiText.trim(),priorExchange:askedOnce});
      if(!res||typeof res.calories!=="number"){
        setAiError("I couldn't confidently estimate this one. Try including the food name, quantity, and how it was prepared.");
        setAiResult(null);
      } else if(res.needsClarification&&!askedOnce){
        // Only ever ask once — after that we take the best estimate available
        setAskedOnce({userText:aiText.trim(),question:res.clarificationQuestion});
        setAiResult(res);
        setAiText("");
      } else {
        setAiResult({...res,needsClarification:false});
      }
    }catch(err){
      setAiError(/network|fetch|unavailable|429|5\d\d/i.test(err.message||"")
        ? "AI nutrition assistant is temporarily unavailable. You can still enter the values manually."
        : (err.message||"Something went wrong. You can still enter the values manually."));
      setAiResult(null);
    }
    setAiLoading(false);
  };
  /* Fills the form only — the person still reviews and presses Add food. */
  const useAiValues=()=>{
    if(!aiResult) return;
    setCustom({
      name:aiResult.foodName||aiText.trim(),
      cal:String(Math.round(aiResult.calories||0)),
      protein:String(Math.round(aiResult.protein||0)),
      carbs:String(Math.round(aiResult.carbs||0)),
      fat:String(Math.round(aiResult.fat||0)),
      fibre:String(Math.round(aiResult.fibre||0)),
    });
  };
  const all=[...mealsData,...aiMeals];
  let list=all;
  if(tab==="saved") list=all.filter(m=>savedMeals.includes(m.id));
  else if(tab==="slot") list=all.filter(m=>m.cat===slot);
  else if(tab==="recent") list=recent.map(r=>{
    const lib=r.mealId?all.find(m=>String(m.id)===String(r.mealId)):null;
    // Custom/AI foods have no library entry — surface them from the log itself
    return lib||{id:"recent_"+(r.name||"").toLowerCase().replace(/\s+/g,"_"),name:r.name,
      cal:r.cal,protein:r.protein,carbs:r.carbs,fat:r.fat,fibre:r.fibre,custom:true};
  }).filter(Boolean);
  if(q.trim()) list=list.filter(m=>m.name.toLowerCase().includes(q.toLowerCase()));

  const addCustom=()=>{
    if(!custom.name.trim()||!custom.cal) return;
    onAdd({
      id:"e_"+Date.now(), name:custom.name.trim(), cal:+custom.cal||0,
      protein:+custom.protein||0, carbs:+custom.carbs||0, fat:+custom.fat||0, fibre:+custom.fibre||0,
      slot, servings:1, custom:true, loggedAt:new Date().toISOString(),
    });
  };
  return(
    <div className="nt-picker" onClick={onClose} role="dialog" aria-modal="true">
      <div className="nt-picker-card" style={tab==="custom"?{maxWidth:720}:undefined} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 style={{fontSize:17,fontWeight:800,margin:0,color:"var(--text)"}}>Add to {slot}</h3>
          <button className="nt-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="nt-tabs">
          {[["all","All meals"],["slot",slot],["saved","Saved"],["recent","Recent"],["custom","Custom"]].map(([k,l])=>(
            <button key={k} className={"nt-tab"+(tab===k?" on":"")} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        {tab==="custom"
          ? <div className="nt-custom-grid">
              {/* Existing manual entry — unchanged, and works with or without AI */}
              <div className="nt-col">
                <p className="nt-col-title">Custom food</p>
                <div style={{display:"flex",flexDirection:"column",gap:11}}>
                  <div className="nt-lbl-field">
                    <label htmlFor="cf-name">Food name</label>
                    <input id="cf-name" className="search-input" style={{padding:"11px 14px"}}
                      placeholder="e.g. Chicken rice bowl" value={custom.name}
                      onChange={e=>setCustom({...custom,name:e.target.value})}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                    {[["cal","Calories","kcal"],["protein","Protein","g"],["carbs","Carbs","g"],["fat","Fat","g"],["fibre","Fibre","g"]].map(([k,l,u])=>(
                      <div className="nt-lbl-field" key={k}>
                        <label htmlFor={"cf-"+k}>{l} <span>({u})</span></label>
                        <input id={"cf-"+k} className="search-input" style={{padding:"11px 12px"}} type="number"
                          placeholder="0" value={custom[k]}
                          onChange={e=>setCustom({...custom,[k]:e.target.value})}/>
                      </div>
                    ))}
                  </div>
                  <button className="btn-primary" onClick={addCustom} disabled={!custom.name.trim()||!custom.cal}>Add food</button>
                </div>
              </div>

              {/* Optional AI assistant — never auto-submits, only fills the form */}
              <div className="nt-col ai">
                <p className="nt-col-title">AI nutrition assistant</p>
                {!apiKey
                  ? <p style={{fontSize:12.5,color:"var(--text-mid)",lineHeight:1.6,margin:0}}>
                      The AI assistant needs the Coach set up. You can still enter values manually on the left.
                    </p>
                  : <>
                      <label style={{fontSize:12,color:"var(--text-mid)",display:"block",marginBottom:6,fontWeight:600}}>
                        {aiResult?.needsClarification?"Add a bit more detail":"What did you eat?"}
                      </label>
                      <textarea className="search-input" rows={2}
                        style={{padding:"10px 12px",width:"100%",resize:"vertical",fontFamily:"inherit"}}
                        placeholder="e.g. 200g grilled chicken with one cup of cooked rice"
                        value={aiText} onChange={e=>setAiText(e.target.value)}
                        onKeyDown={e=>{ if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)) runAnalyse(); }}/>
                      {!aiResult&&<p className="nt-ai-eg">Describe it however you like — include quantity and how it was cooked if you know them.</p>}
                      <button className="btn-primary" style={{width:"100%",padding:11,fontSize:13,marginTop:8}}
                        onClick={runAnalyse} disabled={aiLoading||!aiText.trim()}>
                        {aiLoading?"Analysing…":"Analyse food"}
                      </button>

                      {aiError&&<p style={{fontSize:12.5,color:"var(--accent)",margin:"10px 0 0",lineHeight:1.55}}>{aiError}</p>}

                      {aiResult?.needsClarification&&aiResult.clarificationQuestion&&(
                        <p className="nt-ai-q">{aiResult.clarificationQuestion}</p>
                      )}

                      {aiResult&&!aiResult.needsClarification&&(
                        <div className="nt-ai-result">
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                            <span style={{fontSize:12.5,fontWeight:800,color:"var(--text)"}}>Estimated values</span>
                            {aiResult.confidence&&<span className={"nt-conf "+aiResult.confidence}>{aiResult.confidence} confidence</span>}
                          </div>
                          <div className="nt-ai-row"><span>Calories</span><b>{aiResult.calories} kcal</b></div>
                          <div className="nt-ai-row"><span>Protein</span><b>{aiResult.protein} g</b></div>
                          <div className="nt-ai-row"><span>Carbs</span><b>{aiResult.carbs} g</b></div>
                          <div className="nt-ai-row"><span>Fat</span><b>{aiResult.fat} g</b></div>
                          <div className="nt-ai-row"><span>Fibre</span><b>{aiResult.fibre} g</b></div>
                          {(aiResult.servingSize||aiResult.assumptions)&&(
                            <p className="nt-ai-note">
                              {aiResult.servingSize&&<><strong>Serving:</strong> {aiResult.servingSize}. </>}
                              {aiResult.assumptions}
                            </p>
                          )}
                          <button className="btn-primary" style={{width:"100%",padding:11,fontSize:13,marginTop:11}}
                            onClick={useAiValues}>Use these values</button>
                          <p className="nt-ai-warn">
                            These are AI estimates and vary with ingredients, portion, preparation, and brand. If you have a nutrition label, those numbers will be more accurate. Nothing is added until you press Add food — edit anything first.
                          </p>
                        </div>
                      )}
                    </>}
              </div>
            </div>
          : <>
              <input className="search-input" style={{padding:"11px 14px",marginTop:12}} placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)}/>
              <div className="nt-picker-list">
                {list.length===0
                  ? <p className="nt-empty" style={{padding:"18px 0"}}>
                      {tab==="recent"?"Nothing logged recently yet.":tab==="saved"?"No saved meals — tap the heart on any meal.":"No meals match that search."}
                    </p>
                  : list.map(m=>(
                      <button key={m.id} className="nt-pick" onClick={()=>onAdd({
                        id:"e_"+Date.now()+"_"+m.id, mealId:m.custom?null:m.id, name:m.name, cal:m.cal,
                        protein:m.protein, carbs:m.carbs, fat:m.fat, fibre:m.fibre||0, slot, servings:1,
                        custom:!!m.custom, loggedAt:new Date().toISOString(),
                      })}>
                        {m.image
                          ? <img className="nt-pick-img" src={m.image} alt="" loading="lazy"/>
                          : <span className="nt-pick-img" style={{display:"grid",placeItems:"center",background:"var(--bg3)",fontSize:19}}>🍽</span>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{m.name}</div>
                          <div style={{fontSize:11.5,color:"var(--text-light)"}}>P {m.protein}g · C {m.carbs}g · F {m.fat}g{m.fibre?` · ${m.fibre}g fibre`:""}</div>
                        </div>
                        <div style={{fontSize:14,fontWeight:800,color:"var(--text)"}}>{m.cal}</div>
                      </button>
                    ))}
              </div>
            </>}
      </div>
    </div>
  );
}

function NutritionPage({user,nutritionLogs,nutritionGoals,onSaveDay,onSetGoals,activities,workoutSessions,savedMeals=[],aiMeals=[],settings={},setPage,onRestoreRecommended}){
  const key=todayKey();
  const day=nutritionLogs[key]||emptyNutritionDay(key);
  const [picker,setPicker]=useState(null);
  const [range,setRange]=useState("week");
  const [editGoals,setEditGoals]=useState(false);
  const [draft,setDraft]=useState(nutritionGoals);
  const chartRef=useRef(null), chartInst=useRef(null);
  /* Compares the profile against the snapshot taken when custom targets were saved,
     so the prompt appears only when something that affects the maths actually moved. */
  const fingerprint=nutritionProfileFingerprint(user);
  const [dismissedFingerprint,setDismissedFingerprint]=useState(null);
  const profileChanged=!!nutritionGoals.savedFingerprint
    &&nutritionGoals.savedFingerprint!==fingerprint
    &&dismissedFingerprint!==fingerprint;

  const totals=sumNutrition(day.entries);
  const burned=burnedOnDate(key,activities,workoutSessions);
  const net=Math.round(totals.cal-burned);
  const slots=["Breakfast","Lunch","Dinner","Snacks"];
  /* Keyed by meal id for library items and by name for custom/AI foods, so an
     AI-estimated meal can be re-logged in one tap next time. */
  const recent=useMemo(()=>{
    const seen=new Set(), out=[];
    Object.values(nutritionLogs).sort((a,b)=>b.id.localeCompare(a.id)).forEach(d=>{
      (d.entries||[]).forEach(e=>{
        const key=e.mealId?"m"+e.mealId:"c"+(e.name||"").toLowerCase();
        if(!seen.has(key)){ seen.add(key); out.push(e); }
      });
    });
    return out.slice(0,14);
  },[nutritionLogs]);
  const insights=useMemo(()=>nutritionInsights(nutritionLogs,nutritionGoals,activities,workoutSessions),[nutritionLogs,nutritionGoals]);
  const badges=nutritionStreakBadges(insights,nutritionGoals,day);

  const addEntry=entry=>{ onSaveDay({...day,entries:[...(day.entries||[]),entry]}); setPicker(null); };
  const removeEntry=id=>onSaveDay({...day,entries:(day.entries||[]).filter(e=>e.id!==id)});
  const addWater=ml=>onSaveDay({...day,waterMl:Math.max(0,(day.waterMl||0)+ml)});

  /* Trend chart over the selected range */
  useEffect(()=>{
    if(!chartRef.current||typeof Chart==="undefined") return;
    const days=range==="week"?7:range==="month"?30:1;
    const labels=[], cals=[], burns=[];
    for(let i=days-1;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i);
      const k=todayKey(d);
      labels.push(d.toLocaleDateString(undefined,{day:"numeric",month:"short"}));
      cals.push(Math.round(sumNutrition(nutritionLogs[k]?.entries).cal));
      burns.push(burnedOnDate(k,activities,workoutSessions));
    }
    if(chartInst.current) chartInst.current.destroy();
    const css=getComputedStyle(document.documentElement);
    const accent=css.getPropertyValue("--accent").trim()||"#FF3B3B";
    const grid=css.getPropertyValue("--border").trim()||"#2a2a2e";
    const text=css.getPropertyValue("--text-mid").trim()||"#9aa";
    chartInst.current=new Chart(chartRef.current,{
      type:"bar",
      data:{labels,datasets:[
        {label:"Consumed",data:cals,backgroundColor:accent,borderRadius:5},
        {label:"Burned",data:burns,backgroundColor:"rgba(75,158,255,.75)",borderRadius:5},
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{color:text,boxWidth:12,font:{size:11}}}},
        scales:{x:{ticks:{color:text,font:{size:10},maxRotation:0,autoSkip:true},grid:{display:false}},
                y:{ticks:{color:text,font:{size:10}},grid:{color:grid}}}},
    });
    return ()=>{ if(chartInst.current){ chartInst.current.destroy(); chartInst.current=null; } };
  },[range,nutritionLogs,activities,workoutSessions,settings.theme]);

  return(
    <div className="page-wrap">
      {picker&&<FoodPicker slot={picker} onClose={()=>setPicker(null)} onAdd={addEntry}
        aiMeals={aiMeals} savedMeals={savedMeals} recent={recent} settings={settings}/>}

      <div className="page-header fade-up">
        <h1 className="page-title">Nutrition</h1>
        <p className="page-sub">Today, {new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}</p>
      </div>

      {/* Profile changed since custom targets were set (PRD §13) — offer, never impose */}
      {!nutritionGoals.auto&&profileChanged&&(
        <div className="nt-recalc">
          <span style={{fontSize:19}}>🔄</span>
          <div style={{flex:1,minWidth:200}}>
            <p style={{fontSize:13.5,color:"var(--text)",margin:"0 0 4px",fontWeight:700}}>Your profile has changed</p>
            <p style={{fontSize:13,color:"var(--text-mid)",margin:0,lineHeight:1.55}}>
              Would you like FitFuel to recalculate your recommended nutrition targets?
            </p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="btn-primary" style={{padding:"8px 16px",fontSize:12.5}} onClick={()=>{onRestoreRecommended&&onRestoreRecommended();setDismissedFingerprint(fingerprint);}}>Recalculate</button>
            <button className="btn-secondary" style={{padding:"8px 16px",fontSize:12.5}} onClick={()=>setDismissedFingerprint(fingerprint)}>Keep current</button>
          </div>
        </div>
      )}

      {badges.length>0&&<div className="nt-badges" style={{marginBottom:20}}>
        {badges.map((b,i)=><span className="nt-badge" key={i} style={{animationDelay:`${i*70}ms`}}>{b.icon} {b.label}</span>)}
      </div>}

      {/* RINGS */}
      <div className="nt-rings mb-24">
        <NutritionRing value={totals.cal} goal={nutritionGoals.calories} label="Calories" unit="" color="var(--accent)" info={NUTRITION_INFO.calories}/>
        <NutritionRing value={totals.protein} goal={nutritionGoals.protein} label="Protein" unit="g" color="#38D978" info={NUTRITION_INFO.protein}/>
        <NutritionRing value={totals.carbs} goal={nutritionGoals.carbs} label="Carbs" unit="g" color="#FFC53B" info={NUTRITION_INFO.carbs}/>
        <NutritionRing value={totals.fat} goal={nutritionGoals.fat} label="Fat" unit="g" color="#B57BFF" info={NUTRITION_INFO.fat}/>
        <NutritionRing value={totals.fibre} goal={nutritionGoals.fibre||25} label="Fibre" unit="g" color="#8FB339" info={NUTRITION_INFO.fibre}/>
        <NutritionRing value={(day.waterMl||0)/1000} goal={+(nutritionGoals.waterMl/1000).toFixed(1)} label="Water" unit="L" color="#4B9EFF" info={NUTRITION_INFO.water}/>
      </div>

      {/* ENERGY — baseline and exercise shown separately (PRD §9) */}
      <div className="card mb-24" style={{padding:24}}>
        <h3 className="ff-heading mb-16" style={{fontSize:16,color:"var(--text)"}}>Energy today</h3>
        <div className="nt-net">
          <div className="nt-net-item">
            <b>{nutritionGoals.tdee||nutritionGoals.calories}</b>
            <span>Est. daily burn <InfoDot text={NUTRITION_INFO.tdee} label="estimated daily energy burn"/></span>
          </div>
          <div className="nt-net-item">
            <b>+{burned}</b>
            <span>Exercise <InfoDot text={NUTRITION_INFO.exercise} label="exercise calories"/></span>
          </div>
          <div className="nt-net-item"><b>{Math.round(totals.cal)}</b><span>Food consumed</span></div>
          <div className="nt-net-item"><b>{Math.max(0,nutritionGoals.calories-Math.round(totals.cal))}</b><span>Left to target</span></div>
        </div>
        <p style={{fontSize:12,color:"var(--text-light)",marginTop:14,marginBottom:0,lineHeight:1.6}}>
          Your daily target already assumes your usual activity level, so exercise calories are shown separately rather than added to it — your food target stays steady instead of shifting after every session. All figures are estimates.
        </p>
      </div>

      {/* METABOLISM BREAKDOWN — shows where the targets actually come from */}
      {nutritionGoals.bmr&&(
        <div className="card mb-24" style={{padding:24}}>
          <h3 className="ff-heading mb-16" style={{fontSize:16,color:"var(--text)"}}>What your body burns</h3>
          {nutritionGoals.missing?.length>0&&(
            <div style={{padding:"11px 14px",borderRadius:12,background:"var(--accent-tint-1)",border:"1px solid color-mix(in srgb, var(--accent) 32%, transparent)",marginBottom:16}}>
              <p style={{fontSize:13,color:"var(--text)",margin:0,lineHeight:1.55}}>
                Using default values for your <strong>{nutritionGoals.missing.join(", ")}</strong> — these numbers won't be accurate until you add them.{" "}
                <span style={{color:"var(--accent)",cursor:"pointer",fontWeight:700}} onClick={()=>setPage&&setPage("Profile")}>Update profile →</span>
              </p>
            </div>
          )}
          <div className="nt-net">
            <div className="nt-net-item">
              <b>{nutritionGoals.bmr}</b><span>At rest (BMR) <InfoDot text={NUTRITION_INFO.bmr} label="BMR"/></span>
            </div>
            <div className="nt-net-item">
              <b>+{Math.max(0,nutritionGoals.tdee-nutritionGoals.bmr)}</b><span>From activity</span>
            </div>
            <div className="nt-net-item">
              <b>{nutritionGoals.tdee}</b><span>Total daily burn <InfoDot text={NUTRITION_INFO.tdee} label="daily energy burn"/></span>
            </div>
            <div className="nt-net-item">
              <b>{nutritionGoals.adjustment>=0?"+":""}{nutritionGoals.adjustment}</b>
              <span>{({lose:"Deficit",gain:"Surplus",endurance:"Fuel",maintain:"Balance"})[nutritionGoals.goalKind]||"Adjustment"}</span>
            </div>
          </div>
          <p style={{fontSize:13,color:"var(--text-mid)",lineHeight:1.7,margin:"16px 0 0"}}>
            Your body burns about <strong style={{color:"var(--text)"}}>{nutritionGoals.bmr} kcal</strong> a day doing nothing at all —
            breathing, circulation, keeping you warm. Your activity level ({nutritionGoals.activityMult}×) brings the daily total
            to roughly <strong style={{color:"var(--text)"}}>{nutritionGoals.tdee} kcal</strong>. Because your goal is to{" "}
            {({lose:"lose weight",gain:"gain muscle",endurance:"build endurance",maintain:"maintain"})[nutritionGoals.goalKind]},
            your target is set to <strong style={{color:"var(--text)"}}>{nutritionGoals.calories} kcal</strong>.
          </p>
          {nutritionGoals.genderUnknown&&(
            <p style={{fontSize:12.5,color:"var(--text-mid)",lineHeight:1.6,margin:"12px 0 0"}}>
              You haven't shared a gender, so this uses a midpoint between the male and female constants — everything still works, the estimate is just a little less tailored.
            </p>
          )}
          <p style={{fontSize:12,color:"var(--text-light)",lineHeight:1.6,margin:"10px 0 0"}}>
            Estimated with the Mifflin-St Jeor equation. Real metabolism varies between people, so treat this as a starting point and adjust based on how you actually respond over a few weeks.
          </p>
        </div>
      )}

      {/* WATER */}
      <div className="card mb-24" style={{padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",flexWrap:"wrap",gap:8}}>
          <h3 className="ff-heading" style={{fontSize:16,color:"var(--text)"}}>Hydration</h3>
          <span style={{fontSize:13,color:"var(--text-mid)"}}>{((day.waterMl||0)/1000).toFixed(1)} / {(nutritionGoals.waterMl/1000).toFixed(1)} L</span>
        </div>
        <div className="nt-water-row">
          {Array.from({length:8},(_,i)=>{
            const per=nutritionGoals.waterMl/8;
            return <span key={i} className={"nt-drop"+((day.waterMl||0)>=per*(i+1)?" full":"")}>💧</span>;
          })}
        </div>
        <div className="nt-water-btns">
          {WATER_SERVINGS.map(ml=><button key={ml} onClick={()=>addWater(ml)}>+{ml} mL</button>)}
          {(day.waterMl||0)>0&&<button onClick={()=>addWater(-250)} style={{opacity:.7}}>−250 mL</button>}
        </div>
      </div>

      {/* MEAL TIMELINE */}
      <div className="card mb-24" style={{padding:24}}>
        <h3 className="ff-heading mb-16" style={{fontSize:16,color:"var(--text)"}}>Today's meals</h3>
        {slots.map(slot=>{
          const entries=(day.entries||[]).filter(e=>e.slot===slot);
          const slotCal=Math.round(sumNutrition(entries).cal);
          return(
            <div className="nt-slot" key={slot}>
              <div className="nt-slot-head">
                <span className="nt-slot-title">{slot}</span>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {slotCal>0&&<span style={{fontSize:13,fontWeight:700,color:"var(--text-mid)"}}>{slotCal} kcal</span>}
                  <button className="btn-secondary" style={{padding:"6px 14px",fontSize:12}} onClick={()=>setPicker(slot)}>+ Add</button>
                </div>
              </div>
              {entries.length===0
                ? <p className="nt-empty">Not logged yet.</p>
                : entries.map(e=>(
                    <div className="nt-entry" key={e.id}>
                      <div className="nt-entry-name">
                        {e.name}
                        <div className="nt-entry-macros">P {Math.round(e.protein||0)}g · C {Math.round(e.carbs||0)}g · F {Math.round(e.fat||0)}g{e.fibre?` · ${Math.round(e.fibre)}g fibre`:""}{e.custom?" · custom":""}</div>
                      </div>
                      <div className="nt-entry-cal">{Math.round((e.cal||0)*(e.servings||1))}</div>
                      <button className="nt-x" onClick={()=>removeEntry(e.id)} aria-label={"Remove "+e.name}>✕</button>
                    </div>
                  ))}
            </div>
          );
        })}
      </div>

      {/* TRENDS */}
      <div className="card mb-24" style={{padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:16}}>
          <h3 className="ff-heading" style={{fontSize:16,color:"var(--text)"}}>Trends</h3>
          <Seg options={[{v:"week",l:"Week"},{v:"month",l:"Month"}]} value={range} onChange={setRange}/>
        </div>
        <div style={{height:240}}><canvas ref={chartRef}/></div>
      </div>

      {/* INSIGHTS */}
      {insights&&(
        <div className="card mb-24" style={{padding:24}}>
          <h3 className="ff-heading mb-16" style={{fontSize:16,color:"var(--text)"}}>Insights</h3>
          <div className="nt-net">
            <div className="nt-net-item"><b>{insights.avgCal}</b><span>Avg daily kcal</span></div>
            <div className="nt-net-item"><b>{insights.avgProtein}g</b><span>Avg protein</span></div>
            <div className="nt-net-item"><b>{insights.streak}</b><span>Day logging streak</span></div>
            <div className="nt-net-item"><b>{insights.hydratedDays}</b><span>Days hydrated</span></div>
          </div>
          {insights.topMeal&&<p style={{fontSize:13,color:"var(--text-mid)",marginTop:14,marginBottom:0}}>
            Most logged: <strong style={{color:"var(--text)"}}>{insights.topMeal.name}</strong> ({insights.topMeal.count}×)
          </p>}
        </div>
      )}

      {/* GOALS */}
      <div className="card" style={{padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <h3 className="ff-heading" style={{fontSize:16,color:"var(--text)",display:"flex",alignItems:"center",gap:10}}>
            Daily targets
            {!nutritionGoals.auto&&<span className="nt-custom-tag">Custom target</span>}
          </h3>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {!nutritionGoals.auto&&(
              <button className="btn-secondary" style={{padding:"7px 16px",fontSize:12.5}} onClick={()=>onRestoreRecommended&&onRestoreRecommended()}>
                Restore recommended
              </button>
            )}
            <button className="btn-secondary" style={{padding:"7px 16px",fontSize:12.5}} onClick={()=>{setDraft(nutritionGoals);setEditGoals(v=>!v);}}>
              {editGoals?"Cancel":"Edit"}
            </button>
          </div>
        </div>
        {!editGoals
          ? <>
              <p style={{fontSize:13,color:"var(--text-mid)",lineHeight:1.65,margin:"10px 0 14px"}}>
                {nutritionGoals.auto
                  ? "Estimated from your age, height, weight, activity level, and goal. These are general estimates, not medical advice — a dietitian can tailor them properly."
                  : "You've set these manually. Restore recommended to recalculate them from your profile."}
              </p>
              {nutritionGoals.suppressedDeficit&&(
                <div style={{padding:"12px 15px",borderRadius:13,background:"var(--bg3)",border:"1px solid var(--border)",marginBottom:16}}>
                  <p style={{fontSize:13,color:"var(--text)",margin:0,lineHeight:1.6}}>
                    You picked a weight-loss goal, but since you're under 18 these targets are set to <strong>maintenance</strong> rather than a calorie deficit. Bodies are still developing at your age, and restricting intake isn't something an app should decide for you. Focus on protein, fibre, and consistent training — and talk to a doctor or dietitian if weight is something you want to work on.
                  </p>
                </div>
              )}
              <div className="nt-net">
                <div className="nt-net-item"><b>{nutritionGoals.calories}</b><span>Calories <InfoDot text={NUTRITION_INFO.calories} label="calorie target"/></span></div>
                <div className="nt-net-item"><b>{nutritionGoals.protein}g</b><span>Protein <InfoDot text={NUTRITION_INFO.protein} label="protein target"/></span></div>
                <div className="nt-net-item"><b>{nutritionGoals.carbs}g</b><span>Carbs <InfoDot text={NUTRITION_INFO.carbs} label="carbohydrate target"/></span></div>
                <div className="nt-net-item"><b>{nutritionGoals.fat}g</b><span>Fat <InfoDot text={NUTRITION_INFO.fat} label="fat target"/></span></div>
                <div className="nt-net-item"><b>{nutritionGoals.fibre}g</b><span>Fibre <InfoDot text={NUTRITION_INFO.fibre} label="fibre target"/></span></div>
                <div className="nt-net-item"><b>{(nutritionGoals.waterMl/1000).toFixed(1)}L</b><span>Water <InfoDot text={NUTRITION_INFO.water} label="water target"/></span></div>
              </div>
            </>
          : <div style={{marginTop:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
              {[["calories","Calories"],["protein","Protein g"],["carbs","Carbs g"],["fat","Fat g"],["fibre","Fibre g"],["waterMl","Water mL"]].map(([k,l])=>(
                <div key={k}>
                  <label style={{fontSize:11.5,color:"var(--text-mid)",display:"block",marginBottom:5}}>{l}</label>
                  <input className="search-input" style={{padding:"10px 12px"}} type="number" value={draft[k]}
                    onChange={e=>setDraft({...draft,[k]:+e.target.value||0})}/>
                </div>
              ))}
              <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
                <button className="btn-primary" style={{padding:"10px 18px",fontSize:13}} onClick={()=>{onSetGoals(draft);setEditGoals(false);}}>Save</button>
              </div>
            </div>}
        <p style={{fontSize:12,color:"var(--text-light)",lineHeight:1.6,margin:"16px 0 0"}}>
          These values are estimates based on the information in your FitFuel profile. Individual energy and nutrition needs vary — check with a doctor or dietitian before making significant changes.
        </p>
      </div>
    </div>
  );
}

function DayDetailModal({dateKey,acts,onClose,onAdd,onQuickAdd,onStartWorkout,onStartRun,onUpdate,onEdit,onDelete,onReschedule,today,allWorkouts}){
  const [confirmDel,setConfirmDel]=useState(null);
  /* Matches the existing meal/workout modals: body scroll locks while open. */
  useEffect(()=>{
    document.body.style.overflow="hidden";
    return()=>{ document.body.style.overflow=""; };
  },[]);
  const d=new Date(dateKey+"T00:00:00");
  const startable=acts.filter(a=>{
    const st=derivedStatus(a);
    return st!=="completed"&&st!=="cancelled"&&(a.type==="workout"||a.type==="run");
  });
  const diffColors={Beginner:"#38D978",Intermediate:"#FF8A1F",Advanced:"var(--accent)"};

  return(
    <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="meal-modal workout-modal" role="dialog" aria-modal="true"
        aria-label={"Activities for "+d.toLocaleDateString()} style={{maxWidth:600}}>
        <div style={{padding:"26px 28px 28px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:20}}>
            <div>
              <h2 className="ff-heading" style={{fontSize:24,color:"var(--text)",margin:0,lineHeight:1.1}}>
                {d.toLocaleDateString(undefined,{weekday:"long"})}
              </h2>
              <p style={{fontSize:13.5,color:"var(--text-mid)",margin:"4px 0 0"}}>
                {d.toLocaleDateString(undefined,{day:"numeric",month:"long",year:"numeric"})}
                {dateKey===today&&<span style={{color:"var(--accent)",fontWeight:700}}> · Today</span>}
              </p>
            </div>
            <button className="meal-modal-close" style={{position:"static",flexShrink:0}} onClick={onClose} aria-label="Close">✕</button>
          </div>

          {acts.length===0 ? (
            /* Empty day — offer the quick routes in rather than a dead end */
            <>
              <p style={{fontSize:14,color:"var(--text-mid)",marginBottom:18,lineHeight:1.6}}>
                Nothing planned yet. What do you fancy?
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                <button className="btn-primary" style={{width:"100%",padding:13,fontSize:14}} onClick={()=>onQuickAdd("workout")}>Add workout</button>
                <button className="btn-secondary" style={{width:"100%",padding:13,fontSize:14}} onClick={()=>onQuickAdd("run")}>Add run</button>
                <button className="btn-secondary" style={{width:"100%",padding:13,fontSize:14}} onClick={()=>onQuickAdd("rest")}>Add rest day</button>
              </div>
            </>
          ) : (
            <>
              <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <span style={{fontSize:11,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--text-light)"}}>
                  Planned activities
                </span>
                {startable.length>1&&(
                  <span style={{fontSize:12,color:"var(--text-mid)"}}>Pick which one to start</span>
                )}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:11}}>
                {acts.map(a=>{
                  const st=derivedStatus(a);
                  const canStart=st!=="completed"&&st!=="cancelled";
                  const w=a.workoutId?allWorkouts.find(x=>String(x.id)===String(a.workoutId)):null;
                  return(
                    <div key={a.id} style={{border:"1px solid "+(st==="completed"?"rgba(56,217,120,.35)":st==="missed"?"color-mix(in srgb, var(--accent) 30%, transparent)":"var(--border-strong)"),
                      borderRadius:18,padding:16,background:st==="completed"?"rgba(56,217,120,.07)":"var(--bg3)"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:13}}>
                        <span style={{fontSize:26,lineHeight:1.05}}>
                          {st==="completed"?"✅":st==="missed"?"⚠️":PLAN_TYPES[a.type].icon}
                        </span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:16,fontWeight:800,color:"var(--text)",lineHeight:1.25}}>{a.title}</div>
                          <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:7}}>
                            <span className={"pl-status "+st}>{st}</span>
                            {a.time&&<span className="workout-meta-chip">🕑 {a.time}</span>}
                            {a.durationMin&&<span className="workout-meta-chip">⏱ {a.durationMin} min</span>}
                            {a.distanceKm&&<span className="workout-meta-chip">📍 {a.distanceKm} km</span>}
                            {w&&<span className="workout-meta-chip" style={{color:diffColors[w.diff]}}>{w.diff}</span>}
                            {w&&w.muscles&&<span className="workout-meta-chip">{w.muscles.slice(0,2).join(", ")}</span>}
                          </div>
                          {a.notes&&<p style={{fontSize:13,color:"var(--text-mid)",margin:"9px 0 0",fontStyle:"italic",lineHeight:1.5}}>"{a.notes}"</p>}
                        </div>
                      </div>

                      {canStart&&a.type==="workout"&&a.workoutId&&(
                        <button className="btn-primary" style={{width:"100%",marginTop:13,padding:12,fontSize:14}}
                          onClick={()=>onStartWorkout(a.workoutId)}>Start →</button>
                      )}
                      {canStart&&a.type==="run"&&(
                        <button className="btn-primary" style={{width:"100%",marginTop:13,padding:12,fontSize:14}}
                          onClick={onStartRun}>Start run →</button>
                      )}
                      {st==="completed"&&(
                        <div style={{display:"flex",gap:8,marginTop:13,flexWrap:"wrap"}}>
                          <button className="btn-secondary" style={{flex:1,minWidth:130,padding:11,fontSize:13}}
                            onClick={()=>onStartWorkout&&a.workoutId&&onStartWorkout(a.workoutId)}
                            disabled={!a.workoutId}>Start again</button>
                          <button className="btn-secondary" style={{flex:1,minWidth:130,padding:11,fontSize:13}}
                            onClick={()=>onQuickAdd("summary")}>View summary</button>
                        </div>
                      )}

                      <div className="pl-act-btns" style={{marginTop:10}}>
                        {st!=="completed"&&<button onClick={()=>onUpdate({...a,status:"completed",completedAt:new Date().toISOString()})}>Mark done</button>}
                        <button onClick={()=>onEdit(a)}>Edit</button>
                        {st==="missed"&&<button onClick={()=>onReschedule(a,today)}>Reschedule to today</button>}
                        {st!=="cancelled"&&st!=="completed"&&<button onClick={()=>onUpdate({...a,status:"cancelled"})}>Cancel</button>}
                        <button onClick={()=>setConfirmDel(a)}>Delete</button>
                      </div>

                      {confirmDel?.id===a.id&&(
                        <div style={{marginTop:12,padding:"12px 14px",borderRadius:12,background:"var(--accent-tint-1)",
                          border:"1px solid color-mix(in srgb, var(--accent) 34%, transparent)"}}>
                          <p style={{fontSize:13,color:"var(--text)",margin:"0 0 10px"}}>Delete "{a.title}"?</p>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            <button className="btn-secondary" style={{padding:"7px 14px",fontSize:12.5}} onClick={()=>setConfirmDel(null)}>Keep it</button>
                            <button className="btn-primary" style={{padding:"7px 14px",fontSize:12.5}} onClick={()=>{onDelete(a.id);setConfirmDel(null);}}>Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button className="btn-secondary" style={{width:"100%",marginTop:14,padding:12,fontSize:13.5}} onClick={onAdd}>
                + Add another activity
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
