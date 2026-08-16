/* FitFuel — Application root, routing and state
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── APP ROOT ───────────────────────────────────── */
function App(){
  const [page,setPage]=useState("Home");
  const [user,setUser]=useState(null);
  const [settings,setSettings]=useState(()=>{
    const saved=loadSettings(); return saved||{...DEFAULT_SETTINGS};
  });
  const [savedMeals,setSavedMeals]=useState([]);
  const toggleMeal=useCallback(id=>{
    setSavedMeals(prev=>{
      const next=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];
      if(user?.uid) patchUserDoc(user.uid,{savedMealIds:next});
      return next;
    });
  },[user?.uid]);
  const [favoriteWorkouts,setFavoriteWorkouts]=useState([]);
  const toggleFavoriteWorkout=useCallback(id=>{
    setFavoriteWorkouts(prev=>{
      const next=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];
      if(user?.uid) patchUserDoc(user.uid,{favoriteWorkoutIds:next});
      return next;
    });
  },[user?.uid]);
  const [tracker,setTracker]=useState({...DEFAULT_TRACKER});
  const updateTracker=useCallback(patch=>{
    setTracker(prev=>{
      const next={...prev,...patch};
      if(user?.uid) patchUserDoc(user.uid,{tracker:next});
      return next;
    });
  },[user?.uid]);
  const [activities,setActivities]=useState([]);
  const saveActivity=useCallback(activity=>{
    setActivities(prev=>[activity,...prev]);
    autoCompletePlanned(ymd(activity.finishedAt),a=>a.type==="run");
    if(user?.uid) saveDocToUserCollection(user.uid,"activities",activity).catch(err=>console.error("Cloud save failed:",err));
  },[user?.uid]);
  const deleteActivity=useCallback(id=>{
    setActivities(prev=>prev.filter(a=>a.id!==id));
    if(user?.uid) deleteDocFromUserCollection(user.uid,"activities",id).catch(err=>console.error("Cloud delete failed:",err));
  },[user?.uid]);
  const [aiWorkouts,setAiWorkouts]=useState([]);
  const saveAIWorkout=useCallback(w=>{
    setAiWorkouts(prev=>{
      // Feature 8 technical requirement — don't add a near-duplicate if one already exists
      const isDup=[...workoutsData,...prev].some(existing=>existing.name.trim().toLowerCase()===w.name.trim().toLowerCase());
      if(isDup) return prev;
      const withId={id:w.id||("aiw_"+Date.now()),...w};
      if(user?.uid) saveDocToUserCollection(user.uid,"aiWorkouts",withId).catch(err=>console.error("Cloud save failed:",err));
      return [withId,...prev];
    });
  },[user?.uid]);
  const [aiMeals,setAiMeals]=useState([]);
  const saveAIMeal=useCallback(m=>{
    setAiMeals(prev=>{
      const isDup=[...mealsData,...prev].some(existing=>existing.name.trim().toLowerCase()===m.name.trim().toLowerCase());
      if(isDup) return prev;
      const withId={id:m.id||("aim_"+Date.now()),...m};
      if(user?.uid) saveDocToUserCollection(user.uid,"aiMeals",withId).catch(err=>console.error("Cloud save failed:",err));
      return [withId,...prev];
    });
  },[user?.uid]);
  const [trainingPlans,setTrainingPlans]=useState([]);
  const saveTrainingPlan=useCallback(plan=>{
    const isDup=trainingPlans.some(existing=>existing.name.trim().toLowerCase()===(plan.name||"").trim().toLowerCase());
    if(isDup) return false;
    const withId={id:plan.id||("plan_"+Date.now()),...plan};
    setTrainingPlans(prev=>[withId,...prev]);
    if(user?.uid) saveDocToUserCollection(user.uid,"trainingPlans",withId).catch(err=>console.error("Cloud save failed:",err));
    return true;
  },[user?.uid,trainingPlans]);
  const [conversations,setConversations]=useState([]);
  const [plannedActivities,setPlannedActivities]=useState([]);
  const savePlannedActivity=useCallback(act=>{
    setPlannedActivities(prev=>[...prev,act]);
    if(user?.uid) saveDocToUserCollection(user.uid,"plannedActivities",act).catch(err=>console.error("Cloud save failed:",err));
  },[user?.uid]);
  const updatePlannedActivity=useCallback(act=>{
    setPlannedActivities(prev=>prev.map(a=>a.id===act.id?act:a));
    if(user?.uid) saveDocToUserCollection(user.uid,"plannedActivities",act).catch(err=>console.error("Cloud save failed:",err));
  },[user?.uid]);
  const deletePlannedActivity=useCallback(id=>{
    setPlannedActivities(prev=>prev.filter(a=>a.id!==id));
    if(user?.uid) deleteDocFromUserCollection(user.uid,"plannedActivities",id).catch(err=>console.error("Cloud delete failed:",err));
  },[user?.uid]);
  /* Ticks off a matching planned item when the real thing gets finished, so the
     calendar reflects reality without the person marking it done twice. */
  const autoCompletePlanned=useCallback((dateKey,matchFn)=>{
    setPlannedActivities(prev=>prev.map(a=>{
      if(a.date!==dateKey||a.status==="completed"||!matchFn(a)) return a;
      const done={...a,status:"completed",completedAt:new Date().toISOString()};
      if(user?.uid) saveDocToUserCollection(user.uid,"plannedActivities",done).catch(()=>{});
      return done;
    }));
  },[user?.uid]);
  const [workoutSessions,setWorkoutSessions]=useState([]);
  const deleteWorkoutSession=useCallback(id=>{
    setWorkoutSessions(prev=>prev.filter(s=>s.id!==id));
    if(user?.uid) deleteDocFromUserCollection(user.uid,"workoutSessions",id).catch(err=>console.error("Cloud delete failed:",err));
  },[user?.uid]);
  const clearWorkoutHistory=useCallback(()=>{
    const ids=workoutSessions.map(s=>s.id);
    setWorkoutSessions([]);
    if(user?.uid) ids.forEach(id=>deleteDocFromUserCollection(user.uid,"workoutSessions",id).catch(err=>console.error("Cloud delete failed:",err)));
  },[user?.uid,workoutSessions]);
  /* Nutrition logs are keyed by date so a day's entries live in one document —
     cheap to read, and leaves room for future per-entry metadata (barcode, photo). */
  const [nutritionLogs,setNutritionLogs]=useState({});
  const nutritionGoals=useMemo(()=>{
    const custom=user?.nutritionGoals;
    return custom&&!custom.auto?custom:computeNutritionGoals(user);
  },[user]);
  const saveNutritionDay=useCallback(day=>{
    setNutritionLogs(prev=>({...prev,[day.id]:day}));
    if(user?.uid) saveDocToUserCollection(user.uid,"nutritionLogs",day).catch(err=>console.error("Cloud save failed:",err));
  },[user?.uid]);
  /* Saving a session is also what advances every progress metric, so the
     dashboard, streak, and weekly counts update without a refresh. */
  const saveWorkoutSession=useCallback(session=>{
    setWorkoutSessions(prev=>[session,...prev]);
    // Tick off a matching scheduled workout for today, if there is one
    autoCompletePlanned(ymd(session.date),a=>a.type==="workout"&&String(a.workoutId)===String(session.workoutId));
    if(user?.uid) saveDocToUserCollection(user.uid,"workoutSessions",session).catch(err=>console.error("Cloud save failed:",err));
    setTracker(prev=>{
      const dayIdx=(new Date().getDay()+6)%7; // Mon-first week
      const done=[...(prev.done||[false,false,false,false,false,false,false])];
      done[dayIdx]=true;
      const next={...prev,done,wkCt:(prev.wkCt||0)+1};
      if(user?.uid) patchUserDoc(user.uid,{tracker:next});
      return next;
    });
  },[user?.uid]);
  // Conversations update very frequently while a response streams in — this only
  // needs a Firestore write once things settle, not on every token. AICoachPage
  // calls this after a send() completes (see its `streaming` effect) and at a few
  // explicit points like creating/renaming/pinning a chat.
  const syncConversation=useCallback(conv=>{
    if(user?.uid&&conv) saveDocToUserCollection(user.uid,"conversations",conv).catch(err=>console.error("Cloud save failed:",err));
  },[user?.uid]);
  const deleteConversationCloud=useCallback(id=>{
    if(user?.uid) deleteDocFromUserCollection(user.uid,"conversations",id).catch(err=>console.error("Cloud delete failed:",err));
  },[user?.uid]);
  const [pendingWorkoutStart,setPendingWorkoutStart]=useState(null);
  const [pendingMealDetail,setPendingMealDetail]=useState(null);
  useEffect(()=>{ applySettings(settings); },[settings]);
  const handleUpdate=useCallback(next=>{ setSettings(next); saveSettings(next); },[]);
  const [authLoading,setAuthLoading]=useState(true);
  const [publicView,setPublicView]=useState("landing"); // "landing" | "auth" — only used when signed out
  const [authMode,setAuthMode]=useState("login");
  // Single source of truth for auth state: fires on load (checking for an existing
  // session) and on every login/logout. Loads the Firestore profile for a signed-in
  // user, creating it on first login if it doesn't exist yet.
  useEffect(()=>{
    const unsub=firebase.auth().onAuthStateChanged(async fbUser=>{
      if(!fbUser){
        setUser(null); setAuthLoading(false);
        // Clear cloud-backed state on logout so a previous user's data doesn't linger
        setSavedMeals([]); setFavoriteWorkouts([]); setTracker({...DEFAULT_TRACKER});
        setActivities([]); setAiWorkouts([]); setAiMeals([]);
        setTrainingPlans([]); setConversations([]); setWorkoutSessions([]); setNutritionLogs({}); setPlannedActivities([]);
        return;
      }
      try{
        const ref=firebase.firestore().collection("users").doc(fbUser.uid);
        const snap=await ref.get();
        let data;
        if(snap.exists){
          data=snap.data();
        } else {
          data={
            name:fbUser.displayName||"There", email:fbUser.email, avatar:"🧑",
            age:"", height:"", weight:"",
            goals:["Train 3x per week","Drink 8 glasses of water daily"],
            onboarded:false,
            savedMealIds:[], favoriteWorkoutIds:[], tracker:{...DEFAULT_TRACKER},
            aiMemory:[], aiMemoryEnabled:true,
          };
          await ref.set(data);
        }
        setUser({uid:fbUser.uid,...data});
        setSavedMeals(data.savedMealIds||[]);
        setFavoriteWorkouts(data.favoriteWorkoutIds||[]);
        setTracker(data.tracker||{...DEFAULT_TRACKER});
        // Mirror cloud memory into localStorage so the existing loadAIMemory()/
        // loadAIMemoryForContext() reads pick up synced data on a new device.
        // Existing accounts: lift gender out of onboarding answers so Profile and
        // the nutrition maths read from one place.
        if(!data.gender&&data.onboarding?.gender){
          data={...data,gender:data.onboarding.gender};
          ref.set({gender:data.gender},{merge:true}).catch(()=>{});
        }
        saveLS("ff_ai_memory",data.aiMemory||[]);
        saveLS("ff_ai_memory_enabled",data.aiMemoryEnabled!==false);
      }catch(err){
        console.error("Failed to load profile:",err);
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  },[]);
  // Loads the larger per-user collections once we know who's signed in.
  useEffect(()=>{
    if(!user?.uid) return;
    let cancelled=false;
    Promise.all([
      loadUserCollection(user.uid,"activities"),
      loadUserCollection(user.uid,"aiWorkouts"),
      loadUserCollection(user.uid,"aiMeals"),
      loadUserCollection(user.uid,"trainingPlans"),
      loadUserCollection(user.uid,"conversations"),
      loadUserCollection(user.uid,"workoutSessions"),
      loadUserCollection(user.uid,"nutritionLogs"),
      loadUserCollection(user.uid,"plannedActivities"),
    ]).then(([acts,aiW,aiM,plans,convs,sessions,nutri,planActs])=>{
      if(cancelled) return;
      setActivities(acts.sort((a,b)=>new Date(b.finishedAt||0)-new Date(a.finishedAt||0)));
      setAiWorkouts(aiW);
      setAiMeals(aiM);
      setTrainingPlans(plans);
      setConversations(convs.sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0)));
      setWorkoutSessions(sessions.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)));
      setNutritionLogs(Object.fromEntries((nutri||[]).map(d=>[d.id,d])));
      setPlannedActivities(planActs||[]);
    }).catch(err=>console.error("Failed to load cloud data:",err));
    return ()=>{ cancelled=true; };
  },[user?.uid]);
  const logout=()=>{
    firebase.auth().signOut();
    setPage("Home");
    // Land back on the public homepage, not the login form
    setPublicView("landing"); setAuthMode("login");
    window.scrollTo(0,0);
  };
  const updateUser=useCallback(updated=>{
    setUser({...updated});
    if(updated.uid){
      const {uid,...fields}=updated;
      firebase.firestore().collection("users").doc(uid).set(fields,{merge:true})
        .catch(err=>console.error("Failed to save profile:",err));
    }
  },[]);
  const setNutritionGoals=useCallback(goals=>{
    // Snapshot the profile so we can tell later if the inputs behind these
    // custom targets have since changed.
    updateUser({...user,nutritionGoals:{...goals,auto:false,savedFingerprint:nutritionProfileFingerprint(user)}});
  },[user,updateUser]);
  const restoreRecommendedGoals=useCallback(()=>{
    updateUser({...user,nutritionGoals:null});
  },[user,updateUser]);
  const completeOnboarding=answers=>{
    updateUser({
      ...user,
      onboarding:answers,
      onboarded:true,
      goals:buildGoalsFromOnboarding(answers),
      // Personal Info (and the BMI card that reads from it) look at these top-level
      // fields, not user.onboarding — copy them up so onboarding actually feeds BMI.
      age:answers.age||user.age,
      gender:answers.gender||user.gender,
      height:answers.height||user.height,
      weight:answers.weight||user.weight,
    });
  };
  const skipOnboarding=()=>{ updateUser({...user,onboarded:true}); };
  if(authLoading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"var(--bg)",color:"var(--text-mid)",fontSize:14}}>Loading…</div>;
  /* Public experience. Everything below this line requires an account, so an
     unauthenticated visitor can never reach a private page — returning users with
     a live session skip straight past it via onAuthStateChanged above. */
  if(!user){
    if(publicView==="auth") return <AuthPage initialMode={authMode} onBack={()=>{setPublicView("landing");window.scrollTo(0,0);}}/>;
    return <LandingPage
      onSignUp={()=>{setAuthMode("signup");setPublicView("auth");window.scrollTo(0,0);}}
      onLogIn={()=>{setAuthMode("login");setPublicView("auth");window.scrollTo(0,0);}}
    />;
  }
  if(!user.onboarded) return <OnboardingSurvey user={user} onComplete={completeOnboarding} onSkip={skipOnboarding}/>;
  const pages={
    Home:<HomePage plannedActivities={plannedActivities} onStartPlanned={id=>{setPendingWorkoutStart(id);setPage("Workouts");}} todayNutrition={nutritionLogs[todayKey()]} nutritionGoals={nutritionGoals} onQuickWater={ml=>{const k=todayKey();const d=nutritionLogs[k]||emptyNutritionDay(k);saveNutritionDay({...d,waterMl:Math.max(0,(d.waterMl||0)+ml)});}} setPage={setPage} tracker={tracker} savedMeals={savedMeals} onToggleMeal={toggleMeal} user={user} activities={activities} settings={settings}/>,
    Workouts:<WorkoutsPage aiWorkouts={aiWorkouts} settings={settings} favoriteWorkouts={favoriteWorkouts} onToggleFavoriteWorkout={toggleFavoriteWorkout} pendingWorkoutStart={pendingWorkoutStart} onConsumePendingWorkoutStart={()=>setPendingWorkoutStart(null)} workoutSessions={workoutSessions} onSaveWorkoutSession={saveWorkoutSession} setPage={setPage}/>,
    Activity:<ActivityTrackerPage user={user} activities={activities} onSaveActivity={saveActivity} onDeleteActivity={deleteActivity} settings={settings}/>,
    Coach:<AICoachPage nutritionGoals={nutritionGoals} todayNutrition={nutritionLogs[todayKey()]} workoutSessions={workoutSessions} user={user} tracker={tracker} activities={activities} savedMeals={savedMeals} aiWorkouts={aiWorkouts} aiMeals={aiMeals} favoriteWorkouts={favoriteWorkouts} settings={settings} setPage={setPage} onSaveAIWorkout={saveAIWorkout} onSaveAIMeal={saveAIMeal} onToggleMeal={toggleMeal} onToggleFavoriteWorkout={toggleFavoriteWorkout} onStartWorkout={id=>{setPendingWorkoutStart(id);setPage("Workouts");}} onOpenMealDetail={id=>{setPendingMealDetail(id);setPage("Meals");}} conversations={conversations} setConversations={setConversations} onSyncConversation={syncConversation} onDeleteConversationCloud={deleteConversationCloud} trainingPlans={trainingPlans} onSaveTrainingPlan={saveTrainingPlan}/>,
    Meals:<MealsPage savedMeals={savedMeals} onToggleMeal={toggleMeal} user={user} aiMeals={aiMeals} settings={settings} pendingMealDetail={pendingMealDetail} onConsumePendingMealDetail={()=>setPendingMealDetail(null)}/>,
    Nutrition:<NutritionPage setPage={setPage} onRestoreRecommended={restoreRecommendedGoals} user={user} nutritionLogs={nutritionLogs} nutritionGoals={nutritionGoals} onSaveDay={saveNutritionDay} onSetGoals={setNutritionGoals} activities={activities} workoutSessions={workoutSessions} savedMeals={savedMeals} aiMeals={aiMeals} settings={settings}/>,
    Progress:<ProgressPage tracker={tracker} onUpdateTracker={updateTracker} workoutSessions={workoutSessions} onDeleteSession={deleteWorkoutSession} onClearHistory={clearWorkoutHistory} plannedActivities={plannedActivities} onSavePlanned={savePlannedActivity} onUpdatePlanned={updatePlannedActivity} onDeletePlanned={deletePlannedActivity} aiWorkouts={aiWorkouts} setPage={setPage} onStartWorkout={id=>{setPendingWorkoutStart(id);setPage("Workouts");}}/>,
    Profile:<ProfilePage nutritionGoals={nutritionGoals} setPage={setPage} user={user} onUpdateUser={updateUser} onLogout={logout} tracker={tracker} activities={activities} settings={settings}/>,
    Settings:<SettingsPage settings={settings} onUpdate={handleUpdate} user={user}/>,
  };
  return(
    <>
      <Nav page={page} setPage={setPage} user={user} onLogout={logout}/>
      <main>{pages[page]||<HomePage setPage={setPage} tracker={tracker} savedMeals={savedMeals} user={user} activities={activities} settings={settings}/>}</main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
