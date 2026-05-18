import { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import StickerManager from "./StickerManager";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
        signInWithRedirect(auth, googleProvider);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={styles.spinner} />
        <p style={{ color: "#8b8fa3", marginTop: 16, fontSize: 15 }}>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes fadeIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
          @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        `}</style>
        <div style={styles.loginScreen}>
          <div style={styles.loginCard}>
            <span style={{ fontSize: 64, display: "block", animation: "float 3s ease-in-out infinite" }}>⚽</span>
            <h1 style={styles.loginTitle}>COPA DO MUNDO 2026</h1>
            <p style={styles.loginSubtitle}>CONTROLE DE FIGURINHAS</p>
            <p style={styles.loginDesc}>
              Gerencie sua coleção de figurinhas. Faça login para salvar seu progresso de forma segura.
            </p>
            <button onClick={handleLogin} style={styles.googleBtn}>
              <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              Entrar com Google
            </button>
          </div>
        </div>
      </>
    );
  }

  return <StickerManager user={user} onLogout={handleLogout} />;
}

const styles = {
  loadingScreen: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    height: "100vh", background: "#0a0f1a", fontFamily: "'DM Sans', sans-serif",
  },
  spinner: {
    width: 36, height: 36, border: "3px solid rgba(255,255,255,0.1)",
    borderTopColor: "#7c3aed", borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loginScreen: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "100vh", padding: 20,
    background: "linear-gradient(165deg, #0a0f1a 0%, #101829 50%, #0d1422 100%)",
    fontFamily: "'DM Sans', sans-serif",
  },
  loginCard: {
    textAlign: "center", padding: "48px 32px", maxWidth: 380, width: "100%",
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20, animation: "fadeIn 0.5s ease",
  },
  loginTitle: {
    fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700,
    letterSpacing: 2, color: "#fff", marginTop: 16,
  },
  loginSubtitle: {
    fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500,
    letterSpacing: 3, marginTop: 4,
  },
  loginDesc: {
    fontSize: 14, color: "#8b8fa3", marginTop: 20, lineHeight: 1.5,
  },
  googleBtn: {
    marginTop: 28, padding: "14px 28px", borderRadius: 12, border: "none",
    background: "#fff", color: "#333", fontSize: 15, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 10,
    transition: "all 0.2s ease", boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
  },
};
