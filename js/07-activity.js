/* FitFuel — GPS activity tracking, trends and analytics UI
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── ACTIVITY TRENDS (Weekly & Monthly long-term analytics) ─── */
function ActivityTrendsPanel({activities}){
  const [range,setRange]=useState("month");
  if(!activities.length){
    return(
      <div className="card" style={{padding:"40px 24px",textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:10}}>📊</div>
        <p style={{color:"var(--text-mid)",fontSize:14}}>Complete an activity to start seeing your trends here.</p>
      </div>
    );
  }
  const buckets=buildTrendBuckets(activities,range);
  const stats=aggregateActivityStats(activities);
  const labels=buckets.map(b=>b.label);
  return(
    <div>
      <div className="analytics-section-head" style={{marginBottom:20}}>
        <div className="ff-heading" style={{fontSize:16,color:"var(--text)"}}>Long-Term Trends</div>
        <Seg options={[{v:"week",l:"Week"},{v:"month",l:"Month"},{v:"year",l:"Year"},{v:"all",l:"All Time"}]} value={range} onChange={setRange}/>
      </div>

      <div className="activity-stat-grid" style={{marginBottom:24}}>
        <ActivityStat icon="📏" label="Total Distance" value={stats.totalDistance.toFixed(1)} unit="km"/>
        <ActivityStat icon="🏃" label="Activities" value={stats.totalActivities}/>
        <ActivityStat icon="⏱" label="Total Time" value={formatDuration(stats.totalTimeSeconds)}/>
        <ActivityStat icon="🔥" label="Streak" value={stats.runningStreak} unit="days"/>
      </div>

      <div className="analytics-section">
        <div className="analytics-section-title">Distance</div>
        <LineChartCanvas labels={labels} datasets={[{label:"Distance (km)",data:buckets.map(b=>b.distance),color:"#FF3B3B",fill:true}]} yLabel="km"/>
      </div>
      <div className="analytics-section">
        <div className="analytics-section-title">Average Pace</div>
        <LineChartCanvas labels={labels} datasets={[{label:"Avg Pace (min/km)",data:buckets.map(b=>+b.avgPace.toFixed(2)),color:"#4C8DFF"}]} yLabel="min/km"/>
      </div>
      <div className="analytics-section">
        <div className="analytics-section-title">Total Running Time</div>
        <LineChartCanvas labels={labels} datasets={[{label:"Time (min)",data:buckets.map(b=>b.timeMin),color:"#38D978",fill:true}]} yLabel="min"/>
      </div>
      <div className="analytics-section">
        <div className="analytics-section-title">Calories Burned</div>
        <LineChartCanvas labels={labels} datasets={[{label:"Calories",data:buckets.map(b=>b.calories),color:"#FF8A1F",fill:true}]} yLabel="kcal"/>
      </div>
      <div className="analytics-section">
        <div className="analytics-section-title">Elevation Gain</div>
        <LineChartCanvas labels={labels} datasets={[{label:"Elevation Gain (m)",data:buckets.map(b=>b.elevGain),color:"#38D978"}]} yLabel="m"/>
      </div>
      <div className="analytics-section">
        <div className="analytics-section-title">Activity Count</div>
        <LineChartCanvas labels={labels} datasets={[{label:"Activities",data:buckets.map(b=>b.count),color:"#B968FF"}]} yLabel="count"/>
      </div>
    </div>
  );
}

/* ─── ACTIVITY TRACKER PAGE (orchestrator) ──────────
   Phases: idle → requesting → (denied | live) → summary → back to idle.
   All high-frequency GPS data lives in a ref (trackRef) and is mutated directly
   by the geolocation callback; a 1s ticker snapshots it into React state so the
   UI updates smoothly without re-rendering on every raw GPS event. */
