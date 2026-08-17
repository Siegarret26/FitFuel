/* FitFuel — Theme presets, Firestore helpers, AI conversation storage, onboarding config
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ─── THEME PRESETS ───────────────────────────────────── */
const THEMES = {
  dark:   { label:"Dark Red",      emoji:"🔴", vars:{"--accent":"#FF3B3B","--accent-dark":"#C9181B","--accent-coral":"#FF5757","--bg":"#070709","--bg2":"#111214","--bg3":"#18191C","--card":"#1C1D21","--card2":"#222328","--border":"rgba(255,255,255,0.07)","--border-strong":"rgba(255,255,255,0.13)","--accent-glow":"rgba(255,59,59,0.25)","--logo-color":"#FF3B3B"} },
  light:  { label:"Light",         emoji:"☀️", vars:{"--accent":"#EF4444","--accent-dark":"#B91C1C","--accent-coral":"#F87171","--bg":"#F6F7FB","--bg2":"#EDEEF3","--bg3":"#E3E4EB","--card":"#FFFFFF","--card2":"#F0F1F7","--border":"rgba(0,0,0,0.07)","--border-strong":"rgba(0,0,0,0.13)","--text":"#0D0E12","--text-mid":"#50525E","--text-light":"#9CA0AE","--info-body-text":"#50525E","--info-label-text":"#9CA0AE","--accent-glow":"rgba(239,68,68,0.18)","--nav-bg":"rgba(255,255,255,0.88)","--nav-bg-mobile":"rgba(246,247,251,0.96)","--hero-overlay-start":"rgba(246,247,251,0.92)","--hero-overlay-mid":"rgba(246,247,251,0.70)","--hero-overlay-fade":"rgba(246,247,251,0.30)","--auth-overlay-start":"rgba(246,247,251,0.97)","--auth-overlay-mid":"rgba(246,247,251,0.65)","--accent-bg-deep":"#FCE8E8","--streak-label":"rgba(0,0,0,0.45)","--streak-text":"rgba(0,0,0,0.75)","--streak-sub":"rgba(0,0,0,0.55)","--banner-label":"rgba(0,0,0,0.45)","--banner-heading":"#0D0E12","--banner-pill-bg":"rgba(0,0,0,0.07)","--banner-pill-text":"#0D0E12","--banner-track":"rgba(0,0,0,0.12)","--banner-track-fill":"#0D0E12","--banner-btn-bg":"rgba(0,0,0,0.07)","--banner-btn-border":"rgba(0,0,0,0.15)","--logo-color":"#EF4444"} },
  orange: { label:"Warm Orange",   emoji:"🟠", vars:{"--accent":"#F97316","--accent-dark":"#C2410C","--accent-coral":"#FB923C","--bg":"#0C0700","--bg2":"#181000","--bg3":"#221800","--card":"#1E1600","--card2":"#2A2000","--border":"rgba(255,180,80,0.08)","--border-strong":"rgba(255,180,80,0.14)","--accent-glow":"rgba(249,115,22,0.22)","--logo-color":"#FFFFFF"} },
  blue:   { label:"Electric Blue", emoji:"💙", vars:{"--accent":"#3B82F6","--accent-dark":"#1D4ED8","--accent-coral":"#60A5FA","--bg":"#040610","--bg2":"#0A0D1C","--bg3":"#0F1325","--card":"#111527","--card2":"#161B30","--border":"rgba(59,130,246,0.08)","--border-strong":"rgba(59,130,246,0.15)","--accent-glow":"rgba(59,130,246,0.22)","--logo-color":"#FFFFFF"} },
  green:  { label:"Forest Green",  emoji:"💚", vars:{"--accent":"#22C55E","--accent-dark":"#15803D","--accent-coral":"#4ADE80","--bg":"#040A06","--bg2":"#0A1210","--bg3":"#0F1C14","--card":"#122018","--card2":"#17281E","--border":"rgba(34,197,94,0.08)","--border-strong":"rgba(34,197,94,0.14)","--accent-glow":"rgba(34,197,94,0.2)","--logo-color":"#FFFFFF"} },
};
const FONT_SIZES = { small:"13px", medium:"15px", large:"17px" };
/* ══════════════════════════════════════════════════════════════
   Cloudflare Worker proxy URL. The Gemini API key lives on that Worker,
   never in this file — which is what stops Google from auto-revoking it
   for being published publicly. Set this to "" to instead have each user
   supply their own key in Settings → AI Coach.
   ══════════════════════════════════════════════════════════════ */
const GEMINI_PROXY_URL = "https://fitfuel-proxy.maraon-siegfriedclarence.workers.dev";
/* Optional: change the model. "gemini-flash-latest" is Google's auto-updating
   alias — it always points at their current flash model, so it won't break when
   they retire an older one. */
const GEMINI_MODEL = "gemini-flash-latest";
/* If no proxy URL is set above, FitFuel falls back to asking each user for their
   own API key in Settings → AI Coach. With a proxy set, no key is needed. */
const RESOLVED_GEMINI_API_KEY = GEMINI_PROXY_URL ? "proxy" : "";

