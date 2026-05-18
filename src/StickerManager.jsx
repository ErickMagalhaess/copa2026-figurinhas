export default function StickerManager({ user, onLogout }) {
  return (
    <div style={{padding: 40, background: "#0a0f1a", minHeight: "100vh", color: "#fff", fontFamily: "sans-serif"}}>
      <h1>Funcionou!</h1>
      <p>Logado como: {user.email}</p>
      <button onClick={onLogout} style={{marginTop: 20, padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer"}}>Sair</button>
    </div>
  );
}
