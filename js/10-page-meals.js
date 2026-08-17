/* FitFuel — Meal library
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── MEALS PAGE ────────────────────────────────── */
function MealsPage({savedMeals,onToggleMeal,user,aiMeals=[],settings={},pendingMealDetail,onConsumePendingMealDetail}){
  const cats=["All","Saved","Breakfast","Lunch","Dinner","Snacks","Vegetarian"];
  const [cat,setCat]=useState(()=>user?.onboarding?.dietaryPreference==="Vegetarian"?"Vegetarian":"All");
  const [search,setSearch]=useState("");
  const [aiFilterIds,setAiFilterIds]=useState(null);
  const [aiSearchLoading,setAiSearchLoading]=useState(false);
  const [aiSearchError,setAiSearchError]=useState("");
  const [detailMeal,setDetailMeal]=useState(null);
  const allMeals=[...mealsData,...aiMeals];
  useEffect(()=>{
    if(!pendingMealDetail) return;
    const match=allMeals.find(m=>String(m.id)===String(pendingMealDetail));
    if(match) setDetailMeal(match);
    onConsumePendingMealDetail&&onConsumePendingMealDetail();
    // eslint-disable-next-line
  },[pendingMealDetail]);
  const filtered=allMeals.filter(m=>
    (cat==="All"||(cat==="Saved"?savedMeals.includes(m.id):m.cat===cat))&&(
    aiFilterIds ? aiFilterIds.map(String).includes(String(m.id)) : m.name.toLowerCase().includes(search.toLowerCase())
  ));
  const runSmartSearch=async()=>{
    if(!search.trim()){ setAiFilterIds(null); return; }
    if(!settings.aiApiKey){ setAiSearchError("Add a Gemini API key in Settings → AI Coach to use AI search."); return; }
    setAiSearchLoading(true); setAiSearchError("");
    try{
      const catalog=allMeals.map(m=>({id:m.id,name:m.name,cat:m.cat,cal:m.cal,protein:m.protein,carbs:m.carbs,fat:m.fat}));
      const sys=`You help filter a meal catalog by user intent (e.g. calorie/macro limits, meal type, ingredients implied). Respond with strict JSON only: {"ids":[...matching id values from the catalog...]}. Only include ids that exist in the catalog. Return an empty array if nothing matches well.`;
      const data=await completeGeminiJSON({apiKey:settings.aiApiKey,model:settings.aiModel,messages:[
        {role:"system",content:sys},
        {role:"user",content:`Catalog: ${JSON.stringify(catalog)}\n\nQuery: "${search}"`},
      ]});
      setAiFilterIds(Array.isArray(data.ids)?data.ids:[]);
    }catch(err){ setAiSearchError(err.message||"AI search failed."); }
    finally{ setAiSearchLoading(false); }
  };
  return(
    <div className="page-wrap">
      {detailMeal&&<MealDetailModal m={detailMeal} onClose={()=>setDetailMeal(null)} onSave={onToggleMeal} saved={savedMeals.includes(detailMeal.id)}/>}
      <div className="page-header fade-up">
        <h1 className="page-title">Healthy Meals</h1>
        <p className="page-sub">{allMeals.length} simple, nutritious recipes for every meal of the day.</p>
      </div>
      <div style={{display:"flex",gap:12,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
        <div className="search-wrap" style={{flex:1,minWidth:200,marginBottom:0}}>
          <span className="search-icon">🔍</span>
          <input className="search-input" value={search} onChange={e=>{setSearch(e.target.value);setAiFilterIds(null);setAiSearchError("");}} onKeyDown={e=>e.key==="Enter"&&runSmartSearch()} placeholder="Search, or ask AI: high-protein under 500 cal…" aria-label="Search meals"/>
          <button className="smart-search-btn" onClick={runSmartSearch} disabled={aiSearchLoading} title="Ask AI to interpret this search">{aiSearchLoading?"…":"✨"}</button>
        </div>
        {savedMeals.length>0&&(
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",borderRadius:50,background:"var(--accent-tint-2)",border:"1px solid var(--accent-tint-3)",fontSize:13,fontWeight:600,color:"var(--accent)"}}>
            ❤️ {savedMeals.length} saved
          </div>
        )}
      </div>
      {aiSearchError&&<p style={{fontSize:12,color:"var(--accent)",marginBottom:14}}>{aiSearchError}</p>}
      {aiFilterIds!==null&&!aiSearchError&&<p style={{fontSize:12,color:"var(--text-mid)",marginBottom:14}}>✨ Showing AI matches for "{search}" — <span style={{color:"var(--accent)",cursor:"pointer"}} onClick={()=>setAiFilterIds(null)}>clear</span></p>}
      <FilterBar options={cats} value={cat} onChange={setCat}/>
      {filtered.length===0
        ? <div style={{textAlign:"center",padding:"60px 0",color:"var(--text-mid)"}}>
            {cat==="Saved"?"No saved meals yet — tap the heart on any meal to save it here.":"No meals found. Try a different search or filter."}
          </div>
        : <div className="grid-auto-fit-sm">
            {filtered.map(m=><MealCard key={m.id} m={m} onSave={onToggleMeal} saved={savedMeals.includes(m.id)} onOpenDetail={setDetailMeal}/>)}
          </div>
      }
    </div>
  );
}

/* Estimates nutrition from a plain-language food description. Reuses the same
   Gemini plumbing as the Coach — no second AI system. Returns structured data so
   nothing raw is ever shown to the person. */
async function analyseFoodDescription({apiKey,model,text,priorExchange}){
  const sys=`You estimate the nutrition of a described food or meal for a fitness app.

Work out portion sizes from what's written ("200g chicken" differs from "100g"; "2 bananas" from "1"). If no quantity is given, assume ONE STANDARD SERVING and say so in "assumptions". Account for preparation method where it matters — fried is not grilled, and that belongs in your assumptions too.

Ask for clarification ONLY when the answer would change substantially and you cannot reasonably assume a standard serving (e.g. "I had pasta" with no amount or sauce). Never ask more than once; if you've already asked, make your best estimate and state the assumption. Do not interrogate the person.

Respond with strict JSON only:
{"needsClarification":boolean,"clarificationQuestion":string|null,"foodName":string,"servingSize":string,"calories":number,"protein":number,"carbs":number,"fat":number,"fibre":number,"assumptions":string,"confidence":"high"|"medium"|"low"}

All nutrition figures are grams except calories (kcal). Round to whole numbers. When needsClarification is true, still fill the nutrition fields with your best provisional guess.`;
  const messages=[{role:"system",content:sys}];
  if(priorExchange){
    messages.push({role:"user",content:priorExchange.userText});
    messages.push({role:"assistant",content:priorExchange.question||"Could you tell me the portion size?"});
  }
  messages.push({role:"user",content:text});
  return completeGeminiJSON({apiKey,model,messages});
}
