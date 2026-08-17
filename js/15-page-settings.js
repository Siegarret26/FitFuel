/* FitFuel — Themes, accessibility and AI settings
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── SETTINGS PAGE ──────────────────────────────── */
function SettingsPage({settings,onUpdate,user}){
  const [s,setS]=useState({...settings});
  const [flash,setFlash]=useState("");
  const [showKey,setShowKey]=useState(false);
  const [testState,setTestState]=useState(null); // null | "testing" | "ok" | error string
  const [memory,setMemory]=useState(()=>loadAIMemory().map(normaliseMemoryItem));
  const [memoryEnabled,setMemoryEnabled]=useState(()=>loadAIMemoryEnabled());
  const [confirmClearMemory,setConfirmClearMemory]=useState(false);
  const [newNote,setNewNote]=useState("");
  const upd=(patch)=>{ const next={...s,...patch}; setS(next); onUpdate(next); };
  const updNotif=(key,val)=>{
    const notif={...s.notifications,[key]:val};
    upd({notifications:notif});
    if(val){setFlash(key);setTimeout(()=>setFlash(""),2200);}
  };
  const reset=()=>{upd({...DEFAULT_SETTINGS});setFlash("reset");setTimeout(()=>setFlash(""),2000);};
  const testKey=async()=>{
    setTestState("testing");
    try{
      const reply=await completeGeminiText({apiKey:s.aiApiKey,model:s.aiModel,messages:[{role:"user",content:"Reply with just the word OK."}]});
      setTestState(reply?"ok":"No response received.");
    }catch(err){ setTestState(err?.message||"Connection failed."); }
  };
  const addNote=()=>{ if(!newNote.trim()) return; const item={id:"mem_"+Date.now(),text:newNote.trim(),source:"manual",addedAt:new Date().toISOString()}; const next=[...memory,item]; setMemory(next); saveAIMemoryLS(next,user?.uid); setNewNote(""); };
  const rmNote=id=>{ const next=memory.filter(m=>m.id!==id); setMemory(next); saveAIMemoryLS(next,user?.uid); };
  const toggleMemoryEnabled=()=>{ const next=!memoryEnabled; setMemoryEnabled(next); saveAIMemoryEnabledLS(next,user?.uid); };
  const clearAllMemory=()=>{ setMemory([]); saveAIMemoryLS([],user?.uid); setConfirmClearMemory(false); };
  return(
    <div className="page-wrap" style={{maxWidth:900}}>
      <div className="page-header slide-in">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Customise FitFuel — changes save automatically and persist across sessions.</p>
      </div>

      {/* AI COACH */}
      <div className="settings-section">
        <div className="settings-section-title">
          <div className="settings-icon">🤖</div>
          <h2 style={{fontSize:17,fontWeight:800,color:"var(--text)"}}>AI Coach</h2>
        </div>
        <p style={{fontSize:13,color:"var(--text-mid)",marginBottom:20,lineHeight:1.6}}>
          {GEMINI_PROXY_URL
            ? "The AI Coach is ready to use — requests go through a secure server, so there's nothing for you to set up."
            : <>This site has no AI server configured, so the AI Coach needs your own Gemini API key. It's stored only on this device and sent straight to Google. Get a free key at <span style={{color:"var(--accent)"}}>aistudio.google.com/apikey</span>.</>}
        </p>
        {GEMINI_PROXY_URL
          ? <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,background:"var(--bg3)",marginBottom:16,flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:"var(--text-mid)"}}>Model: <strong style={{color:"var(--text)"}}>{s.aiModel}</strong></span>
              <span style={{fontSize:13,color:"var(--text-mid)"}}>·</span>
              <span style={{fontSize:13,color:"var(--text-mid)"}}>Status: <strong style={{color:"var(--text)"}}>Ready ✓</strong></span>
            </div>
          : <div style={{marginBottom:16}}>
              <label style={{fontSize:13,color:"var(--text-mid)",display:"block",marginBottom:8,fontWeight:500}}>Gemini API Key</label>
              <div style={{display:"flex",gap:8,maxWidth:420}}>
                <input type={showKey?"text":"password"} value={s.aiApiKey} onChange={e=>{upd({aiApiKey:sanitizeApiKey(e.target.value)});setTestState(null);}} placeholder="AQ.… or AIza…" style={{flex:1,padding:"10px 12px",borderRadius:10,border:"1px solid var(--border-strong)",fontSize:13,background:"var(--card)",color:"var(--text)"}}/>
                <button onClick={()=>setShowKey(v=>!v)} style={{padding:"0 14px",borderRadius:10,border:"1px solid var(--border-strong)",background:"var(--bg3)",color:"var(--text-mid)",cursor:"pointer",fontSize:13}}>{showKey?"Hide":"Show"}</button>
              </div>
            </div>}
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <button className="btn-secondary" style={{padding:"9px 20px",fontSize:13}} onClick={testKey} disabled={!s.aiApiKey||testState==="testing"}>{testState==="testing"?"Testing…":"Test Connection"}</button>
          {testState==="ok"&&<span style={{fontSize:13,color:"#38D978",fontWeight:600}}>✓ Connected</span>}
          {testState&&testState!=="testing"&&testState!=="ok"&&<span style={{fontSize:13,color:"var(--accent)",fontWeight:600}}>⚠ {testState}</span>}
        </div>

        <div style={{marginTop:26,paddingTop:22,borderTop:"1px solid var(--border)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.08em",textTransform:"uppercase"}}>AI Memory Manager</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:12.5,color:"var(--text-mid)",fontWeight:600}}>{memoryEnabled?"Enabled":"Disabled"}</span>
              <Toggle checked={memoryEnabled} onChange={toggleMemoryEnabled}/>
            </div>
          </div>
          <p style={{fontSize:12,color:"var(--text-light)",marginBottom:14,lineHeight:1.5}}>
            The AI remembers things you mention worth keeping long-term (like an injury or a firm preference), plus anything you add manually below. Turn this off to stop it from reading or adding memories — your saved list stays put, just unused.
          </p>
          <div className="ai-memory-card-grid">
            {memory.map(m=>(
              <div key={m.id} className="ai-memory-card">
                <span className="ai-memory-card-source">{m.source==="ai"?"🧠 AI-noticed":"✍️ You added"}</span>
                <p>{m.text}</p>
                <button onClick={()=>rmNote(m.id)} aria-label="Delete memory">✕</button>
              </div>
            ))}
            {memory.length===0&&<p style={{color:"var(--text-light)",fontSize:13,gridColumn:"1/-1"}}>Nothing saved yet — e.g. "training for a 10K", "prefers home workouts".</p>}
          </div>
          <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
            <input value={newNote} onChange={e=>setNewNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNote()} placeholder="Add something the AI should remember…" style={{flex:1,minWidth:180,padding:"10px 14px",borderRadius:50,border:"1.5px solid var(--border-strong)",fontSize:13,background:"var(--bg3)",color:"var(--text)"}}/>
            <button className="btn-primary" style={{padding:"10px 18px",fontSize:13}} onClick={addNote}>Add</button>
            {memory.length>0&&(
              confirmClearMemory
                ? <button className="btn-secondary" style={{padding:"10px 18px",fontSize:13,color:"var(--accent)"}} onClick={clearAllMemory}>Confirm clear all?</button>
                : <button className="btn-secondary" style={{padding:"10px 18px",fontSize:13}} onClick={()=>setConfirmClearMemory(true)}>Clear all</button>
            )}
          </div>
        </div>
      </div>

      {/* APPEARANCE */}
      <div className="settings-section">
        <div className="settings-section-title">
          <div className="settings-icon">🎨</div>
          <h2 style={{fontSize:17,fontWeight:800,color:"var(--text)"}}>Appearance</h2>
        </div>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.08em",marginBottom:14,textTransform:"uppercase"}}>Theme</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:28}}>
          {Object.entries(THEMES).map(([k,t])=>(
            <button key={k} className={"theme-swatch"+(s.theme===k?" active":"")} onClick={()=>upd({theme:k})}>
              <div style={{fontSize:24,marginBottom:8}}>{t.emoji}</div>
              <div style={{fontSize:12,fontWeight:s.theme===k?700:500,color:s.theme===k?"var(--accent)":"var(--text-mid)"}}>{t.label}</div>
              {s.theme===k&&<div style={{fontSize:10,color:"var(--accent)",marginTop:4}}>● Active</div>}
            </button>
          ))}
          <button className={"theme-swatch"+(s.theme==="custom"?" active":"")} onClick={()=>upd({theme:"custom"})}>
            <div style={{fontSize:24,marginBottom:8}}>🎨</div>
            <div style={{fontSize:12,fontWeight:s.theme==="custom"?700:500,color:s.theme==="custom"?"var(--accent)":"var(--text-mid)"}}>Custom</div>
            {s.theme==="custom"&&<div style={{fontSize:10,color:"var(--accent)",marginTop:4}}>● Active</div>}
          </button>
        </div>
        {s.theme==="custom"&&(
          <div style={{background:"var(--bg3)",borderRadius:16,padding:20,marginBottom:24,border:"1px solid var(--border-strong)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:16}}>Custom Theme Builder</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
              <div>
                <label style={{fontSize:13,color:"var(--text-mid)",display:"block",marginBottom:8,fontWeight:500}}>Accent Colour</label>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <input type="color" value={s.customAccent} onChange={e=>upd({customAccent:e.target.value})} style={{width:44,height:44,borderRadius:10,border:"1px solid var(--border-strong)",cursor:"pointer",padding:3,background:"none"}}/>
                  <input value={s.customAccent} onChange={e=>upd({customAccent:e.target.value})} style={{flex:1,padding:"9px 12px",borderRadius:10,border:"1px solid var(--border-strong)",fontSize:13,background:"var(--card)",color:"var(--text)"}} placeholder="#FF3B3B"/>
                </div>
              </div>
              <div>
                <label style={{fontSize:13,color:"var(--text-mid)",display:"block",marginBottom:8,fontWeight:500}}>Background Colour</label>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <input type="color" value={s.customBg} onChange={e=>upd({customBg:e.target.value})} style={{width:44,height:44,borderRadius:10,border:"1px solid var(--border-strong)",cursor:"pointer",padding:3,background:"none"}}/>
                  <input value={s.customBg} onChange={e=>upd({customBg:e.target.value})} style={{flex:1,padding:"9px 12px",borderRadius:10,border:"1px solid var(--border-strong)",fontSize:13,background:"var(--card)",color:"var(--text)"}} placeholder="#070709"/>
                </div>
              </div>
            </div>
            <div style={{marginTop:14,padding:"10px 14px",background:"var(--accent-tint-1)",borderRadius:10,fontSize:13,color:"var(--text-mid)",borderLeft:"3px solid var(--accent)"}}>Changes preview instantly across the whole app.</div>
          </div>
        )}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>Font Size</div>
          <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
            <Seg options={[{v:"small",l:"Small"},{v:"medium",l:"Medium"},{v:"large",l:"Large"}]} value={s.fontSize} onChange={v=>upd({fontSize:v})}/>
            <div style={{fontSize:12,color:"var(--text-mid)"}}>Preview: <span style={{fontSize:s.fontSize==="small"?"12px":s.fontSize==="large"?"18px":"15px",color:"var(--text)",fontWeight:600}}>Aa FitFuel</span></div>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      <div className="settings-section">
        <div className="settings-section-title">
          <div className="settings-icon">🔔</div>
          <h2 style={{fontSize:17,fontWeight:800,color:"var(--text)"}}>Notifications</h2>
        </div>
        <p style={{fontSize:13,color:"var(--text-mid)",marginBottom:20}}>Enable simulated reminders to keep your habits on track.</p>
        {[
          {key:"workout",icon:"💪",label:"Workout Reminders",desc:"Daily reminder to complete your workout"},
          {key:"water",icon:"💧",label:"Water Intake Reminders",desc:"Stay hydrated throughout the day"},
          {key:"meal",icon:"🥗",label:"Meal Reminders",desc:"Remember to log your healthy meals"},
        ].map(n=>(
          <div key={n.key} className="settings-row">
            <div style={{display:"flex",gap:12,alignItems:"center",flex:1}}>
              <div className="settings-row-icon">{n.icon}</div>
              <div><div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:2}}>{n.label}</div><div style={{fontSize:12,color:"var(--text-mid)"}}>{n.desc}</div></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:12}}>
              {flash===n.key&&<span style={{fontSize:12,color:"#38D978",fontWeight:600}}>✓ On!</span>}
              <Toggle checked={s.notifications[n.key]} onChange={v=>updNotif(n.key,v)}/>
            </div>
          </div>
        ))}
      </div>

      {/* PREFERENCES */}
      <div className="settings-section">
        <div className="settings-section-title">
          <div className="settings-icon">📐</div>
          <h2 style={{fontSize:17,fontWeight:800,color:"var(--text)"}}>Measurement Preferences</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:24}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>Weight Unit</div>
            <Seg options={[{v:"kg",l:"kg"},{v:"lbs",l:"lbs"}]} value={s.weightUnit} onChange={v=>upd({weightUnit:v})}/>
            <div style={{marginTop:8,fontSize:12,color:"var(--text-mid)"}}>Using: <span style={{color:"var(--accent)",fontWeight:700}}>{s.weightUnit==="kg"?"Kilograms":"Pounds"}</span></div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>Height Unit</div>
            <Seg options={[{v:"cm",l:"cm"},{v:"ft",l:"ft / in"}]} value={s.heightUnit} onChange={v=>upd({heightUnit:v})}/>
            <div style={{marginTop:8,fontSize:12,color:"var(--text-mid)"}}>Using: <span style={{color:"var(--accent)",fontWeight:700}}>{s.heightUnit==="cm"?"Centimetres":"Feet & Inches"}</span></div>
          </div>
        </div>
      </div>

      {/* ACCESSIBILITY */}
      <div className="settings-section">
        <div className="settings-section-title">
          <div className="settings-icon">♿</div>
          <h2 style={{fontSize:17,fontWeight:800,color:"var(--text)"}}>Accessibility</h2>
        </div>
        <p style={{fontSize:13,color:"var(--text-mid)",marginBottom:20}}>Adjust the interface so FitFuel works best for you.</p>
        {[
          {key:"highContrast",icon:"🔆",label:"High Contrast Mode",desc:"Boost text and border contrast for easier reading"},
          {key:"reduceMotion",icon:"🎞️",label:"Reduce Animations",desc:"Disable fade-in and slide animations"},
          {key:"largeButtons",icon:"🔲",label:"Larger Buttons",desc:"Increase button size for easier tapping"},
        ].map(a=>(
          <div key={a.key} className="settings-row">
            <div style={{display:"flex",gap:12,alignItems:"center",flex:1}}>
              <div className="settings-row-icon">{a.icon}</div>
              <div><div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:2}}>{a.label}</div><div style={{fontSize:12,color:"var(--text-mid)"}}>{a.desc}</div></div>
            </div>
            <Toggle checked={s[a.key]} onChange={v=>upd({[a.key]:v})}/>
          </div>
        ))}
      </div>

      {/* RESET */}
      <div className="settings-section" style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div>
          <h3 style={{fontSize:16,fontWeight:700,color:"var(--text)",marginBottom:4}}>Reset to Defaults</h3>
          <p style={{fontSize:13,color:"var(--text-mid)"}}>Restore all settings to the original Dark Red theme.</p>
        </div>
        <button onClick={reset} style={{padding:"11px 24px",borderRadius:50,border:"1px solid var(--border-strong)",background:"var(--bg3)",color:"var(--text-mid)",cursor:"pointer",fontSize:14,fontWeight:600,transition:"all 0.2s",whiteSpace:"nowrap"}}>
          {flash==="reset"?"✓ Reset!":"↺ Reset All"}
        </button>
      </div>
    </div>
  );
}
