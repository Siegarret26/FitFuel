/* FitFuel — Profile, goals and BMI
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── PROFILE FIELD ──────────────────────────────── */
const profileInputStyle={width:"100%",padding:"10px 13px",borderRadius:12,border:"1.5px solid var(--border-strong)",fontSize:14,outline:"none",background:"var(--bg3)",color:"var(--text)"};
function ProfileField({label,field,placeholder,type="text",unit="",editing,value,onChange,options,emptyText="Not set"}){
  return(
    <div>
      <label style={{fontSize:11,color:"var(--text-mid)",fontWeight:700,display:"block",marginBottom:6,letterSpacing:"0.06em"}}>{label}</label>
      {editing
        ? (options
            ? <select value={value||""} onChange={e=>onChange(field,e.target.value)} style={{...profileInputStyle,cursor:"pointer"}}>
                <option value="">{placeholder||"Select…"}</option>
                {options.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            : <div style={{display:"flex",alignItems:"center",gap:6}}>
                <input value={value||""} onChange={e=>onChange(field,e.target.value)} placeholder={placeholder} type={type} style={profileInputStyle}/>
                {unit&&<span style={{fontSize:12,color:"var(--text-mid)",whiteSpace:"nowrap"}}>{unit}</span>}
              </div>)
        : <div style={{padding:"10px 13px",borderRadius:12,background:"var(--bg3)",fontSize:14,color:value?"var(--text)":"var(--text-light)",border:"1px solid var(--border)"}}>
            {value||emptyText}{value&&unit?" "+unit:""}
          </div>
      }
    </div>
  );
}

/* ─── PROFILE PAGE ───────────────────────────────── */
/* ═══════════════════════════════════════════
   AI COACH — UI (FitFuel V3)
═══════════════════════════════════════════ */
function ChatMessageBubble({msg,cardProps}){
  if(msg.role==="system-note"){
    return <div className="chat-system-note">{msg.content}</div>;
  }
  const isUser=msg.role==="user";
  const textPart=Array.isArray(msg.content)?msg.content.find(c=>c.type==="text")?.text:msg.content;
  const imagePart=Array.isArray(msg.content)?msg.content.find(c=>c.type==="image_url"):null;
  return(
    <div className={"chat-bubble-row"+(isUser?" user":"")}>
      <div className={"chat-bubble"+(isUser?" user":" assistant")}>
        {imagePart&&<img src={imagePart.image_url.url} alt="Attached" className="chat-bubble-img"/>}
        {textPart&&<div className="chat-bubble-text">{textPart}</div>}
      </div>
      {msg.card&&<AIContentCard card={msg.card} {...cardProps}/>}
    </div>
  );
}

/* Renders a structured recommendation/generation result inline in the chat (Feature 6).
   This same object is what gets saved as part of the conversation (Feature 1) — no
   separate persistence needed, since it's just part of the message. */
function AIContentCard({card,onStartWorkout,onOpenMealDetail,onToggleMeal,onToggleFavoriteWorkout,favoriteWorkouts=[],savedMeals=[],onSaveGeneratedWorkout,onSaveGeneratedMeal,onSaveGeneratedPlan}){
  const [saved,setSaved]=useState(false);
  const [expanded,setExpanded]=useState(false);
  if(!card||!card.data) return null;
  const {type,source,data}=card;
  const isLibrary=source==="library";

  if(type==="workout"){
    const favored=isLibrary&&favoriteWorkouts.includes(data.id);
    return(
      <div className="ai-content-card">
        <div className="ai-content-card-badge">{isLibrary?"📚 Found in FitFuel":"✨ Newly generated"}</div>
        <img src={data.image||"https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80"} alt={data.name} className="ai-content-card-img"/>
        <div className="ai-content-card-body">
          <h4>{data.name}</h4>
          {data.description&&<p>{data.description}</p>}
          <div className="ai-content-card-meta">
            {data.duration&&<span>⏱ {data.duration} min</span>}
            {(data.difficulty||data.diff)&&<span>📶 {data.difficulty||data.diff}</span>}
            {data.calories&&<span>🔥 {data.calories} kcal</span>}
          </div>
          {data.muscles&&data.muscles.length>0&&<div className="ai-content-card-tags">{data.muscles.map(m=><span key={m}>{m}</span>)}</div>}
          <div className="ai-content-card-actions">
            {isLibrary ? (
              <>
                <button className="btn-primary" onClick={()=>onStartWorkout(data.id)}>▶ Start Workout</button>
                <button className="btn-secondary" onClick={()=>onStartWorkout(data.id)}>View Workout</button>
                <button className="btn-secondary" onClick={()=>onToggleFavoriteWorkout(data.id)}>{favored?"❤️ Favourited":"🤍 Favourite"}</button>
              </>
            ) : (
              <>
                <button className="btn-secondary" onClick={()=>setExpanded(e=>!e)}>{expanded?"Hide Details":"View Details"}</button>
                <button className="btn-primary" onClick={()=>{onSaveGeneratedWorkout(data);setSaved(true);}} disabled={saved}>{saved?"✓ Saved":"💾 Save to Library"}</button>
              </>
            )}
          </div>
          {expanded&&!isLibrary&&(
            <div className="ai-content-card-expand">
              {data.warmup&&data.warmup.length>0&&<><div className="analytics-section-title" style={{fontSize:12}}>Warm-up</div><ul className="exercise-info-list">{data.warmup.map((w,i)=><li key={i}>{w}</li>)}</ul></>}
              <div className="analytics-section-title" style={{fontSize:12}}>Exercises</div>
              <ul className="exercise-info-list">{(data.exercises||[]).map((e,i)=><li key={i}>{e.name} — {e.sets}×{e.reps}, rest {e.rest}</li>)}</ul>
              {data.cooldown&&data.cooldown.length>0&&<><div className="analytics-section-title" style={{fontSize:12}}>Cool-down</div><ul className="exercise-info-list">{data.cooldown.map((c,i)=><li key={i}>{c}</li>)}</ul></>}
            </div>
          )}
        </div>
      </div>
    );
  }

  if(type==="meal"){
    const favored=isLibrary&&savedMeals.includes(data.id);
    return(
      <div className="ai-content-card">
        <div className="ai-content-card-badge">{isLibrary?"📚 Found in FitFuel":"✨ Newly generated"}</div>
        <img src={data.image||"https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80"} alt={data.name} className="ai-content-card-img"/>
        <div className="ai-content-card-body">
          <h4>{data.name}</h4>
          <div className="ai-content-card-meta">
            <span>🔥 {data.cal||data.calories} kcal</span>
            <span>💪 {data.protein}g protein</span>
            {(data.prepTime||data.cookTime)!=null&&<span>⏱ {(data.prepTime||0)+(data.cookTime||0)} min</span>}
          </div>
          <div className="ai-content-card-actions">
            {isLibrary ? (
              <>
                <button className="btn-primary" onClick={()=>onOpenMealDetail(data.id)}>View Recipe</button>
                <button className="btn-secondary" onClick={()=>onToggleMeal(data.id)}>{favored?"❤️ Favourited":"🤍 Favourite"}</button>
              </>
            ) : (
              <>
                <button className="btn-secondary" onClick={()=>setExpanded(e=>!e)}>{expanded?"Hide Recipe":"View Recipe"}</button>
                <button className="btn-primary" onClick={()=>{onSaveGeneratedMeal(data);setSaved(true);}} disabled={saved}>{saved?"✓ Saved":"💾 Save to Library"}</button>
              </>
            )}
          </div>
          {expanded&&!isLibrary&&(
            <div className="ai-content-card-expand">
              <div className="analytics-section-title" style={{fontSize:12}}>Ingredients</div>
              <ul className="exercise-info-list">{(data.ingredients||[]).map((ing,i)=><li key={i}>{ing}</li>)}</ul>
              <div className="analytics-section-title" style={{fontSize:12}}>Instructions</div>
              <ul className="exercise-info-list">{(data.instructions||[]).map((step,i)=><li key={i}>{step}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if(type==="plan"){
    return(
      <div className="ai-content-card">
        <div className="ai-content-card-badge">{isLibrary?"📚 Found in FitFuel":"✨ Newly generated"}</div>
        <div className="ai-content-card-body" style={{paddingTop:16}}>
          <h4>{data.name}</h4>
          <div className="ai-content-card-meta">
            <span>🎯 {data.goal}</span>
            <span>📅 {(data.weeks||[]).length} weeks</span>
          </div>
          <div className="ai-content-card-actions">
            <button className="btn-secondary" onClick={()=>setExpanded(e=>!e)}>{expanded?"Hide Details":"View Details"}</button>
            {!isLibrary&&<button className="btn-primary" onClick={()=>{onSaveGeneratedPlan(data);setSaved(true);}} disabled={saved}>{saved?"✓ Saved":"💾 Save Plan"}</button>}
          </div>
          {expanded&&(
            <div className="ai-content-card-expand">
              {(data.weeks||[]).map((w,i)=>(
                <div key={i} style={{marginBottom:10}}>
                  <strong style={{fontSize:12,color:"var(--accent)"}}>Week {w.weekNumber} — {w.focus}</strong>
                  <ul className="exercise-info-list">{(w.sessions||[]).map((s,j)=><li key={j}>{s.day}: {s.type} — {s.description}</li>)}</ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if(type==="report"){
    return(
      <div className="ai-content-card">
        <div className="ai-content-card-badge">Weekly Report</div>
        <div className="ai-content-card-body" style={{paddingTop:16}}>
          <div className="activity-stat-grid" style={{marginBottom:12}}>
            <ActivityStat icon="🏋️" label="Workouts" value={data.workoutsCompleted}/>
            <ActivityStat icon="🏃" label="Running" value={data.runningDistance.toFixed(1)} unit="km"/>
            <ActivityStat icon="🔥" label="Calories" value={data.caloriesBurned} unit="kcal"/>
            {data.goalCompletion!==null&&<ActivityStat icon="🎯" label="Goals" value={data.goalCompletion} unit="%"/>}
          </div>
          {data.summary&&<p style={{fontSize:13,color:"var(--text)",lineHeight:1.6,margin:0}}>{data.summary}</p>}
        </div>
      </div>
    );
  }
  return null;
}

function AIWorkoutGenerator({apiKey,model,contextSummary,onSaveWorkout}){
  const [duration,setDuration]=useState(45);
  const [focus,setFocus]=useState("Full Body");
  const [equipment,setEquipment]=useState(["Dumbbells"]);
  const [difficulty,setDifficulty]=useState("Intermediate");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [result,setResult]=useState(null);
  const [saved,setSaved]=useState(false);
  const focusOptions=["Full Body","Push","Pull","Legs","Upper Body","Lower Body","Core","Cardio/HIIT"];
  const equipmentOptions=["No Equipment","Dumbbells","Barbell","Resistance Bands","Pull-up Bar","Machines","Full Gym"];
  const diffOptions=["Beginner","Intermediate","Advanced"];
  const toggleEquip=opt=>setEquipment(e=>e.includes(opt)?e.filter(x=>x!==opt):[...e,opt]);

  const generate=async()=>{
    setLoading(true); setError(""); setResult(null); setSaved(false);
    try{
      const sys=buildSystemPrompt(contextSummary,`Generate a single workout as strict JSON only, matching exactly this shape:
{"name":string,"description":string,"difficulty":"Beginner"|"Intermediate"|"Advanced","duration":number,"calories":number,"equipment":string[],"muscles":string[],"warmup":string[],"exercises":[{"name":string,"sets":number,"reps":string,"rest":string,"tempo":string}],"cooldown":string[]}
Return ONLY the JSON object, nothing else.`);
      const userMsg=`Create a ${duration}-minute ${difficulty.toLowerCase()} ${focus} workout using: ${equipment.join(", ")||"no equipment"}.`;
      const data=await completeGeminiJSON({apiKey,model,messages:[{role:"system",content:sys},{role:"user",content:userMsg}]});
      setResult(data);
    }catch(err){ setError(err.message||"Something went wrong."); }
    finally{ setLoading(false); }
  };
  const save=()=>{
    if(!result) return;
    const workout={
      id:"ai_w_"+Date.now(), aiGenerated:true,
      name:result.name||"AI Workout", cat:focus, duration:result.duration||duration,
      diff:result.difficulty||difficulty, desc:result.description||"",
      image:"https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80",
      imageAlt:"AI generated workout", emoji:"🤖",
      calories:result.calories||null, equipment:result.equipment||equipment, muscles:result.muscles||[],
      exercises:[
        ...(result.warmup||[]).map(w=>({name:"Warm-up: "+w, detail:""})),
        ...(result.exercises||[]).map(e=>({name:e.name, detail:`${e.sets}×${e.reps} · rest ${e.rest}${e.tempo?" · tempo "+e.tempo:""}`})),
        ...(result.cooldown||[]).map(c=>({name:"Cool-down: "+c, detail:""})),
      ],
    };
    onSaveWorkout(workout); setSaved(true);
  };

  return(
    <div className="ai-tool-panel">
      <div className="onboarding-field"><div className="onboarding-field-label">Duration: {duration} min</div>
        <input type="range" min="10" max="90" step="5" value={duration} onChange={e=>setDuration(+e.target.value)} className="ai-slider"/></div>
      <div className="onboarding-field"><div className="onboarding-field-label">Focus</div>
        <div className="onboarding-options">{focusOptions.map(o=><button key={o} type="button" className={"onboarding-chip"+(focus===o?" selected":"")} onClick={()=>setFocus(o)}>{o}</button>)}</div></div>
      <div className="onboarding-field"><div className="onboarding-field-label">Equipment</div>
        <div className="onboarding-options">{equipmentOptions.map(o=><button key={o} type="button" className={"onboarding-chip"+(equipment.includes(o)?" selected":"")} onClick={()=>toggleEquip(o)}>{o}</button>)}</div></div>
      <div className="onboarding-field"><div className="onboarding-field-label">Difficulty</div>
        <div className="onboarding-options">{diffOptions.map(o=><button key={o} type="button" className={"onboarding-chip"+(difficulty===o?" selected":"")} onClick={()=>setDifficulty(o)}>{o}</button>)}</div></div>
      <button className="btn-primary" style={{width:"100%",padding:14}} onClick={generate} disabled={loading}>{loading?"Generating…":"✨ Generate Workout"}</button>
      {error&&<p style={{color:"var(--accent)",fontSize:13,marginTop:10}}>{error}</p>}
      {result&&(
        <div className="ai-result-card">
          <h3 style={{fontSize:18,fontWeight:800,color:"var(--text)",marginBottom:6}}>{result.name}</h3>
          <p style={{fontSize:13,color:"var(--text-mid)",marginBottom:14}}>{result.description}</p>
          <div className="activity-stat-grid" style={{marginBottom:16}}>
            <ActivityStat icon="⏱" label="Duration" value={result.duration} unit="min"/>
            <ActivityStat icon="🔥" label="Calories" value={result.calories} unit="kcal"/>
            <ActivityStat icon="📶" label="Difficulty" value={result.difficulty}/>
          </div>
          {result.warmup&&result.warmup.length>0&&(
            <div style={{marginBottom:14}}><div className="analytics-section-title" style={{fontSize:13}}>Warm-up</div>
              <ul className="exercise-info-list">{result.warmup.map((w,i)=><li key={i}>{w}</li>)}</ul></div>
          )}
          <div className="analytics-section-title" style={{fontSize:13}}>Exercises</div>
          <div className="splits-table-wrap" style={{marginBottom:14}}>
            <table className="splits-table">
              <thead><tr><th>Exercise</th><th>Sets×Reps</th><th>Rest</th><th>Tempo</th></tr></thead>
              <tbody>{(result.exercises||[]).map((e,i)=>(<tr key={i}><td>{e.name}</td><td>{e.sets}×{e.reps}</td><td>{e.rest}</td><td>{e.tempo||"—"}</td></tr>))}</tbody>
            </table>
          </div>
          {result.cooldown&&result.cooldown.length>0&&(
            <div style={{marginBottom:14}}><div className="analytics-section-title" style={{fontSize:13}}>Cool-down</div>
              <ul className="exercise-info-list">{result.cooldown.map((c,i)=><li key={i}>{c}</li>)}</ul></div>
          )}
          <button className="btn-primary" style={{width:"100%"}} onClick={save} disabled={saved}>{saved?"✓ Saved to Workouts":"💾 Save to Workouts"}</button>
        </div>
      )}
    </div>
  );
}

function AIMealGenerator({apiKey,model,contextSummary,onSaveMeal}){
  const [calorieTarget,setCalorieTarget]=useState(2000);
  const [proteinTarget,setProteinTarget]=useState(120);
  const [diet,setDiet]=useState("No Preference");
  const [mealsPerDay,setMealsPerDay]=useState(3);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [result,setResult]=useState(null);
  const [savedIds,setSavedIds]=useState([]);
  const dietOptions=["No Preference","High Protein","Vegetarian","Vegan","Low Carb","Gluten Free"];

  const generate=async()=>{
    setLoading(true); setError(""); setResult(null); setSavedIds([]);
    try{
      const sys=buildSystemPrompt(contextSummary,`Generate a one-day meal plan as strict JSON only, matching exactly this shape:
{"meals":[{"name":string,"category":"Breakfast"|"Lunch"|"Dinner"|"Snacks"|"Vegetarian","calories":number,"protein":number,"carbs":number,"fat":number,"ingredients":string[],"instructions":string[],"prepTime":number,"cookTime":number}],"shoppingList":string[]}
Return ONLY the JSON object.`);
      const userMsg=`Build a ${mealsPerDay}-meal daily plan targeting about ${calorieTarget} kcal and ${proteinTarget}g protein, dietary preference: ${diet}.`;
      const data=await completeGeminiJSON({apiKey,model,messages:[{role:"system",content:sys},{role:"user",content:userMsg}]});
      setResult(data);
    }catch(err){ setError(err.message||"Something went wrong."); }
    finally{ setLoading(false); }
  };
  const saveMeal=(m,i)=>{
    const meal={
      id:"ai_m_"+Date.now()+"_"+i, aiGenerated:true,
      cat:m.category||"Snacks", name:m.name, emoji:"🤖",
      cal:m.calories, protein:m.protein, carbs:m.carbs, fat:m.fat,
      image:"https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80",
      imageAlt:"AI generated meal",
      ingredients:m.ingredients||[], prepTime:m.prepTime||10, cookTime:m.cookTime||10,
      difficulty:"Easy", instructions:m.instructions||[],
    };
    onSaveMeal(meal); setSavedIds(ids=>[...ids,i]);
  };

  return(
    <div className="ai-tool-panel">
      <div className="onboarding-field"><div className="onboarding-field-label">Calorie Target: {calorieTarget} kcal</div>
        <input type="range" min="1200" max="4000" step="50" value={calorieTarget} onChange={e=>setCalorieTarget(+e.target.value)} className="ai-slider"/></div>
      <div className="onboarding-field"><div className="onboarding-field-label">Protein Target: {proteinTarget}g</div>
        <input type="range" min="40" max="250" step="5" value={proteinTarget} onChange={e=>setProteinTarget(+e.target.value)} className="ai-slider"/></div>
      <div className="onboarding-field"><div className="onboarding-field-label">Meals per Day: {mealsPerDay}</div>
        <input type="range" min="2" max="6" step="1" value={mealsPerDay} onChange={e=>setMealsPerDay(+e.target.value)} className="ai-slider"/></div>
      <div className="onboarding-field"><div className="onboarding-field-label">Dietary Preference</div>
        <div className="onboarding-options">{dietOptions.map(o=><button key={o} type="button" className={"onboarding-chip"+(diet===o?" selected":"")} onClick={()=>setDiet(o)}>{o}</button>)}</div></div>
      <button className="btn-primary" style={{width:"100%",padding:14}} onClick={generate} disabled={loading}>{loading?"Generating…":"✨ Generate Meal Plan"}</button>
      {error&&<p style={{color:"var(--accent)",fontSize:13,marginTop:10}}>{error}</p>}
      {result&&(
        <div className="ai-result-card">
          {(result.meals||[]).map((m,i)=>(
            <div key={i} className="ai-meal-row">
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{m.name}</div>
                <div style={{fontSize:12,color:"var(--text-mid)"}}>{m.category} · {m.calories} kcal · {m.protein}g protein</div>
              </div>
              <button className="btn-secondary" style={{padding:"7px 14px",fontSize:12,flexShrink:0}} onClick={()=>saveMeal(m,i)} disabled={savedIds.includes(i)}>{savedIds.includes(i)?"✓ Saved":"💾 Save"}</button>
            </div>
          ))}
          {result.shoppingList&&result.shoppingList.length>0&&(
            <div style={{marginTop:16}}><div className="analytics-section-title" style={{fontSize:13}}>Shopping List</div>
              <ul className="exercise-info-list">{result.shoppingList.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
          )}
        </div>
      )}
    </div>
  );
}

function AITrainingPlanGenerator({apiKey,model,contextSummary,onSave}){
  const [goalType,setGoalType]=useState("5K");
  const [weeks,setWeeks]=useState(8);
  const [daysPerWeek,setDaysPerWeek]=useState(3);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [result,setResult]=useState(null);
  const [saved,setSaved]=useState(false);
  const goalOptions=["Couch to 5K","5K","10K","Half Marathon","Marathon","General Cardio","Walking Program"];

  const generate=async()=>{
    setLoading(true); setError(""); setResult(null); setSaved(false);
    try{
      const sys=buildSystemPrompt(contextSummary,`Generate a running/walking training plan as strict JSON only, matching exactly this shape:
{"name":string,"goal":string,"weeks":[{"weekNumber":number,"focus":string,"sessions":[{"day":string,"type":string,"description":string}]}]}
Return ONLY the JSON object.`);
      const userMsg=`Build a ${weeks}-week ${goalType} training plan with ${daysPerWeek} running/walking days per week.`;
      const data=await completeGeminiJSON({apiKey,model,messages:[{role:"system",content:sys},{role:"user",content:userMsg}]});
      setResult(data);
    }catch(err){ setError(err.message||"Something went wrong."); }
    finally{ setLoading(false); }
  };
  const save=()=>{
    if(!result) return;
    onSave(result);
    setSaved(true);
  };

  return(
    <div className="ai-tool-panel">
      <div className="onboarding-field"><div className="onboarding-field-label">Goal</div>
        <div className="onboarding-options">{goalOptions.map(o=><button key={o} type="button" className={"onboarding-chip"+(goalType===o?" selected":"")} onClick={()=>setGoalType(o)}>{o}</button>)}</div></div>
      <div className="onboarding-field"><div className="onboarding-field-label">Plan Length: {weeks} weeks</div>
        <input type="range" min="2" max="20" step="1" value={weeks} onChange={e=>setWeeks(+e.target.value)} className="ai-slider"/></div>
      <div className="onboarding-field"><div className="onboarding-field-label">Days per Week: {daysPerWeek}</div>
        <input type="range" min="2" max="6" step="1" value={daysPerWeek} onChange={e=>setDaysPerWeek(+e.target.value)} className="ai-slider"/></div>
      <button className="btn-primary" style={{width:"100%",padding:14}} onClick={generate} disabled={loading}>{loading?"Generating…":"✨ Generate Training Plan"}</button>
      {error&&<p style={{color:"var(--accent)",fontSize:13,marginTop:10}}>{error}</p>}
      {result&&(
        <div className="ai-result-card">
          <h3 style={{fontSize:18,fontWeight:800,color:"var(--text)",marginBottom:14}}>{result.name}</h3>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {(result.weeks||[]).map((w,i)=>(
              <div key={i} style={{background:"var(--bg3)",borderRadius:14,padding:16}}>
                <div style={{fontSize:13,fontWeight:800,color:"var(--accent)",marginBottom:8}}>Week {w.weekNumber} — {w.focus}</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {(w.sessions||[]).map((s,j)=>(<div key={j} style={{fontSize:13,color:"var(--text)"}}><strong>{s.day}:</strong> {s.type} — {s.description}</div>))}
                </div>
              </div>
            ))}
          </div>
          <button className="btn-primary" style={{width:"100%",marginTop:16}} onClick={save} disabled={saved}>{saved?"✓ Saved":"💾 Save Plan"}</button>
        </div>
      )}
    </div>
  );
}

function AIWeeklyReport({apiKey,model,contextSummary}){
  const weekKey=(()=>{ const d=new Date(); const day=(d.getDay()+6)%7; const monday=new Date(d); monday.setDate(d.getDate()-day); return "ff_weekly_report_"+monday.toISOString().slice(0,10); })();
  const [report,setReport]=useState(()=>loadLS(weekKey,null));
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const generate=async()=>{
    setLoading(true); setError("");
    try{
      const sys=buildSystemPrompt(contextSummary,"Write a short, encouraging weekly progress report (150-220 words) covering workouts completed, running distance/calories/nutrition where relevant, goal progress, and 1-2 concrete recommendations for next week. Plain text, no markdown headers, short paragraphs.");
      const text=await completeGeminiText({apiKey,model,messages:[{role:"system",content:sys},{role:"user",content:"Generate my weekly report."}]});
      setReport(text); saveLS(weekKey,text);
    }catch(err){ setError(err.message||"Something went wrong."); }
    finally{ setLoading(false); }
  };

  return(
    <div className="ai-tool-panel">
      {!report&&!loading&&(
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <p style={{fontSize:13,color:"var(--text-mid)",marginBottom:16}}>Get an AI summary of this week's workouts, activities, and progress.</p>
          <button className="btn-primary" onClick={generate}>Generate Weekly Report</button>
        </div>
      )}
      {loading&&<p style={{fontSize:13,color:"var(--text-mid)",textAlign:"center"}}>Analysing your week…</p>}
      {error&&<p style={{color:"var(--accent)",fontSize:13}}>{error}</p>}
      {report&&(
        <div className="ai-result-card">
          <div style={{fontSize:13,color:"var(--text)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{report}</div>
          <button className="btn-secondary" style={{marginTop:16}} onClick={generate} disabled={loading}>↻ Regenerate</button>
        </div>
      )}
    </div>
  );
}

function AIProgressPhotos({apiKey,model}){
  const [photos,setPhotos]=useState(()=>loadLS("ff_progress_photos",[]));
  const [selected,setSelected]=useState([]);
  const [aiText,setAiText]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const [aiError,setAiError]=useState("");
  const [uploadError,setUploadError]=useState("");
  const fileInputRef=useRef(null);

  const handleUpload=async e=>{
    const file=e.target.files?.[0]; if(!file) return;
    setUploadError("");
    try{
      const dataUrl=await downscaleImageFile(file,480);
      const photo={id:"photo_"+Date.now(),dataUrl,date:new Date().toISOString()};
      const next=[photo,...photos];
      setPhotos(next); saveLS("ff_progress_photos",next);
    }catch(err){ setUploadError(err.message||"Couldn't upload that photo."); }
    e.target.value="";
  };
  const toggleSelect=id=>{
    setSelected(sel=>sel.includes(id)?sel.filter(x=>x!==id):(sel.length<2?[...sel,id]:[sel[1],id]));
    setAiText("");
  };
  const deletePhoto=id=>{
    const next=photos.filter(p=>p.id!==id);
    setPhotos(next); saveLS("ff_progress_photos",next);
    setSelected(sel=>sel.filter(x=>x!==id));
  };
  const runCompare=async()=>{
    if(selected.length<2) return;
    if(!apiKey){ setAiError("Add a Gemini API key in Settings → AI Coach to use this."); return; }
    setAiLoading(true); setAiError(""); setAiText("");
    try{
      const chosen=photos.filter(p=>selected.includes(p.id)).sort((a,b)=>new Date(a.date)-new Date(b.date));
      const [p1,p2]=chosen;
      const sys=`You compare two progress photos of the same person over time. Describe only general, visible changes (posture, general build, clothing fit) in an encouraging, neutral way. NEVER estimate body-fat percentage, weight, or make any medical/health claims. Keep it to 3-4 sentences and end with a short reminder that this is a general visual impression only, not a measurement.`;
      const text=await completeGeminiText({apiKey,model,messages:[
        {role:"system",content:sys},
        {role:"user",content:[
          {type:"text",text:`Earlier photo (${new Date(p1.date).toLocaleDateString()}) vs later photo (${new Date(p2.date).toLocaleDateString()}). What visible changes do you notice?`},
          {type:"image_url",image_url:{url:p1.dataUrl}},
          {type:"image_url",image_url:{url:p2.dataUrl}},
        ]},
      ]});
      setAiText(text);
    }catch(err){ setAiError(err.message||"Something went wrong."); }
    finally{ setAiLoading(false); }
  };

  const sorted=[...photos].sort((a,b)=>new Date(b.date)-new Date(a.date));

  return(
    <div className="ai-tool-panel">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <p style={{fontSize:13,color:"var(--text-mid)",margin:0,flex:1,minWidth:200}}>Upload progress photos to track visible changes over time. Photos are stored only on this device.</p>
        <button className="btn-primary" style={{padding:"9px 18px",fontSize:13,flexShrink:0}} onClick={()=>fileInputRef.current?.click()}>+ Upload Photo</button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleUpload}/>
      </div>
      {uploadError&&<p style={{fontSize:13,color:"var(--accent)",marginBottom:12}}>{uploadError}</p>}
      {sorted.length===0
        ? <p style={{color:"var(--text-light)",fontSize:13,textAlign:"center",padding:"30px 0"}}>No progress photos yet.</p>
        : <>
            <div className="progress-photo-grid">
              {sorted.map(p=>(
                <div key={p.id} className={"progress-photo-thumb"+(selected.includes(p.id)?" selected":"")} onClick={()=>toggleSelect(p.id)}>
                  <img src={p.dataUrl} alt={"Progress photo from "+new Date(p.date).toLocaleDateString()}/>
                  <div className="progress-photo-date">{new Date(p.date).toLocaleDateString()}</div>
                  <button className="progress-photo-del" onClick={e=>{e.stopPropagation();deletePhoto(p.id);}} aria-label="Delete photo">✕</button>
                </div>
              ))}
            </div>
            <p style={{fontSize:12,color:"var(--text-light)",marginTop:10}}>Select two photos to compare ({selected.length}/2 selected).</p>
            {selected.length===2&&(
              <button className="btn-secondary" style={{marginTop:8}} onClick={runCompare} disabled={aiLoading}>{aiLoading?"Comparing…":"✨ Ask AI to describe changes"}</button>
            )}
            {aiError&&<p style={{fontSize:13,color:"var(--accent)",marginTop:10}}>{aiError}</p>}
            {aiText&&(
              <div className="insights-card" style={{marginTop:14}}>
                <div style={{fontSize:13.5,color:"var(--text)",lineHeight:1.6}}>{aiText}</div>
                <p style={{fontSize:11,color:"var(--text-light)",marginTop:10}}>This is a general visual impression only — not a medical or body-composition measurement.</p>
              </div>
            )}
          </>
      }
    </div>
  );
}