const DEFAULT_SETTINGS = {
  theme:"dark", customAccent:"#FF3B3B", customBg:"#070709",
  fontSize:"medium",
  notifications:{ workout:true, water:false, meal:false },
  weightUnit:"kg", heightUnit:"cm",
  highContrast:false, reduceMotion:false, largeButtons:false,
  aiApiKey:RESOLVED_GEMINI_API_KEY, aiModel:GEMINI_MODEL,
};
function loadSettings(){
  try{
    const s=localStorage.getItem("ff_s");
    if(!s) return null;
    const parsed=JSON.parse(s);
    if(parsed){
      parsed.aiModel=GEMINI_MODEL;
      // With a proxy configured, ignore any key saved in this browser from before.
      if(GEMINI_PROXY_URL) parsed.aiApiKey="proxy";
      else if(typeof parsed.aiApiKey==="string") parsed.aiApiKey=sanitizeApiKey(parsed.aiApiKey);
    }
    return parsed;
  }catch{ return null; }
}
function saveSettings(s){ try{ localStorage.setItem("ff_s",JSON.stringify(s)); }catch{} }
function loadLS(key,fallback){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; }catch{ return fallback; } }
function saveLS(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)); }catch{} }

/* ─── FIRESTORE (per-user cloud data) ───────────────────────────────
   Each of these lives at users/{uid}/{collectionName}/{itemId}. Reads/writes are
   scoped to the signed-in user's own uid, matched by the Firestore security rules. */
function userSubcollection(uid,name){ return firebase.firestore().collection("users").doc(uid).collection(name); }
async function loadUserCollection(uid,name){
  const snap=await userSubcollection(uid,name).get();
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}
function saveDocToUserCollection(uid,name,item){
  const {id,...rest}=item;
  return userSubcollection(uid,name).doc(String(id)).set(rest);
}
function deleteDocFromUserCollection(uid,name,id){
  return userSubcollection(uid,name).doc(String(id)).delete();
}
/* Merges a patch onto the main users/{uid} profile document — used for the small,
   single-value fields (favorites, tracker stats, AI memory) that don't need their
   own subcollection. */
function patchUserDoc(uid,patch){
  return firebase.firestore().collection("users").doc(uid).set(patch,{merge:true}).catch(err=>console.error("Cloud save failed:",err));
}

/* ═══════════════════════════════════════════
   AI COACH — service layer (FitFuel V3)
   This app has no backend, so "integrating AI" here means calling Google's
   Gemini API (generateContent / streamGenerateContent) directly from the
   browser, using a key the person supplies themselves in Settings. The key
   never leaves this browser except in requests sent straight to
   generativelanguage.googleapis.com.
   Unlike Groq/Cerebras, Gemini's API is NOT OpenAI-shaped — different auth
   header, different request/response format, different streaming format.
   Every other part of the app still builds plain OpenAI-style messages
   ([{role, content}]); convertMessagesToGemini() below is the only place
   that translates to/from Gemini's {systemInstruction, contents} shape, so
   nothing else had to change for this provider switch. Gemini's flash
   models are natively multimodal, so photo/vision features should work
   fine here (unlike the open-source models on Groq/Cerebras).
═══════════════════════════════════════════ */
function loadAIMemory(){ return loadLS("ff_ai_memory",[]); }
function saveAIMemoryLS(list,uid){ saveLS("ff_ai_memory",list); if(uid) patchUserDoc(uid,{aiMemory:list}); }
/* Memory items are {id,text,source:"manual"|"ai",addedAt} objects; older saves may still be
   plain strings — normalise so every consumer can rely on a consistent shape. */
function normaliseMemoryItem(m){
  return typeof m==="string" ? {id:"mem_"+Math.random().toString(36).slice(2), text:m, source:"manual", addedAt:new Date().toISOString()} : m;
}
function loadAIMemoryEnabled(){ return loadLS("ff_ai_memory_enabled",true); }
function saveAIMemoryEnabledLS(v,uid){ saveLS("ff_ai_memory_enabled",v); if(uid) patchUserDoc(uid,{aiMemoryEnabled:v}); }
/* Used everywhere memory feeds an AI prompt — respects the "disable AI memory" toggle.
   The raw loadAIMemory() above stays available so the Memory Manager can still show/edit
   items even while memory use is temporarily switched off. */
function loadAIMemoryForContext(){ return loadAIMemoryEnabled() ? loadAIMemory() : []; }

/* ─── AI CONVERSATIONS (Feature 2) ─────────────────────
   Conversation history (per-thread messages) is stored separately from
   long-term AI Memory above, so starting a new chat never loses saved
   preferences, and clearing/deleting a chat never touches memory. */
function loadConversations(){ return loadLS("ff_ai_conversations",[]); }
function saveConversationsLS(list){ saveLS("ff_ai_conversations",list); }
function makeNewConversation(){
  return { id:"conv_"+Date.now(), title:"New Chat", pinned:false, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), messages:[] };
}
function extractTextFromContent(content){
  if(typeof content==="string") return content;
  const part=Array.isArray(content)?content.find(c=>c.type==="text"):null;
  return part?.text||"";
}
/* Short 2-4 word conversation title, generated from the first exchange (Feature 2) */
async function generateConversationTitle({apiKey,model,firstUserMessage}){
  try{
    const sys=`Generate a short 2-4 word title summarising this fitness/nutrition chat's topic. Respond with strict JSON only: {"title":"..."}. No trailing punctuation.`;
    const data=await completeGeminiJSON({apiKey,model,messages:[{role:"system",content:sys},{role:"user",content:extractTextFromContent(firstUserMessage)||"General chat"}]});
    const title=(data.title||"").trim().slice(0,40);
    return title||null;
  }catch{ return null; }
}
/* Scans one exchange for a durable fact worth remembering long-term (Feature 1 — Conversation
   Memory). Deliberately conservative: only fires for specific, lasting facts, not chit-chat. */
