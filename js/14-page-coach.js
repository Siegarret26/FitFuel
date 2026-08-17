/* FitFuel — AI Coach conversations and tools
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── AI CONVERSATION SIDEBAR (Feature 2) ─────────── */
function AIConversationSidebar({conversations,activeId,onSelect,onNew,onRename,onDelete,onPin,mobileOpen,onCloseMobile}){
  const [search,setSearch]=useState("");
  const [renamingId,setRenamingId]=useState(null);
  const [renameText,setRenameText]=useState("");
  const [confirmDeleteId,setConfirmDeleteId]=useState(null);

  const filtered=conversations.filter(c=>c.title.toLowerCase().includes(search.toLowerCase()));
  const sorted=[...filtered].sort((a,b)=>{
    if(!!a.pinned!==!!b.pinned) return a.pinned?-1:1;
    return new Date(b.updatedAt)-new Date(a.updatedAt);
  });
  const startRename=c=>{ setRenamingId(c.id); setRenameText(c.title); };
  const commitRename=c=>{ if(renameText.trim()) onRename(c.id,renameText.trim()); setRenamingId(null); };

  return(
    <>
      {mobileOpen&&<div className="ai-sidebar-backdrop" onClick={onCloseMobile}/>}
      <div className={"ai-sidebar"+(mobileOpen?" mobile-open":"")}>
        <div className="ai-sidebar-head">
          <button className="btn-primary ai-new-chat-btn" onClick={onNew}>+ New Chat</button>
          <button className="ai-sidebar-close-mobile" onClick={onCloseMobile} aria-label="Close sidebar">✕</button>
        </div>
        <div className="ai-sidebar-search">
          <span>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations…"/>
        </div>
        <div className="ai-sidebar-list">
          {sorted.length===0&&<p className="ai-sidebar-empty">{conversations.length===0?"No conversations yet — start one above.":"No matches."}</p>}
          {sorted.map(c=>(
            <div key={c.id} className={"ai-conv-item"+(c.id===activeId?" active":"")} onClick={()=>{if(renamingId!==c.id) onSelect(c.id);}}>
              {renamingId===c.id ? (
                <input className="ai-conv-rename-input" autoFocus value={renameText} onChange={e=>setRenameText(e.target.value)}
                  onBlur={()=>commitRename(c)} onKeyDown={e=>{if(e.key==="Enter")commitRename(c);if(e.key==="Escape")setRenamingId(null);}}
                  onClick={e=>e.stopPropagation()}/>
              ) : (
                <span className="ai-conv-title">{c.pinned&&"📌 "}{c.title}</span>
              )}
              <div className="ai-conv-actions" onClick={e=>e.stopPropagation()}>
                <button onClick={()=>onPin(c.id)} title={c.pinned?"Unpin":"Pin"}>{c.pinned?"📌":"📍"}</button>
                <button onClick={()=>startRename(c)} title="Rename">✏️</button>
                {confirmDeleteId===c.id
                  ? <button onClick={()=>{onDelete(c.id);setConfirmDeleteId(null);}} className="ai-conv-del-confirm" title="Confirm delete">✓</button>
                  : <button onClick={()=>setConfirmDeleteId(c.id)} title="Delete">🗑</button>
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function AICoachPage({user,tracker,activities,savedMeals,settings,setPage,onSaveAIWorkout,onSaveAIMeal,aiWorkouts=[],aiMeals=[],favoriteWorkouts=[],onToggleMeal,onToggleFavoriteWorkout,onStartWorkout,onOpenMealDetail,conversations,setConversations,onSyncConversation,onDeleteConversationCloud,trainingPlans=[],onSaveTrainingPlan,nutritionGoals,todayNutrition,workoutSessions=[]}){
  const apiKey=settings.aiApiKey;
  const model=settings.aiModel;
  const [tool,setTool]=useState(null);
  const [activeConvId,setActiveConvId]=useState(null);
  const [input,setInput]=useState("");
  const [streaming,setStreaming]=useState(false);
  const [attachedImage,setAttachedImage]=useState(null);
  const [sidebarMobileOpen,setSidebarMobileOpen]=useState(false);
  const bottomRef=useRef(null);
  const fileInputRef=useRef(null);
  const memoryEnabled=loadAIMemoryEnabled();
  const aiMemory=loadAIMemoryForContext();
  const allWorkoutsForContext=[...workoutsData,...aiWorkouts];
  const favoriteWorkoutNames=favoriteWorkouts.map(id=>allWorkoutsForContext.find(w=>w.id===id)?.name).filter(Boolean);
  const nutritionContext=useMemo(()=>{
    if(!nutritionGoals) return null;
    const d=todayNutrition||emptyNutritionDay();
    return { goals:nutritionGoals, totals:sumNutrition(d.entries), waterMl:d.waterMl||0,
      burned:burnedOnDate(todayKey(),activities,workoutSessions), entryCount:(d.entries||[]).length,
      loggedMeals:(d.entries||[]).map(e=>`${e.slot}: ${e.name} (${Math.round((e.cal||0)*(e.servings||1))} kcal)`) };
  },[nutritionGoals,todayNutrition,activities,workoutSessions]);
  const contextSummary=buildUserContextSummary(user,tracker,activities,savedMeals,aiMemory,favoriteWorkoutNames,nutritionContext);
  const suggestedPrompts=["Create today's workout.","Build me a meal plan.","Explain deadlifts.","Help me lose weight.","Improve my running pace.","Analyse my progress.","Give me motivation.","Recommend recovery exercises."];
  const welcomeStat=computeWelcomeStatLine(tracker,activities);

  const activeConv=conversations.find(c=>c.id===activeConvId)||null;
  const messages=activeConv?.messages||[];

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages.length,streaming]);

  const updateConv=(id,updaterFn)=>{
    setConversations(prev=>prev.map(c=>c.id===id?updaterFn(c):c));
  };
  const startNewChat=()=>{
    const conv=makeNewConversation();
    setConversations(prev=>[conv,...prev]);
    onSyncConversation(conv);
    setActiveConvId(conv.id); setTool(null); setSidebarMobileOpen(false);
  };
  const selectConv=id=>{ setActiveConvId(id); setTool(null); setSidebarMobileOpen(false); };
  const renameConv=(id,title)=>{
    updateConv(id,c=>({...c,title}));
    const conv=conversations.find(c=>c.id===id);
    if(conv) onSyncConversation({...conv,title});
  };
  const deleteConv=id=>{
    setConversations(prev=>prev.filter(c=>c.id!==id));
    onDeleteConversationCloud(id);
    if(activeConvId===id) setActiveConvId(null);
  };
  const pinConv=id=>{
    updateConv(id,c=>({...c,pinned:!c.pinned}));
    const conv=conversations.find(c=>c.id===id);
    if(conv) onSyncConversation({...conv,pinned:!conv.pinned});
  };
  const saveGeneratedPlan=plan=>{ onSaveTrainingPlan(plan); };
  // Once a response finishes (streaming or a one-shot card), persist the active
  // conversation's current state to Firestore in a single write — not on every token.
  useEffect(()=>{
    if(streaming) return;
    if(!activeConvId) return;
    const conv=conversations.find(c=>c.id===activeConvId);
    if(conv) onSyncConversation(conv);
    // eslint-disable-next-line
  },[streaming]);

  const handleImageSelect=e=>{
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>setAttachedImage({dataUrl:reader.result,name:file.name});
    reader.readAsDataURL(file);
    e.target.value="";
  };

  const cardProps={
    onStartWorkout,
    onOpenMealDetail,
    onToggleMeal,
    onToggleFavoriteWorkout,
    favoriteWorkouts,
    savedMeals,
    onSaveGeneratedWorkout:onSaveAIWorkout,
    onSaveGeneratedMeal:onSaveAIMeal,
    onSaveGeneratedPlan:saveGeneratedPlan,
  };

  const send=async(rawText)=>{
    const text=(rawText!==undefined?rawText:input).trim();
    if(!text&&!attachedImage) return;
    let convId=activeConvId;
    let priorMessages=messages;
    if(!convId){
      const conv=makeNewConversation();
      setConversations(prev=>[conv,...prev]);
      onSyncConversation(conv);
      setActiveConvId(conv.id);
      convId=conv.id; priorMessages=[];
    }
    setTool(null);
    if(!apiKey){
      updateConv(convId,c=>({...c,messages:[...c.messages,{role:"user",content:text},{role:"assistant",content:"I don't have a Gemini API key yet — add one in Settings → AI Coach to start chatting."}],updatedAt:new Date().toISOString()}));
      setInput(""); return;
    }
    const userContent=attachedImage
      ?[{type:"text",text:text||"What can you tell me about this?"},{type:"image_url",image_url:{url:attachedImage.dataUrl}}]
      :text;
    const userMsg={role:"user",content:userContent};
    const historyForApi=[...priorMessages.filter(m=>m.role!=="system-note"),userMsg];
    const hadImage=!!attachedImage;
    const isFirstMessage=priorMessages.length===0;

    updateConv(convId,c=>({...c,messages:[...c.messages,userMsg],updatedAt:new Date().toISOString()}));
    setInput(""); setAttachedImage(null); setStreaming(true);

    const finishFirstMessageChores=async(assistantTextForMemory)=>{
      if(isFirstMessage){
        const title=await generateConversationTitle({apiKey,model,firstUserMessage:userMsg.content});
        if(title) updateConv(convId,c=>({...c,title}));
      }
      if(memoryEnabled&&!hadImage&&assistantTextForMemory!==undefined&&text.length>=18){
        const note=await extractMemoryFromExchange({apiKey,model,userText:text,assistantText:assistantTextForMemory});
        if(note){
          const mem=loadAIMemory();
          saveAIMemoryLS([...mem,{id:"mem_"+Date.now(),text:note,source:"ai",addedAt:new Date().toISOString()}],user?.uid);
          updateConv(convId,c=>({...c,messages:[...c.messages,{role:"system-note",content:`🧠 Remembered: ${note}`}]}));
        }
      }
    };

    /* Feature 7 — one call classifies intent AND (for workout/meal/plan) searches the library
       then generates if needed, instead of two separate round trips. Image messages always go
       straight to normal chat, since vision analysis isn't a library-search scenario. */
    let dispatch;
    if(hadImage){
      dispatch={intent:"chat"};
    } else {
      try{
        const allMealsForContext=[...mealsData,...aiMeals];
        dispatch=await classifyAndFulfill({
          apiKey, model, userText:text, contextSummary,
          workoutCatalog:buildCompactWorkoutCatalog(allWorkoutsForContext),
          mealCatalog:buildCompactMealCatalog(allMealsForContext),
          planCatalog:buildCompactPlanCatalog(trainingPlans),
        });
      }catch{ dispatch={intent:"chat"}; }
    }
    const intent=dispatch?.intent||"chat";

    if(intent==="workout"||intent==="meal"||intent==="plan"){
      try{
        let matchedItem=null;
        if(dispatch.found){
          if(intent==="workout") matchedItem=allWorkoutsForContext.find(w=>String(w.id)===String(dispatch.matchedId));
          else if(intent==="meal") matchedItem=[...mealsData,...aiMeals].find(m=>String(m.id)===String(dispatch.matchedId));
          else matchedItem=trainingPlans.find(p=>String(p.id)===String(dispatch.matchedId));
        }
        const found=dispatch.found&&matchedItem;
        const card={type:intent,source:found?"library":"generated",data:found?matchedItem:dispatch.generated};
        const cardMsg={role:"assistant",content:dispatch.reply||"Here's what I found:",card};
        updateConv(convId,c=>({...c,messages:[...c.messages,cardMsg],updatedAt:new Date().toISOString()}));
        setStreaming(false);
        await finishFirstMessageChores(dispatch.reply);
      }catch(err){
        updateConv(convId,c=>({...c,messages:[...c.messages,{role:"assistant",content:`⚠️ ${err.message||"Something went wrong."}`}],updatedAt:new Date().toISOString()}));
        setStreaming(false);
      }
      return;
    }
    if(intent==="report"){
      try{
        const data=await generateWeeklyReportCard({apiKey,model,contextSummary,tracker,activities,user});
        const cardMsg={role:"assistant",content:"Here's your weekly report, straight from your real FitFuel data:",card:{type:"report",source:"generated",data}};
        updateConv(convId,c=>({...c,messages:[...c.messages,cardMsg],updatedAt:new Date().toISOString()}));
        setStreaming(false);
        await finishFirstMessageChores(cardMsg.content);
      }catch(err){
        updateConv(convId,c=>({...c,messages:[...c.messages,{role:"assistant",content:`⚠️ ${err.message||"Something went wrong."}`}],updatedAt:new Date().toISOString()}));
        setStreaming(false);
      }
      return;
    }

    /* Plain conversational chat — real token-by-token streaming */
    updateConv(convId,c=>({...c,messages:[...c.messages,{role:"assistant",content:""}],updatedAt:new Date().toISOString()}));
    const sys={role:"system",content:buildSystemPrompt(contextSummary,hadImage
      ?"The user attached an image. If it's a meal photo, estimate calories/protein/carbs/fat and serving size, then suggest one healthier swap. If it's an exercise photo, give general technique feedback (positioning, stability, range of motion) and include a brief disclaimer that this is informational only and not a substitute for a coach or physiotherapist. Never make medical claims from photos."
      :"Chat naturally as the person's fitness coach. Keep responses focused and not overly long unless asked for detail.")};

    streamGeminiChat({
      apiKey, model, messages:[sys,...historyForApi],
      onToken:(_,full)=>updateConv(convId,c=>{ const msgs=[...c.messages]; msgs[msgs.length-1]={role:"assistant",content:full}; return {...c,messages:msgs}; }),
      onDone:async(fullText)=>{
        setStreaming(false);
        await finishFirstMessageChores(fullText);
      },
      onError:err=>{
        setStreaming(false);
        updateConv(convId,c=>{ const msgs=[...c.messages]; msgs[msgs.length-1]={role:"assistant",content:`⚠️ ${err}`}; return {...c,messages:msgs}; });
      },
    });
  };

  const tools=[
    {id:"workout",label:"🏋️ Workout"},
    {id:"meal",label:"🥗 Meal Plan"},
    {id:"plan",label:"🏃 Training Plan"},
    {id:"report",label:"Weekly Report"},
    {id:"photos",label:"📸 Progress Photos"},
  ];
  const firstName=user?.name?user.name.split(" ")[0]:"there";

  if(!apiKey){
    return(
      <div className="page-wrap">
        <div className="page-header fade-up"><h1 className="page-title">AI Coach</h1><p className="page-sub">Your personal fitness coach, powered by Gemini (free, no card needed).</p></div>
        <div className="card" style={{padding:"46px 24px",textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:14}}>🔑</div>
          <h2 style={{fontSize:18,fontWeight:800,color:"var(--text)",marginBottom:10}}>Connect Your Gemini API Key</h2>
          <p style={{color:"var(--text-mid)",fontSize:14,maxWidth:420,margin:"0 auto 22px",lineHeight:1.6}}>FitFuel has no server, so the AI Coach calls Gemini straight from your browser using your own key. Add one in Settings to unlock workout generation, meal planning, running analysis, and more.</p>
          <button className="btn-primary" onClick={()=>setPage("Settings")}>Go to Settings</button>
        </div>
      </div>
    );
  }

  return(
    <div className="ai-coach-page">
      <div className="ai-coach-bg" aria-hidden="true"/>
      <div className="ai-coach-content">
        <div className="page-header fade-up ai-coach-header">
          <div>
            <h1 className="page-title">AI Coach</h1>
            <p className="page-sub">Personalised coaching, workouts, meals, and training plans.</p>
          </div>
          <button className="ai-sidebar-toggle-mobile" onClick={()=>setSidebarMobileOpen(true)}>Conversations</button>
        </div>

        <div className="ai-coach-layout">
          <AIConversationSidebar
            conversations={conversations} activeId={activeConvId}
            onSelect={selectConv} onNew={startNewChat} onRename={renameConv} onDelete={deleteConv} onPin={pinConv}
            mobileOpen={sidebarMobileOpen} onCloseMobile={()=>setSidebarMobileOpen(false)}
          />

          <div className="ai-coach-main">
            <div className="ai-tool-tabs">
              <button className={"ai-tool-tab"+(tool===null?" active":"")} onClick={()=>setTool(null)}>Chat</button>
              {tools.map(t=><button key={t.id} className={"ai-tool-tab"+(tool===t.id?" active":"")} onClick={()=>setTool(t.id)}>{t.label}</button>)}
            </div>

            {tool==="workout"&&<AIWorkoutGenerator apiKey={apiKey} model={model} contextSummary={contextSummary} onSaveWorkout={onSaveAIWorkout}/>}
            {tool==="meal"&&<AIMealGenerator apiKey={apiKey} model={model} contextSummary={contextSummary} onSaveMeal={onSaveAIMeal}/>}
            {tool==="plan"&&<AITrainingPlanGenerator apiKey={apiKey} model={model} contextSummary={contextSummary} onSave={onSaveTrainingPlan}/>}
            {tool==="report"&&<AIWeeklyReport apiKey={apiKey} model={model} contextSummary={contextSummary}/>}
            {tool==="photos"&&<AIProgressPhotos apiKey={apiKey} model={model}/>}

            {tool===null&&activeConvId===null&&(
              <div className="ai-welcome-screen scale-in">
                <div className="ai-welcome-greeting">{timeGreeting()}, {firstName} 👋</div>
                <p className="ai-welcome-sub">{conversations.length===0?"I'm your FitFuel AI coach — let's get started.":"Welcome back to FitFuel AI."}</p>
                {welcomeStat&&<p className="ai-welcome-stat">{welcomeStat}</p>}
                <p className="ai-welcome-question">What would you like to work on today?</p>
                <div className="ai-welcome-actions">
                  <button onClick={()=>setTool("workout")}>Create Today's Workout</button>
                  <button onClick={()=>setTool("meal")}>Build a Meal Plan</button>
                  <button onClick={()=>setTool("report")}>Analyse My Progress</button>
                  <button onClick={()=>send("How can I improve my running performance based on my recent activity data?")}>Running Coach</button>
                  <button onClick={startNewChat}>Ask Anything</button>
                </div>
                <div className="ai-welcome-suggested">
                  {suggestedPrompts.map(p=><button key={p} type="button" className="onboarding-chip" onClick={()=>send(p)}>{p}</button>)}
                </div>
              </div>
            )}

            {tool===null&&activeConvId!==null&&(
              <div className="ai-chat-wrap">
                <div className="ai-chat-history">
                  {messages.map((m,i)=><ChatMessageBubble key={i} msg={m} cardProps={cardProps}/>)}
                  {streaming&&messages[messages.length-1]?.content===""&&<div className="ai-typing-indicator"><span/><span/><span/></div>}
                  <div ref={bottomRef}/>
                </div>
                {attachedImage&&(
                  <div className="ai-attach-preview">
                    <img src={attachedImage.dataUrl} alt="Attached preview"/>
                    <button onClick={()=>setAttachedImage(null)}>✕</button>
                  </div>
                )}
                <div className="ai-chat-input-row">
                  <button className="ai-attach-btn" onClick={()=>fileInputRef.current?.click()} title="Attach a meal or exercise photo" type="button">📷</button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImageSelect}/>
                  <input className="ai-chat-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask your AI coach anything…" disabled={streaming}/>
                  <button className="btn-primary ai-send-btn" onClick={()=>send()} disabled={streaming||(!input.trim()&&!attachedImage)}>➤</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({user,onUpdateUser,onLogout,tracker,activities=[],settings={},nutritionGoals,setPage}){
  const [editing,setEditing]=useState(false);
  const [showAv,setShowAv]=useState(false);
  const [draft,setDraft]=useState({...user});
  const [goals,setGoals]=useState(user.goals||[]);
  const [ng,setNg]=useState("");
  const [savedMsg,setSavedMsg]=useState(false);
  const [aiBreakdownLoading,setAiBreakdownLoading]=useState(false);
  const [aiBreakdownError,setAiBreakdownError]=useState("");
  const addGoal=()=>{if(ng.trim()){const g=[...goals,ng.trim()];setGoals(g);setNg("");onUpdateUser({...user,goals:g});}};
  const addGoalWithAI=async()=>{
    if(!ng.trim()) return;
    if(!settings.aiApiKey){ setAiBreakdownError("Add a Gemini API key in Settings → AI Coach to use this."); return; }
    setAiBreakdownLoading(true); setAiBreakdownError("");
    try{
      const sys=`Break a fitness/health goal into 3-5 short, concrete, achievable milestones. Respond with strict JSON only: {"milestones":["...","..."]}.`;
      const data=await completeGeminiJSON({apiKey:settings.aiApiKey,model:settings.aiModel,messages:[{role:"system",content:sys},{role:"user",content:`Goal: "${ng.trim()}"`}]});
      const milestones=(data.milestones||[]).map(m=>({label:m,done:false}));
      const goalObj={text:ng.trim(),milestones,aiGenerated:true};
      const g=[...goals,goalObj]; setGoals(g); setNg(""); onUpdateUser({...user,goals:g});
    }catch(err){ setAiBreakdownError(err.message||"Something went wrong."); }
    finally{ setAiBreakdownLoading(false); }
  };
  const toggleMilestone=(gi,mi)=>{
    const g=goals.map((goal,i)=>{
      if(i!==gi||typeof goal==="string") return goal;
      return {...goal,milestones:goal.milestones.map((m,j)=>j===mi?{...m,done:!m.done}:m)};
    });
    setGoals(g); onUpdateUser({...user,goals:g});
  };
  const rmGoal=i=>{const g=goals.filter((_,j)=>j!==i);setGoals(g);onUpdateUser({...user,goals:g});};
  const saveEdits=()=>{onUpdateUser({...draft,goals});setSavedMsg(true);setEditing(false);setShowAv(false);setTimeout(()=>setSavedMsg(false),2500);};
  const updateDraft=useCallback((field,val)=>setDraft(d=>({...d,[field]:val})),[]);
  const streak=tracker?tracker.done.filter(Boolean).length:0;
  const actStats=aggregateActivityStats(activities);
  const getBMICategory=bmi=>{
    if(bmi<18.5)return{label:"Underweight",color:"var(--blue)"};
    if(bmi<25)return{label:"Healthy Weight",color:"#38D978"};
    if(bmi<30)return{label:"Overweight",color:"#EAB308"};
    return{label:"Obese",color:"var(--accent)"};
  };
  const bmi=(draft.height&&draft.weight)?parseFloat((draft.weight/(draft.height/100)**2).toFixed(1)):null;
  const bmiCat=bmi?getBMICategory(bmi):null;
  const bmiPct=bmi?Math.min(100,Math.max(0,((bmi-15)/25)*100)):0;
  return(
    <div className="page-wrap">
      {/* HEADER */}
      <div className="profile-header fade-up mb-24">
        <div className="profile-header-glow"/>
        <div style={{display:"flex",alignItems:"flex-start",gap:22,flexWrap:"wrap",position:"relative"}}>
          <div style={{position:"relative",flexShrink:0}}>
            <div className="profile-avatar">{draft.avatar}</div>
            {editing&&<button onClick={()=>setShowAv(!showAv)} style={{position:"absolute",bottom:0,right:0,width:28,height:28,borderRadius:"50%",background:"var(--accent)",border:"2px solid var(--card)",color:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✏</button>}
          </div>
          <div style={{flex:1,minWidth:180}}>
            {editing
              ? <input value={draft.name||""} onChange={e=>setDraft({...draft,name:e.target.value})} style={{...profileInputStyle,fontSize:22,fontWeight:800,marginBottom:6,fontFamily:"'Manrope',sans-serif"}}/>
              : <h1 style={{fontSize:26,fontWeight:800,color:"var(--text)",marginBottom:4}}>{draft.name||"Unnamed"}</h1>
            }
            <p style={{color:"var(--text-mid)",fontSize:13,marginBottom:16}}>{user.email}</p>
            <div style={{display:"flex",gap:24,flexWrap:"wrap",paddingTop:12,borderTop:"1px solid var(--border)"}}>
              {[{val:tracker?.wkCt||0,label:"Workouts"},{val:streak,label:"Day Streak"},{val:streak,label:"Active Days"}].map(s=>(
                <div key={s.label} className="profile-stat"><div className="profile-stat-val">{s.val}</div><div className="profile-stat-label">{s.label}</div></div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            {savedMsg&&<div style={{padding:"8px 16px",background:"rgba(56,217,120,0.12)",borderRadius:20,fontSize:13,fontWeight:600,color:"#38D978",border:"1px solid rgba(56,217,120,0.2)"}}>✓ Saved!</div>}
            {editing
              ? <><button onClick={()=>{setEditing(false);setDraft({...user});setShowAv(false);}} className="btn-secondary" style={{padding:"9px 20px",fontSize:14}}>Cancel</button>
                  <button className="btn-primary" onClick={saveEdits} style={{padding:"9px 20px",fontSize:14}}>Save Changes</button></>
              : <><button onClick={()=>setEditing(true)} className="btn-secondary" style={{padding:"9px 20px",fontSize:14}}>Edit Profile</button>
                  <button onClick={onLogout} className="btn-ghost" style={{padding:"9px 18px",fontSize:14,border:"1px solid var(--border-strong)",borderRadius:50}}>Log Out</button></>
            }
          </div>
        </div>
        {showAv&&editing&&(
          <div style={{marginTop:20,background:"var(--bg3)",borderRadius:16,padding:16,border:"1px solid var(--border)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-mid)",marginBottom:12,letterSpacing:"0.07em"}}>PICK AVATAR</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {AVATARS.map(a=><button key={a} onClick={()=>setDraft({...draft,avatar:a})} style={{fontSize:22,background:draft.avatar===a?"var(--accent-tint-2)":"var(--card)",border:`2px solid ${draft.avatar===a?"var(--accent)":"var(--border-strong)"}`,borderRadius:10,width:42,height:42,cursor:"pointer",transition:"all 0.15s"}}>{a}</button>)}
            </div>
          </div>
        )}
        {/* Interest tags */}
        <div style={{marginTop:16,display:"flex",gap:8,flexWrap:"wrap"}}>
          {["🏃 Runner","💪 Strength","🥗 Clean Eating"].map(b=>(
            <span key={b} style={{padding:"5px 14px",borderRadius:20,background:"var(--accent-tint-1)",border:"1px solid var(--accent-tint-2)",fontSize:12,fontWeight:600,color:"var(--accent)"}}>{b}</span>
          ))}
        </div>
      </div>

      <div className="grid-3 mb-24">
        {/* PERSONAL INFO */}
        <div className="card" style={{padding:28}}>
          <h3 className="ff-heading mb-24" style={{fontSize:17,color:"var(--text)"}}>Personal Info</h3>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <ProfileField label="AGE"    field="age"    placeholder="e.g. 17"  type="number" unit="yrs" editing={editing} value={draft.age}    onChange={updateDraft}/>
            <ProfileField label="GENDER" field="gender" placeholder="Prefer not to say" editing={editing} value={draft.gender} onChange={updateDraft}
              options={["Male","Female","Other","Prefer not to say"]} emptyText="Not provided"/>
            <ProfileField label="HEIGHT" field="height" placeholder="e.g. 170" type="number" unit="cm"  editing={editing} value={draft.height} onChange={updateDraft}/>
            <ProfileField label="WEIGHT" field="weight" placeholder="e.g. 65"  type="number" unit="kg"  editing={editing} value={draft.weight} onChange={updateDraft}/>
          </div>
        </div>

        {/* NUTRITION GOALS — entry point for anyone who skipped onboarding (PRD §2) */}
        <div className="card" style={{padding:28}}>
          <h3 className="ff-heading mb-16" style={{fontSize:17,color:"var(--text)"}}>Nutrition Goals</h3>
          {nutritionGoals?.missing?.length>0
            ? <>
                <p style={{fontSize:13.5,color:"var(--text-mid)",lineHeight:1.65,marginBottom:16}}>
                  FitFuel can estimate your daily calorie and macro targets, but it still needs your{" "}
                  <strong style={{color:"var(--text)"}}>{nutritionGoals.missing.join(", ")}</strong>.
                  Add {nutritionGoals.missing.length===1?"it":"them"} above and your targets are generated automatically.
                </p>
                <button className="btn-primary" style={{width:"100%",fontSize:13.5,padding:12}} onClick={()=>setEditing(true)}>
                  Set up my targets
                </button>
              </>
            : <>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
                  <span className="workout-meta-chip">🔥 {nutritionGoals?.calories} kcal</span>
                  <span className="workout-meta-chip">💪 {nutritionGoals?.protein}g protein</span>
                  <span className="workout-meta-chip">🍚 {nutritionGoals?.carbs}g carbs</span>
                  <span className="workout-meta-chip">🥑 {nutritionGoals?.fat}g fat</span>
                  <span className="workout-meta-chip">💧 {((nutritionGoals?.waterMl||0)/1000).toFixed(1)}L</span>
                </div>
                <p style={{fontSize:12.5,color:"var(--text-light)",lineHeight:1.6,marginBottom:16}}>
                  {nutritionGoals?.auto
                    ? "Estimated from your profile. These are general estimates, not medical advice."
                    : "You've customised these targets."}
                </p>
                <button className="btn-secondary" style={{width:"100%",fontSize:13.5,padding:12}} onClick={()=>setPage&&setPage("Nutrition")}>
                  View nutrition dashboard →
                </button>
              </>}
        </div>

        {/* BMI CARD */}
        <div className="card" style={{padding:28}}>
          <h3 className="ff-heading mb-16" style={{fontSize:17,color:"var(--text)"}}>Health &amp; BMI</h3>
          {bmi?(
            <div>
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:52,fontWeight:800,color:bmiCat.color,lineHeight:1,fontFamily:"'Bebas Neue',sans-serif"}}>{bmi}</div>
                <div style={{fontSize:13,fontWeight:700,color:bmiCat.color,marginTop:4}}>{bmiCat.label}</div>
                <div style={{fontSize:11,color:"var(--text-light)",marginTop:2}}>Body Mass Index</div>
              </div>
              <div style={{marginBottom:8}}>
                <div className="bmi-track">
                  <div className="bmi-fill" style={{width:`${bmiPct}%`,background:`linear-gradient(to right, var(--blue), #38D978, #EAB308, var(--accent))`}}/>
                  <div className="bmi-marker" style={{left:`${bmiPct}%`}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:10,color:"var(--text-light)",fontWeight:600}}>
                  <span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span>
                </div>
              </div>
            </div>
          ):(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:36,marginBottom:12}}>📊</div>
              <p style={{fontSize:14,color:"var(--text-mid)",lineHeight:1.6}}>Enter your height and weight in Personal Info to see your BMI and health metrics.</p>
              <button onClick={()=>setEditing(true)} className="btn-primary" style={{marginTop:16,fontSize:13,padding:"10px 22px"}}>Complete Profile</button>
            </div>
          )}
        </div>

        {/* GOALS */}
        <div className="card" style={{padding:28}}>
          <h3 className="ff-heading mb-20" style={{fontSize:17,color:"var(--text)"}}>My Goals</h3>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
            {goals.map((g,i)=>{
              const isObj=typeof g!=="string";
              const text=isObj?g.text:g;
              const doneCount=isObj?g.milestones.filter(m=>m.done).length:0;
              return(
                <div key={i} className="goal-item" style={{flexDirection:"column",alignItems:"stretch"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div className="goal-check">{isObj?"🎯":"✓"}</div>
                    <span style={{flex:1,fontSize:14,color:"var(--text)",fontWeight:isObj?700:400}}>
                      {text}{isObj&&<span style={{fontSize:11,color:"var(--text-mid)",fontWeight:500,marginLeft:8}}>{doneCount}/{g.milestones.length} done</span>}
                    </span>
                    <button onClick={()=>rmGoal(i)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-light)",fontSize:20,lineHeight:1,padding:"0 4px"}}>×</button>
                  </div>
                  {isObj&&(
                    <div style={{marginTop:8,marginLeft:34,display:"flex",flexDirection:"column",gap:6}}>
                      {g.milestones.map((m,mi)=>(
                        <label key={mi} style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5,color:m.done?"var(--text-mid)":"var(--text)",textDecoration:m.done?"line-through":"none",cursor:"pointer"}}>
                          <input type="checkbox" checked={m.done} onChange={()=>toggleMilestone(i,mi)}/>
                          {m.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {goals.length===0&&<p style={{color:"var(--text-light)",fontSize:13,textAlign:"center",padding:"12px 0"}}>No goals yet!</p>}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input value={ng} onChange={e=>setNg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addGoal()} placeholder="Add a new goal…" style={{flex:1,minWidth:160,padding:"10px 14px",borderRadius:50,border:"1.5px solid var(--border-strong)",fontSize:13,background:"var(--bg3)",color:"var(--text)"}}/>
            <button className="btn-primary" style={{padding:"10px 18px",fontSize:13}} onClick={addGoal}>Add</button>
            <button className="btn-secondary" style={{padding:"10px 18px",fontSize:13,whiteSpace:"nowrap"}} onClick={addGoalWithAI} disabled={aiBreakdownLoading}>{aiBreakdownLoading?"…":"✨ Break down with AI"}</button>
          </div>
          {aiBreakdownError&&<p style={{fontSize:12,color:"var(--accent)",marginTop:8}}>{aiBreakdownError}</p>}
        </div>
      </div>

      {/* THIS WEEK */}
      <div className="card" style={{padding:28}}>
        <h3 className="ff-heading mb-24" style={{fontSize:17,color:"var(--text)"}}>This Week</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16}}>
          {[
            {label:"Workouts",val:tracker?.wkCt||0,max:5,col:"var(--accent)",icon:"💪"},
            {label:"Healthy Meals",val:14,max:21,col:"#38D978",icon:"🥗"},
            {label:"Water (glasses)",val:tracker?.water||0,max:8,col:"var(--blue)",icon:"💧"},
            {label:"Sleep (hrs)",val:tracker?.sleep||0,max:9,col:"var(--purple)",icon:"😴"},
            {label:"Active Days",val:streak,max:7,col:"#FF6B35",icon:"🔥"},
          ].map(h=>(
            <div key={h.label} className="health-metric-card">
              <div style={{fontSize:22,marginBottom:8}}>{h.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.06em",marginBottom:4}}>{h.label.toUpperCase()}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
                <span style={{fontSize:22,fontWeight:800,color:h.col}}>{h.val}</span>
                <span style={{fontSize:12,color:"var(--text-light)"}}>/{h.max}</span>
              </div>
              <ProgressBar val={h.val} max={h.max} col={h.col}/>
            </div>
          ))}
        </div>
      </div>

      {/* LIFETIME ACTIVITY STATS (Feature 6 — GPS run/walk tracking) */}
      {activities.length>0&&(
        <div className="card" style={{padding:28,marginTop:24}}>
          <h3 className="ff-heading mb-24" style={{fontSize:17,color:"var(--text)"}}>Lifetime Activity Stats</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:16}}>
            {[
              {label:"Total Kilometres",val:`${actStats.totalDistance.toFixed(1)} km`,icon:"📏"},
              {label:"Running Distance",val:`${actStats.runningDistance.toFixed(1)} km`,icon:"🏃"},
              {label:"Walking Distance",val:`${actStats.walkingDistance.toFixed(1)} km`,icon:"🚶"},
              {label:"Total Time Exercising",val:formatDuration(actStats.totalTimeSeconds),icon:"⏱"},
              {label:"Avg Weekly Distance",val:`${actStats.avgWeeklyDistance.toFixed(1)} km`,icon:"📅"},
              {label:"Fastest Pace",val:`${formatPace(actStats.fastestPace)} /km`,icon:"⚡"},
              {label:"Longest Activity",val:`${actStats.longestActivity.toFixed(1)} km`,icon:"🏆"},
              {label:"Highest Elevation",val:actStats.highestElevation>0?`${Math.round(actStats.highestElevation)} m`:"—",icon:"⛰️"},
            ].map(s=>(
              <div key={s.label} className="health-metric-card">
                <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.06em",marginBottom:6}}>{s.label.toUpperCase()}</div>
                <div style={{fontSize:19,fontWeight:800,color:"var(--accent)"}}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
