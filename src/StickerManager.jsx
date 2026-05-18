import { useState, useEffect, useCallback, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { GROUPS_DATA, getStickerIds, STICKER_LOOKUP, TOTAL_STICKERS, FLAGS } from "./data";

export default function StickerManager({ user, onLogout }) {
  const [collected, setCollected] = useState({});
  const [duplicates, setDuplicates] = useState({});
  const [activeGroup, setActiveGroup] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("groups");

  useEffect(() => { if (!user) return; (async () => { try { const snap = await getDoc(doc(db,"collections",user.uid)); if(snap.exists()){setCollected(snap.data().collected||{});setDuplicates(snap.data().duplicates||{});} } catch(e){console.error(e);} setLoading(false); })(); }, [user]);

  const ti = useRef(null);
  const save = useCallback((c,d) => { if(!user)return; setSaving(true); if(ti.current)clearTimeout(ti.current); ti.current=setTimeout(async()=>{ try{await setDoc(doc(db,"collections",user.uid),{collected:c,duplicates:d,updatedAt:new Date().toISOString(),email:user.email});}catch(e){console.error(e);} setSaving(false); },500); },[user]);

  const toggle=(id)=>{setCollected(p=>{const n={...p};if(n[id]){delete n[id];setDuplicates(dp=>{const nd={...dp};delete nd[id];save(n,nd);return nd;});}else{n[id]=true;save(n,duplicates);}return n;});};
  const addD=(id)=>{if(!collected[id])return;setDuplicates(p=>{const n={...p,[id]:(p[id]||0)+1};save(collected,n);return n;});};
  const remD=(id)=>{setDuplicates(p=>{const n={...p};if(n[id]>1)n[id]--;else delete n[id];save(collected,n);return n;});};

  const haveCount=Object.keys(collected).length;
  const dupeCount=Object.values(duplicates).reduce((a,b)=>a+b,0);
  const missCount=TOTAL_STICKERS-haveCount;
  const q=search.trim().toUpperCase();
  const isS=q.length>0;
  const sr=isS?Object.entries(STICKER_LOOKUP).filter(([id,info])=>id.includes(q)||info.country.toUpperCase().includes(q)).map(([id,info])=>({id,...info})):[];
  const isSp=(n)=>n==="Página Inicial"||n==="Coca-Cola"||n==="FIFA History";

  const getMissing=()=>{const g={};Object.entries(GROUPS_DATA).forEach(([gn,teams])=>{Object.entries(teams).forEach(([key,team])=>{getStickerIds(team).forEach(id=>{if(!collected[id]){if(!g[key])g[key]={country:team.country,group:gn,prefix:key,ids:[]};g[key].ids.push(id);}});});});return Object.values(g);};
  const getDupes=()=>Object.entries(duplicates).filter(([,v])=>v>0).map(([id,count])=>{const info=STICKER_LOOKUP[id]||{};return{id,count,country:info.country||"",prefix:info.prefix||""};});

  const shareList=(type)=>{
    let text="";
    if(type==="missing"){text="⚽ FIGURINHAS FALTANTES - Copa 2026\n\n";getMissing().forEach(g=>{text+=FLAGS[g.prefix]+" "+g.country+": "+g.ids.join(", ")+"\n";});text+="\nTotal: "+missCount+" faltando";}
    else{text="🔁 FIGURINHAS REPETIDAS - Copa 2026\n\n";getDupes().forEach(d=>{text+=d.id+" (x"+d.count+") - "+d.country+"\n";});text+="\nTotal: "+dupeCount+" para troca";}
    if(navigator.share){navigator.share({title:"Figurinhas Copa 2026",text});}else{navigator.clipboard.writeText(text).then(()=>alert("Lista copiada!"));}
  };

  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0a0f1a",color:"#fff",fontFamily:"sans-serif"}}><p>Carregando coleção...</p></div>;

  const Chip=(id)=>{const have=!!collected[id];const dc=duplicates[id]||0;return(
    <div key={id} style={{display:"inline-flex",flexDirection:"column",alignItems:"center",margin:3}}>
      <button onClick={()=>toggle(id)} style={{minWidth:54,padding:"6px 5px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",border:have?"1px solid #7c3aed":"1px solid #333",background:have?"#7c3aed":"#1a1a2e",color:have?"#fff":"#666"}}>{id}</button>
      {have&&<div style={{display:"flex",alignItems:"center",gap:2,marginTop:2}}>
        <button onClick={()=>remD(id)} style={{width:22,height:22,borderRadius:"50%",border:"none",background:"#4a1a1a",color:"#f66",cursor:"pointer",fontWeight:700}}>-</button>
        <span style={{fontSize:10,color:"#fa0",fontWeight:700,minWidth:14,textAlign:"center"}}>{dc>0?"+"+dc:""}</span>
        <button onClick={()=>addD(id)} style={{width:22,height:22,borderRadius:"50%",border:"none",background:"#1a3a1a",color:"#4ade80",cursor:"pointer",fontWeight:700}}>+</button>
      </div>}
    </div>);};

  const TB=({k,label,count})=><button onClick={()=>{setTab(k);setActiveGroup(null);}} style={{padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:600,border:tab===k?"1px solid #7c3aed":"1px solid transparent",background:tab===k?"rgba(124,58,237,0.3)":"rgba(255,255,255,0.04)",color:tab===k?"#c4b5fd":"#888",cursor:"pointer"}}>{label}{count!=null&&<span style={{marginLeft:4,opacity:0.7}}>({count})</span>}</button>;

  return(
    <div style={{minHeight:"100vh",background:"#0a0f1a",fontFamily:"sans-serif",color:"#e8eaf0",paddingBottom:40,maxWidth:900,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#1a1147,#7b2fbe)",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:26}}>⚽</span>
          <div><div style={{fontSize:18,fontWeight:700,color:"#fff"}}>COPA 2026</div><div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>FIGURINHAS {haveCount}/{TOTAL_STICKERS} | Repetidas: {dupeCount}</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {saving&&<span style={{fontSize:10,color:"#fa0"}}>Salvando...</span>}
          {user.photoURL&&<img src={user.photoURL} alt="" style={{width:28,height:28,borderRadius:"50%"}} referrerPolicy="no-referrer"/>}
          <button onClick={onLogout} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",padding:"5px 10px",borderRadius:6,fontSize:11,cursor:"pointer"}}>Sair</button>
        </div>
      </div>

      <div style={{padding:"10px 16px",position:"sticky",top:0,zIndex:10,background:"#0a0f1a",borderBottom:"1px solid #222"}}>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar... ex: BRA1, ARG, México" style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid #333",background:"#111",color:"#eee",fontSize:14}}/>
      </div>

      {isS?(
        <div style={{padding:"12px 16px"}}>
          <p style={{fontSize:12,color:"#888",marginBottom:10}}>{sr.length} resultados para "{search}"</p>
          <div style={{display:"flex",flexWrap:"wrap"}}>{sr.slice(0,80).map(r=>Chip(r.id))}</div>
        </div>
      ):(<>
        <div style={{display:"flex",gap:6,padding:"12px 16px 0",flexWrap:"wrap"}}>
          <TB k="groups" label="📋 Grupos" count={null}/>
          <TB k="missing" label="❌ Faltantes" count={missCount}/>
          <TB k="dupes" label="🔁 Repetidas" count={dupeCount}/>
        </div>

        {tab==="groups"&&!activeGroup&&(
          <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
            {Object.keys(GROUPS_DATA).map(gName=>{const teams=GROUPS_DATA[gName];let total=0,have=0;Object.values(teams).forEach(t=>{const ids=getStickerIds(t);total+=ids.length;ids.forEach(id=>{if(collected[id])have++;});});const pct=total?Math.round(have/total*100):0;return(
              <div key={gName} onClick={()=>setActiveGroup(gName)} style={{background:pct===100?"#0a2a0a":"#111",border:pct===100?"1px solid #2a5a2a":"1px solid #222",borderRadius:10,padding:12,cursor:"pointer"}}>
                <div style={{fontWeight:700,fontSize:isSp(gName)?13:18,color:pct===100?"#4ade80":"#fff"}}>{isSp(gName)?gName:"GRUPO "+gName}</div>
                <div style={{fontSize:11,color:"#888",marginTop:4}}>{have}/{total} — {pct}%</div>
                <div style={{height:3,background:"#222",borderRadius:2,marginTop:6}}><div style={{height:"100%",borderRadius:2,width:pct+"%",background:pct===100?"#22c55e":"#7c3aed"}}/></div>
                <div style={{marginTop:6}}>{Object.entries(teams).map(([k])=><span key={k} style={{fontSize:14,marginRight:3}}>{FLAGS[k]||"🏳️"}</span>)}</div>
              </div>);})}
          </div>
        )}

        {tab==="groups"&&activeGroup&&(
          <div style={{padding:"12px 16px"}}>
            <button onClick={()=>setActiveGroup(null)} style={{background:"none",border:"none",color:"#a78bfa",cursor:"pointer",fontSize:14,fontWeight:600,marginBottom:12}}>← Voltar</button>
            <h2 style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:12}}>{isSp(activeGroup)?activeGroup:"GRUPO "+activeGroup}</h2>
            {Object.entries(GROUPS_DATA[activeGroup]).map(([key,team])=>{const ids=getStickerIds(team);const th=ids.filter(id=>collected[id]).length;return(
              <div key={key} style={{background:"#111",borderRadius:10,padding:12,marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <span style={{fontSize:20}}>{FLAGS[key]||"🏳️"}</span>
                  <b style={{color:"#fff"}}>{team.country}</b>
                  <span style={{fontSize:11,color:"#888"}}>{th}/{ids.length}</span>
                  {th===ids.length&&<span>🎉</span>}
                </div>
                <div style={{display:"flex",flexWrap:"wrap"}}>{ids.map(id=>Chip(id))}</div>
              </div>);})}
          </div>
        )}

        {tab==="missing"&&(
          <div style={{padding:"12px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:13,color:"#f87171",fontWeight:600}}>{missCount} figurinhas faltando</span>
              {missCount>0&&<button onClick={()=>shareList("missing")} style={{background:"rgba(59,130,246,0.15)",border:"1px solid rgba(59,130,246,0.3)",color:"#60a5fa",padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer"}}>📤 Compartilhar</button>}
            </div>
            {missCount===0?<div style={{textAlign:"center",padding:40}}><span style={{fontSize:48}}>🏆</span><p style={{color:"#4ade80",fontWeight:700,fontSize:20,marginTop:8}}>ÁLBUM COMPLETO!</p></div>
            :getMissing().map(g=>(
              <div key={g.prefix} style={{background:"#111",borderRadius:10,padding:12,marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <span style={{fontSize:16}}>{FLAGS[g.prefix]||"🏳️"}</span>
                  <span style={{fontWeight:600,fontSize:13,color:"#f87171"}}>{g.country}</span>
                  <span style={{fontSize:11,color:"#888"}}>({g.ids.length})</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap"}}>{g.ids.map(id=>
                  <button key={id} onClick={()=>toggle(id)} style={{margin:3,minWidth:52,padding:"5px 4px",borderRadius:7,fontSize:11,fontWeight:700,background:"rgba(248,113,113,0.08)",color:"#f87171",border:"1px solid rgba(248,113,113,0.2)",cursor:"pointer"}}>{id}</button>
                )}</div>
              </div>
            ))}
          </div>
        )}

        {tab==="dupes"&&(
          <div style={{padding:"12px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:13,color:"#fbbf24",fontWeight:600}}>{dupeCount} figurinha{dupeCount!==1?"s":""} para troca</span>
              {dupeCount>0&&<button onClick={()=>shareList("dupes")} style={{background:"rgba(59,130,246,0.15)",border:"1px solid rgba(59,130,246,0.3)",color:"#60a5fa",padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer"}}>📤 Compartilhar</button>}
            </div>
            {dupeCount===0?<div style={{textAlign:"center",padding:40}}><span style={{fontSize:40}}>📭</span><p style={{color:"#888",marginTop:8}}>Nenhuma repetida ainda</p></div>
            :<div style={{display:"flex",flexWrap:"wrap",gap:8}}>{getDupes().map(d=>(
              <div key={d.id} style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,minWidth:140}}>
                <div><span style={{fontWeight:700,fontSize:14,color:"#fbbf24"}}>{d.id}</span><br/><span style={{fontSize:11,color:"#888"}}>{d.country}</span></div>
                <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
                  <button onClick={()=>remD(d.id)} style={{width:24,height:24,borderRadius:"50%",border:"none",background:"#4a1a1a",color:"#f66",cursor:"pointer",fontWeight:700}}>-</button>
                  <span style={{fontWeight:700,fontSize:14,color:"#fbbf24",minWidth:18,textAlign:"center"}}>{d.count}</span>
                  <button onClick={()=>addD(d.id)} style={{width:24,height:24,borderRadius:"50%",border:"none",background:"#1a3a1a",color:"#4ade80",cursor:"pointer",fontWeight:700}}>+</button>
                </div>
              </div>))}</div>}
          </div>
        )}
      </>)}
    </div>);
}