async function extractMemoryFromExchange({apiKey,model,userText,assistantText}){
  try{
    const sys=`You watch one turn of a fitness coaching conversation for a durable fact worth remembering long-term — injuries/restrictions, firm equipment or food preferences, an ongoing goal or event they're training for. Respond with strict JSON only: {"shouldRemember":boolean,"note":string}. Only set shouldRemember true for something genuinely durable and specific mentioned by the USER — not generic chit-chat, not a one-off request, not something already obvious. Keep note under 14 words, written as a short factual statement.`;
    const data=await completeGeminiJSON({apiKey,model,messages:[{role:"system",content:sys},{role:"user",content:`User said: "${userText}"\nCoach replied: "${(assistantText||"").slice(0,300)}"`}]});
    return data?.shouldRemember&&data.note ? data.note.trim() : null;
  }catch{ return null; }
}

/* ═══════════════════════════════════════════
   SMART CONTENT INTEGRATION (FitFuel AI Smart Content PRD)
   Feature 7's search priority: before generating anything, the AI is shown
   a compact catalog of what already exists in FitFuel and is instructed to
   recommend a real match first, only generating new content when nothing
   in the library fits well.
═══════════════════════════════════════════ */
function buildCompactWorkoutCatalog(list){ return list.map(w=>({id:w.id,name:w.name,cat:w.cat,diff:w.diff,duration:w.duration,calories:w.calories,equipment:w.equipment,muscles:w.muscles})); }
function buildCompactMealCatalog(list){ return list.map(m=>({id:m.id,name:m.name,cat:m.cat,cal:m.cal,protein:m.protein,carbs:m.carbs,fat:m.fat})); }
function buildCompactPlanCatalog(list){ return list.map(p=>({id:p.id,name:p.name,goal:p.goal,weeks:(p.weeks||[]).length})); }

/* Classifies a chat message into one of FitFuel's structured content types, or plain "chat". */
/* Classifies intent AND (for workout/meal/plan) searches the given catalogs and either
   recommends a match or generates new content — all in ONE call instead of a separate
   classify-then-fulfill round trip, since every extra request eats into the free tier's
   per-minute limit. */
async function classifyAndFulfill({apiKey,model,userText,contextSummary,workoutCatalog,mealCatalog,planCatalog}){
  const sys=buildSystemPrompt(contextSummary,`Determine what the person wants, then fulfil it in one step.

First classify their message into exactly one intent: "workout" (wants an exercise routine), "meal" (wants a meal/recipe/food suggestion), "plan" (wants a multi-week training program), "report" (wants their progress/weekly summary/stats), or "chat" (anything else — questions, advice, motivation, explanations, greetings, follow-ups).

⚠️ MOST IMPORTANT RULE — RECOMMEND FROM THE CATALOG, DON'T INVENT:
FitFuel already has a curated library of workouts and meals with real photos, tested instructions, and full app integration (start/track/save). Generated content has none of that. So recommending an existing item is ALMOST ALWAYS the better answer.

Set found:true and recommend a catalog item whenever ANY item is a reasonable fit — it does NOT need to be perfect. Judge by the main thing they asked for (e.g. body part, category, goal, meal type). A leg workout request should match ANY leg/lower-body workout in the catalog. A high-protein dinner request should match ANY high-protein dinner.

Do NOT set found:false merely because:
- you could write something more precisely tailored
- the catalog item isn't an exact wording match
- you want to vary the duration, difficulty, or exact exercises
- there are several options and none is obviously "the best" (just pick the closest one)

Only set found:false when the catalog genuinely contains NOTHING relevant — e.g. they asked for a swimming workout and there are no swimming workouts at all, or a dessert recipe and there are no desserts. If in doubt, set found:true.

If intent is "workout": search the workout catalog per the rule above. When found, set found:true and matchedId to that catalog item's id exactly as given. Only if genuinely nothing is relevant, set found:false and fill "generated": {"name":string,"description":string,"difficulty":"Beginner"|"Intermediate"|"Advanced","duration":number,"calories":number,"equipment":string[],"muscles":string[],"warmup":string[],"exercises":[{"name":string,"sets":number,"reps":string,"rest":string,"tempo":string}],"cooldown":string[]}.

If intent is "meal": same rule. Generated shape if genuinely needed: {"name":string,"category":"Breakfast"|"Lunch"|"Dinner"|"Snacks"|"Vegetarian","calories":number,"protein":number,"carbs":number,"fat":number,"ingredients":string[],"instructions":string[],"prepTime":number,"cookTime":number}.

If intent is "plan": same rule. Note the plan library is often empty for new users — generating is expected here if it is. Generated shape: {"name":string,"goal":string,"weeks":[{"weekNumber":number,"focus":string,"sessions":[{"day":string,"type":string,"description":string}]}]}.

When found:true, write "reply" as a natural sentence introducing the match, e.g. "I found a workout in FitFuel that fits — here's Leg Strength Builder."

If intent is "report" or "chat", omit found/matchedId/generated entirely — those are handled elsewhere.

Respond with strict JSON only: {"intent":"workout"|"meal"|"plan"|"report"|"chat","reply":"<1-2 sentence natural reply, only for workout/meal/plan>","found":boolean,"matchedId":<catalog id or null>,"generated":{...}|null}

Workout catalog: ${JSON.stringify(workoutCatalog)}
Meal catalog: ${JSON.stringify(mealCatalog)}
Plan catalog: ${JSON.stringify(planCatalog)}`);
  return completeGeminiJSON({apiKey,model,messages:[{role:"system",content:sys},{role:"user",content:userText}]});
}
/* Feature 5 — real FitFuel data, not an estimate. The numbers are computed locally; only the
   short narrative summary is written by the AI, grounded in those exact figures. */
