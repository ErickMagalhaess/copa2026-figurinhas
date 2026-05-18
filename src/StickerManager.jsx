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

        <div style={{ padding: "14px 20px", background: "rgba(10,15,26,0.92)", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 17, opacity: 0.45, pointerEvents: "none" }}>🔍</span>
            <input className="search-input" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar figurinha... ex: BRA1, ARG, México"
              style={{ width: "100%", padding: "12px 40px 12px 42px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05
