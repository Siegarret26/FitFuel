/* FitFuel — Public landing page, authentication and onboarding
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── PUBLIC LANDING PAGE ──────────────────────── */
function useScrollReveal(){
  useEffect(()=>{
    if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els=document.querySelectorAll(".reveal");
    const io=new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
    },{rootMargin:"0px 0px -60px 0px"});
    els.forEach(el=>io.observe(el));
    return ()=>io.disconnect();
  },[]);
}

function LandingPage({onSignUp,onLogIn}){
  const [scrolled,setScrolled]=useState(false);
  useScrollReveal();
  useEffect(()=>{
    const onScroll=()=>setScrolled(window.scrollY>12);
    window.addEventListener("scroll",onScroll,{passive:true});
    return ()=>window.removeEventListener("scroll",onScroll);
  },[]);
  const jump=id=>e=>{
    e.preventDefault();
    const el=document.getElementById(id);
    if(!el) return;
    const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"});
  };

  const features=[
    {icon:"🤖",title:"AI Coach",body:"Ask for a workout, a meal, or a read on your week. It knows your goals, equipment, and history — and pulls from FitFuel's own library before inventing anything."},
    {icon:"💪",title:"Workout tracker",body:"45 built-in workouts with per-exercise form notes, common mistakes, and a session timer that keeps your place.",list:["Strength, cardio, mobility, recovery","Beginner to advanced","Equipment or bodyweight"]},
    {icon:"🏃",title:"GPS running",body:"Start a run and FitFuel maps it live, then breaks down what actually happened afterwards.",list:["Distance, pace, speed, elevation","Kilometre splits and intervals","Route playback on a map"]},
    {icon:"🥗",title:"Meal planner",body:"60 meals with full macros and instructions. Save the ones you like, and ask the coach to build around them.",list:["Calories, protein, carbs, fat","Breakfast through dinner","Vegetarian options throughout"]},
    {icon:"📊",title:"Progress",body:"Streaks, personal records, calories burned, and week-over-week trends — computed from what you actually logged, never estimated."},
    {icon:"📱",title:"Anywhere",body:"Runs in any browser and installs to your home screen like an app. Your data follows you between devices automatically."},
  ];

  return(
    <div className="lp">
      <nav className={"lp-nav"+(scrolled?" scrolled":"")}>
        <div className="lp-nav-inner">
          <div className="lp-brand" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>
            <div className="lp-brand-mark"><FitFuelLogoMark size={70}/></div>
            <span className="lp-brand-word">FitFuel</span>
          </div>
          <div className="lp-nav-links">
            <a href="#features" onClick={jump("features")}>Features</a>
            <a href="#coach" onClick={jump("coach")}>AI Coach</a>
            <a href="#compare" onClick={jump("compare")}>Why FitFuel</a>
            <a href="#about" onClick={jump("about")}>About</a>
          </div>
          <div className="lp-nav-cta">
            <button className="lp-ghost-btn" onClick={onLogIn}>Log in</button>
            <button className="lp-solid-btn" onClick={onSignUp}>Get started</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="lp-hero">
        <div className="lp-hero-bg">
          <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1800&q=75" alt="" loading="eager"/>
        </div>
        <div className="lp-hero-inner">
          <div className="lp-eyebrow">Free · No app store · Works on any phone</div>
          <h1 className="lp-headline">
            <span>Train</span>
            <span className="accent">smarter.</span>
            <span className="hollow">Not harder.</span>
          </h1>
          <p className="lp-sub">
            Workouts, meals, GPS runs, and an AI coach that actually knows your training history —
            in one place, free, and running in your browser right now.
          </p>
          <div className="lp-hero-btns">
            <button className="lp-solid-btn" onClick={onSignUp}>Create free account</button>
            <button className="lp-ghost-btn" onClick={onLogIn}>I already have one</button>
          </div>
          <div className="lp-hero-stats">
            <div className="lp-hero-stat"><b>45</b><span>Workouts</span></div>
            <div className="lp-hero-stat"><b>60</b><span>Meals</span></div>
            <div className="lp-hero-stat"><b>70</b><span>Exercises explained</span></div>
            <div className="lp-hero-stat"><b>$0</b><span>To use</span></div>
          </div>
        </div>
      </header>

      {/* FEATURES */}
      <section className="lp-section" id="features">
        <div className="lp-inner">
          <div className="lp-section-head reveal">
            <div className="lp-kicker">Everything included</div>
            <h2 className="lp-h2">One app instead of five</h2>
            <p className="lp-lede">Most people end up with a workout app, a calorie counter, a running tracker, and a notes file. FitFuel is all of it, and the parts actually talk to each other.</p>
          </div>
          <div className="lp-features">
            {features.map((f,i)=>(
              <div className="lp-feature reveal" key={f.title} style={{transitionDelay:`${i*60}ms`}}>
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
                {f.list&&<ul>{f.list.map(l=><li key={l}>{l}</li>)}</ul>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI SHOWCASE */}
      <section className="lp-section" id="coach" style={{background:"var(--bg2)"}}>
        <div className="lp-inner">
          <div className="lp-ai">
            <div className="reveal">
              <div className="lp-kicker">FitFuel AI</div>
              <h2 className="lp-h2">A coach that reads<br/>your training log</h2>
              <p className="lp-lede">
                Ask in plain language. It checks your profile, recent runs, saved meals, and what you told it
                last week — then answers from FitFuel's own library first, so what you get is something you can
                actually tap and start.
              </p>
              <div style={{marginTop:28}}>
                <button className="lp-solid-btn" onClick={onSignUp}>Try FitFuel AI</button>
              </div>
            </div>
            <div className="lp-chat reveal">
              <div className="lp-chat-head">
                <span className="lp-chat-dot live"/><span className="lp-chat-dot"/><span className="lp-chat-dot"/>
                <span className="lp-chat-title">FitFuel AI</span>
              </div>
              <div className="lp-msg user">Create a 30-minute leg workout using dumbbells.</div>
              <div className="lp-msg ai">
                Found one in your library that fits — dumbbells only, and it lines up with the lower-body
                session you skipped on Tuesday.
                <div className="lp-msg-card">
                  <span className="lp-badge-found">📚 Found in FitFuel</span>
                  <b>Leg Strength Builder</b>
                  <span>30 min · Intermediate · Quads, hamstrings, glutes</span>
                </div>
              </div>
              <div className="lp-msg user">How was my pace last run?</div>
              <div className="lp-msg ai">
                5.2 km at 5:41/km — your second-fastest this month, and your splits held steady instead of
                fading after km 3 like last time.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARE */}
      <section className="lp-section" id="compare">
        <div className="lp-inner">
          <div className="lp-section-head reveal">
            <div className="lp-kicker">The difference</div>
            <h2 className="lp-h2">Why bother switching</h2>
          </div>
          <div className="lp-compare">
            <div className="lp-comp-card dim reveal">
              <h3>Typical fitness app</h3>
              {["Same plan for everyone","Advice that ignores your history","Tracking lives in a separate app","Paywall on anything useful","Nutrition data you enter by hand"].map(t=>(
                <div className="lp-comp-row" key={t}><span>✕</span><span>{t}</span></div>
              ))}
            </div>
            <div className="lp-comp-card win reveal" style={{transitionDelay:"90ms"}}>
              <h3>FitFuel</h3>
              {["Recommendations built from your own data","Coach that remembers injuries and preferences","Workouts, meals, and runs in one place","Everything free, no tiers","60 meals with macros already filled in"].map(t=>(
                <div className="lp-comp-row" key={t}><span style={{color:"var(--accent)"}}>✓</span><span>{t}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SCREENSHOTS */}
      <section className="lp-section" style={{background:"var(--bg2)"}}>
        <div className="lp-inner">
          <div className="lp-section-head reveal">
            <div className="lp-kicker">Inside the app</div>
            <h2 className="lp-h2">Built to be used mid-set</h2>
            <p className="lp-lede">Big targets, high contrast, and nothing buried three taps deep — because you're checking it with sweaty hands between sets, not sitting at a desk.</p>
          </div>
          <div className="lp-shots">
            <div className="reveal">
              <div className="lp-laptop">
                <div className="lp-bar"><i/><i/><i/></div>
                <div className="lp-shot-body">
                  <div className="lp-skel-line w40"/>
                  <div className="lp-skel-row"><div className="lp-skel accent"/><div className="lp-skel"/><div className="lp-skel"/></div>
                  <div className="lp-skel-row"><div className="lp-skel tall"/><div className="lp-skel tall accent"/></div>
                  <div className="lp-skel-line w80"/><div className="lp-skel-line w60"/>
                </div>
              </div>
              <div className="lp-shot-label">Dashboard · Progress · Meal planner</div>
            </div>
            <div className="reveal" style={{transitionDelay:"110ms"}}>
              <div className="lp-phone">
                <div className="lp-shot-body">
                  <div className="lp-skel-line w60"/>
                  <div className="lp-skel tall accent" style={{marginBottom:12}}/>
                  <div className="lp-skel-line w80"/><div className="lp-skel-line w40"/>
                  <div className="lp-skel-row" style={{marginTop:12}}><div className="lp-skel"/><div className="lp-skel"/></div>
                </div>
              </div>
              <div className="lp-shot-label">GPS run · AI Coach</div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="lp-section" id="about">
        <div className="lp-inner">
          <div className="lp-section-head reveal">
            <div className="lp-kicker">Early days</div>
            <h2 className="lp-h2">Built by a student,<br/>for people who train</h2>
            <p className="lp-lede">FitFuel is new and these seats are still empty. If you use it and something's broken or missing, that feedback goes straight to the person who wrote it.</p>
          </div>
          <div className="lp-quotes">
            {[
              {who:"Your review here",tag:"Runner",av:"🏃"},
              {who:"And here",tag:"Lifter",av:"🏋️"},
              {who:"Room for one more",tag:"Just starting out",av:"🌱"},
            ].map((q,i)=>(
              <div className="lp-quote reveal" key={q.who} style={{transitionDelay:`${i*70}ms`}}>
                <div className="lp-quote-stars">☆ ☆ ☆ ☆ ☆</div>
                <p>Nothing here yet — FitFuel launched recently and hasn't collected reviews. Try it and tell us what you'd change.</p>
                <div className="lp-quote-who">
                  <div className="lp-quote-av">{q.av}</div>
                  <div><b>{q.who}</b><span>{q.tag}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <div className="lp-kicker reveal">Takes about a minute</div>
        <h2 className="lp-h2 reveal" style={{maxWidth:620}}>Ready to transform your fitness?</h2>
        <p className="lp-lede reveal" style={{maxWidth:480,margin:"0 auto"}}>Create an account, answer a few questions, and your first workout is waiting.</p>
        <div className="lp-cta-btns reveal">
          <button className="lp-solid-btn" onClick={onSignUp}>Create free account</button>
          <button className="lp-ghost-btn" onClick={onLogIn}>Log in</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-foot">
        <div className="lp-inner">
          <div className="lp-foot-grid">
            <div className="lp-foot-col" style={{maxWidth:260}}>
              <div className="lp-brand" style={{marginBottom:12}}>
                <div className="lp-brand-mark"><FitFuelLogoMark size={70}/></div>
                <span className="lp-brand-word">FitFuel</span>
              </div>
              <p style={{fontSize:13,color:"var(--text-light)",lineHeight:1.7,margin:0}}>
                Workouts, meals, running, and an AI coach. Free, in your browser.
              </p>
            </div>
            <div className="lp-foot-col">
              <h4>Product</h4>
              <a onClick={jump("features")}>Features</a>
              <a onClick={jump("coach")}>AI Coach</a>
              <a onClick={jump("compare")}>Why FitFuel</a>
            </div>
            <div className="lp-foot-col">
              <h4>Account</h4>
              <a onClick={onSignUp}>Create account</a>
              <a onClick={onLogIn}>Log in</a>
            </div>
            <div className="lp-foot-col">
              <h4>Legal</h4>
              <a onClick={jump("about")}>About</a>
              <a>Privacy policy</a>
              <a>Terms of service</a>
            </div>
          </div>
          <div className="lp-foot-note">
            <span>© {new Date().getFullYear()} FitFuel. A student project.</span>
            <span>Not medical advice. Talk to a professional before starting a new programme.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── AUTH ─────────────────────────────────────── */
function AuthPage({initialMode="login",onBack}){
  const [mode,setMode]=useState(initialMode);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [busy,setBusy]=useState(false);
  const [remember,setRemember]=useState(true);
  /* Remember me → Firebase LOCAL persistence (survives closing the browser).
     Unchecked → SESSION, so the login ends when the tab closes. */
  const applyPersistence=()=>{
    const p=remember?firebase.auth.Auth.Persistence.LOCAL:firebase.auth.Auth.Persistence.SESSION;
    return firebase.auth().setPersistence(p);
  };
  const login=async()=>{
    setError("");
    if(!email.trim()||!password.trim()){setError("Please fill in all fields.");return;}
    if(!email.includes("@")){setError("Enter a valid email.");return;}
    setBusy(true);
    try{
      await applyPersistence();
      await firebase.auth().signInWithEmailAndPassword(email.trim().toLowerCase(),password);
      // App's onAuthStateChanged listener takes it from here
    }catch(err){
      setError(describeAuthError(err));
      setBusy(false);
    }
  };
  /* Firebase sends the reset email and hosts the reset page itself, so there is no
     token handling here. Modern Firebase projects have email-enumeration protection
     on by default, meaning this succeeds even for addresses with no account — so the
     confirmation is deliberately worded not to reveal whether an account exists. */
  const resetPassword=async()=>{
    setError(""); setSuccess("");
    if(!email.trim()){ setError("Enter your email address first."); return; }
    if(!email.includes("@")){ setError("Enter a valid email."); return; }
    setBusy(true);
    try{
      await firebase.auth().sendPasswordResetEmail(email.trim().toLowerCase());
      setSuccess("If an account exists for that address, a reset link is on its way. Check your inbox — and your spam folder, since it can land there.");
    }catch(err){
      setError(describeAuthError(err));
    }
    setBusy(false);
  };
  const signup=async()=>{
    setError("");
    if(!name.trim()||!email.trim()||!password.trim()){setError("Please fill in all fields.");return;}
    if(!email.includes("@")){setError("Enter a valid email.");return;}
    if(password.length<6){setError("Password must be at least 6 characters.");return;}
    setBusy(true);
    try{
      await applyPersistence();
      const cred=await firebase.auth().createUserWithEmailAndPassword(email.trim().toLowerCase(),password);
      await cred.user.updateProfile({displayName:name.trim()});
      setSuccess("Account created! Logging you in…");
      // App's onAuthStateChanged listener creates the Firestore profile and takes it from here
    }catch(err){
      setError(describeAuthError(err));
      setBusy(false);
    }
  };
  return(
    <div className="auth-page">
      <div className="auth-visual">
        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80" alt="Athlete training in gym"/>
        <div className="auth-visual-overlay"/>
        <div className="auth-visual-text fade-up">
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",color:"var(--accent)",textTransform:"uppercase",marginBottom:16}}>YOUR FITNESS JOURNEY STARTS HERE</div>
          <div className="ff-display" style={{fontSize:52,color:"#fff",lineHeight:0.9,marginBottom:16}}>TRAIN<br/><span style={{color:"var(--accent)"}}>SMARTER.</span><br/>FEEL<br/>AMAZING.</div>
          <p style={{fontSize:14,color:"rgba(255,255,255,0.6)",lineHeight:1.65}}>Workouts, nutrition, and habit tracking — built for real student life.</p>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-card fade-up">
          <div style={{textAlign:"center",marginBottom:28}}>
            <div className="auth-badge"><FitFuelLogoMark size={150}/></div>
            <h1 style={{fontSize:26,fontWeight:800,marginBottom:6,color:"var(--text)"}}>FitFuel</h1>
            <p style={{fontSize:14,color:"var(--text-mid)"}}>{mode==="login"?"Welcome back. Ready to crush it?":mode==="reset"?"We'll email you a link to set a new password.":"Create your free account."}</p>
          </div>
          {mode!=="reset"&&<div className="auth-tab-bar">
            {["login","signup"].map(m=><button key={m} className={"auth-tab"+(mode===m?" active":"")} onClick={()=>{setMode(m);setError("");setSuccess("");}}>
              {m==="login"?"Log In":"Sign Up"}
            </button>)}
          </div>}
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {mode==="signup"&&<div className="auth-field"><label>YOUR NAME</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Alex Johnson"/></div>}
            <div className="auth-field"><label>EMAIL</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" type="email"
              onKeyDown={e=>e.key==="Enter"&&!busy&&mode==="reset"&&resetPassword()}/></div>
            {mode!=="reset"&&<div className="auth-field"><label>PASSWORD</label><input value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="signup"?"At least 6 characters":"••••••••"} type="password" onKeyDown={e=>e.key==="Enter"&&!busy&&(mode==="login"?login():signup())}/></div>}
          </div>
          {mode==="login"&&<p style={{textAlign:"right",marginTop:6}}>
            <span onClick={()=>{setMode("reset");setError("");setSuccess("");}}
              style={{fontSize:12.5,color:"var(--accent)",cursor:"pointer",fontWeight:600}}>Forgot password?</span>
          </p>}
          {mode!=="reset"&&<label style={{display:"flex",alignItems:"center",gap:9,marginTop:14,cursor:"pointer",fontSize:13,color:"var(--text-mid)"}}>
            <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} style={{width:16,height:16,accentColor:"var(--accent)",cursor:"pointer"}}/>
            Keep me signed in on this device
          </label>}
          {error&&<div className="auth-error">{error}</div>}
          {success&&<div className="auth-success">{success}</div>}
          <button className="btn-primary" onClick={mode==="login"?login:mode==="reset"?resetPassword:signup} disabled={busy} style={{width:"100%",marginTop:20,fontSize:15,padding:"14px",opacity:busy?0.7:1}}>
            {busy?"Please wait…":(mode==="login"?"Log In →":mode==="reset"?"Send reset link →":"Create Account →")}
          </button>
          <p style={{textAlign:"center",fontSize:12,color:"var(--text-light)",marginTop:16}}>
            {mode==="reset"?"Remembered it? ":mode==="login"?"Don't have an account? ":"Already have an account? "}
            <span onClick={()=>{setMode(mode==="signup"?"login":mode==="reset"?"login":"signup");setError("");setSuccess("");}} style={{color:"var(--accent)",cursor:"pointer",fontWeight:600}}>
              {mode==="reset"?"Back to log in":mode==="login"?"Sign up":"Log in"}
            </span>
          </p>
          {onBack&&<p style={{textAlign:"center",marginTop:10}}>
            <span onClick={onBack} style={{fontSize:12,color:"var(--text-light)",cursor:"pointer"}}>← Back to homepage</span>
          </p>}
        </div>
      </div>
    </div>
  );
}

/* ─── ONBOARDING: FIELD RENDERER ─────────────────── */
function OnboardingField({field, value, onChange}){
  if(field.type==="single"){
    return(
      <div className="onboarding-field">
        <div className="onboarding-field-label">{field.label}</div>
        <div className="onboarding-options">
          {field.options.map(opt=>(
            <button key={opt} type="button" className={"onboarding-chip"+(value===opt?" selected":"")} onClick={()=>onChange(opt)}>{opt}</button>
          ))}
        </div>
      </div>
    );
  }
  if(field.type==="multi"){
    const arr=value||[];
    const toggle=opt=>onChange(arr.includes(opt)?arr.filter(o=>o!==opt):[...arr,opt]);
    return(
      <div className="onboarding-field">
        <div className="onboarding-field-label">{field.label}</div>
        <div className="onboarding-options">
          {field.options.map(opt=>(
            <button key={opt} type="button" className={"onboarding-chip"+(arr.includes(opt)?" selected":"")} onClick={()=>toggle(opt)}>{opt}</button>
          ))}
        </div>
      </div>
    );
  }
  return(
    <div className="onboarding-field">
      <label className="onboarding-field-label">{field.label}</label>
      <input className="onboarding-input" type={field.type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder||""}/>
    </div>
  );
}

/* ─── ONBOARDING: WELCOME + SURVEY ───────────────────
   Shown once, right after registration (Feature 5). Rendered by App
   whenever a logged-in user has `onboarded:false`. Answers are handed
   back via onComplete and merged into the user profile + starter goals. */
function OnboardingSurvey({user, onComplete, onSkip}){
  const [phase,setPhase]=useState("welcome");
  const [stepIdx,setStepIdx]=useState(0);
  const [answers,setAnswers]=useState({});
  const total=ONBOARDING_STEPS.length;
  const step=ONBOARDING_STEPS[stepIdx];
  const firstName=(user.name||"").split(" ")[0]||"there";
  const setField=(key,val)=>setAnswers(a=>({...a,[key]:val}));
  const next=()=>{ if(stepIdx<total-1) setStepIdx(i=>i+1); else onComplete(answers); };
  const back=()=>{ if(stepIdx>0) setStepIdx(i=>i-1); };

  if(phase==="welcome"){
    return(
      <div className="onboarding-page">
        <div className="onboarding-card scale-in" style={{textAlign:"center"}}>
          <div className="auth-badge"><FitFuelLogoMark size={150}/></div>
          <h1 style={{fontSize:25,fontWeight:800,color:"var(--text)",marginBottom:10}}>Welcome to FitFuel, {firstName}! 👋</h1>
          <p style={{fontSize:14,color:"var(--text-mid)",lineHeight:1.7,marginBottom:26,maxWidth:400,marginLeft:"auto",marginRight:"auto"}}>
            Let's spend about a minute learning more about you so we can personalise your workouts, meals, and overall fitness experience.
          </p>
          <button className="btn-primary" style={{padding:"14px 40px",fontSize:15}} onClick={()=>setPhase("survey")}>Let's Go →</button>
          <p style={{marginTop:16}}>
            <span onClick={onSkip} style={{fontSize:13,color:"var(--text-light)",cursor:"pointer",textDecoration:"underline"}}>Skip for now</span>
          </p>
        </div>
      </div>
    );
  }

  return(
    <div className="onboarding-page">
      <div className="onboarding-card scale-in">
        <div className="onboarding-progress-head">
          <span className="onboarding-step-label">Step {stepIdx+1} of {total}</span>
          <span onClick={onSkip} style={{fontSize:12,color:"var(--text-light)",cursor:"pointer"}}>Skip survey</span>
        </div>
        <div className="onboarding-progress-track">
          <div className="onboarding-progress-fill" style={{width:`${((stepIdx+1)/total)*100}%`}}/>
        </div>

        <h2 style={{fontSize:20,fontWeight:800,color:"var(--text)",marginTop:22,marginBottom:6}}>{step.title}</h2>
        <p style={{fontSize:13,color:"var(--text-mid)",marginBottom:22}}>{step.subtitle}</p>

        <div style={{display:"flex",flexDirection:"column",gap:22}}>
          {step.fields.map(f=>(
            <OnboardingField key={f.key} field={f} value={answers[f.key]} onChange={v=>setField(f.key,v)}/>
          ))}
        </div>

        <div style={{display:"flex",gap:10,marginTop:30}}>
          {stepIdx>0&&<button className="btn-secondary" style={{padding:"12px 22px"}} onClick={back}>← Back</button>}
          <button className="btn-primary" style={{flex:1,padding:"13px"}} onClick={next}>
            {stepIdx<total-1?"Continue →":"Finish ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