function computeWeeklyReportData(tracker,activities,user){
  const s=aggregateActivityStats(activities);
  const now=Date.now(), week=7*86400000;
  const weekActs=(activities||[]).filter(a=>now-new Date(a.finishedAt).getTime()<=week);
  const goalObjs=(user?.goals||[]).filter(g=>typeof g!=="string");
  const totalMilestones=goalObjs.reduce((t,g)=>t+(g.milestones?g.milestones.length:0),0);
  const doneMilestones=goalObjs.reduce((t,g)=>t+(g.milestones?g.milestones.filter(m=>m.done).length:0),0);
  return {
    workoutsCompleted: tracker?.wkCt||0,
    runningDistance: s.weeklyDistance,
    caloriesBurned: weekActs.reduce((t,a)=>t+(a.calories||0),0),
    activitiesThisWeek: weekActs.length,
    goalCompletion: totalMilestones>0?Math.round((doneMilestones/totalMilestones)*100):null,
    streak: s.runningStreak,
    prs: [...new Set((activities||[]).flatMap(a=>a.personalRecords||[]))],
  };
}
async function generateWeeklyReportCard({apiKey,model,contextSummary,tracker,activities,user}){
  const data=computeWeeklyReportData(tracker,activities,user);
  const sys=buildSystemPrompt(contextSummary,`Write a short (2-3 sentence) encouraging weekly summary using ONLY these real numbers — do not invent or estimate anything beyond them: ${JSON.stringify(data)}`);
  let summary="";
  try{ summary=await completeGeminiText({apiKey,model,messages:[{role:"system",content:sys},{role:"user",content:"Summarise my week."}]}); }catch{}
  return {...data,summary};
}

const AI_SAFETY_SYSTEM_PROMPT=`You are the FitFuel AI Coach, a certified-fitness-coach-style assistant embedded in a fitness app.
Safety rules you must always follow:
- You are not a doctor, dietitian, or physiotherapist, and must never claim to be one or diagnose any medical condition.
- Recommend the person consult a qualified healthcare professional for injuries, pain, medical conditions, or before starting a new exercise/diet program if they mention a relevant health concern.
- Never create dangerously low-calorie diet plans (below ~1200 kcal/day for adults) or unsafe/extreme training advice (e.g. ignoring pain, severe overtraining, unsafe form).
- Never guarantee specific results, exercise form safety, or nutrition outcomes.
- Refuse requests for unsafe exercise or nutrition advice, explaining briefly why, and suggest a safer alternative instead.
- Be encouraging, clear, and concise. Explain concepts simply. Ask a follow-up question when you need more information to help well.
- Personalise your answers using the person's profile/history context below whenever it's relevant.`;

/* Compact, current summary of everything the app knows about the person — injected into
   every AI system prompt so answers are personalised (Feature: AI Knowledge Sources / Memory). */
