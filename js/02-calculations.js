/* FitFuel — Nutrition targets, workout planner and session maths, colour helpers
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ═══════════ NUTRITION (V3.5) ═══════════ */
const WATER_SERVINGS=[250,500,750];
function todayKey(d){ return (d?new Date(d):new Date()).toISOString().slice(0,10); }
/* Mifflin-St Jeor is the standard clinical estimator for resting energy; it needs
   sex, and when that's unknown we average the male/female constants rather than
   silently assuming one. Multipliers and macro splits follow common sports-nutrition
   guidance — these are estimates, and the UI says so and lets people override. */
function computeNutritionGoals(user){
  const w=parseFloat(user?.weight)||70;
  const h=parseFloat(user?.height)||170;
  const age=parseInt(user?.age)||25;
  const sex=(user?.gender||user?.sex||user?.onboarding?.gender||"").toLowerCase();
  const base=10*w+6.25*h-5*age;
  const bmr=sex.startsWith("m")?base+5:sex.startsWith("f")?base-161:base-78;
  const activity=user?.onboarding?.activityLevel||user?.onboarding?.exerciseFrequency||"";
  const mult=/very|athlete|6|7/i.test(activity)?1.725
    :/active|4|5/i.test(activity)?1.55
    :/light|2|3/i.test(activity)?1.375
    :/sedentary|0|1/i.test(activity)?1.2:1.45;
  const tdee=bmr*mult;
  const goals=(user?.onboarding?.primaryGoals||user?.goals||[]).join(" ").toLowerCase();
  let goalKind=/lose|fat|weight loss|slim/.test(goals)?"lose"
    :/muscle|gain|bulk|strength/.test(goals)?"gain"
    :/endurance|marathon|run/.test(goals)?"endurance":"maintain";
  /* Under-18s are still growing, and a tapped goal isn't a clinical reason to
     restrict a teenager's intake. Their targets are set to maintenance with an
     emphasis on adequate protein and fibre instead of a deficit. Flagged so the
     UI can explain why, rather than silently ignoring what they selected. */
  const isYouth=age>0&&age<18;
  const suppressedDeficit=isYouth&&goalKind==="lose";
  if(suppressedDeficit) goalKind="maintain";
  /* Mifflin-St Jeor needs a sex constant. When someone declines to share it we use
     the midpoint of the male/female constants rather than guessing — the estimate
     is simply a bit less precise, which the UI says plainly. We never re-prompt. */
  const genderDeclined=/prefer not|other/i.test(user?.gender||user?.onboarding?.gender||"");
  const genderUnknown=!sex.startsWith("m")&&!sex.startsWith("f");
  const calories=Math.max(
    // Never return a target below widely-accepted minimum intakes, however the
    // deficit maths works out — an under-eating recommendation is a real harm.
    sex.startsWith("m")?1500:1200,
    Math.round(({lose:tdee-450,gain:tdee+350,endurance:tdee+150,maintain:tdee})[goalKind]/10)*10
  );
  const proteinPerKg={lose:2.0,gain:1.9,endurance:1.5,maintain:1.6}[goalKind];
  const protein=Math.round(w*proteinPerKg);
  const fat=Math.round((calories*({lose:0.28,gain:0.27,endurance:0.25,maintain:0.28})[goalKind])/9);
  const carbs=Math.max(0,Math.round((calories-protein*4-fat*9)/4));
  return { calories, protein, carbs, fat, waterMl:Math.round((w*33)/50)*50, goalKind, auto:true,
    // Standard guidance is ~14g fibre per 1000 kcal
    fibre:Math.round((calories/1000)*14),
    isYouth, suppressedDeficit, genderDeclined, genderUnknown,
    bmr:Math.round(bmr), tdee:Math.round(tdee), activityMult:mult,
    adjustment:calories-Math.round(tdee),
    /* Tracked so the UI can tell people their estimate is running on defaults
       rather than quietly presenting placeholder numbers as if they were real. */
    missing:[
      !user?.weight&&"weight", !user?.height&&"height",
      !user?.age&&"age", !(user?.gender||user?.sex||user?.onboarding?.gender)&&!genderDeclined&&"gender",
    ].filter(Boolean),
  };
}
function emptyNutritionDay(dateKey){ return { id:dateKey||todayKey(), entries:[], waterMl:0 }; }
function sumNutrition(entries){
  return (entries||[]).reduce((t,e)=>({
    cal:t.cal+(e.cal||0)*(e.servings||1),
    protein:t.protein+(e.protein||0)*(e.servings||1),
    carbs:t.carbs+(e.carbs||0)*(e.servings||1),
    fat:t.fat+(e.fat||0)*(e.servings||1),
    fibre:t.fibre+(e.fibre||0)*(e.servings||1),
  }),{cal:0,protein:0,carbs:0,fat:0,fibre:0});
}
/* Calories burned on a given day, drawn from what's already tracked elsewhere so
   nothing has to be entered twice. */
