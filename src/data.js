export const GROUPS_DATA = {
  "Página Inicial": {
    FWC: { prefix: "FWC", country: "FIFA World Cup", count: 19, start: 1, hasZero: true },
  },
  A: {
    MEX: { prefix: "MEX", country: "México", count: 20 },
    RSA: { prefix: "RSA", country: "África do Sul", count: 20 },
    KOR: { prefix: "KOR", country: "Coreia do Sul", count: 20 },
    CZE: { prefix: "CZE", country: "Rep. Tcheca", count: 20 },
  },
  B: {
    CAN: { prefix: "CAN", country: "Canadá", count: 20 },
    BIH: { prefix: "BIH", country: "Bósnia", count: 20 },
    QAT: { prefix: "QAT", country: "Catar", count: 20 },
    SUI: { prefix: "SUI", country: "Suíça", count: 20 },
  },
  C: {
    BRA: { prefix: "BRA", country: "Brasil", count: 20 },
    MAR: { prefix: "MAR", country: "Marrocos", count: 20 },
    HAI: { prefix: "HAI", country: "Haiti", count: 20 },
    SCO: { prefix: "SCO", country: "Escócia", count: 20 },
  },
  D: {
    USA: { prefix: "USA", country: "Estados Unidos", count: 20 },
    PAR: { prefix: "PAR", country: "Paraguai", count: 20 },
    AUS: { prefix: "AUS", country: "Austrália", count: 20 },
    TUR: { prefix: "TUR", country: "Turquia", count: 20 },
  },
  E: {
    GER: { prefix: "GER", country: "Alemanha", count: 20 },
    CUW: { prefix: "CUW", country: "Curaçao", count: 20 },
    CIV: { prefix: "CIV", country: "Costa do Marfim", count: 20 },
    ECU: { prefix: "ECU", country: "Equador", count: 20 },
  },
  F: {
    NED: { prefix: "NED", country: "Holanda", count: 20 },
    JPN: { prefix: "JPN", country: "Japão", count: 20 },
    SWE: { prefix: "SWE", country: "Suécia", count: 20 },
    TUN: { prefix: "TUN", country: "Tunísia", count: 20 },
  },
  G: {
    BEL: { prefix: "BEL", country: "Bélgica", count: 20 },
    EGY: { prefix: "EGY", country: "Egito", count: 20 },
    IRN: { prefix: "IRN", country: "Irã", count: 20 },
    NZL: { prefix: "NZL", country: "Nova Zelândia", count: 20 },
  },
  H: {
    ESP: { prefix: "ESP", country: "Espanha", count: 20 },
    CPV: { prefix: "CPV", country: "Cabo Verde", count: 20 },
    KSA: { prefix: "KSA", country: "Arábia Saudita", count: 20 },
    URU: { prefix: "URU", country: "Uruguai", count: 20 },
  },
  I: {
    FRA: { prefix: "FRA", country: "França", count: 20 },
    SEN: { prefix: "SEN", country: "Senegal", count: 20 },
    IRQ: { prefix: "IRQ", country: "Iraque", count: 20 },
    NOR: { prefix: "NOR", country: "Noruega", count: 20 },
  },
  J: {
    ARG: { prefix: "ARG", country: "Argentina", count: 20 },
    ALG: { prefix: "ALG", country: "Argélia", count: 20 },
    AUT: { prefix: "AUT", country: "Áustria", count: 20 },
    JOR: { prefix: "JOR", country: "Jordânia", count: 20 },
  },
  K: {
    POR: { prefix: "POR", country: "Portugal", count: 20 },
    COD: { prefix: "COD", country: "Congo", count: 20 },
    UZB: { prefix: "UZB", country: "Uzbequistão", count: 20 },
    COL: { prefix: "COL", country: "Colômbia", count: 20 },
  },
  L: {
    ENG: { prefix: "ENG", country: "Inglaterra", count: 20 },
    CRO: { prefix: "CRO", country: "Croácia", count: 20 },
    GHA: { prefix: "GHA", country: "Gana", count: 20 },
    PAN: { prefix: "PAN", country: "Panamá", count: 20 },
  },
  "Coca-Cola": {
    CC: { prefix: "CC", country: "Coca-Cola", count: 14 },
  },
  "FIFA History": {
    FWC_H: { prefix: "FWC", country: "Fifa World Cup History", count: 20, historyRange: true },
  },
};

export function getStickerIds(team) {
  const ids = [];
  if (team.hasZero) ids.push(`${team.prefix}00`);
  const start = team.start || 1;
  for (let i = start; i <= team.count; i++) ids.push(`${team.prefix}${i}`);
  return ids;
}

export const STICKER_LOOKUP = {};
export let TOTAL_STICKERS = 0;
Object.entries(GROUPS_DATA).forEach(([gName, teams]) => {
  Object.entries(teams).forEach(([key, team]) => {
    getStickerIds(team).forEach((id) => {
      STICKER_LOOKUP[id] = { country: team.country, group: gName, prefix: key };
      TOTAL_STICKERS++;
    });
  });
});

export const FLAGS = {
  MEX: "🇲🇽", RSA: "🇿", KOR: "🇰🇷", CZE: "🇨🇿", CAN: "🇨🇦", BIH: "🇧🇦",
  QAT: "🇶🇦", SUI: "🇨🇭", BRA: "🇧🇷", MAR: "🇲🇦", HAI: "🇭🇹", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  USA: "🇺🇸", PAR: "🇵🇾", AUS: "🇦🇺", TUR: "🇹🇷", GER: "🇩🇪", CUW: "🇨🇼",
  CIV: "🇨🇮", ECU: "🇪🇨", NED: "🇳🇱", JPN: "🇯🇵", SWE: "🇸🇪", TUN: "🇹🇳",
  BEL: "🇧🇪", EGY: "🇪🇬", IRN: "🇮🇷", NZL: "🇳🇿", ESP: "🇪", CPV: "🇨🇻",
  KSA: "🇸🇦", URU: "🇺🇾", FRA: "🇫🇷", SEN: "🇸🇳", IRQ: "🇮🇶", NOR: "🇳🇴",
  ARG: "🇦🇷", ALG: "🇩🇿", AUT: "🇦", JOR: "🇯🇴", POR: "🇵🇹", COD: "🇨🇩",
  UZB: "🇺🇿", COL: "🇨", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", CRO: "🇭🇷", GHA: "🇬🇭", PAN: "🇵🇦",
  FWC: "🏆", CC: "🥤", FWC_H: "📜",
};