function buildUserContextSummary(user,tracker,activities,savedMeals,aiMemory,favoriteWorkoutNames,nutrition){
  const lines=[];
  if(user){
    lines.push(`Name: ${user.name||"—"}`);
    if(user.age) lines.push(`Age: ${user.age}`);
    if(user.height) lines.push(`Height: ${user.height} cm`);
    if(user.weight) lines.push(`Weight: ${user.weight} kg`);
    const ob=user.onboarding;
    if(ob){
      if(ob.gender) lines.push(`Gender: ${ob.gender}`);
      if(ob.experienceLevel) lines.push(`Fitness level: ${ob.experienceLevel}`);
      if(ob.exerciseFrequency) lines.push(`Usual exercise frequency: ${ob.exerciseFrequency}`);
      if(ob.primaryGoals&&ob.primaryGoals.length) lines.push(`Primary goals: ${ob.primaryGoals.join(", ")}`);
      if(ob.trainingLocation) lines.push(`Trains at: ${ob.trainingLocation}`);
      if(ob.equipment&&ob.equipment.length) lines.push(`Equipment available: ${ob.equipment.join(", ")}`);
      if(ob.dietaryPreference) lines.push(`Dietary preference: ${ob.dietaryPreference}`);
      if(ob.activityLevel) lines.push(`Daily activity level: ${ob.activityLevel}`);
    }
    if(user.goals&&user.goals.length){
      lines.push(`Current goals: ${user.goals.map(g=>typeof g==="string"?g:g.text).join("; ")}`);
    }
  }
  if(nutrition&&nutrition.goals){
    const t=nutrition.totals||{cal:0,protein:0,carbs:0,fat:0};
    const g=nutrition.goals;
    lines.push(`Today's nutrition so far — calories ${Math.round(t.cal)}/${g.calories}, protein ${Math.round(t.protein)}/${g.protein}g, carbs ${Math.round(t.carbs)}/${g.carbs}g, fat ${Math.round(t.fat)}/${g.fat}g, water ${((nutrition.waterMl||0)/1000).toFixed(1)}/${(g.waterMl/1000).toFixed(1)}L. Calories burned today: ${nutrition.burned||0}. Meals logged today: ${nutrition.entryCount||0}.`);
    if(nutrition.loggedMeals&&nutrition.loggedMeals.length){
      lines.push(`Meals logged today: ${nutrition.loggedMeals.join("; ")}.`);
    } else {
      lines.push(`No meals logged today yet.`);
    }
    lines.push(`Only use these nutrition figures — never estimate or invent intake the person hasn't logged. BMR and calorie figures are estimates, not exact measurements; say so if you reference them.`);
  }
  if(favoriteWorkoutNames&&favoriteWorkoutNames.length) lines.push(`Favourite workouts: ${favoriteWorkoutNames.join(", ")}.`);
  if(tracker){
    lines.push(`This week: ${tracker.wkCt||0} workouts done, ${tracker.water||0} glasses of water today, ${tracker.sleep||0}h sleep last logged, mood ${tracker.mood||"—"}/3.`);
  }
  if(activities&&activities.length){
    const s=aggregateActivityStats(activities);
    lines.push(`Running/walking: ${s.totalActivities} activities logged, ${s.totalDistance.toFixed(1)}km lifetime, ${s.weeklyDistance.toFixed(1)}km this week, current streak ${s.runningStreak} day(s), longest run ${s.longestRun.toFixed(1)}km, fastest pace ${formatPace(s.fastestPace)}/km.`);
    const last=s.lastActivity;
    if(last) lines.push(`Most recent activity: ${last.title}, ${last.distance.toFixed(2)}km, ${formatDuration(last.duration)}, pace ${formatPace(last.avgPace)}/km.`);
    const allPRs=[...new Set(activities.flatMap(a=>a.personalRecords||[]))];
    if(allPRs.length) lines.push(`Personal records achieved: ${allPRs.join(", ")}.`);
  } else {
    lines.push("No GPS activities logged yet.");
  }
  if(savedMeals&&savedMeals.length){
    const names=savedMeals.map(id=>{ const m=mealsData.find(x=>x.id===id); return m?m.name:null; }).filter(Boolean);
    if(names.length) lines.push(`Saved/favourite meals: ${names.join(", ")}.`);
  }
  if(aiMemory&&aiMemory.length) lines.push(`Notes the person asked you to remember: ${aiMemory.map(m=>typeof m==="string"?m:m.text).join("; ")}.`);
  return lines.join("\n");
}
function buildSystemPrompt(contextSummary,taskInstructions){
  return `${AI_SAFETY_SYSTEM_PROMPT}\n\nHere is what you currently know about this person:\n${contextSummary||"(no profile data yet)"}\n\n${taskInstructions||""}`.trim();
}

/* Simple in-memory cache + in-flight guard: avoids re-billing/re-calling for an
   identical request repeated in the same session (Technical Requirements: caching + rate limiting). */
const _aiCache=new Map();
const _aiInFlight=new Set();
function _aiCacheKey(model,messages){ try{ return model+"::"+JSON.stringify(messages); }catch{ return null; } }

function describeAIError(status){
  if(status===404) return "Model not found (404). Google retires Gemini model versions on short notice — set the Model field in Settings to gemini-flash-latest (auto-updates) instead of a pinned version, or check aistudio.google.com for current names.";
  if(status===400) return "Bad request (400) — often an invalid or misspelled model name. Check Settings → AI Coach.";
  if(status===401||status===403) return "Invalid API key ("+status+"). Double-check the key in Settings → AI Coach.";
  if(status===429) return "Rate limit reached (429). You're sending requests faster than the free tier allows — wait a moment and try again.";
  if(status===503) return "Google's AI servers are overloaded right now (503). This is on their end, not yours, and usually clears within a minute — FitFuel already retried automatically. Please try again shortly.";
  if(status>=500) return "The AI service had a temporary problem ("+status+"). FitFuel retried automatically; please try again in a moment.";
  return null;
}

/* Gemini's API doesn't speak the OpenAI message format, so every call site in the app still
   builds plain [{role:"system"|"user"|"assistant", content:string|array}] messages exactly like
   before — this adapter converts that into Gemini's {systemInstruction, contents} shape right
   before sending, so nothing else in the app had to change for the provider switch. */