function burnedOnDate(dateKey,activities,workoutSessions){
  const match=x=>todayKey(x)===dateKey;
  const a=(activities||[]).filter(x=>match(x.finishedAt)).reduce((t,x)=>t+(x.calories||0),0);
  const w=(workoutSessions||[]).filter(x=>match(x.date)).reduce((t,x)=>t+(x.calories||0),0);
  return Math.round(a+w);
}
function nutritionInsights(logs,goals,activities,workoutSessions){
  const days=Object.values(logs||{}).filter(d=>d.entries?.length||d.waterMl);
  if(!days.length) return null;
  const totals=days.map(d=>({key:d.id,...sumNutrition(d.entries),water:d.waterMl||0}));
  const avgCal=Math.round(totals.reduce((t,d)=>t+d.cal,0)/totals.length);
  const avgProtein=Math.round(totals.reduce((t,d)=>t+d.protein,0)/totals.length);
  const best=totals.reduce((a,b)=>b.protein>a.protein?b:a,totals[0]);
  const hydratedDays=totals.filter(d=>goals?.waterMl&&d.water>=goals.waterMl).length;
  const counts={};
  days.forEach(d=>(d.entries||[]).forEach(e=>{counts[e.name]=(counts[e.name]||0)+1;}));
  const topMeal=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  // Consecutive days logged, counting back from today
  let streak=0; const logged=new Set(days.map(d=>d.id)); const cur=new Date();
  if(!logged.has(todayKey(cur))) cur.setDate(cur.getDate()-1);
  while(logged.has(todayKey(cur))){ streak++; cur.setDate(cur.getDate()-1); }
  return { daysLogged:days.length, avgCal, avgProtein, bestProteinDay:best,
    hydratedDays, topMeal:topMeal?{name:topMeal[0],count:topMeal[1]}:null, streak };
}
function nutritionStreakBadges(insights,goals,today){
  if(!insights) return [];
  const out=[];
  if(insights.streak>=7) out.push({icon:"🔥",label:"7 days logged"});
  else if(insights.streak>=3) out.push({icon:"🔥",label:`${insights.streak}-day logging streak`});
  if(goals?.waterMl&&today?.waterMl>=goals.waterMl) out.push({icon:"💧",label:"Hydration hero"});
  const t=sumNutrition(today?.entries);
  if(goals?.protein&&t.protein>=goals.protein) out.push({icon:"🥩",label:"Protein goal hit"});
  if(insights.daysLogged>=7) out.push({icon:"🏅",label:"Healthy week"});
  return out;
}