function ActivityTrackerPage({user,activities,onSaveActivity,onDeleteActivity,settings={}}){
  const [phase,setPhase]=useState("idle");
  const [wakeLockOn,setWakeLockOn]=useState(false);
  const wakeLockRef=useRef(null);
  /* Holds the screen awake while an activity is running. Browsers cannot record
     location once the screen locks, so the most common way to lose part of a route
     is simply the display timing out. Not supported everywhere — where it isn't,
     the on-screen warning is the only safeguard. */
  useEffect(()=>{
    let cancelled=false;
    const request=async()=>{
      if(phase!=="live"||!("wakeLock" in navigator)) return;
      try{
        const lock=await navigator.wakeLock.request("screen");
        if(cancelled){ lock.release(); return; }
        wakeLockRef.current=lock;
        setWakeLockOn(true);
        lock.addEventListener("release",()=>setWakeLockOn(false));
      }catch{ setWakeLockOn(false); }
    };
    // Re-acquire if the tab was backgrounded and returned, since the lock is dropped
    const onVisible=()=>{ if(document.visibilityState==="visible") request(); };
    request();
    document.addEventListener("visibilitychange",onVisible);
    return ()=>{
      cancelled=true;
      document.removeEventListener("visibilitychange",onVisible);
      if(wakeLockRef.current){ try{ wakeLockRef.current.release(); }catch{} wakeLockRef.current=null; }
      setWakeLockOn(false);
    };
  },[phase]); // idle | requesting | denied | live | summary
  const [selectedType,setSelectedType]=useState("Running");
  const [permissionError,setPermissionError]=useState("");
  const [live,setLive]=useState(null);
  const [unsaved,setUnsaved]=useState(null);
  const [detailActivity,setDetailActivity]=useState(null);
  const [confirmDiscardLive,setConfirmDiscardLive]=useState(false);
  const [historyTab,setHistoryTab]=useState("history");
  const trackRef=useRef(null);
  const watchIdRef=useRef(null);
  const tickRef=useRef(null);

  useEffect(()=>()=>{ clearInterval(tickRef.current); if(watchIdRef.current!=null&&navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current); },[]);

  const addPoint=pos=>{
    const t=trackRef.current; if(!t) return;
    const {latitude:lat,longitude:lng,altitude,speed}=pos.coords;
    const last=t.points[t.points.length-1];
    const now=Date.now();
    if(last){
      const distKm=haversineKm(last.lat,last.lng,lat,lng);
      const distM=distKm*1000;
      const dtSec=(now-last.timestamp)/1000;
      if(distM<4&&dtSec<5) return; // throttle: only record on meaningful movement or elapsed time
      if(distM>=1) t.distanceKm+=distKm;
      const instSpeedKmh=speed!=null&&speed>=0?speed*3.6:(dtSec>0?(distKm/dtSec)*3600:0);
      t.currentSpeed=instSpeedKmh;
      if(instSpeedKmh>t.maxSpeed) t.maxSpeed=instSpeedKmh;
      if(instSpeedKmh>1) t.movingSeconds+=dtSec;
      if(altitude!=null){
        t.hasElevation=true;
        if(last.elevation!=null){
          const dEle=altitude-last.elevation;
          if(dEle>0.5) t.elevGain+=dEle; else if(dEle<-0.5) t.elevLoss+=Math.abs(dEle);
        }
        if(altitude>t.maxElevation) t.maxElevation=altitude;
      }
    }
    t.points.push({lat,lng,timestamp:now,elevation:altitude!=null?altitude:(last?last.elevation:null),speed:speed!=null?speed*3.6:null});
  };

  const tick=()=>{
    const t=trackRef.current; if(!t) return;
    if(!t.paused&&Date.now()-t.lastFixTime>8000) t.gpsStatus="lost";
    const elapsed=t.paused?t.frozenElapsed:(Date.now()-t.startTime-t.pausedAccum)/1000;
    setLive({
      elapsed, distanceKm:t.distanceKm, route:[...t.points],
      currentSpeed:t.currentSpeed, maxSpeed:t.maxSpeed,
      elevGain:t.elevGain, elevLoss:t.elevLoss,
      maxElevation:t.maxElevation===-Infinity?null:t.maxElevation, hasElevation:t.hasElevation,
      movingSeconds:t.movingSeconds, gpsStatus:t.gpsStatus, accuracy:t.accuracy, paused:t.paused,
    });
  };

  const handlePosition=pos=>{
    const t=trackRef.current; if(!t) return;
    t.gpsStatus="connected"; t.accuracy=pos.coords.accuracy; t.lastFixTime=Date.now();
    if(t.paused) return;
    addPoint(pos);
  };
  const handlePositionError=()=>{
    const t=trackRef.current; if(!t) return;
    t.gpsStatus="lost"; // keep timer running — offline behaviour requirement
  };

  const beginTracking=initialPos=>{
    const t={
      points:[], distanceKm:0, elevGain:0, elevLoss:0, maxElevation:-Infinity, hasElevation:false,
      currentSpeed:0, maxSpeed:0, movingSeconds:0, paused:false, pausedAccum:0, pauseStartedAt:0, frozenElapsed:0,
      gpsStatus:"connected", accuracy:initialPos.coords.accuracy, lastFixTime:Date.now(), startTime:Date.now(),
    };
    trackRef.current=t;
    addPoint(initialPos);
    setPhase("live");
    setLive({elapsed:0,distanceKm:0,route:[...t.points],currentSpeed:0,maxSpeed:0,elevGain:0,elevLoss:0,maxElevation:null,hasElevation:false,movingSeconds:0,gpsStatus:"connected",accuracy:t.accuracy,paused:false});
    watchIdRef.current=navigator.geolocation.watchPosition(handlePosition,handlePositionError,{enableHighAccuracy:true,maximumAge:0,timeout:15000});
    tickRef.current=setInterval(tick,1000);
  };

  const startActivity=()=>{
    setPermissionError(""); setPhase("requesting");
    if(!navigator.geolocation){ setPermissionError("Geolocation isn't supported by this browser."); setPhase("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      beginTracking,
      err=>{
        setPermissionError(err.code===1
          ?"Location access was denied. Enable location permissions for this site in your browser/device settings, then try again."
          :"We couldn't get your location. Check that GPS/location services are turned on and try again.");
        setPhase("denied");
      },
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
  };

  const pauseActivity=()=>{
    const t=trackRef.current; if(!t||t.paused) return;
    t.paused=true; t.pauseStartedAt=Date.now(); t.frozenElapsed=(Date.now()-t.startTime-t.pausedAccum)/1000;
    setLive(l=>l?{...l,paused:true}:l);
  };
  const resumeActivity=()=>{
    const t=trackRef.current; if(!t||!t.paused) return;
    t.pausedAccum+=Date.now()-t.pauseStartedAt; t.paused=false;
    setLive(l=>l?{...l,paused:false}:l);
  };
  const stopTrackingInternals=()=>{
    clearInterval(tickRef.current);
    if(watchIdRef.current!=null&&navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
  };
  const finishActivity=()=>{
    const t=trackRef.current; if(!t) return;
    stopTrackingInternals();
    const elapsed=t.paused?t.frozenElapsed:(Date.now()-t.startTime-t.pausedAccum)/1000;
    const hours=elapsed/3600;
    const avgSpeed=t.distanceKm>0&&hours>0?t.distanceKm/hours:0;
    const avgPace=t.distanceKm>0?(elapsed/60)/t.distanceKm:0;
    const finishedAt=new Date().toISOString();
    const hasElevation=t.hasElevation;
    const maxElevation=t.maxElevation===-Infinity?0:t.maxElevation;
    const base={
      id:"act_"+Date.now(), type:selectedType, title:activityTitle(selectedType,finishedAt),
      startedAt:new Date(t.startTime).toISOString(), finishedAt,
      distance:t.distanceKm, duration:elapsed, movingTime:t.movingSeconds,
      avgSpeed, maxSpeed:t.maxSpeed, avgPace,
      calories:estimateCalories(selectedType,avgSpeed,user?.weight,hours),
      elevGain:t.elevGain, elevLoss:t.elevLoss,
      maxElevation, hasElevation,
      route:t.points,
      heartRate:null, // future-ready: populated once wearable integration exists
    };
    // Feature 7 — precompute all analytics once, at save time, so the dashboard loads instantly later
    base.splits=computeSplits(base.route,base.distance);
    base.intervals5=computeTimeIntervals(base.route,5,base.type,user?.weight);
    base.intervals10=computeTimeIntervals(base.route,10,base.type,user?.weight);
    base.series=computeTimeSeries(base.route);
    base.elevationSeries=hasElevation?computeElevationSeries(base.route):[];
    base.personalRecords=detectPersonalRecords(base,activities);
    base.insights=generateInsights(base);
    setUnsaved(base);
    trackRef.current=null; setLive(null); setPhase("summary");
  };
  const discardLive=()=>{
    stopTrackingInternals();
    trackRef.current=null; setLive(null); setConfirmDiscardLive(false); setPhase("idle");
  };
  const saveUnsaved=()=>{ onSaveActivity(unsaved); setUnsaved(null); setPhase("idle"); };
  const discardUnsaved=()=>{ setUnsaved(null); setPhase("idle"); };

  const sorted=[...activities].sort((a,b)=>new Date(b.finishedAt)-new Date(a.finishedAt));

  return(
    <div className="page-wrap">
      {detailActivity&&<ActivityDetailModal activity={detailActivity} onClose={()=>setDetailActivity(null)} onDelete={id=>{onDeleteActivity(id);setDetailActivity(null);}} settings={settings} user={user}/>}
      <div className="page-header fade-up">
        <h1 className="page-title">Activity Tracker</h1>
        <p className="page-sub">Record your runs, jogs, walks, and hikes with live GPS tracking.</p>
      </div>

      {phase==="idle"&&(
        <>
          <div className="card activity-start-card fade-up" style={{padding:28,marginBottom:32}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:14}}>Choose Activity Type</div>
            <div className="onboarding-options" style={{marginBottom:22}}>
              {ACTIVITY_TYPES.map(t=>(
                <button key={t.id} type="button" className={"onboarding-chip"+(selectedType===t.id?" selected":"")} onClick={()=>setSelectedType(t.id)}>{t.icon} {t.label}</button>
              ))}
            </div>
            <div className="gps-warn">
              <span className="ico">⚠️</span>
              <div>
                <b>Keep your screen on while tracking</b>
                <span>Browsers can't record location once the screen locks or you switch apps, so
                locking your phone mid-activity will stop tracking and you'll lose that part of your
                route. FitFuel will try to hold the screen awake, but avoid pressing the lock button
                or leaving the page until you finish.</span>
              </div>
            </div>
            <button className="btn-primary activity-start-btn" onClick={startActivity}>▶ Start Activity</button>
            <p style={{fontSize:12,color:"var(--text-light)",marginTop:12,textAlign:"center"}}>We'll ask for location access to track your route live on the map.</p>
          </div>

          <div className="analytics-section-head">
            <h3 className="ff-heading" style={{fontSize:20,color:"var(--text)",marginBottom:0}}>{historyTab==="history"?"My Activities":"Analytics"}</h3>
            <Seg options={[{v:"history",l:"History"},{v:"analytics",l:"Analytics"}]} value={historyTab} onChange={setHistoryTab}/>
          </div>
          {historyTab==="analytics"
            ? <ActivityTrendsPanel activities={activities}/>
            : (sorted.length===0
                ? <div className="card" style={{padding:"40px 24px",textAlign:"center"}}>
                    <div style={{fontSize:36,marginBottom:10}}>🗺️</div>
                    <p style={{color:"var(--text-mid)",fontSize:14}}>No activities yet — start your first run, jog, walk, or hike above!</p>
                  </div>
                : <div className="grid-auto-fit-sm">
                    {sorted.map(a=><ActivityCard key={a.id} activity={a} onOpen={setDetailActivity}/>)}
                  </div>
              )
          }
        </>
      )}

      {phase==="requesting"&&(
        <div className="card scale-in" style={{padding:"50px 24px",textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:14}}>📡</div>
          <h2 style={{fontSize:18,fontWeight:800,color:"var(--text)",marginBottom:8}}>Requesting location access…</h2>
          <p style={{color:"var(--text-mid)",fontSize:14}}>Please allow location permission in the browser prompt to start tracking.</p>
        </div>
      )}

      {phase==="denied"&&(
        <div className="card scale-in" style={{padding:"46px 24px",textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:14}}>📍</div>
          <h2 style={{fontSize:18,fontWeight:800,color:"var(--text)",marginBottom:10}}>Location Access Needed</h2>
          <p style={{color:"var(--text-mid)",fontSize:14,lineHeight:1.6,maxWidth:420,margin:"0 auto 22px"}}>{permissionError}</p>
          <button className="btn-primary" onClick={startActivity}>Try Again</button>
        </div>
      )}

      {phase==="live"&&live&&(
        <div className="scale-in">
          <div className="activity-gps-pill-row">
            <span className={"activity-gps-pill "+(live.gpsStatus==="connected"?"connected":live.gpsStatus==="lost"?"lost":"connecting")}>
              {live.gpsStatus==="connected"?`🟢 GPS Connected${live.accuracy?` · Accuracy ±${Math.round(live.accuracy)}m`:""}`:live.gpsStatus==="lost"?"🟠 Waiting for GPS Signal…":"⚪ Connecting…"}
            </span>
            {live.paused&&<span className="activity-gps-pill paused">⏸ Paused</span>}
          </div>

          <div className="activity-timer-display">{formatDuration(live.elapsed)}</div>

          <div className="gps-warn gps-warn-live">
            <span className="ico">📱</span>
            <div><span>Keep this screen open — locking your phone or switching apps will pause
            tracking and lose part of your route.{wakeLockOn?" Screen is being held awake.":""}</span></div>
          </div>

          <ActivityMap route={live.route} live={true} height={300}/>

          <div className="activity-stat-grid" style={{marginTop:20}}>
            <ActivityStat icon="📏" label="Distance" value={live.distanceKm.toFixed(2)} unit="km"/>
            <ActivityStat icon="💨" label="Current Speed" value={live.currentSpeed.toFixed(1)} unit="km/h"/>
            <ActivityStat icon="⚡" label="Avg Speed" value={(live.distanceKm>0&&live.elapsed>0?live.distanceKm/(live.elapsed/3600):0).toFixed(1)} unit="km/h"/>
            <ActivityStat icon="⏱" label="Pace" value={formatPace(live.distanceKm>0?(live.elapsed/60)/live.distanceKm:0)} unit="/km"/>
            <ActivityStat icon="⛰️" label="Elevation" value={live.hasElevation?Math.round(live.maxElevation):"—"} unit={live.hasElevation?"m":""}/>
            <ActivityStat icon="🔥" label="Calories" value={estimateCalories(selectedType, live.distanceKm>0&&live.elapsed>0?live.distanceKm/(live.elapsed/3600):0, user?.weight, live.elapsed/3600)} unit="kcal"/>
          </div>

          {confirmDiscardLive?(
            <div style={{marginTop:20,padding:"14px 16px",background:"var(--bg3)",borderRadius:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:"var(--text-mid)",flex:1}}>Discard this activity? All progress will be lost.</span>
              <button className="btn-secondary" onClick={()=>setConfirmDiscardLive(false)}>Cancel</button>
              <button className="btn-primary" onClick={discardLive}>Discard</button>
            </div>
          ):(
            <div className="activity-controls-row">
              {live.paused
                ? <button className="btn-primary activity-control-btn" onClick={resumeActivity}>▶ Resume</button>
                : <button className="btn-secondary activity-control-btn" onClick={pauseActivity}>⏸ Pause</button>
              }
              <button className="btn-primary activity-control-btn" onClick={finishActivity}>⏹ Finish</button>
              <button className="btn-ghost activity-control-btn" style={{border:"1px solid var(--border-strong)",borderRadius:50}} onClick={()=>setConfirmDiscardLive(true)}>Discard</button>
            </div>
          )}
        </div>
      )}

      {phase==="summary"&&unsaved&&(
        <ActivitySummaryCard activity={unsaved} onSave={saveUnsaved} onDiscard={discardUnsaved} settings={settings} user={user}/>
      )}
    </div>
  );
}