function _geminiPartsFromContent(content){
  if(typeof content==="string") return [{text:content}];
  return content.map(part=>{
    if(part.type==="text") return {text:part.text};
    if(part.type==="image_url"){
      const url=part.image_url?.url||"";
      const match=url.match(/^data:([^;]+);base64,(.*)$/);
      if(match) return {inlineData:{mimeType:match[1], data:match[2]}};
      return {text:"[image attached]"};
    }
    return {text:""};
  });
}
function convertMessagesToGemini(messages){
  const systemParts=[];
  const contents=[];
  for(const m of messages){
    if(m.role==="system"){ systemParts.push(...(_geminiPartsFromContent(m.content))); continue; }
    contents.push({ role: m.role==="assistant"?"model":"user", parts:_geminiPartsFromContent(m.content) });
  }
  return { systemInstruction: systemParts.length?{parts:systemParts}:undefined, contents };
}
function _geminiText(candidateResponse){
  const parts=candidateResponse?.candidates?.[0]?.content?.parts||[];
  return parts.map(p=>p.text||"").join("");
}
function _geminiUrl(model,method,stream){
  const m=encodeURIComponent(model||GEMINI_MODEL);
  if(GEMINI_PROXY_URL){
    return `${GEMINI_PROXY_URL}?model=${m}&method=${method}${stream?"&stream=1":""}`;
  }
  // Fallback: direct call using a key supplied in Settings (see GEMINI_PROXY_URL note above).
  return `https://generativelanguage.googleapis.com/v1beta/models/${m}:${method}`+(stream?"?alt=sse":"");
}
/* Auth headers are only needed when calling Google directly. When going through the
   proxy, the key lives on the server and must never be sent from the browser. */
function _geminiHeaders(apiKey){
  return GEMINI_PROXY_URL
    ? { "Content-Type":"application/json" }
    : { "Content-Type":"application/json", "x-goog-api-key":sanitizeApiKey(apiKey) };
}
/* HTTP header values must be plain ASCII. A key copy-pasted from a doc/notes app can pick up
   "smart" typographic substitutes (en-dash instead of hyphen, curly quotes, etc.) that the
   browser then rejects with a cryptic ByteString conversion error. Strip anything outside
   printable ASCII before it ever reaches a fetch header. */
function sanitizeApiKey(key){
  return (key||"").trim().replace(/[^\x20-\x7E]/g,"");
}

/* Free-tier rate limits are tight, and one chat turn can trigger several Gemini calls
   (classify, search/generate, title, memory). This serializes every Gemini request with a
   minimum gap between them, and automatically retries once or twice with backoff on a 429
   before giving up — so an occasional rate limit recovers on its own instead of just failing. */
let _geminiQueueTail=Promise.resolve();
let _geminiLastCallAt=0;
const GEMINI_MIN_GAP_MS=1400;
function _scheduleGeminiFetch(url,options){
  const run=async()=>{
    const wait=Math.max(0,_geminiLastCallAt+GEMINI_MIN_GAP_MS-Date.now());
    if(wait>0) await new Promise(r=>setTimeout(r,wait));
    _geminiLastCallAt=Date.now();
    for(let attempt=0;attempt<=3;attempt++){
      const res=await fetch(url,options);
      // 429 = rate limited, 500/502/503/504 = Google's servers busy or briefly
      // unavailable. Both are transient, so back off and try again rather than
      // surfacing an error the user can do nothing about.
      const transient = res.status===429 || (res.status>=500 && res.status<=504);
      if(!transient||attempt===3) return res;
      await new Promise(r=>setTimeout(r,2000*Math.pow(2,attempt)));
      _geminiLastCallAt=Date.now();
    }
  };
  const result=_geminiQueueTail.then(run,run);
  _geminiQueueTail=result.catch(()=>{});
  return result;
}

/* Streaming chat completion — powers the live Coach conversation. */
async function streamGeminiChat({apiKey,model,messages,onToken,onDone,onError}){
  if(!apiKey){ onError&&onError("No Gemini API key configured. Add one in Settings → AI Coach."); return; }
  try{
    const {systemInstruction,contents}=convertMessagesToGemini(messages);
    const res=await _scheduleGeminiFetch(_geminiUrl(model,"streamGenerateContent",true),{
      method:"POST",
      headers:_geminiHeaders(apiKey),
      body:JSON.stringify({ contents, systemInstruction, generationConfig:{ temperature:0.7 } }),
    });
    if(!res.ok||!res.body){
      let msg=describeAIError(res.status);
      if(!msg){
        msg=`Gemini request failed (${res.status}).`;
        try{ const j=await res.json(); const errObj=Array.isArray(j)?j[0]?.error:j?.error; if(errObj?.message) msg=errObj.message; }catch{}
      }
      onError&&onError(msg); return;
    }
    const reader=res.body.getReader();
    const decoder=new TextDecoder();
    let buffer="", full="";
    while(true){
      const {value,done}=await reader.read();
      if(done) break;
      buffer+=decoder.decode(value,{stream:true});
      const lines=buffer.split("\n");
      buffer=lines.pop();
      for(const line of lines){
        const trimmed=line.trim();
        if(!trimmed.startsWith("data:")) continue;
        const data=trimmed.slice(5).trim();
        if(!data) continue;
        try{
          const json=JSON.parse(data);
          const delta=_geminiText(json);
          if(delta){ full+=delta; onToken&&onToken(delta,full); }
        }catch{}
      }
    }
    onDone&&onDone(full);
  }catch(err){
    onError&&onError(err?.message||"Network error contacting Gemini.");
  }
}
/* Non-streaming, JSON-mode completion — powers workout/meal generation, smart search,
   goal breakdowns, and anywhere else we need a structured, parseable result. */
