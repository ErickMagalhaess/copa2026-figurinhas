import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  GROUPS_DATA, getStickerIds, STICKER_LOOKUP,
  TOTAL_STICKERS, FLAGS,
} from "./data";

export default function StickerManager({ user, onLogout }) {
  const [collected, setCollected] = useState({});
  const [duplicates, setDuplicates] = useState({});
  const [activeGroup, setActiveGroup] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("groups");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "collections", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setCollected(data.collected || {});
          setDuplicates(data.duplicates || {});
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
      setLoading(false);
    })();
  }, [user]);

  const saveTimer = useRef(null);
  const saveToFirestore = useCallback(
    (c, d) => {
      if (!user) return;
      setSaving(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await setDoc(doc(db, "collections", user.uid), {
            collected: c,
            duplicates: d,
            updatedAt: new Date().toISOString(),
            email: user.email,
          });
        } catch (err) {
          console.error("Erro ao salvar:", err);
        }
        setSaving(false);
      }, 500);
    },
    [user]
  );

  const toggleSticker = useCallback(
    (id) => {
      setCollected((prev) => {
        const next = { ...prev };
        if (next[id]) {
          delete next[id];
          setDuplicates((dp) => {
            const nd = { ...dp };
            delete nd[id];
            saveToFirestore(next, nd);
            return nd;
          });
        } else {
          next[id] = true;
          saveToFirestore(next, duplicates);
        }
        return next;
      });
    },
    [duplicates, saveToFirestore]
  );

  const addDuplicate = useCallback(
    (id) => {
      if (!collected[id]) return;
      setDuplicates((prev) => {
        const next = { ...prev, [id]: (prev[id] || 0) + 1 };
        saveToFirestore(collected, next);
        return next;
      });
    },
    [collected, saveToFirestore]
  );

  const removeDuplicate = useCallback(
    (id) => {
      setDuplicates((prev) => {
        const next = { ...prev };
        if (next[id] > 1) next[id]--;
        else delete next[id];
        saveToFirestore(collected, next);
        return next;
      });
    },
    [collected, saveToFirestore]
  );

  const stats = useMemo(() => {
    const have = Object.keys(collected).length;
    const dupeCount = Object.values(duplicates).reduce((a, b) => a + b, 0);
    return { total: TOTAL_STICKERS, have, missing: TOTAL_STICKERS - have, dupeCount };
  }, [collected, duplicates]);

  const groupStats = useMemo(() => {
    const gs = {};
    Object.entries(GROUPS_DATA).forEach(([gName, teams]) => {
      let total = 0, have = 0;
      Object.values(teams).forEach((team) => {
        const ids = getStickerIds(team);
        total += ids.length;
        ids.forEach((id) => { if (collected[id]) have++; });
      });
      gs[gName] = { total, have, pct: total ? Math.round((have / total) * 100) : 0 };
    });
    return gs;
  }, [collected]);

  const missingStickers = useMemo(() => {
    const missing = [];
    Object.entries(GROUPS_DATA).forEach(([gName, teams]) => {
      Object.entries(teams).forEach(([key, team]) => {
        getStickerIds(team).forEach((id) => {
          if (!collected[id])
            missing.push({ id, country: team.country, group: gName, prefix: key });
        });
      });
    });
    return missing;
  }, [collected]);

  const duplicateList = useMemo(() => {
    return Object.entries(duplicates)
      .filter(([, v]) => v > 0)
      .map(([id, count]) => {
        const info = STICKER_LOOKUP[id] || {};
        return { id, count, country: info.country || "", group: info.group || "", prefix: info.prefix || "" };
      });
  }, [duplicates]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toUpperCase();
    const results = [];
    Object.entries(STICKER_LOOKUP).forEach(([id, info]) => {
      if (id.toUpperCase().includes(q) || info.country.toUpperCase().includes(q)) {
        results.push({ id, ...info });
      }
    });
    results.sort((a, b) => {
      const aExact = a.id.toUpperCase().startsWith(q) ? 0 : 1;
      const bExact = b.id.toUpperCase().startsWith(q) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.id.localeCompare(b.id);
    });
    return results;
  }, [search]);

  const handleImport = () => {
    const codes = importText.toUpperCase().match(/[A-Z]{2,4}\d{1,2}/g) || [];
    if (codes.length === 0) return;
    const newCollected = { ...collected };
    const newDupes = { ...duplicates };
    codes.forEach((code) => {
      if (STICKER_LOOKUP[code]) {
        if (newCollected[code]) newDupes[code] = (newDupes[code] || 0) + 1;
        else newCollected[code] = true;
      }
    });
    setCollected(newCollected);
    setDuplicates(newDupes);
    saveToFirestore(newCollected, newDupes);
    setImportText("");
    setShowImport(false);
  };

  const handleReset = async () => {
    if (confirm("Tem certeza que deseja apagar toda a coleção?")) {
      setCollected({});
      setDuplicates({});
      saveToFirestore({}, {});
    }
  };

  const isSearching = search.trim().length > 0;

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0f1a", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" />
        <p style={{ fontSize: 18, opacity: 0.7 }}>Carregando coleção...</p>
      </div>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0f1a; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334; border-radius: 3px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sticker-btn { transition: all 0.15s ease; cursor: pointer; border: none; font-family: 'Oswald', sans-serif; font-weight: 600; letter-spacing: 0.5px; }
        .sticker-btn:hover { transform: scale(1.08); }
        .sticker-btn:active { transform: scale(0.95); }
        .group-card { transition: all 0.2s ease; cursor: pointer; }
        .group-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.4); }
        .tab-btn { transition: all 0.15s ease; cursor: pointer; border: none; }
        .tab-btn:hover { opacity: 1 !important; }
        .dupe-btn { width: 26px; height: 26px; border-radius: 50%; border: none; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; transition: all 0.1s ease; font-size: 15px; }
        .dupe-btn:hover { transform: scale(1.15); }
        .search-input:focus { outline: none; border-color: rgba(124,58,237,0.6) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
      `}</style>
      <div style={{ minHeight: "100vh", background: "linear-gradient(165deg, #0a0f1a 0%, #101829 50%, #0d1422 100%)", fontFamily: "'DM Sans', sans-serif", color: "#e8eaf0", padding: "0 0 40px 0", maxWidth: 900, margin: "0 auto" }}>

        <div style={{ background: "linear-gradient(135deg, #1a1147 0%, #2d1068 40%, #7b2fbe 100%)", padding: "20px 20px 18px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28 }}>⚽</span>
                <div>
                  <h1 style={{ fontFamily: "'Oswald'", fontSize: 22, fontWeight: 700, letterSpacing: 1.5, lineHeight: 1.1, color: "#fff" }}>COPA DO MUNDO 2026</h1>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500, letterSpacing: 2, marginTop: 2 }}>CONTROLE DE FIGURINHAS</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {saving && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24", animation: "spin 1s linear infinite" }} />
                    Salvando...
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {user.photoURL && (
                    <img src={user.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)" }} referrerPolicy="no-referrer" />
                  )}
                  <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.7)", padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'" }}>
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

    <div style={{ padding: "14px 20px", background: "rgba(10,15,26,0.92)", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(14px)" }}>
<div style={{ position: "relative" }}>
<span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 17, opacity: 0.45, pointerEvents: "none" }}>🔍</span>
<input className="search-input" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar figurinha... ex: BRA1, ARG, México" style={{ width: "100%", padding: "12px 40px 12px 42px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e8eaf0", fontSize: 15, fontFamily: "'DM Sans', sans-serif" }} />
{search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "none", color: "#8b8fa3", width: 24, height: 24, borderRadius: "50%", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>}
</div></div>

{isSearching ? (
<div style={{ padding: "16px 20px", animation: "fadeIn 0.2s ease" }}>
<p style={{ fontSize: 13, color: "#8b8fa3", marginBottom: 14 }}>{searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""} para "<span style={{ color: "#c4b5fd" }}>{search}</span>"</p>
{searchResults.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: "#555" }}><span style={{ fontSize: 36, display: "block", marginBottom: 8 }}>🔎</span><p>Nenhuma figurinha encontrada.</p></div> : (() => { const grouped = {}; searchResults.forEach((s) => { const key = `${s.group}|${s.prefix}`; if (!grouped[key]) grouped[key] = { country: s.country, group: s.group, prefix: s.prefix, ids: [] }; grouped[key].ids.push(s.id); }); return Object.values(grouped).map((g) => (<div key={g.group + g.prefix} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14, marginBottom: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ fontSize: 20 }}>{FLAGS[g.prefix] || "🏳️"}</span><div><span style={{ fontFamily: "'Oswald'", fontWeight: 600, fontSize: 15, color: "#fff" }}>{g.country}</span><span style={{ fontSize: 11, color: "#8b8fa3", marginLeft: 8 }}>{isSpecialGroup(g.group) ? g.group : `Grupo ${g.group}`}</span></div></div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{g.ids.map((id) => <StickerChip key={id} id={id} have={!!collected[id]} dupeCount={duplicates[id] || 0} onToggle={toggleSticker} onAddDupe={addDuplicate} onRemoveDupe={removeDuplicate} />)}</div></div>)); })()}</div>
) : (<>
<div style={{ display: "flex", gap: 6, padding: "14px 20px 0", flexWrap: "wrap", alignItems: "center" }}>
{[{ key: "groups", label: "📋 Grupos", count: null }, { key: "missing", label: "❌ Faltantes", count: stats.missing }, { key: "duplicates", label: "🔁 Repetidas", count: stats.dupeCount }].map((t) => <button key={t.key} className="tab-btn" onClick={() => { setView(t.key); setActiveGroup(null); }} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans'", background: view === t.key ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.04)", color: view === t.key ? "#c4b5fd" : "#8b8fa3", border: view === t.key ? "1px solid rgba(124,58,237,0.4)" : "1px solid transparent" }}>{t.label}{t.count !== null && <span style={{ marginLeft: 6, opacity: 0.7 }}>({t.count})</span>}</button>)}
<div style={{ flex: 1 }} />
<button className="tab-btn" onClick={() => setShowImport(!showImport)} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans'", background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" }}>📥 Importar</button>
<button className="tab-btn" onClick={handleReset} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans'", background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}>🗑️</button></div>

{showImport && <div style={{ padding: "12px 20px", animation: "fadeIn 0.2s ease" }}><div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 12, padding: 16 }}><p style={{ fontSize: 13, color: "#93c5fd", marginBottom: 8 }}>Cole os códigos das figurinhas (ex: BRA1, BRA2, ARG5).</p><textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="BRA1, BRA2, ARG5, FRA10..." style={{ width: "100%", height: 70, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10, color: "#e8eaf0", fontSize: 13, fontFamily: "'DM Sans'", resize: "vertical" }} /><button onClick={handleImport} style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", background: "#3b82f6", color: "#fff", fontWeight: 600, fontSize: 13, fontFamily: "'DM Sans'" }}>Adicionar figurinhas</button></div></div>}

<div style={{ padding: "16px 20px" }}>
{view === "groups" && !activeGroup && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10, animation: "fadeIn 0.3s ease" }}>{Object.keys(GROUPS_DATA).map((gName, i) => { const gs = groupStats[gName]; return (<div key={gName} className="group-card" onClick={() => setActiveGroup(gName)} style={{ background: gs.pct === 100 ? "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))" : "rgba(255,255,255,0.03)", border: gs.pct === 100 ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px", animationDelay: `${i * 30}ms`, animation: "slideUp 0.3s ease both" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{ fontFamily: "'Oswald'", fontWeight: 700, fontSize: isSpecialGroup(gName) ? 14 : 22, color: gs.pct === 100 ? "#4ade80" : "#fff", letterSpacing: isSpecialGroup(gName) ? 0 : 2 }}>{isSpecialGroup(gName) ? gName : `GRUPO ${gName}`}</span>{gs.pct === 100 && <span style={{ fontSize: 18 }}>✅</span>}</div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8b8fa3", marginBottom: 6 }}><span>{gs.have}/{gs.total}</span><span style={{ color: gs.pct === 100 ? "#4ade80" : "#a78bfa", fontWeight: 600 }}>{gs.pct}%</span></div><div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, transition: "width 0.4s ease", width: `${gs.pct}%`, background: gs.pct === 100 ? "#22c55e" : "#7c3aed" }} /></div><div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>{Object.entries(GROUPS_DATA[gName]).map(([key, team]) => <span key={key} style={{ fontSize: 16 }} title={team.country}>{FLAGS[key] || "🏳️"}</span>)}</div></div>); })}</div>}

{view === "groups" && activeGroup && <div style={{ animation: "fadeIn 0.25s ease" }}><button onClick={() => setActiveGroup(null)} style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans'", fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>← Voltar aos grupos</button><h2 style={{ fontFamily: "'Oswald'", fontSize: 22, fontWeight: 700, letterSpacing: 1, marginBottom: 16, color: "#fff" }}>{isSpecialGroup(activeGroup) ? activeGroup : `GRUPO ${activeGroup}`}</h2>{Object.entries(GROUPS_DATA[activeGroup]).map(([key, team]) => { const ids = getStickerIds(team); const teamHave = ids.filter((id) => collected[id]).length; return (<div key={key} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 24 }}>{FLAGS[key] || "🏳️"}</span><div><h3 style={{ fontFamily: "'Oswald'", fontSize: 17, fontWeight: 600, color: "#fff" }}>{team.country}</h3><span style={{ fontSize: 12, color: "#8b8fa3" }}>{teamHave}/{ids.length} figurinhas</span></div></div>{teamHave === ids.length && <span style={{ fontSize: 20 }}>🎉</span>}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{ids.map((id) => <StickerChip key={id} id={id} have={!!collected[id]} dupeCount={duplicates[id] || 0} onToggle={toggleSticker} onAddDupe={addDuplicate} onRemoveDupe={removeDuplicate} />)}</div></div>); })}</div>}

{view === "missing" && <div style={{ animation: "fadeIn 0.25s ease" }}>{stats.missing === 0 ? <div style={{ textAlign: "center", padding: 40 }}><span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>🏆</span><p style={{ fontFamily: "'Oswald'", fontSize: 22, color: "#4ade80" }}>ÁLBUM COMPLETO!</p></div> : (() => { const grouped = {}; missingStickers.forEach((s) => { const key = `${s.group}|${s.country}`; if (!grouped[key]) grouped[key] = { country: s.country, group: s.group, prefix: s.prefix, ids: [] }; grouped[key].ids.push(s.id); }); return Object.values(grouped).map((g) => <div key={g.group + g.country} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><span style={{ fontSize: 16 }}>{FLAGS[g.prefix] || "🏳️"}</span><span style={{ fontFamily: "'Oswald'", fontWeight: 600, fontSize: 14, color: "#f87171" }}>{g.country}</span><span style={{ fontSize: 11, color: "#8b8fa3" }}>({g.ids.length})</span></div><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{g.ids.map((id) => <button key={id} className="sticker-btn" onClick={() => toggleSticker(id)} style={{ minWidth: 52, padding: "6px 5px", borderRadius: 7, fontSize: 11, background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>{id}</button>)}</div></div>); })()}</div>}

{view === "duplicates" && <div style={{ animation: "fadeIn 0.25s ease" }}>{stats.dupeCount === 0 ? <div style={{ textAlign: "center", padding: 40 }}><span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>📭</span><p style={{ color: "#8b8fa3" }}>Nenhuma figurinha repetida ainda.</p></div> : <><p style={{ fontSize: 13, color: "#fbbf24", marginBottom: 12, fontWeight: 600 }}>{stats.dupeCount} figurinha{stats.dupeCount > 1 ? "s" : ""} repetida{stats.dupeCount > 1 ? "s" : ""} para troca</p><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{duplicateList.map((d) => <div key={d.id} style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, minWidth: 140 }}><div><span style={{ fontFamily: "'Oswald'", fontWeight: 700, fontSize: 14, color: "#fbbf24" }}>{d.id}</span><br /><span style={{ fontSize: 11, color: "#8b8fa3" }}>{d.country}</span></div><div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}><button className="dupe-btn" onClick={() => removeDuplicate(d.id)} style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>−</button><span style={{ fontFamily: "'Oswald'", fontWeight: 700, fontSize: 16, color: "#fbbf24", minWidth: 20, textAlign: "center" }}>{d.count}</span><button className="dupe-btn" onClick={() => addDuplicate(d.id)} style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}>+</button></div></div>)}</div></>}</div>}
</div></>)}</div></> ); }

function StickerChip({ id, have, dupeCount, onToggle, onAddDupe, onRemoveDupe }) {
  return (<div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
    <button className="sticker-btn" onClick={() => onToggle(id)} style={{ minWidth: 56, padding: "7px 6px", borderRadius: 8, fontSize: 12, background: have ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "rgba(255,255,255,0.04)", color: have ? "#fff" : "#555", border: have ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.08)", boxShadow: have ? "0 2px 8px rgba(124,58,237,0.3)" : "none" }}>{id}</button>
    {have && <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 3 }}>
      <button className="dupe-btn" onClick={() => onRemoveDupe(id)} style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", fontSize: 13 }}>−</button>
      <span style={{ fontSize: 10, color: dupeCount > 0 ? "#fbbf24" : "#555", fontWeight: 700, minWidth: 14, textAlign: "center" }}>{dupeCount > 0 ? `+${dupeCount}` : ""}</span>
      <button className="dupe-btn" onClick={() => onAddDupe(id)} style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80", fontSize: 13 }}>+</button>
    </div>}
  </div>);
}