/* ═══════════ WORKOUT PLANNER (V3.6) ═══════════ */
const PLAN_TYPES={
  workout:{icon:"🏋️",label:"Workout"},
  run:{icon:"🏃",label:"Run"},
  recovery:{icon:"🧘",label:"Recovery"},
  rest:{icon:"😴",label:"Rest day"},
  other:{icon:"⭐",label:"Other"},
};
function ymd(d){ const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`; }
/* Monday-first grid covering the whole month plus the leading/trailing days that
   complete the first and last weeks. */
function buildMonthGrid(year,month){
  const first=new Date(year,month,1);
  const startOffset=(first.getDay()+6)%7;
  const start=new Date(year,month,1-startOffset);
  const cells=[];
  for(let i=0;i<42;i++){
    const d=new Date(start); d.setDate(start.getDate()+i);
    cells.push({date:d,key:ymd(d),inMonth:d.getMonth()===month});
    if(i>=34&&d.getMonth()!==month&&(i+1)%7===0) break;
  }
  return cells;
}
/* "Missed" is derived rather than stored — a planned item whose day has passed
   without completion. Keeps storage truthful and avoids needing a nightly job. */
function derivedStatus(act){
  if(act.status&&act.status!=="planned") return act.status;
  if(act.type==="rest") return "planned";
  return act.date<ymd(new Date())?"missed":"planned";
}
function expandRecurrence({baseDate,recurrence,weekdays,weeks=12}){
  const out=[];
  if(!recurrence||recurrence==="none") return [baseDate];
  const start=new Date(baseDate+"T00:00:00");
  const end=new Date(start); end.setDate(end.getDate()+weeks*7);
  for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)){
    const dow=(d.getDay()+6)%7; // 0=Mon
    if(recurrence==="daily") out.push(ymd(d));
    else if(recurrence==="weekly"&&(d-start)%(7*86400000)===0) out.push(ymd(d));
    else if(recurrence==="weekdays"&&(weekdays||[]).includes(dow)) out.push(ymd(d));
  }
  return out.length?out:[baseDate];
}
function summarisePlan(activities,filterFn){
  const list=activities.filter(filterFn);
  const planned=list.filter(a=>a.type!=="rest");
  const completed=planned.filter(a=>derivedStatus(a)==="completed");
  const missed=planned.filter(a=>derivedStatus(a)==="missed");
  return {
    total:planned.length, completed:completed.length, missed:missed.length,
    rest:list.filter(a=>a.type==="rest").length,
    runs:completed.filter(a=>a.type==="run").length,
    workouts:completed.filter(a=>a.type==="workout").length,
    rate:planned.length?Math.round((completed.length/planned.length)*100):0,
  };
}

function loadActivities(){ return loadLS("ff_activities",[]); }

/* ═══════════ WORKOUT SESSIONS (V3.4) ═══════════ */
/* Rest values in the library are written as "15s", "30 sec", "1 min", "1:30". */
function parseRestSeconds(detail){
  if(!detail) return 0;
  const s=String(detail).toLowerCase().trim();
  const clock=s.match(/^(\d+):(\d{2})$/);
  if(clock) return (+clock[1])*60+(+clock[2]);
  const min=s.match(/([\d.]+)\s*(min|minute)/);
  if(min) return Math.round(parseFloat(min[1])*60);
  const sec=s.match(/([\d.]+)\s*(s|sec|second)/);
  if(sec) return Math.round(parseFloat(sec[1]));
  const bare=s.match(/^([\d.]+)$/);
  if(bare) return Math.round(parseFloat(bare[1]));
  return 0;
}
/* An estimate built from the workout's actual contents rather than a fixed
   number: explicit rest blocks are counted at face value, and working sets are
   costed by difficulty (harder sessions mean heavier loads and longer resets). */
function estimateWorkoutSeconds(w){
  if(!w||!Array.isArray(w.exercises)||w.exercises.length===0){
    return Math.max(60,(parseInt(w?.duration)||10)*60);
  }
  const perExercise={Beginner:105,Intermediate:150,Advanced:195}[w.diff]||150;
  let total=0;
  w.exercises.forEach(ex=>{
    if(ex.rest){ total+=parseRestSeconds(ex.detail)||30; return; }
    total+=perExercise;
    const holdOrReps=parseRestSeconds(ex.detail);
    if(holdOrReps>60) total+=holdOrReps-60; // long holds add real time
  });
  total+=90; // warm-up / transition overhead
  return Math.round(total);
}
function formatEstimateRange(sec){
  const mins=sec/60;
  const lo=Math.max(1,Math.round(mins*0.85));
  const hi=Math.round(mins*1.2);
  return lo===hi?`${lo} min`:`${lo}–${hi} min`;
}
function requiredExerciseIndexes(w){
  if(!w||!Array.isArray(w.exercises)) return [];
  return w.exercises.map((ex,i)=>ex.rest?null:i).filter(i=>i!==null);
}
/* Scales the workout's headline calorie figure by how much was actually done and
   how long it took, so a half-finished session doesn't claim the full burn. */
function estimateWorkoutCalories(w,elapsedSec,completedCount,requiredCount){
  const base=w?.calories||0;
  if(!base||!requiredCount) return 0;
  const doneRatio=Math.min(1,completedCount/requiredCount);
  const planned=estimateWorkoutSeconds(w);
  const timeRatio=planned>0?Math.min(1.35,Math.max(0.4,elapsedSec/planned)):1;
  return Math.max(0,Math.round(base*doneRatio*timeRatio));
}
function loadWorkoutSessionsLS(){ return loadLS("ff_workout_sessions",[]); }
/* Personal bests are only meaningful against comparable efforts, so "fastest"
   compares the same workout completed in full. */
function detectWorkoutPRs(session,prior){
  const prs=[];
  if(!session.completed) return prs;
  const sameFull=prior.filter(s=>s.workoutId===session.workoutId&&s.completed);
  if(sameFull.length&&session.durationSec<Math.min(...sameFull.map(s=>s.durationSec))){
    prs.push({icon:"⚡",label:"Fastest time for this workout"});
  } else if(!sameFull.length){
    prs.push({icon:"✨",label:"First time completing this workout"});
  }
  if(prior.length&&session.durationSec>Math.max(...prior.map(s=>s.durationSec))){
    prs.push({icon:"⏱",label:"Longest session yet"});
  }
  if(session.calories&&prior.length&&session.calories>Math.max(...prior.map(s=>s.calories||0))){
    prs.push({icon:"🔥",label:"Most calories burned in one workout"});
  }
  return prs;
}
function workoutStreakDays(sessions){
  if(!sessions.length) return 0;
  const days=new Set(sessions.map(s=>new Date(s.date).toDateString()));
  let streak=0;
  const d=new Date();
  if(!days.has(d.toDateString())) d.setDate(d.getDate()-1);
  while(days.has(d.toDateString())){ streak++; d.setDate(d.getDate()-1); }
  return streak;
}
function detectAchievements(sessions){
  const total=sessions.length;
  const streak=workoutStreakDays(sessions);
  const cardio=sessions.filter(s=>s.cat==="Cardio").length;
  const fast=sessions.some(s=>s.completed&&s.estimateSec&&s.durationSec<s.estimateSec*0.8);
  const out=[];
  if(total>=1) out.push({icon:"🏅",label:"First workout"});
  if(streak>=7) out.push({icon:"🔥",label:"7-day streak"});
  if(total>=50) out.push({icon:"💪",label:"50 workouts completed"});
  else if(total>=10) out.push({icon:"💪",label:"10 workouts completed"});
  if(fast) out.push({icon:"⚡",label:"Fast finisher"});
  if(cardio>=10) out.push({icon:"🏃",label:"Cardio champion"});
  return out;
}
function saveActivitiesLS(list){ saveLS("ff_activities",list); }
function activityTitle(type,dateIso){
  const h=new Date(dateIso).getHours();
  const tod=h<12?"Morning":h<18?"Afternoon":"Evening";
  const verb={Running:"Run",Jogging:"Jog",Walking:"Walk",Hiking:"Hike"}[type]||type;
  return `${tod} ${verb}`;
}
/* Aggregate stats used by the Home dashboard + Profile lifetime card */
function aggregateActivityStats(activities){
  const now=Date.now();
  const day=86400000;
  const inLast=days=>activities.filter(a=>now-new Date(a.finishedAt).getTime()<=days*day);
  const sumDist=list=>list.reduce((t,a)=>t+a.distance,0);
  const runsAndJogs=activities.filter(a=>a.type==="Running"||a.type==="Jogging");
  const walks=activities.filter(a=>a.type==="Walking"||a.type==="Hiking");
  const sorted=[...activities].sort((a,b)=>new Date(b.finishedAt)-new Date(a.finishedAt));
  // running streak: consecutive calendar days (from today backward) containing >=1 activity
  const daySet=new Set(activities.map(a=>new Date(a.finishedAt).toDateString()));
  let streak=0, cursor=new Date();
  while(daySet.has(cursor.toDateString())){ streak++; cursor.setDate(cursor.getDate()-1); }
  const totalWeeks=Math.max(1, activities.length ? Math.ceil((now-new Date(sorted[sorted.length-1].finishedAt).getTime())/(7*day)) : 1);
  return {
    lastActivity: sorted[0]||null,
    weeklyDistance: sumDist(inLast(7)),
    monthlyDistance: sumDist(inLast(30)),
    totalActivities: activities.length,
    longestRun: runsAndJogs.length ? Math.max(...runsAndJogs.map(a=>a.distance)) : 0,
    longestActivity: activities.length ? Math.max(...activities.map(a=>a.distance)) : 0,
    runningStreak: streak,
    totalDistance: sumDist(activities),
    runningDistance: sumDist(runsAndJogs),
    walkingDistance: sumDist(walks),
    totalTimeSeconds: activities.reduce((t,a)=>t+(a.duration||0),0),
    avgWeeklyDistance: sumDist(activities)/totalWeeks,
    fastestPace: activities.length ? Math.min(...activities.filter(a=>a.avgPace>0).map(a=>a.avgPace)) : 0,
    highestElevation: activities.length ? Math.max(0,...activities.map(a=>a.maxElevation||0)) : 0,
  };
}

/* ═══════════════════════════════════════════
   ACTIVITY ANALYTICS — data processing (Feature 7)
   All of this runs once at save time and is stored on the
   activity object, so the analytics dashboard never has to
   recompute from raw GPS points on load.
═══════════════════════════════════════════ */

/* Distance-based splits — 1km by default, 500m if the whole activity is under 1km */
function computeSplits(route,totalDistanceKm){
  if(!route||route.length<2||totalDistanceKm<=0) return [];
  const unitKm=totalDistanceKm<1?0.5:1;
  const splits=[]; let cum=0, splitStartDist=0, splitStartTime=route[0].timestamp, idx=1;
  for(let i=1;i<route.length;i++){
    cum+=haversineKm(route[i-1].lat,route[i-1].lng,route[i].lat,route[i].lng);
    while(cum>=idx*unitKm-1e-9 && idx*unitKm<=totalDistanceKm+1e-9){
      const distanceKm=idx*unitKm-splitStartDist;
      const timeSec=(route[i].timestamp-splitStartTime)/1000;
      splits.push({
        label: unitKm===1?`${idx} km`:`${Math.round(idx*unitKm*1000)} m`,
        distanceKm, timeSec,
        pace: distanceKm>0?(timeSec/60)/distanceKm:0,
        avgSpeed: timeSec>0?distanceKm/(timeSec/3600):0,
        partial:false,
      });
      splitStartDist=idx*unitKm; splitStartTime=route[i].timestamp; idx++;
    }
  }
  const remain=totalDistanceKm-splitStartDist;
  if(remain>0.03){
    const lastPoint=route[route.length-1];
    const timeSec=(lastPoint.timestamp-splitStartTime)/1000;
    splits.push({
      label:`${Math.round(totalDistanceKm*1000)} m`,
      distanceKm:remain, timeSec,
      pace:remain>0?(timeSec/60)/remain:0,
      avgSpeed:timeSec>0?remain/(timeSec/3600):0,
      partial:true,
    });
  }
  return splits;
}
/* Fixed time-window intervals (e.g. every 5 or 10 minutes) */
function computeTimeIntervals(route,intervalMin,type,weightKg){
  if(!route||route.length<2) return [];
  const intervalMs=intervalMin*60000;
  let bIdx=0, bStart=route[0].timestamp, bStartDist=0, cum=0;
  const buckets=[];
  for(let i=1;i<route.length;i++){
    cum+=haversineKm(route[i-1].lat,route[i-1].lng,route[i].lat,route[i].lng);
    while(route[i].timestamp-bStart>=intervalMs){
      const distanceKm=Math.max(0,cum-bStartDist);
      const timeSec=intervalMin*60;
      const avgSpeed=distanceKm>0?distanceKm/(timeSec/3600):0;
      buckets.push({
        label:`${bIdx*intervalMin}–${(bIdx+1)*intervalMin} min`,
        distanceKm, avgPace:distanceKm>0?(timeSec/60)/distanceKm:0, avgSpeed,
        calories:estimateCalories(type,avgSpeed,weightKg,timeSec/3600),
      });
      bStart+=intervalMs; bStartDist=cum; bIdx++;
    }
  }
  const lastPoint=route[route.length-1];
  const trailingSec=(lastPoint.timestamp-bStart)/1000;
  if(trailingSec>30){
    const distanceKm=Math.max(0,cum-bStartDist);
    const avgSpeed=distanceKm>0?distanceKm/(trailingSec/3600):0;
    buckets.push({
      label:`${bIdx*intervalMin}+ min`,
      distanceKm, avgPace:distanceKm>0?(trailingSec/60)/distanceKm:0, avgSpeed,
      calories:estimateCalories(type,avgSpeed,weightKg,trailingSec/3600),
    });
  }
  return buckets;
}
/* Smoothed, downsampled pace+speed-over-time series (capped sample count keeps storage
   and chart rendering fast even for activities with thousands of raw GPS points) */
function computeTimeSeries(route,maxSamples=60){
  if(!route||route.length<2) return [];
  const t0=route[0].timestamp;
  const totalMs=route[route.length-1].timestamp-t0;
  if(totalMs<=0) return [];
  const bucketCount=Math.min(maxSamples,Math.max(6,Math.round(totalMs/30000)));
  const bucketMs=totalMs/bucketCount;
  const buckets=Array.from({length:bucketCount},()=>({distSum:0,timeSum:0,speedSum:0,speedCount:0}));
  for(let i=1;i<route.length;i++){
    const d=haversineKm(route[i-1].lat,route[i-1].lng,route[i].lat,route[i].lng);
    const dt=(route[i].timestamp-route[i-1].timestamp)/1000;
    const tMid=((route[i].timestamp-t0)+(route[i-1].timestamp-t0))/2;
    let bIdx=Math.min(bucketCount-1,Math.max(0,Math.floor(tMid/bucketMs)));
    buckets[bIdx].distSum+=d; buckets[bIdx].timeSum+=dt;
    if(route[i].speed!=null){ buckets[bIdx].speedSum+=route[i].speed; buckets[bIdx].speedCount++; }
  }
  return buckets.map((b,i)=>({
    t: Math.round(((i+0.5)*bucketMs/60000)*10)/10,
    pace: b.distSum>0?(b.timeSum/60)/b.distSum:0,
    speed: b.speedCount>0?b.speedSum/b.speedCount:(b.timeSum>0?b.distSum/(b.timeSum/3600):0),
  })).filter(p=>p.speed>0||p.pace>0);
}
/* Smoothed elevation-vs-distance profile */
function computeElevationSeries(route,maxSamples=60){
  if(!route||route.length<2||!route.some(p=>p.elevation!=null)) return [];
  let cum=0;
  const points=[{d:0,e:route[0].elevation||0}];
  for(let i=1;i<route.length;i++){
    cum+=haversineKm(route[i-1].lat,route[i-1].lng,route[i].lat,route[i].lng);
    points.push({d:cum,e:route[i].elevation!=null?route[i].elevation:points[points.length-1].e});
  }
  if(cum<=0) return [];
  const bucketCount=Math.min(maxSamples,Math.max(6,points.length));
  const bucketKm=cum/bucketCount;
  const buckets=Array.from({length:bucketCount},()=>({sum:0,count:0}));
  points.forEach(p=>{
    let bIdx=Math.min(bucketCount-1,Math.max(0,Math.floor(p.d/bucketKm)));
    buckets[bIdx].sum+=p.e; buckets[bIdx].count++;
  });
  return buckets.map((b,i)=>({distanceKm:Math.round(((i+0.5)*bucketKm)*100)/100,elevation:b.count>0?b.sum/b.count:null})).filter(p=>p.elevation!=null);
}
/* Best "full" split pace — used both for display and fastest-1km PR detection */
function bestSplitPace(activity){
  const full=(activity.splits||[]).filter(s=>!s.partial);
  if(!full.length) return Infinity;
  return Math.min(...full.map(s=>s.pace));
}
/* Compare a freshly-finished activity against prior saved activities to detect PRs.
   Fastest-5km/10km use total-distance activities close to that target distance, since
   true rolling best-segment analysis would need far more GPS precision than a demo app has. */
function detectPersonalRecords(newAct,priorActivities){
  const records=[];
  const isRun=newAct.type==="Running"||newAct.type==="Jogging";
  const priorRuns=priorActivities.filter(a=>a.type==="Running"||a.type==="Jogging");
  const priorWalks=priorActivities.filter(a=>a.type==="Walking"||a.type==="Hiking");
  if(isRun){
    const longest=priorRuns.length?Math.max(...priorRuns.map(a=>a.distance)):0;
    if(newAct.distance>longest&&newAct.distance>0.1) records.push("Longest Run");
  } else {
    const longest=priorWalks.length?Math.max(...priorWalks.map(a=>a.distance)):0;
    if(newAct.distance>longest&&newAct.distance>0.1) records.push("Longest Walking Distance");
  }
  const newBest=bestSplitPace(newAct);
  if(newBest<Infinity){
    const priorBest=priorActivities.length?Math.min(...priorActivities.map(bestSplitPace)):Infinity;
    if(newBest<priorBest) records.push("Fastest 1 km");
  }
  const near=(v,target,tol)=>Math.abs(v-target)<=tol;
  if(near(newAct.distance,5,0.3)){
    const cands=priorActivities.filter(a=>near(a.distance,5,0.3)&&a.avgPace>0);
    const priorBest=cands.length?Math.min(...cands.map(a=>a.avgPace)):Infinity;
    if(newAct.avgPace>0&&newAct.avgPace<priorBest) records.push("Fastest 5 km");
  }
  if(near(newAct.distance,10,0.5)){
    const cands=priorActivities.filter(a=>near(a.distance,10,0.5)&&a.avgPace>0);
    const priorBest=cands.length?Math.min(...cands.map(a=>a.avgPace)):Infinity;
    if(newAct.avgPace>0&&newAct.avgPace<priorBest) records.push("Fastest 10 km");
  }
  const priorMaxSpeed=priorActivities.length?Math.max(...priorActivities.map(a=>a.avgSpeed||0)):0;
  if(newAct.avgSpeed>priorMaxSpeed&&newAct.avgSpeed>0) records.push("Highest Average Speed");
  const priorMaxElev=priorActivities.length?Math.max(...priorActivities.map(a=>a.elevGain||0)):0;
  if(newAct.hasElevation&&newAct.elevGain>priorMaxElev&&newAct.elevGain>0) records.push("Highest Elevation Gain");
  const priorMaxDur=priorActivities.length?Math.max(...priorActivities.map(a=>a.duration||0)):0;
  if(newAct.duration>priorMaxDur&&newAct.duration>60) records.push("Longest Activity Duration");
  return records;
}
/* Short, positive, data-driven summary sentences */
function generateInsights(activity){
  const insights=[];
  const full=(activity.splits||[]).filter(s=>!s.partial);
  if(full.length>=2){
    let bestIdx=0; full.forEach((s,i)=>{ if(s.pace<full[bestIdx].pace) bestIdx=i; });
    insights.push(`Your fastest split was ${full[bestIdx].label}, at a ${formatPace(full[bestIdx].pace)}/km pace.`);
    const avgP=full.reduce((a,s)=>a+s.pace,0)/full.length;
    const variance=full.reduce((a,s)=>a+Math.abs(s.pace-avgP),0)/full.length;
    if(avgP>0&&variance/avgP<0.08) insights.push("Your pace remained consistent throughout the activity.");
    const lastFifth=full.slice(Math.ceil(full.length*0.8));
    if(lastFifth.length){
      const lastAvg=lastFifth.reduce((a,s)=>a+s.pace,0)/lastFifth.length;
      if(avgP>0&&lastAvg>avgP*1.1) insights.push("You slowed slightly during the final stretch of the activity.");
      else if(avgP>0&&lastAvg<avgP*0.95) insights.push("You finished strong, picking up the pace in the final stretch.");
    }
  }
  if(activity.hasElevation&&activity.elevGain>20) insights.push(`You kept a solid pace despite climbing ${Math.round(activity.elevGain)}m of elevation.`);
  if(activity.personalRecords&&activity.personalRecords.length) insights.push(`New personal best: ${activity.personalRecords.join(", ")}! 🎉`);
  if(!insights.length) insights.push("Nice work getting outside and moving — every activity adds up!");
  return insights;
}
/* Locate the route point index reached after `ms` of virtual playback time — used by Route Playback */
function findRouteIndexAtMs(route,ms){
  if(!route||!route.length) return 0;
  const targetTime=route[0].timestamp+ms;
  let idx=0;
  while(idx<route.length-1&&route[idx+1].timestamp<=targetTime) idx++;
  return idx;
}
function buildTrendBuckets(activities,range){
  if(!activities.length) return [];
  const now=new Date();
  let count, bucketFn, labels;
  if(range==="week"){
    count=7;
    bucketFn=d=>{ const diff=Math.floor((now-d)/86400000); return diff>=0&&diff<7?6-diff:-1; };
    labels=Array.from({length:7},(_,i)=>{ const dt=new Date(now); dt.setDate(dt.getDate()-(6-i)); return dt.toLocaleDateString(undefined,{weekday:"short"}); });
  } else if(range==="month"){
    count=5;
    bucketFn=d=>{ const diffDays=Math.floor((now-d)/86400000); const wk=Math.floor(diffDays/7); return wk>=0&&wk<5?4-wk:-1; };
    labels=Array.from({length:5},(_,i)=>`Wk ${i+1}`);
  } else if(range==="year"){
    count=12;
    bucketFn=d=>{ const m=(now.getFullYear()-d.getFullYear())*12+(now.getMonth()-d.getMonth()); return m>=0&&m<12?11-m:-1; };
    labels=Array.from({length:12},(_,i)=>{ const dt=new Date(now.getFullYear(),now.getMonth()-(11-i),1); return dt.toLocaleDateString(undefined,{month:"short"}); });
  } else {
    const sorted=[...activities].sort((a,b)=>new Date(a.finishedAt)-new Date(b.finishedAt));
    const first=new Date(sorted[0].finishedAt);
    count=Math.max(1,(now.getFullYear()-first.getFullYear())*12+(now.getMonth()-first.getMonth())+1);
    bucketFn=d=>{ const m=(now.getFullYear()-d.getFullYear())*12+(now.getMonth()-d.getMonth()); return m>=0&&m<count?count-1-m:-1; };
    labels=Array.from({length:count},(_,i)=>{ const dt=new Date(now.getFullYear(),now.getMonth()-(count-1-i),1); return dt.toLocaleDateString(undefined,{month:"short",year:"2-digit"}); });
  }
  const buckets=Array.from({length:count},()=>({distance:0,time:0,calories:0,elevGain:0,count:0,paceSum:0,paceCount:0}));
  activities.forEach(a=>{
    const idx=bucketFn(new Date(a.finishedAt));
    if(idx<0||idx>=count) return;
    const b=buckets[idx];
    b.distance+=a.distance; b.time+=a.duration||0; b.calories+=a.calories||0; b.elevGain+=a.elevGain||0; b.count+=1;
    if(a.avgPace>0){ b.paceSum+=a.avgPace; b.paceCount++; }
  });
  return buckets.map((b,i)=>({
    label:labels[i],
    distance:Math.round(b.distance*100)/100,
    timeMin:Math.round(b.time/60),
    calories:Math.round(b.calories),
    elevGain:Math.round(b.elevGain),
    count:b.count,
    avgPace:b.paceCount>0?b.paceSum/b.paceCount:0,
  }));
}
/* ─── LUMINANCE HELPERS ─────────────────────────────── */
function hexToRgb(hex){
  hex=hex.replace(/^#/,"");
  if(hex.length===3) hex=hex.split("").map(c=>c+c).join("");
  const n=parseInt(hex,16);
  return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}
function relativeLuminance({r,g,b}){
  const ch=c=>{const s=c/255;return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4);};
  return 0.2126*ch(r)+0.7152*ch(g)+0.0722*ch(b);
}
function adjustHex(hex,factor){
  let {r,g,b}=hexToRgb(hex);
  r=Math.min(255,Math.max(0,Math.round(r+(factor>0?(255-r):r)*Math.abs(factor))));
  g=Math.min(255,Math.max(0,Math.round(g+(factor>0?(255-g):g)*Math.abs(factor))));
  b=Math.min(255,Math.max(0,Math.round(b+(factor>0?(255-b):b)*Math.abs(factor))));
  return "#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");
}
// Build tint tokens from an accent hex string.
// Returns an object with --accent-tint-1..5 and --accent-bg-deep.
function buildTints(accentHex, bgHex){
  const {r,g,b}=hexToRgb(accentHex);
  const a=`${r},${g},${b}`;
  // --accent-bg-deep: a very dark mix of the bg colour tinted toward accent
  const bgRgb=hexToRgb(bgHex);
  const isLightBg=relativeLuminance(bgRgb)>0.179;
  // For light themes the "deep" bg is a faint tinted white; for dark it's a dark tinted shade
  const deepBg = isLightBg
    ? adjustHex(accentHex, 0.80)   // very pale tint of accent
    : adjustHex(accentHex, -0.82); // very dark shade of accent
  return {
    "--accent-tint-1":`rgba(${a},0.07)`,
    "--accent-tint-2":`rgba(${a},0.12)`,
    "--accent-tint-3":`rgba(${a},0.20)`,
    "--accent-tint-4":`rgba(${a},0.35)`,
    "--accent-tint-5":`rgba(${a},0.45)`,
    "--accent-bg-deep": deepBg,
  };
}
function buildCustomVars(accentHex,bgHex){
  const bgRgb=hexToRgb(bgHex);
  const lum=relativeLuminance(bgRgb);
  const isLight=lum>0.179;
  const text       = isLight?"#0D0E12":"#F0F0F5";
  const textMid    = isLight?"#50525E":"#8B8D97";
  const textLight  = isLight?"#9CA0AE":"#444653";
  const bg2        = adjustHex(bgHex,isLight?-0.06:0.06);
  const bg3        = adjustHex(bgHex,isLight?-0.10:0.10);
  const card       = adjustHex(bgHex,isLight? 0.05:0.04);
  const card2      = adjustHex(bgHex,isLight?-0.03:0.07);
  const borderA    = isLight?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.07)";
  const borderS    = isLight?"rgba(0,0,0,0.14)":"rgba(255,255,255,0.13)";
  const {r,g,b}=hexToRgb(accentHex);
  // Streak / banner vars
  const streakLabel  = isLight?"rgba(0,0,0,0.45)":"rgba(255,255,255,0.5)";
  const streakText   = isLight?"rgba(0,0,0,0.75)":"rgba(255,255,255,0.85)";
  const streakSub    = isLight?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.65)";
  const bannerHead   = isLight?"#0D0E12":"#fff";
  const pillBg       = isLight?"rgba(0,0,0,0.07)":"rgba(255,255,255,0.12)";
  const pillText     = isLight?"#0D0E12":"rgba(255,255,255,0.88)";
  const trackBg     = isLight?"rgba(0,0,0,0.12)":"rgba(255,255,255,0.15)";
  const trackFill   = isLight?"#0D0E12":"#fff";
  const btnBg       = isLight?"rgba(0,0,0,0.07)":"rgba(255,255,255,0.1)";
  const btnBorder   = isLight?"rgba(0,0,0,0.15)":"rgba(255,255,255,0.18)";
  /* Surfaces that sit over the page background must follow it too. Without these,
     a light custom background left the nav and hero overlays at their dark
     defaults, so dark text and the brand mark became unreadable on them. */
  const bgR = hexToRgb(bgHex);
  const rgba = a => `rgba(${bgR.r},${bgR.g},${bgR.b},${a})`;
  return {
    "--accent":accentHex,"--accent-dark":adjustHex(accentHex,-0.2),
    "--accent-coral":adjustHex(accentHex,0.15),
    "--bg":bgHex,"--bg2":bg2,"--bg3":bg3,"--card":card,"--card2":card2,
    "--border":borderA,"--border-strong":borderS,
    "--text":text,"--text-mid":textMid,"--text-light":textLight,
    "--info-body-text":textMid,"--info-label-text":textLight,
    "--accent-glow":`rgba(${r},${g},${b},0.22)`,
    "--nav-bg":rgba(0.88),"--nav-bg-mobile":rgba(0.96),
    "--hero-overlay-start":rgba(0.92),"--hero-overlay-mid":rgba(0.70),
    "--hero-overlay-fade":rgba(0.30),
    "--auth-overlay-start":rgba(0.97),"--auth-overlay-mid":rgba(0.65),
    "--accent-bg-deep":adjustHex(accentHex, isLight?0.85:-0.75),
    "--logo-color": isLight ? "#0D0E12" : "#FFFFFF",
    "--streak-label":streakLabel,"--streak-text":streakText,"--streak-sub":streakSub,
    "--banner-label":streakLabel,"--banner-heading":bannerHead,
    "--banner-pill-bg":pillBg,"--banner-pill-text":pillText,
    "--banner-track":trackBg,"--banner-track-fill":trackFill,
    "--banner-btn-bg":btnBg,"--banner-btn-border":btnBorder,
  };
}

// Every CSS variable managed by the theme engine. Listing them explicitly
// ensures applySettings always writes/clears every variable so nothing
// leaks from a previous theme.
const ALL_THEME_VARS=["--logo-color",
  "--accent","--accent-dark","--accent-coral","--accent-glow",
  "--bg","--bg2","--bg3","--card","--card2",
  "--border","--border-strong","--text","--text-mid","--text-light",
  "--info-body-text","--info-label-text",
  "--accent-tint-1","--accent-tint-2","--accent-tint-3",
  "--accent-tint-4","--accent-tint-5","--accent-bg-deep",
  "--nav-bg","--nav-bg-mobile",
  "--hero-overlay-start","--hero-overlay-mid","--hero-overlay-fade",
  "--auth-overlay-start","--auth-overlay-mid",
  "--streak-label","--streak-text","--streak-sub",
  "--banner-label","--banner-heading","--banner-pill-bg","--banner-pill-text",
  "--banner-track","--banner-track-fill","--banner-btn-bg","--banner-btn-border",
];

function applySettings(s){
  const theme=THEMES[s.theme];
  const fallback=THEMES.dark.vars;
  let vars;
  if(s.theme==="custom"){
    vars=buildCustomVars(s.customAccent||"#FF3B3B",s.customBg||"#070709");
  } else {
    vars=theme?{...fallback,...theme.vars}:{...fallback};
  }
  // Compute and merge derived tint tokens from the resolved accent + bg
  const accentHex=vars["--accent"]||"#FF3B3B";
  const bgHex=vars["--bg"]||"#070709";
  Object.assign(vars,buildTints(accentHex,bgHex));
  /* Brand mark colour for the custom theme. A white mark on a light custom
     background would be invisible, so the mark follows the background's
     luminance: white on dark grounds, near-black on light ones. */
  if(!vars["--logo-color"]){
    vars["--logo-color"]=relativeLuminance(hexToRgb(bgHex))>0.179 ? "#0D0E12" : "#FFFFFF";
  }
  // Inject streak/banner defaults for themes that don't specify them
  if(!vars["--streak-label"]){
    const bgRgb=hexToRgb(bgHex);
    const isLight=relativeLuminance(bgRgb)>0.179;
    if(isLight){
      vars["--streak-label"]="rgba(0,0,0,0.45)";
      vars["--streak-text"]="rgba(0,0,0,0.75)";
      vars["--streak-sub"]="rgba(0,0,0,0.55)";
      vars["--banner-label"]="rgba(0,0,0,0.45)";
      vars["--banner-heading"]="#0D0E12";
      vars["--banner-pill-bg"]="rgba(0,0,0,0.07)";
      vars["--banner-pill-text"]="#0D0E12";
      vars["--banner-track"]="rgba(0,0,0,0.12)";
      vars["--banner-track-fill"]="#0D0E12";
      vars["--banner-btn-bg"]="rgba(0,0,0,0.07)";
      vars["--banner-btn-border"]="rgba(0,0,0,0.15)";
    } else {
      vars["--streak-label"]="rgba(255,255,255,0.5)";
      vars["--streak-text"]="rgba(255,255,255,0.85)";
      vars["--streak-sub"]="rgba(255,255,255,0.65)";
      vars["--banner-label"]="rgba(255,255,255,0.55)";
      vars["--banner-heading"]="#fff";
      vars["--banner-pill-bg"]="rgba(255,255,255,0.12)";
      vars["--banner-pill-text"]="rgba(255,255,255,0.88)";
      vars["--banner-track"]="rgba(255,255,255,0.15)";
      vars["--banner-track-fill"]="#fff";
      vars["--banner-btn-bg"]="rgba(255,255,255,0.1)";
      vars["--banner-btn-border"]="rgba(255,255,255,0.18)";
    }
  }
  const root=document.documentElement;
  // Write every managed variable; use removeProperty for any gaps so
  // stale values from a prior theme can never persist.
  ALL_THEME_VARS.forEach(k=>{
    vars[k]!==undefined
      ? root.style.setProperty(k,vars[k])
      : root.style.removeProperty(k);
  });
  root.style.setProperty("--font-size-base",FONT_SIZES[s.fontSize]||"15px");
  document.body.classList.toggle("high-contrast",!!s.highContrast);
  document.body.classList.toggle("reduce-motion",!!s.reduceMotion);
  document.body.classList.toggle("large-buttons",!!s.largeButtons);
}