async function completeGeminiJSON({apiKey,model,messages}){
  if(!apiKey) throw new Error("No Gemini API key configured. Add one in Settings → AI Coach.");
  const key=_aiCacheKey(model,messages);
  if(key&&_aiCache.has(key)) return _aiCache.get(key);
  if(key&&_aiInFlight.has(key)) throw new Error("A similar request is already in progress — please wait a moment.");
  if(key) _aiInFlight.add(key);
  try{
    const {systemInstruction,contents}=convertMessagesToGemini(messages);
    const res=await _scheduleGeminiFetch(_geminiUrl(model,"generateContent"),{
      method:"POST",
      headers:_geminiHeaders(apiKey),
      body:JSON.stringify({ contents, systemInstruction, generationConfig:{ temperature:0.6, responseMimeType:"application/json" } }),
    });
    if(!res.ok){
      let msg=describeAIError(res.status);
      if(!msg){
        msg=`Gemini request failed (${res.status}).`;
        try{ const j=await res.json(); if(j?.error?.message) msg=j.error.message; }catch{}
      }
      throw new Error(msg);
    }
    const data=await res.json();
    const content=_geminiText(data);
    if(!content) throw new Error("Gemini returned an empty response.");
    let parsed;
    try{ parsed=JSON.parse(content); }
    catch{ throw new Error("Couldn't parse the AI's response as JSON. Try again."); }
    if(key) _aiCache.set(key,parsed);
    return parsed;
  } finally {
    if(key) _aiInFlight.delete(key);
  }
}
/* Plain (non-JSON-mode) single-shot completion — used for short text like dashboard
   greetings and habit-nudge phrasing where we just want a sentence back, not JSON. */
async function completeGeminiText({apiKey,model,messages}){
  if(!apiKey) throw new Error("No API key configured.");
  const {systemInstruction,contents}=convertMessagesToGemini(messages);
  const res=await _scheduleGeminiFetch(_geminiUrl(model,"generateContent"),{
    method:"POST",
    headers:_geminiHeaders(apiKey),
    body:JSON.stringify({ contents, systemInstruction, generationConfig:{ temperature:0.7, maxOutputTokens:150 } }),
  });
  if(!res.ok) throw new Error(describeAIError(res.status)||`Gemini request failed (${res.status}).`);
  const data=await res.json();
  return _geminiText(data).trim();
}
/* Downscales an uploaded image client-side before storing it (localStorage has a small quota,
   and progress photos are only ever kept on this device — see Feature 5 / AI Vision). */
function downscaleImageFile(file,maxDim=480){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        let {width,height}=img;
        if(width>height){ if(width>maxDim){ height=Math.round(height*maxDim/width); width=maxDim; } }
        else{ if(height>maxDim){ width=Math.round(width*maxDim/height); height=maxDim; } }
        const canvas=document.createElement("canvas");
        canvas.width=width; canvas.height=height;
        canvas.getContext("2d").drawImage(img,0,0,width,height);
        resolve(canvas.toDataURL("image/jpeg",0.8));
      };
      img.onerror=()=>reject(new Error("Couldn't read that image."));
      img.src=reader.result;
    };
    reader.onerror=()=>reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}
const DEFAULT_TRACKER={ done:[false,false,false,false,false,false,false], water:0, sleep:7, mood:2, wkCt:0 };

