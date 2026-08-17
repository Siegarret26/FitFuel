/* FitFuel — Workout and meal cards, detail modals, exercise rows
   Loaded by index.html in order. All files share one scope, so this is plain JSX
   compiled in the browser rather than ES modules. */

/* ─── WORKOUT CARD ───────────────────────────────── */
function WorkoutCard({w,onStart,isActive,onOpenDetail,onToggleFavorite,favorited}){
  const diffClass={"Beginner":"tag-diff-beginner","Intermediate":"tag-diff-intermediate","Advanced":"tag-diff-advanced"}[w.diff]||"tag-diff-beginner";
  return(
    <div className="workout-card card-hover" onClick={()=>onOpenDetail&&onOpenDetail(w)} style={{cursor:"pointer"}}>
      <div className="workout-card-img-wrap">
        <img src={w.image} alt={w.imageAlt} className="workout-card-img" loading="lazy"/>
        <div className="workout-card-img-overlay"/>
        {onToggleFavorite&&(
          <button className={"meal-save-btn"+(favorited?" saved":"")} onClick={e=>{e.stopPropagation();onToggleFavorite(w.id);}} aria-label={favorited?"Unfavorite workout":"Favorite workout"}>
            {favorited?"❤️":"🤍"}
          </button>
        )}
        <div className="workout-card-chips">
          <span className={"tag "+diffClass}>{w.diff}</span>
          <span className="workout-dur-chip">⏱ {w.duration}m</span>
          {w.aiGenerated&&<span className="workout-dur-chip ai-badge-chip">🤖 AI</span>}
        </div>
      </div>
      <div className="workout-card-body">
        <div className="workout-card-name">{w.name}</div>
        <p className="workout-card-desc">{w.desc}</p>
        {(w.calories||w.equipment)&&(
          <div className="workout-card-meta">
            {w.calories&&<span className="workout-meta-chip">🔥 {w.calories} kcal</span>}
            {w.equipment&&<span className="workout-meta-chip" title={w.equipment.join(", ")}>🏋 {w.equipment[0]==="None"?"No equipment":w.equipment.join(", ")}</span>}
          </div>
        )}
        <button className="btn-primary" style={{width:"100%",fontSize:13,padding:"11px"}} onClick={e=>{e.stopPropagation();onStart&&onStart(w);}}>
          {isActive ? "⚡ In Progress" : "▶ Start Workout"}
        </button>
      </div>
    </div>
  );
}

