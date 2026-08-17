/* FitFuel — Dashboard
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── HOME PAGE ──────────────────────────────────── */
function HomePage({setPage,tracker,savedMeals,onToggleMeal,user,activities=[],settings={},todayNutrition,nutritionGoals,onQuickWater,plannedActivities=[],onStartPlanned}){
  const nutTotals=sumNutrition(todayNutrition?.entries);
  /* Today and tomorrow only — the dashboard answers "what am I doing now", the
     planner answers everything further out. */
  const upcoming=useMemo(()=>{
    const t=ymd(new Date()); const tm=new Date(); tm.setDate(tm.getDate()+1);
    const tmKey=ymd(tm);
    return plannedActivities
      .filter(a=>(a.date===t||a.date===tmKey)&&a.status!=="cancelled")
      .sort((a,b)=>(a.date+(a.time||"99")).localeCompare(b.date+(b.time||"99")))
      .slice(0,4);
  },[plannedActivities]);
  const streak=tracker?tracker.done.filter(Boolean).length:0;
  const [detailMeal,setDetailMeal]=useState(null);
  const firstName=user?.name?user.name.split(" ")[0]:null;
  const level=user?.onboarding?.experienceLevel;
  const diet=user?.onboarding?.dietaryPreference;
  const levelMatches=level?workoutsData.filter(w=>w.diff===level):[];
  const featuredWorkouts=(levelMatches.length?levelMatches:workoutsData).slice(0,3);
  const dietMatches=diet==="Vegetarian"?mealsData.filter(m=>m.cat==="Vegetarian"):[];
  const featuredMeals=(dietMatches.length>=4?dietMatches:mealsData).slice(0,4);
  const actStats=aggregateActivityStats(activities);
  const [aiGreetingLine,setAiGreetingLine]=useState(null);
  const [nudge,setNudge]=useState(null);
  const [nudgeDismissed,setNudgeDismissed]=useState(false);

  /* Feature 6 — AI dashboard: one cached-per-day AI line, gracefully falls back to the rule-based line if no key/offline */
  useEffect(()=>{
    if(!settings.aiApiKey||!user) return;
    const todayKey="ff_ai_greeting_"+new Date().toISOString().slice(0,10);
    const cached=loadLS(todayKey,null);
    if(cached){ setAiGreetingLine(cached); return; }
    const ctx=buildUserContextSummary(user,tracker,activities,savedMeals,loadAIMemoryForContext());
    const sys=buildSystemPrompt(ctx,"Write ONE short, upbeat sentence (max 18 words) suggesting what the person should focus on today, based on their data. No greeting or name, just the focus sentence, no quotes.");
    completeGeminiText({apiKey:settings.aiApiKey,model:settings.aiModel,messages:[{role:"system",content:sys},{role:"user",content:"What should I focus on today?"}]})
      .then(text=>{ if(text){ setAiGreetingLine(text); saveLS(todayKey,text); } })
      .catch(()=>{});
    // eslint-disable-next-line
  },[settings.aiApiKey,user?.email]);

  /* Feature 8 — AI Habit Coach: deterministic nudge, always available even without a key */
  useEffect(()=>{
    let candidate=null;
    if(actStats.runningStreak>=6) candidate="You're one day from a 7-day activity streak — keep it going!";
    else if((tracker?.wkCt||0)===0) candidate="You haven't logged a workout yet this week.";
    else if((tracker?.water||0)<4) candidate=`Don't forget today's hydration goal — you're at ${tracker?.water||0}/8 glasses.`;
    setNudge(candidate);
    // eslint-disable-next-line
  },[activities,tracker?.wkCt,tracker?.water]);

  return(
    <div>
      {detailMeal&&<MealDetailModal m={detailMeal} onClose={()=>setDetailMeal(null)} onSave={onToggleMeal} saved={savedMeals?.includes(detailMeal.id)}/>}
      {/* HERO */}
      <section className="hero">
        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80" alt="Athlete training" className="hero-img"/>
        <div className="hero-overlay"/>
        <div className="hero-glow"/>
        <div className="hero-content">
          <div className="hero-eyebrow fade-up">Built for teens & students</div>
          <h1 className="hero-headline fade-up-2">
            FUEL YOUR<br/><span>BODY.</span><br/>TRAIN SMARTER.
          </h1>
          <p className="hero-sub fade-up-3">Simple workouts, healthy meals, and habit tracking — designed for real student life.</p>
          <div className="hero-btns fade-up-3">
            <button className="btn-primary" style={{fontSize:15,padding:"14px 36px"}} onClick={()=>setPage("Workouts")}>Start Training</button>
            <button className="btn-secondary" onClick={()=>setPage("Meals")}>Explore Meals</button>
          </div>
          <div className="hero-stats fade-up-3">
            {[{val:`${(tracker?.wkCt||0)}`, label:"Workouts Done"},{val:`${streak}🔥`, label:"Current Streak"},{val:`${savedMeals?.length||0}`, label:"Saved Meals"},{val:`${tracker?.done?Math.round((streak/7)*100):0}%`, label:"Habit Rate"}].map(s=>(
              <div key={s.label}>
                <div className="hero-stat-val">{s.val}</div>
                <div className="hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PERSONALISED GREETING (Feature 5 survey + Feature 6 AI dashboard) */}
      {firstName&&(
        <div style={{background:"var(--bg)",padding:"32px 24px 0"}}>
          <div style={{maxWidth:1180,margin:"0 auto"}}>
            <div className="home-greeting-card fade-up">
              <div>
                <div className="home-greeting-hello">{timeGreeting()}, {firstName} 👋</div>
                <div className="home-greeting-sub">{aiGreetingLine||`Ready for today's ${featuredWorkouts[0]?.name||"workout"}?`}</div>
              </div>
              <button className="btn-primary" style={{padding:"11px 24px",fontSize:14,flexShrink:0}} onClick={()=>setPage("Workouts")}>Let's go →</button>
            </div>
            {nudge&&!nudgeDismissed&&(
              <div className="habit-nudge-banner fade-up">
                <span>🔔 {nudge}</span>
                <button onClick={()=>setNudgeDismissed(true)} aria-label="Dismiss">✕</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UPCOMING — from the planner (V3.6) */}
      {upcoming.length>0&&(
        <div style={{background:"var(--bg)",padding:"18px 24px 0"}}>
          <div style={{maxWidth:1180,margin:"0 auto"}}>
            <div className="card fade-up" style={{padding:24}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
                <h3 className="ff-heading" style={{fontSize:16,color:"var(--text)"}}>Upcoming</h3>
                <button className="section-link" onClick={()=>setPage("Progress")}>View planner →</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {upcoming.map(a=>{
                  const st=derivedStatus(a);
                  return(
                    <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:13,background:"var(--bg3)"}}>
                      <span style={{fontSize:19}}>{st==="completed"?"✅":PLAN_TYPES[a.type].icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13.5,fontWeight:700,color:"var(--text)"}}>{a.title}</div>
                        <div style={{fontSize:11.5,color:"var(--text-light)"}}>
                          {a.date===ymd(new Date())?"Today":new Date(a.date+"T00:00:00").toLocaleDateString(undefined,{weekday:"long"})}
                          {a.time?` · ${a.time}`:""}{a.durationMin?` · ~${a.durationMin} min`:""}{a.distanceKm?` · ${a.distanceKm} km`:""}
                        </div>
                      </div>
                      {a.type==="workout"&&st!=="completed"&&a.workoutId&&(
                        <button className="btn-secondary" style={{padding:"6px 14px",fontSize:12}}
                          onClick={()=>onStartPlanned&&onStartPlanned(a.workoutId)}>Start</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TODAY'S NUTRITION (V3.5) */}
      <div style={{background:"var(--bg)",padding:"18px 24px 0"}}>
        <div style={{maxWidth:1180,margin:"0 auto"}}>
          <div className="card fade-up" style={{padding:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <h3 className="ff-heading" style={{fontSize:16,color:"var(--text)"}}>Today's Nutrition</h3>
              <button className="section-link" onClick={()=>setPage("Nutrition")}>View nutrition →</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:14}}>
              {[
                {label:"Calories",value:Math.round(nutTotals.cal),sub:`of ${nutritionGoals?.calories||0}`},
                {label:"Protein",value:`${Math.round(nutTotals.protein)}g`,sub:`of ${nutritionGoals?.protein||0}g`},
                {label:"Water",value:`${((todayNutrition?.waterMl||0)/1000).toFixed(1)}L`,sub:`of ${((nutritionGoals?.waterMl||0)/1000).toFixed(1)}L`},
                {label:"Meals",value:(todayNutrition?.entries||[]).length,sub:"logged today"},
              ].map(s=>(
                <div key={s.label} style={{background:"var(--bg3)",borderRadius:14,padding:"14px 16px"}}>
                                    <div style={{fontSize:19,fontWeight:800,color:"var(--text)",lineHeight:1.15}}>{s.value}</div>
                  <div style={{fontSize:11,color:"var(--text-light)"}}>{s.label} · {s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:16}}>
              <button className="btn-primary" style={{padding:"9px 18px",fontSize:13}} onClick={()=>setPage("Nutrition")}>+ Log a meal</button>
              <button className="btn-secondary" style={{padding:"9px 18px",fontSize:13}} onClick={()=>onQuickWater&&onQuickWater(250)}>+ 250 mL water</button>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY (Feature 6 — GPS run/walk tracking) */}
      <div style={{background:"var(--bg)",padding:"18px 24px 0"}}>
        <div style={{maxWidth:1180,margin:"0 auto"}}>
          {activities.length>0?(
            <div className="card fade-up" style={{padding:24}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
                <h3 className="ff-heading" style={{fontSize:16,color:"var(--text)"}}>Recent Activity</h3>
                <button className="section-link" onClick={()=>setPage("Activity")}>See all →</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:14}}>
                {[
                  {label:"Last Activity",val:actStats.lastActivity?`${actStats.lastActivity.distance.toFixed(1)} km`:"—"},
                  {label:"This Week",val:`${actStats.weeklyDistance.toFixed(1)} km`},
                  {label:"This Month",val:`${actStats.monthlyDistance.toFixed(1)} km`},
                  {label:"Longest Run",val:`${actStats.longestRun.toFixed(1)} km`},
                  {label:"Total Activities",val:actStats.totalActivities},
                  {label:"Activity Streak",val:`${actStats.runningStreak}🔥`},
                ].map(s=>(
                  <div key={s.label} style={{textAlign:"center"}}>
                    <div style={{fontSize:18,fontWeight:800,color:"var(--accent)"}}>{s.val}</div>
                    <div style={{fontSize:11,color:"var(--text-mid)",marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ):(
            <div className="card fade-up" style={{padding:22,display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:2}}>Track your first run or walk</div>
                <div style={{fontSize:13,color:"var(--text-mid)"}}>Live GPS pace, distance, and route mapping.</div>
              </div>
              <button className="btn-secondary" onClick={()=>setPage("Activity")}>Start Tracking →</button>
            </div>
          )}
        </div>
      </div>

      {/* FEATURED WORKOUTS */}
      <div style={{background:"var(--bg)",padding:"60px 0"}}>
        <div style={{maxWidth:1180,margin:"0 auto",padding:"0 24px"}}>
          <div className="section-label">
            <h2 className="section-title">{level?`${level} Workouts For You`:"Featured Workouts"}</h2>
            <button className="section-link" onClick={()=>setPage("Workouts")}>See all →</button>
          </div>
          <div className="grid-3">
            {featuredWorkouts.map(w=>(
              <WorkoutCard key={w.id} w={w} onStart={()=>setPage("Workouts")}/>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURED MEALS */}
      <div style={{background:"var(--bg2)",padding:"60px 0",borderTop:"1px solid var(--border)"}}>
        <div style={{maxWidth:1180,margin:"0 auto",padding:"0 24px"}}>
          <div className="section-label">
            <h2 className="section-title">{diet==="Vegetarian"?"Vegetarian Meal Ideas":"Healthy Meal Ideas"}</h2>
            <button className="section-link" onClick={()=>setPage("Meals")}>See all →</button>
          </div>
          <div className="grid-4">
            {featuredMeals.map(m=>(
              <MealCard key={m.id} m={m} onSave={onToggleMeal} saved={savedMeals?.includes(m.id)} onOpenDetail={setDetailMeal}/>
            ))}
          </div>
        </div>
      </div>

      {/* CTA BAND */}
      <div className="cta-band">
        <div className="cta-band-bg"/>
        <div style={{position:"relative",maxWidth:560,margin:"0 auto"}}>
          <h2 style={{fontSize:"clamp(28px,5vw,44px)",fontWeight:800,color:"var(--text)",marginBottom:14,lineHeight:1.15}}>Ready to build better habits?</h2>
          <p style={{color:"var(--text-mid)",marginBottom:28,lineHeight:1.7}}>Thousands of students are already smashing their goals with FitFuel.</p>
          <button className="btn-primary" style={{fontSize:15,padding:"14px 40px"}} onClick={()=>setPage("Progress")}>Track My Progress</button>
        </div>
      </div>

      <footer style={{background:"var(--bg)",borderTop:"1px solid var(--border)",color:"var(--text-light)",padding:"28px 24px",textAlign:"center"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:6}}>
          <FitFuelLogoMark size={62}/>
          <span style={{fontWeight:700,color:"var(--text-mid)",fontSize:15}}>FitFuel</span>
        </div>
        <p style={{fontSize:13}}>Made for students who want to feel their best.</p>
      </footer>
    </div>
  );
}