/* ─── ONBOARDING SURVEY CONFIG ──────────────────────── */
const ONBOARDING_STEPS = [
  { id:"personal", title:"Tell us about you", subtitle:"This helps us tailor workouts and meals to your body.",
    fields:[
      {key:"age", label:"Age", type:"number", placeholder:"e.g. 17"},
      {key:"gender", label:"Gender", type:"single", options:["Male","Female","Other","Prefer not to say"]},
      {key:"height", label:"Height (cm)", type:"number", placeholder:"e.g. 170"},
      {key:"weight", label:"Weight (kg)", type:"number", placeholder:"e.g. 65"},
    ]},
  { id:"experience", title:"Your fitness experience", subtitle:"So we can match you with the right intensity.",
    fields:[
      {key:"exerciseFrequency", label:"How often do you currently exercise?", type:"single", options:["Never","1–2 days/week","3–4 days/week","5–6 days/week","Every day"]},
      {key:"experienceLevel", label:"What's your experience level?", type:"single", options:["Beginner","Intermediate","Advanced"]},
    ]},
  { id:"goals", title:"What are you working towards?", subtitle:"Pick as many as apply — we'll prioritise these.",
    fields:[
      {key:"primaryGoals", label:"Primary goal(s)", type:"multi", options:["Lose Weight","Build Muscle","Stay Healthy","Improve Fitness","Increase Strength","Improve Endurance","Gain Weight","Eat Healthier","Build Better Habits"]},
    ]},
  { id:"training", title:"How do you like to train?", subtitle:"We'll suggest workouts that fit your setup.",
    fields:[
      {key:"trainingLocation", label:"Where do you usually train?", type:"single", options:["Gym","Home","Outdoors","Mixed"]},
      {key:"equipment", label:"Equipment available", type:"multi", options:["No Equipment","Dumbbells","Barbell","Resistance Bands","Pull-up Bar","Machines","Full Gym"]},
    ]},
  { id:"diet", title:"Any dietary preferences?", subtitle:"We'll highlight meals that match.",
    fields:[
      {key:"dietaryPreference", label:"Dietary preference", type:"single", options:["No Preference","High Protein","Vegetarian","Vegan","Low Carb","Gluten Free"]},
    ]},
  { id:"activity", title:"Your daily activity", subtitle:"Outside of workouts, how active is your day?",
    fields:[
      {key:"activityLevel", label:"Activity level", type:"single", options:["Mostly Sitting","Lightly Active","Moderately Active","Very Active"]},
    ]},
  { id:"referral", title:"One last thing", subtitle:"How did you hear about FitFuel?",
    fields:[
      {key:"referralSource", label:"Referral source", type:"single", options:["Friend","Social Media","School","Google Search","Advertisement","Other"]},
    ]},
];
/* Build a short starter goal list from survey answers — feeds straight into the existing "My Goals" profile card */
function buildGoalsFromOnboarding(a={}){
  const goals=[];
  const freqDays={"Never":2,"1–2 days/week":2,"3–4 days/week":4,"5–6 days/week":5,"Every day":6};
  const targetDays = freqDays[a.exerciseFrequency]!==undefined ? freqDays[a.exerciseFrequency] : 3;
  goals.push(`Train ${targetDays}x per week`);
  const pg = a.primaryGoals||[];
  if(pg.includes("Build Muscle")||pg.includes("Increase Strength")) goals.push("Complete 2 strength sessions per week");
  if(pg.includes("Lose Weight")||pg.includes("Improve Fitness")) goals.push("Finish 1 fat-loss workout per week");
  if(pg.includes("Improve Endurance")) goals.push("Complete 1 cardio session per week");
  if(pg.includes("Eat Healthier")) goals.push("Try 5 new healthy meals");
  if(pg.includes("Build Better Habits")) goals.push("Check in on Progress daily");
  goals.push("Complete your first workout");
  goals.push("Drink 8 glasses of water daily");
  return [...new Set(goals)].slice(0,5);
}
function timeGreeting(){
  const h=new Date().getHours();
  if(h<12) return "Good morning";
  if(h<18) return "Good afternoon";
  return "Good evening";
}
/* Real, deterministic stat sentence for the AI Coach welcome screen (Feature 7) — computed
   directly from actual app data, no AI call needed, so it's instant and free. */
function computeWelcomeStatLine(tracker,activities){
  const parts=[];
  const wk=tracker?.wkCt||0;
  if(wk>0) parts.push(`you completed ${wk} workout${wk===1?"":"s"} this week`);
  const sorted=[...(activities||[])].sort((a,b)=>new Date(a.finishedAt)-new Date(b.finishedAt));
  if(sorted.length>=2){
    const prev=sorted[sorted.length-2], latest=sorted[sorted.length-1];
    if(prev.avgPace>0&&latest.avgPace>0){
      const diffSec=Math.round((prev.avgPace-latest.avgPace)*60);
      if(diffSec>=3) parts.push(`improved your average running pace by ${diffSec} seconds per kilometre`);
    }
  }
  if(!parts.length) return null;
  return "You've been busy — "+parts.join(" and ")+".";
}

/* ═══════════════════════════════════════════
   GPS ACTIVITY TRACKING — helpers & data (Feature 6)
═══════════════════════════════════════════ */
const ACTIVITY_TYPES=[
  {id:"Running",  label:"Running",  icon:"🏃"},
  {id:"Jogging",  label:"Jogging",  icon:"🏃‍♂️"},
  {id:"Walking",  label:"Walking",  icon:"🚶"},
  {id:"Hiking",   label:"Hiking",   icon:"🥾"},
];
/* Great-circle distance between two GPS points, in km */
function haversineKm(lat1,lon1,lat2,lon2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function formatDuration(totalSeconds){
  const s=Math.max(0,Math.round(totalSeconds));
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  return h>0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
}
/* minutes-per-km (float) -> "5:28" string */
function formatPace(minPerKm){
  if(!minPerKm||!isFinite(minPerKm)||minPerKm<=0) return "—:—";
  const m=Math.floor(minPerKm), s=Math.round((minPerKm-m)*60);
  return `${m}:${String(s).padStart(2,"0")}`;
}
/* MET-based calorie estimate from activity type + average speed + bodyweight */
function estimateMET(type,speedKmh){
  if(type==="Walking") return speedKmh<4?2.8:speedKmh<5.5?3.5:speedKmh<6.5?4.3:5;
  if(type==="Hiking") return 6;
  if(type==="Jogging") return speedKmh<8?7:8.3;
  // Running
  if(speedKmh<8) return 8.3;
  if(speedKmh<9.7) return 9.8;
  if(speedKmh<11.3) return 11;
  if(speedKmh<12.9) return 11.8;
  return 12.8;
}
function estimateCalories(type,avgSpeedKmh,weightKg,hours){
  const w=weightKg&&weightKg>0?Number(weightKg):65;
  const met=estimateMET(type,avgSpeedKmh||0);
  return Math.round(met*w*Math.max(0,hours));
}
