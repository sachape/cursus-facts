/**
 * Styles partagés des emails d'authentification.
 *
 * Les clients de messagerie ne chargent pas nos polices ni nos variables CSS :
 * tout est en valeurs littérales, volontairement. La charte est reprise dans
 * son esprit — sobre, contrastée, sans ornement — pas dans ses tokens.
 */
export const main = {
  backgroundColor: "#faf9f7",
  fontFamily: "Geist, -apple-system, Segoe UI, Helvetica, Arial, sans-serif",
};

export const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e6e3de",
  borderRadius: "12px",
  margin: "32px auto",
  maxWidth: "520px",
  padding: "32px",
};

export const marque = {
  fontSize: "13px",
  fontWeight: 600 as const,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#111111",
  margin: "0 0 24px",
  textDecoration: "none",
};

export const h1 = {
  fontSize: "22px",
  fontWeight: 700 as const,
  color: "#111111",
  margin: "0 0 20px",
  lineHeight: "1.3",
};

export const text = {
  fontSize: "14px",
  color: "#4a4a4a",
  lineHeight: "1.6",
  margin: "0 0 20px",
};

export const link = { color: "#111111", textDecoration: "underline" };

export const button = {
  backgroundColor: "#111111",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 500 as const,
  borderRadius: "8px",
  padding: "12px 20px",
  textDecoration: "none",
  display: "inline-block",
};

export const code = {
  fontFamily: "DM Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "28px",
  letterSpacing: "0.2em",
  color: "#111111",
  backgroundColor: "#f4f2ef",
  border: "1px solid #e6e3de",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

export const footer = {
  fontSize: "12px",
  color: "#8a8a8a",
  lineHeight: "1.6",
  margin: "28px 0 0",
};