/* ─── EXERCISE ROW (expandable instruction dropdown) ────── */
function ExerciseRow({name, detail, rest, showCheckbox, done, onToggleDone}){
  const [open,setOpen]=useState(false);
  const info = EXERCISE_LIBRARY[name];
  if(rest){
    return(
      <div className="exercise-row rest-row">
        <div className="exercise-row-main">
          <span className="exercise-row-text" style={{opacity:0.6,fontStyle:"italic"}}>😮‍💨 {name} <span className="exercise-detail">{detail}</span></span>
        </div>
      </div>
    );
  }
  const toggleOpen=e=>{ if(e)e.stopPropagation(); setOpen(o=>!o); };
  return(
    <div className={"exercise-row"+(done?" done":"")}>
      <div className="exercise-row-main" onClick={showCheckbox?onToggleDone:undefined} style={{cursor:showCheckbox?"pointer":"default"}}>
        {showCheckbox&&(
          <div className={"exercise-row-cb"+(done?" checked":"")}>{done?"✓":""}</div>
        )}
        <span className="exercise-row-text">{name} <span className="exercise-detail">{detail}</span></span>
        {info&&(
          <button className={"exercise-info-btn"+(open?" open":"")} onClick={toggleOpen} aria-label={open?"Hide exercise instructions":"Show exercise instructions"} aria-expanded={open}>
            {open?"−":"ⓘ"}
          </button>
        )}
      </div>
      {info&&(
        <div className={"exercise-info-panel"+(open?" open":"")}>
          <div className="exercise-info-inner">
            <div className="exercise-info-divider"/>
            <div className="exercise-info-title">How to Perform</div>
            <ul className="exercise-info-list">
              {info.howTo.map((step,i)=><li key={i}>{step}</li>)}
            </ul>
            <div className="exercise-info-title">Common Mistakes</div>
            <ul className="exercise-info-list mistakes">
              {info.mistakes.map((m,i)=><li key={i}>{m}</li>)}
            </ul>
            <div className="exercise-info-muscles">
              <div><span className="exercise-info-muscle-label">Primary Muscles</span>{info.primary.join(", ")}</div>
              {info.secondary&&info.secondary.length>0&&(
                <div><span className="exercise-info-muscle-label">Secondary Muscles</span>{info.secondary.join(", ")}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── WORKOUT DETAIL MODAL ───────────────────────────────── */
function WorkoutDetailModal({w, onClose, onStart}){
  const diffColors={Beginner:"#38D978",Intermediate:"#FF8A1F",Advanced:"var(--accent)"};
  const diffBg={Beginner:"rgba(56,217,120,0.12)",Intermediate:"rgba(255,138,31,0.12)",Advanced:"var(--accent-tint-2)"};
  useEffect(()=>{
    document.body.style.overflow="hidden";
    return()=>{ document.body.style.overflow=""; };
  },[]);
  return(
    <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="meal-modal workout-modal" role="dialog" aria-modal="true" aria-label={w.name}>
        <div className="meal-modal-hero">
          <img src={w.image.replace("w=600","w=900")} alt={w.imageAlt}/>
          <div className="meal-modal-hero-overlay"/>
          <div className="meal-modal-cat-pill">{w.cat}</div>
          <button className="meal-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="meal-modal-body">
          <h2 className="meal-modal-title">{w.emoji} {w.name}</h2>
          <p style={{fontSize:14,color:"var(--text-mid)",lineHeight:1.6,marginBottom:18,marginTop:-6}}>{w.desc}</p>

          <div className="meal-modal-meta" style={{marginBottom:16}}>
            <div className="meal-modal-badge" style={{background:diffBg[w.diff]||"var(--bg3)",color:diffColors[w.diff]||"var(--text-mid)",borderColor:"transparent"}}>
              <span>{w.diff==="Beginner"?"🟢":w.diff==="Intermediate"?"🟡":"🔴"}</span>{w.diff}
            </div>
            <div className="meal-modal-badge"><span>⏱</span>{w.duration} min</div>
            {w.calories&&<div className="meal-modal-badge"><span>🔥</span>{w.calories} kcal</div>}
          </div>

          {(w.muscles||w.equipment)&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:20}}>
              {w.muscles&&(
                <div style={{background:"var(--bg3)",borderRadius:14,padding:"12px 16px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:5}}>Target Muscles</div>
                  <div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{w.muscles.join(", ")}</div>
                </div>
              )}
              {w.equipment&&(
                <div style={{background:"var(--bg3)",borderRadius:14,padding:"12px 16px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--text-mid)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:5}}>Equipment</div>
                  <div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{w.equipment[0]==="None"?"No equipment needed":w.equipment.join(", ")}</div>
                </div>
              )}
            </div>
          )}

          <div className="meal-modal-section-title">
            Exercises
            <span style={{marginLeft:8,fontSize:11,fontWeight:500,color:"var(--text-light)"}}> — tap ⓘ for technique</span>
          </div>
          <div className="exercise-list">
            {w.exercises.map((e,i)=><ExerciseRow key={i} name={e.name} detail={e.detail} rest={e.rest} showCheckbox={false}/>)}
          </div>

          <button className="btn-primary" style={{width:"100%",marginTop:8,padding:"14px"}} onClick={()=>{onStart&&onStart(w);onClose();}}>
            ▶ Start Workout
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MEAL DETAIL MODAL ──────────────────────────── */
function MealDetailModal({m, onClose, onSave, saved}){
  const [checked, setChecked] = useState([]);
  const toggle = i => setChecked(prev => prev.includes(i) ? prev.filter(x=>x!==i) : [...prev,i]);
  const diffColors = {Easy:"#38D978", Medium:"#FF8A1F", Hard:"var(--accent)"};
  const diffBg = {Easy:"rgba(56,217,120,0.12)", Medium:"rgba(255,138,31,0.12)", Hard:"var(--accent-tint-2)"};
  // Step icons for visual variety
  const stepIcons = ["🔪","🥄","🍳","🥘","🫙","⏱","🥗","🌡️","💧","✅"];
  useEffect(()=>{
    document.body.style.overflow="hidden";
    return()=>{ document.body.style.overflow=""; };
  },[]);
  return(
    <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="meal-modal" role="dialog" aria-modal="true" aria-label={m.name}>
        <div className="meal-modal-hero">
          <img src={m.image.replace("w=600","w=900")} alt={m.imageAlt}/>
          <div className="meal-modal-hero-overlay"/>
          <div className="meal-modal-cat-pill">{m.cat}</div>
          <button className="meal-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="meal-modal-body">
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:12}}>
            <h2 className="meal-modal-title" style={{marginBottom:0}}>{m.emoji} {m.name}</h2>
            {onSave&&(
              <button onClick={()=>onSave(m.id)} style={{flexShrink:0,background:saved?"var(--accent-tint-2)":"var(--bg3)",border:`1px solid ${saved?"var(--accent-tint-3)":"var(--border-strong)"}`,borderRadius:50,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:700,color:saved?"var(--accent)":"var(--text-mid)",transition:"all 0.2s",whiteSpace:"nowrap"}}>
                {saved?"Saved":"🤍 Save"}
              </button>
            )}
          </div>

          {/* MACROS */}
          <div className="meal-modal-macros">
            {[{val:m.cal,label:"Calories",col:"var(--accent)"},{val:`${m.protein}g`,label:"Protein",col:"var(--purple)"},{val:`${m.carbs}g`,label:"Carbs",col:"var(--blue)"},{val:`${m.fat}g`,label:"Fat",col:"#38D978"}].map(x=>(
              <div key={x.label} className="meal-modal-macro">
                <div className="meal-modal-macro-val" style={{color:x.col}}>{x.val}</div>
                <div className="meal-modal-macro-label">{x.label}</div>
              </div>
            ))}
          </div>

          {/* META BADGES */}
          <div className="meal-modal-meta">
            <div className="meal-modal-badge"><span>⏱</span>Prep: {m.prepTime}</div>
            <div className="meal-modal-badge"><span>🍳</span>Cook: {m.cookTime}</div>
            <div className="meal-modal-badge" style={{background:diffBg[m.difficulty]||"var(--bg3)",color:diffColors[m.difficulty]||"var(--text-mid)",borderColor:"transparent"}}>
              <span>{m.difficulty==="Easy"?"🟢":m.difficulty==="Medium"?"🟡":"🔴"}</span>{m.difficulty}
            </div>
          </div>

          {/* INGREDIENTS */}
          <div className="meal-modal-section-title">
            Ingredients
            <span style={{marginLeft:8,fontSize:11,fontWeight:500,color:"var(--text-light)"}}> — tap to check off</span>
          </div>
          <ul className="meal-modal-ingredients">
            {m.ingredients.map((ing,i)=>(
              <li key={i} className={"meal-modal-ingredient"+(checked.includes(i)?" checked":"")} onClick={()=>toggle(i)}>
                <div className="meal-modal-ingredient-cb">{checked.includes(i)?"✓":""}</div>
                <span className="meal-modal-ingredient-text">{ing}</span>
              </li>
            ))}
          </ul>

          {/* INSTRUCTIONS */}
          {m.instructions&&m.instructions.length>0&&(
            <>
              <div className="meal-modal-section-title">Cooking Instructions</div>
              <div className="meal-modal-steps">
                {m.instructions.map((step,i)=>(
                  <div key={i} className="meal-modal-step">
                    <div className="meal-modal-step-num">{i+1}</div>
                    <div className="meal-modal-step-text">{stepIcons[i]||"•"} {step}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── MEAL CARD ──────────────────────────────────── */
function MealCard({m, onSave, saved, onOpenDetail}){
  return(
    <div className="meal-card card-hover" onClick={()=>onOpenDetail&&onOpenDetail(m)} style={{cursor:"pointer"}}>
      <div className="meal-card-img-wrap">
        <img src={m.image} alt={m.imageAlt} className="meal-card-img" loading="lazy"/>
        <div className="meal-card-img-overlay"/>
        <button className={"meal-save-btn"+(saved?" saved":"")} onClick={e=>{e.stopPropagation();onSave&&onSave(m.id);}} aria-label={saved?"Unsave meal":"Save meal"}>
          {saved?"❤️":"🤍"}
        </button>
        <div className="meal-cat-pill">{m.cat}</div>
        {m.aiGenerated&&<div className="meal-cat-pill ai-badge-chip" style={{left:"auto",right:16}}>🤖 AI</div>}
      </div>
      <div className="meal-card-body">
        <div className="meal-card-name">{m.name}</div>
        <div className="meal-macros">
          <div className="meal-macro"><div className="meal-macro-val text-accent">{m.cal}</div><div className="meal-macro-label">kcal</div></div>
          <div style={{width:1,background:"var(--border)"}}/>
          <div className="meal-macro"><div className="meal-macro-val" style={{color:"var(--purple)"}}>{m.protein}g</div><div className="meal-macro-label">Protein</div></div>
          <div style={{width:1,background:"var(--border)"}}/>
          <div className="meal-macro"><div className="meal-macro-val" style={{color:"var(--blue)"}}>{m.carbs}g</div><div className="meal-macro-label">Carbs</div></div>
          <div style={{width:1,background:"var(--border)"}}/>
          <div className="meal-macro"><div className="meal-macro-val" style={{color:"#38D978"}}>{m.fat}g</div><div className="meal-macro-label">Fat</div></div>
        </div>
        <ul className="meal-ingredients">
          {m.ingredients.slice(0,3).map((ing,i)=><li key={i}>{ing}</li>)}
          {m.ingredients.length>3&&<li style={{color:"var(--text-light)"}}>+{m.ingredients.length-3} more ingredients</li>}
        </ul>
        <div style={{marginTop:12,fontSize:12,fontWeight:600,color:"var(--accent)",display:"flex",alignItems:"center",gap:4}}>
          View recipe →
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   GPS ACTIVITY TRACKING — components (Feature 6)
═══════════════════════════════════════════ */

/* Leaflet map wrapper — draws the live/recorded route on a dark basemap.
   Leaflet itself loads from a CDN (see <head>); if it fails to load
   (e.g. no network) we fall back to a simple message instead of crashing. */
function ActivityMap({route, live, height}){
  const containerRef=useRef(null);
  const mapRef=useRef(null);
  const polylineRef=useRef(null);
  const markerRef=useRef(null);
  const leafletAvailable=typeof window!=="undefined"&&!!window.L;

  useEffect(()=>{
    if(!leafletAvailable||!containerRef.current||mapRef.current) return;
    const start=route.length?[route[0].lat,route[0].lng]:[51.505,-0.09];
    const map=window.L.map(containerRef.current,{zoomControl:true,attributionControl:true}).setView(start,16);
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{
      attribution:'&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
      subdomains:"abcd", maxZoom:20,
    }).addTo(map);
    mapRef.current=map;
    return ()=>{ map.remove(); mapRef.current=null; polylineRef.current=null; markerRef.current=null; };
    // eslint-disable-next-line
  },[leafletAvailable]);

  useEffect(()=>{
    if(!mapRef.current||!route.length) return;
    const latlngs=route.map(p=>[p.lat,p.lng]);
    if(polylineRef.current) polylineRef.current.setLatLngs(latlngs);
    else polylineRef.current=window.L.polyline(latlngs,{color:"#FF3B3B",weight:5,opacity:0.9,lineJoin:"round"}).addTo(mapRef.current);
    const last=latlngs[latlngs.length-1];
    if(markerRef.current) markerRef.current.setLatLng(last);
    else markerRef.current=window.L.marker(last,{icon:window.L.divIcon({className:"activity-map-dot",iconSize:[16,16]})}).addTo(mapRef.current);
    if(live) mapRef.current.panTo(last,{animate:true,duration:0.5});
    else if(latlngs.length>1) mapRef.current.fitBounds(window.L.latLngBounds(latlngs),{padding:[26,26]});
  },[route,live]);

  return(
    <div className="activity-map-wrap" style={{height:height||280}}>
      <div ref={containerRef} className="activity-map-canvas"/>
      {!leafletAvailable&&(
        <div className="activity-map-fallback">🗺️ Map preview unavailable right now — your route is still being recorded.</div>
      )}
    </div>
  );
}

function ActivityStat({icon,label,value,unit,color}){
  return(
    <div className="activity-stat-tile">
      <div className="activity-stat-icon">{icon}</div>
      <div className="activity-stat-value" style={color?{color}:undefined}>{value}{unit&&<span className="activity-stat-unit"> {unit}</span>}</div>
      <div className="activity-stat-label">{label}</div>
    </div>
  );
}

function ActivityStatGrid({activity}){
  return(
    <div className="activity-stat-grid">
      <ActivityStat icon="📏" label="Total Distance" value={activity.distance.toFixed(2)} unit="km"/>
      <ActivityStat icon="⏱" label="Total Time" value={formatDuration(activity.duration)}/>
      <ActivityStat icon="🏃" label="Moving Time" value={formatDuration(activity.movingTime)}/>
      <ActivityStat icon="⚡" label="Avg Pace" value={formatPace(activity.avgPace)} unit="/km"/>
      <ActivityStat icon="💨" label="Avg Speed" value={activity.avgSpeed.toFixed(1)} unit="km/h"/>
      <ActivityStat icon="🚀" label="Max Speed" value={activity.maxSpeed.toFixed(1)} unit="km/h"/>
      <ActivityStat icon="🔥" label="Calories" value={activity.calories} unit="kcal"/>
      <ActivityStat icon="⛰️" label="Elevation Gain" value={activity.hasElevation?`+${Math.round(activity.elevGain)}`:"—"} unit={activity.hasElevation?"m":""}/>
      <ActivityStat icon="⬇️" label="Elevation Loss" value={activity.hasElevation?`-${Math.round(activity.elevLoss)}`:"—"} unit={activity.hasElevation?"m":""}/>
      <ActivityStat icon="🏔️" label="Highest Point" value={activity.hasElevation?Math.round(activity.maxElevation):"—"} unit={activity.hasElevation?"m":""}/>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ACTIVITY ANALYTICS — UI (Feature 7)
═══════════════════════════════════════════ */

/* Generic Chart.js line-chart wrapper. Watches <html> for attribute changes so
   charts redraw with fresh colors whenever the person switches light/dark theme. */
function LineChartCanvas({labels,datasets,height,yLabel,xLabel}){
  const canvasRef=useRef(null);
  const chartRef=useRef(null);
  const [themeTick,setThemeTick]=useState(0);
  const available=typeof window!=="undefined"&&!!window.Chart;

  useEffect(()=>{
    if(!available) return;
    const observer=new MutationObserver(()=>setThemeTick(t=>t+1));
    observer.observe(document.documentElement,{attributes:true,attributeFilter:["style","class"]});
    return ()=>observer.disconnect();
  },[available]);

  useEffect(()=>{
    if(!available||!canvasRef.current) return;
    const styles=getComputedStyle(document.documentElement);
    const textColor=(styles.getPropertyValue("--text-mid")||"").trim()||"#999";
    const gridColor=(styles.getPropertyValue("--border")||"").trim()||"rgba(255,255,255,0.08)";
    if(chartRef.current) chartRef.current.destroy();
    chartRef.current=new window.Chart(canvasRef.current.getContext("2d"),{
      type:"line",
      data:{ labels, datasets: datasets.map(ds=>({
        label:ds.label, data:ds.data, borderColor:ds.color, backgroundColor:ds.color+"33",
        borderWidth:2.5, pointRadius:0, pointHoverRadius:5, tension:0.35, fill:!!ds.fill, yAxisID:ds.yAxisID||"y",
      })) },
      options:{
        responsive:true, maintainAspectRatio:false,
        interaction:{mode:"index",intersect:false},
        plugins:{
          legend:{display:datasets.length>1,labels:{color:textColor,font:{family:"Manrope",size:11}}},
          tooltip:{mode:"index",intersect:false},
        },
        scales:{
          x:{ ticks:{color:textColor,font:{family:"Manrope",size:10}}, grid:{color:gridColor}, title:xLabel?{display:true,text:xLabel,color:textColor}:undefined },
          y:{ ticks:{color:textColor,font:{family:"Manrope",size:10}}, grid:{color:gridColor}, title:yLabel?{display:true,text:yLabel,color:textColor}:undefined },
        },
      },
    });
    return ()=>{ if(chartRef.current){chartRef.current.destroy();chartRef.current=null;} };
    // eslint-disable-next-line
  },[available,themeTick,JSON.stringify(labels),JSON.stringify(datasets)]);

  return(
    <div className="chart-canvas-wrap" style={{height:height||220}}>
      <canvas ref={canvasRef}/>
      {!available&&<div className="activity-map-fallback">Charts unavailable right now.</div>}
    </div>
  );
}

function PersonalRecordBadges({records}){
  if(!records||!records.length) return null;
  return(
    <div className="pr-badges-row">
      {records.map(r=><span key={r} className="pr-badge">🏆 New PR: {r}</span>)}
    </div>
  );
}

function InsightsList({insights}){
  if(!insights||!insights.length) return null;
  return(
    <div className="insights-card">
      <div className="insights-title">Performance Insights</div>
      <ul className="insights-list">
        {insights.map((line,i)=><li key={i}>💡 {line}</li>)}
      </ul>
    </div>
  );
}

function SplitsTable({splits}){
  if(!splits||!splits.length) return <p className="analytics-empty-note">Not enough distance recorded for a split breakdown.</p>;
  const fullPaces=splits.filter(s=>!s.partial).map(s=>s.pace);
  const fastest=fullPaces.length?Math.min(...fullPaces):null;
  return(
    <div className="splits-table-wrap">
      <table className="splits-table">
        <thead><tr><th>Split</th><th>Time</th><th>Pace</th><th>Avg Speed</th></tr></thead>
        <tbody>
          {splits.map((s,i)=>(
            <tr key={i} className={fastest!==null&&!s.partial&&s.pace===fastest?"fastest-split":""}>
              <td>{s.label}{s.partial?" (partial)":""}</td>
              <td>{formatDuration(s.timeSec)}</td>
              <td>{formatPace(s.pace)}/km{fastest!==null&&!s.partial&&s.pace===fastest?" ⚡":""}</td>
              <td>{s.avgSpeed.toFixed(1)} km/h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntervalsTable({activity}){
  const [mins,setMins]=useState(5);
  const intervals=mins===5?activity.intervals5:activity.intervals10;
  return(
    <div>
      <div className="analytics-section-head">
        <div className="analytics-section-title" style={{marginBottom:0}}>Time Intervals</div>
        <Seg options={[{v:5,l:"Every 5 min"},{v:10,l:"Every 10 min"}]} value={mins} onChange={setMins}/>
      </div>
      {(!intervals||!intervals.length)
        ? <p className="analytics-empty-note">Activity was too short for this interval length.</p>
        : <div className="splits-table-wrap">
            <table className="splits-table">
              <thead><tr><th>Interval</th><th>Distance</th><th>Avg Pace</th><th>Calories</th></tr></thead>
              <tbody>
                {intervals.map((b,i)=>(
                  <tr key={i}>
                    <td>{b.label}</td>
                    <td>{b.distanceKm.toFixed(2)} km</td>
                    <td>{formatPace(b.avgPace)}/km</td>
                    <td>{b.calories} kcal</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  );
}

/* Structured so real wearable data can slot straight in later — see activity.heartRate */
function HeartRateSection({heartRate}){
  if(!heartRate){
    return(
      <div className="hr-placeholder">
        <div style={{fontSize:26,marginBottom:8}}>❤️</div>
        <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:4}}>Heart Rate — Coming Soon</div>
        <p style={{fontSize:12,color:"var(--text-mid)",margin:0}}>Connect a smartwatch or fitness band to see live heart rate, zones, and time-in-zone here.</p>
      </div>
    );
  }
  return(
    <div>
      <div className="activity-stat-grid" style={{marginBottom:16}}>
        <ActivityStat icon="❤️" label="Avg Heart Rate" value={heartRate.avg} unit="bpm"/>
        <ActivityStat icon="💓" label="Max Heart Rate" value={heartRate.max} unit="bpm"/>
      </div>
      {heartRate.series&&heartRate.series.length>1&&(
        <LineChartCanvas labels={heartRate.series.map(p=>`${p.t}m`)} datasets={[{label:"Heart Rate",data:heartRate.series.map(p=>p.bpm),color:"#FF3B3B"}]} yLabel="bpm" xLabel="Time elapsed" height={200}/>
      )}
    </div>
  );
}

/* Animated playback of a completed route: marker moves along the recorded GPS
   path at 1×/2×/4× speed, with live stats and pause/resume. */
function ActivityPlaybackMap({activity}){
  const containerRef=useRef(null);
  const mapRef=useRef(null);
  const traveledLineRef=useRef(null);
  const markerRef=useRef(null);
  const leafletAvailable=typeof window!=="undefined"&&!!window.L;
  const route=activity.route||[];
  const totalMs=route.length>1?route[route.length-1].timestamp-route[0].timestamp:0;

  const [playing,setPlaying]=useState(false);
  const [speedMult,setSpeedMult]=useState(1);
  const [virtualMs,setVirtualMs]=useState(0);
  const tickRef=useRef(null);

  useEffect(()=>{
    if(!leafletAvailable||!containerRef.current||mapRef.current||route.length<2) return;
    const map=window.L.map(containerRef.current,{zoomControl:true}).setView([route[0].lat,route[0].lng],15);
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{attribution:'&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',subdomains:"abcd",maxZoom:20}).addTo(map);
    const latlngs=route.map(p=>[p.lat,p.lng]);
    window.L.polyline(latlngs,{color:"#666",weight:3,opacity:0.45}).addTo(map);
    traveledLineRef.current=window.L.polyline([latlngs[0]],{color:"#FF3B3B",weight:5}).addTo(map);
    markerRef.current=window.L.marker(latlngs[0],{icon:window.L.divIcon({className:"activity-map-dot",iconSize:[16,16]})}).addTo(map);
    map.fitBounds(window.L.latLngBounds(latlngs),{padding:[24,24]});
    mapRef.current=map;
    return ()=>{ map.remove(); mapRef.current=null; traveledLineRef.current=null; markerRef.current=null; };
  },[leafletAvailable]);

  useEffect(()=>{
    if(!playing){ clearInterval(tickRef.current); return; }
    tickRef.current=setInterval(()=>{
      setVirtualMs(ms=>{
        const next=ms+200*speedMult;
        if(next>=totalMs){ setPlaying(false); return totalMs; }
        return next;
      });
    },200);
    return ()=>clearInterval(tickRef.current);
  },[playing,speedMult,totalMs]);

  useEffect(()=>{
    if(!mapRef.current||route.length<2) return;
    const idx=findRouteIndexAtMs(route,virtualMs);
    const point=route[idx];
    if(traveledLineRef.current) traveledLineRef.current.setLatLngs(route.slice(0,idx+1).map(p=>[p.lat,p.lng]));
    if(markerRef.current) markerRef.current.setLatLng([point.lat,point.lng]);
  },[virtualMs]);

  if(route.length<2) return <p className="analytics-empty-note">Not enough GPS data to play back this route.</p>;

  const idx=findRouteIndexAtMs(route,virtualMs);
  let distanceSoFar=0;
  for(let i=1;i<=idx&&i<route.length;i++) distanceSoFar+=haversineKm(route[i-1].lat,route[i-1].lng,route[i].lat,route[i].lng);
  const reset=()=>{ setPlaying(false); setVirtualMs(0); };

  return(
    <div>
      <div className="activity-map-wrap" style={{height:240}}>
        <div ref={containerRef} className="activity-map-canvas"/>
        {!leafletAvailable&&<div className="activity-map-fallback">Map preview unavailable right now.</div>}
      </div>
      <div className="playback-stats-row">
        <div><span className="playback-stat-val">{formatDuration(virtualMs/1000)}</span><span className="playback-stat-label">elapsed</span></div>
        <div><span className="playback-stat-val">{distanceSoFar.toFixed(2)} km</span><span className="playback-stat-label">distance</span></div>
        <div><span className="playback-stat-val">{formatPace(distanceSoFar>0?(virtualMs/60000)/distanceSoFar:0)}</span><span className="playback-stat-label">pace/km</span></div>
      </div>
      <div className="playback-controls-row">
        <button className="btn-secondary" onClick={reset}>⏮ Reset</button>
        <button className="btn-primary" style={{flex:1}} onClick={()=>setPlaying(p=>!p)}>{playing?"⏸ Pause":"▶ Play"}</button>
        <Seg options={[{v:1,l:"1×"},{v:2,l:"2×"},{v:4,l:"4×"}]} value={speedMult} onChange={setSpeedMult}/>
      </div>
    </div>
  );
}

/* Composed post-activity analytics dashboard — used both right after finishing
   and when reopening a saved activity from history. */
function ActivityAnalyticsDashboard({activity,settings={},user}){
  const [showPlayback,setShowPlayback]=useState(false);
  const [aiAnalysis,setAiAnalysis]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiError,setAiError]=useState("");
  const series=activity.series||[];

  const runAIAnalysis=async()=>{
    if(!settings.aiApiKey){ setAiError("Add a Gemini API key in Settings → AI Coach to use this."); return; }
    setAiLoading(true); setAiError("");
    try{
      const splitSummary=(activity.splits||[]).map(s=>`${s.label}: ${formatPace(s.pace)}/km`).join(", ");
      const sys=buildSystemPrompt(buildUserContextSummary(user,null,[],[],loadAIMemoryForContext()),"You are analysing one specific completed run/walk as a running coach. Be specific, reference the actual splits and numbers given, keep it to 3-5 short sentences, encouraging but honest.");
      const userMsg=`Analyse this activity: ${activity.title}, ${activity.distance.toFixed(2)}km in ${formatDuration(activity.duration)}, avg pace ${formatPace(activity.avgPace)}/km, splits: ${splitSummary||"n/a"}.${activity.hasElevation?` Elevation gain ${Math.round(activity.elevGain)}m.`:""}`;
      const text=await completeGeminiText({apiKey:settings.aiApiKey,model:settings.aiModel,messages:[{role:"system",content:sys},{role:"user",content:userMsg}]});
      setAiAnalysis(text);
    }catch(err){ setAiError(err.message||"Something went wrong."); }
    finally{ setAiLoading(false); }
  };

  return(
    <div className="analytics-dashboard">
      <PersonalRecordBadges records={activity.personalRecords}/>
      <InsightsList insights={activity.insights}/>

      <div className="analytics-section">
        <div className="analytics-section-head">
          <div className="analytics-section-title" style={{marginBottom:0}}>AI Running Coach</div>
          {!aiAnalysis&&<button className="btn-secondary" style={{padding:"8px 16px",fontSize:13}} onClick={runAIAnalysis} disabled={aiLoading}>{aiLoading?"Analysing…":"Ask AI to analyse this run"}</button>}
        </div>
        {aiError&&<p style={{fontSize:13,color:"var(--accent)"}}>{aiError}</p>}
        {aiAnalysis&&<div className="insights-card"><div style={{fontSize:13.5,color:"var(--text)",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{aiAnalysis}</div></div>}
      </div>

      <div className="analytics-section">
        <div className="analytics-section-title">Pace Over Time</div>
        {series.length>1
          ? <LineChartCanvas labels={series.map(p=>`${p.t}m`)} datasets={[{label:"Pace (min/km)",data:series.map(p=>+p.pace.toFixed(2)),color:"#FF3B3B"}]} yLabel="min/km" xLabel="Time elapsed"/>
          : <p className="analytics-empty-note">Not enough data for a pace graph.</p>}
      </div>

      <div className="analytics-section">
        <div className="analytics-section-title">Speed Over Time</div>
        {series.length>1
          ? <>
              <LineChartCanvas labels={series.map(p=>`${p.t}m`)} datasets={[{label:"Speed (km/h)",data:series.map(p=>+p.speed.toFixed(2)),color:"#4C8DFF"}]} yLabel="km/h" xLabel="Time elapsed"/>
              <div className="mini-stat-row">
                <span>Average: {activity.avgSpeed.toFixed(1)} km/h</span>
                <span>Max: {activity.maxSpeed.toFixed(1)} km/h</span>
              </div>
            </>
          : <p className="analytics-empty-note">Not enough data for a speed graph.</p>}
      </div>

      {activity.hasElevation&&activity.elevationSeries&&activity.elevationSeries.length>1&&(
        <div className="analytics-section">
          <div className="analytics-section-title">Elevation Profile</div>
          <LineChartCanvas labels={activity.elevationSeries.map(p=>p.distanceKm.toFixed(1))} datasets={[{label:"Elevation (m)",data:activity.elevationSeries.map(p=>Math.round(p.elevation)),color:"#38D978",fill:true}]} yLabel="m" xLabel="Distance (km)"/>
          <div className="mini-stat-row">
            <span>Highest: {Math.round(activity.maxElevation)} m</span>
            <span>Gain: +{Math.round(activity.elevGain)} m</span>
            <span>Loss: -{Math.round(activity.elevLoss)} m</span>
          </div>
        </div>
      )}

      <div className="analytics-section">
        <div className="analytics-section-title">Heart Rate</div>
        <HeartRateSection heartRate={activity.heartRate}/>
      </div>

      <div className="analytics-section">
        <div className="analytics-section-title">Splits</div>
        <SplitsTable splits={activity.splits}/>
      </div>

      <div className="analytics-section">
        <IntervalsTable activity={activity}/>
      </div>

      <div className="analytics-section">
        <div className="analytics-section-head">
          <div className="analytics-section-title" style={{marginBottom:0}}>Route Playback</div>
          <button className="btn-secondary" style={{padding:"8px 16px",fontSize:13}} onClick={()=>setShowPlayback(s=>!s)}>{showPlayback?"Hide":"▶ Play Route"}</button>
        </div>
        {showPlayback&&<ActivityPlaybackMap activity={activity}/>}
      </div>
    </div>
  );
}

function ActivityCard({activity,onOpen}){
  const meta=ACTIVITY_TYPES.find(t=>t.id===activity.type)||ACTIVITY_TYPES[0];
  const dateLabel=new Date(activity.finishedAt).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"});
  return(
    <div className="activity-card card-hover" onClick={()=>onOpen(activity)} style={{cursor:"pointer"}}>
      <div className="activity-card-head">
        <span className="activity-card-icon">{meta.icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div className="activity-card-title">{activity.title}</div>
          <div className="activity-card-date">{dateLabel}</div>
        </div>
      </div>
      <div className="activity-card-stats">
        <div><span className="activity-card-stat-val">{activity.distance.toFixed(2)}</span><span className="activity-card-stat-label">km</span></div>
        <div><span className="activity-card-stat-val">{formatDuration(activity.duration)}</span><span className="activity-card-stat-label">time</span></div>
        <div><span className="activity-card-stat-val">{formatPace(activity.avgPace)}</span><span className="activity-card-stat-label">/km</span></div>
        <div><span className="activity-card-stat-val">{activity.calories}</span><span className="activity-card-stat-label">kcal</span></div>
      </div>
    </div>
  );
}

function ActivitySummaryCard({activity,onSave,onDiscard,settings,user}){
  const meta=ACTIVITY_TYPES.find(t=>t.id===activity.type)||ACTIVITY_TYPES[0];
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  return(
    <div className="card activity-summary-card fade-up" style={{padding:28}}>
      <div className="activity-summary-head">
        <span style={{fontSize:34}}>{meta.icon}</span>
        <div>
          <h2 style={{fontSize:22,fontWeight:800,color:"var(--text)",marginBottom:2}}>{activity.title}</h2>
          <div style={{fontSize:13,color:"var(--text-mid)"}}>Activity complete — review &amp; save</div>
        </div>
      </div>
      <ActivityMap route={activity.route} live={false} height={260}/>
      <ActivityStatGrid activity={activity}/>
      <ActivityAnalyticsDashboard activity={activity} settings={settings} user={user}/>
      {confirmDiscard?(
        <div style={{marginTop:20,padding:"14px 16px",background:"var(--bg3)",borderRadius:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:"var(--text-mid)",flex:1}}>Discard this activity? It won't be saved.</span>
          <button className="btn-secondary" onClick={()=>setConfirmDiscard(false)}>Cancel</button>
          <button className="btn-primary" onClick={onDiscard}>Discard</button>
        </div>
      ):(
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button className="btn-secondary" style={{flex:1}} onClick={()=>setConfirmDiscard(true)}>Delete Activity</button>
          <button className="btn-primary" style={{flex:1}} onClick={onSave}>✓ Save Activity</button>
        </div>
      )}
    </div>
  );
}

function ActivityDetailModal({activity,onClose,onDelete,settings,user}){
  const meta=ACTIVITY_TYPES.find(t=>t.id===activity.type)||ACTIVITY_TYPES[0];
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  useEffect(()=>{ document.body.style.overflow="hidden"; return()=>{document.body.style.overflow="";}; },[]);
  return(
    <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="meal-modal activity-detail-modal" role="dialog" aria-modal="true" aria-label={activity.title}>
        <button className="meal-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="meal-modal-body" style={{paddingTop:28}}>
          <div className="activity-summary-head">
            <span style={{fontSize:34}}>{meta.icon}</span>
            <div>
              <h2 style={{fontSize:22,fontWeight:800,color:"var(--text)",marginBottom:2}}>{activity.title}</h2>
              <div style={{fontSize:13,color:"var(--text-mid)"}}>{new Date(activity.finishedAt).toLocaleString(undefined,{weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"})}</div>
            </div>
          </div>
          <ActivityMap route={activity.route} live={false} height={260}/>
          <ActivityStatGrid activity={activity}/>
          <ActivityAnalyticsDashboard activity={activity} settings={settings} user={user}/>
          {confirmDiscard?(
            <div style={{marginTop:20,padding:"14px 16px",background:"var(--bg3)",borderRadius:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:"var(--text-mid)",flex:1}}>Delete this activity permanently?</span>
              <button className="btn-secondary" onClick={()=>setConfirmDiscard(false)}>Cancel</button>
              <button className="btn-primary" onClick={()=>onDelete(activity.id)}>Delete</button>
            </div>
          ):(
            <button className="btn-secondary" style={{width:"100%",marginTop:20}} onClick={()=>setConfirmDiscard(true)}>Delete Activity</button>
          )}
        </div>
      </div>
    </div>
  );
}
