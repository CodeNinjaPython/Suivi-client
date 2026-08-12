// =====================================================================
// Notifications client — Supabase Edge Function (Deno) — envoi via RESEND
// Déclenchée par un Database Webhook sur UPDATE de la table `projects`.
//
// Trois déclencheurs, et trois seulement : une étape FRANCHIE VERS L'AVANT, un
// projet marqué livré, un client qui vient de donner son email. Reculer d'une
// étape ne déclenche rien : c'est une correction d'erreur, pas une nouvelle.
//
// L'email reprend la charte de la page client correspondante (colonne `style`) :
//   prismae → bleu nuit / accent bleu électrique (suivi.html)
//   studio  → noir cinéma / or (suivi-studio.html)
//   mariage → papier ivoire / or gravé (suivi-mariage.html)
// Markup en tableaux + styles en ligne pour rendre correctement partout
// (Gmail, Apple Mail, Outlook). Les dégradés et border-radius dégradent
// proprement sur Outlook Windows (couleur pleine, angles droits).
//
// Polices : un thème peut déclarer des @font-face (champ `fontFace`). Les fichiers
// sont servis depuis SITE_URL (Vercel renvoie `access-control-allow-origin: *`, ce
// que réclament les webviews des clients mail ; le domaine jourjstudio.com, lui,
// n'envoie pas cet en-tête). Apple Mail / Mail iOS les chargent ; Gmail et Outlook
// Windows ignorent @font-face → la pile de repli de chaque `font-family` prend le
// relais, donc elle doit rester présentable seule.
//
// Expéditeur sur le domaine vérifié chez Resend (jourjstudio.com)
// → bonne délivrabilité (SPF/DKIM alignés), pas de spam.
//
// Secrets : RESEND_API_KEY, SENDER_EMAIL (défaut site@jourjstudio.com),
//           SENDER_NAME, SITE_URL, WEBHOOK_SECRET
// =====================================================================

const MONTHS = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// =====================================================================
// Thèmes — un jeu de jetons par style, calqué sur les pages client
// =====================================================================
type Theme = {
  scheme: "dark" | "light";
  pageBg: string;        // couleur pleine (repli Outlook)
  pageBgImage: string;   // décor (halos/dégradé) ignoré par Outlook
  card: string;
  cardBorder: string;
  cardRadius: string;
  cardShadow: string;
  heading: string;
  body: string;
  muted: string;
  accent: string;
  accentSoft: string;
  track: string;         // fond de la barre de progression
  rule: string;          // filets
  footerBg: string;
  fontHead: string;
  fontBody: string;
  fontLabel: string;     // petites capitales / mono / gravé
  labelWeight: string;   // graisse des labels (400 si la police n'a qu'un seul gras)
  labelWordSpacing: string; // chasse de l'espace pour fontLabel ("normal" par défaut)
  fontFace: string;      // @font-face du thème ({BASE} = SITE_URL), "" = aucune
  headSize: string;
  headWeight: string;
  headSpacing: string;
  labelSpacing: string;
  brandFont: string;
  brandSize: string;
  brandColor: string;
  brandSpacing: string;
  brandTransform: string;
  logoRadius: string;
  logoBorder: string;
  eyebrowPill: boolean;  // pastille arrondie (prismae) ou simple label
  btnBg: string;
  btnBgImage: string;
  btnText: string;
  btnRadius: string;
  btnSpacing: string;
  btnTransform: string;
  btnSize: string;
  ornament: string;      // caractère du séparateur ("" = filet simple)
  logoFile: string;      // fichier servi depuis SITE_URL
};

const THEMES: Record<string, Theme> = {
  // ---- PRISMAE : bleu nuit, accent bleu électrique, Syne / Manrope / DM Mono
  prismae: {
    scheme: "dark",
    pageBg: "#07090c",
    pageBgImage: "radial-gradient(600px 320px at 85% -10%, rgba(59,155,255,.16), transparent 70%), linear-gradient(180deg,#0b0f15 0%,#07090c 60%)",
    card: "#12161d",
    cardBorder: "rgba(244,241,236,.10)",
    cardRadius: "18px",
    cardShadow: "0 24px 60px rgba(0,0,0,.45)",
    heading: "#f4f1ec",
    body: "#a3a8b2",
    muted: "#6b7280",
    accent: "#3b9bff",
    accentSoft: "#9ecbff",
    track: "rgba(244,241,236,.10)",
    rule: "rgba(244,241,236,.08)",
    footerBg: "#0e1218",
    fontHead: "'Syne','Helvetica Neue',Helvetica,Arial,sans-serif",
    fontBody: "'Manrope','Helvetica Neue',Helvetica,Arial,sans-serif",
    fontLabel: "'DM Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
    labelWeight: "700",
    labelWordSpacing: "normal",
    fontFace: "",
    headSize: "23px",
    headWeight: "700",
    headSpacing: "-.02em",
    labelSpacing: ".14em",
    brandFont: "'Syne','Helvetica Neue',Helvetica,Arial,sans-serif",
    brandSize: "17px",
    brandColor: "#f4f1ec",
    brandSpacing: "-.01em",
    brandTransform: "none",
    logoRadius: "10px",
    logoBorder: "1px solid rgba(244,241,236,.10)",
    eyebrowPill: true,
    btnBg: "#3b9bff",
    btnBgImage: "linear-gradient(180deg,#57a9ff 0%,#3b9bff 100%)",
    btnText: "#04121f",
    btnRadius: "999px",
    btnSpacing: ".06em",
    btnTransform: "none",
    btnSize: "15px",
    ornament: "",
    logoFile: "icon-192.png",
  },

  // ---- STUDIO : noir cinéma, or, Playfair / DM Mono
  studio: {
    scheme: "dark",
    pageBg: "#0a0a0a",
    pageBgImage: "radial-gradient(620px 300px at 50% -12%, rgba(201,162,74,.14), transparent 72%), #0a0a0a",
    card: "#141414",
    cardBorder: "#2a2a2a",
    cardRadius: "4px",
    cardShadow: "0 24px 60px rgba(0,0,0,.55)",
    heading: "#efe8d8",
    body: "#9e968a",
    muted: "#6b6b6b",
    accent: "#c9a24a",
    accentSoft: "#e0c483",
    track: "rgba(239,232,216,.10)",
    rule: "#2a2a2a",
    footerBg: "#0f0f0f",
    fontHead: "'Playfair Display',Georgia,'Times New Roman',serif",
    fontBody: "'DM Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
    fontLabel: "'DM Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
    labelWeight: "700",
    labelWordSpacing: "normal",
    fontFace: "",
    headSize: "26px",
    headWeight: "400",
    headSpacing: "0",
    labelSpacing: ".3em",
    brandFont: "'DM Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
    brandSize: "12px",
    brandColor: "#c9a24a",
    brandSpacing: ".3em",
    brandTransform: "uppercase",
    logoRadius: "2px",
    logoBorder: "1px solid #2a2a2a",
    eyebrowPill: false,
    btnBg: "#c9a24a",
    btnBgImage: "linear-gradient(180deg,#d8b45f 0%,#c9a24a 100%)",
    btnText: "#0a0a0a",
    btnRadius: "3px",
    btnSpacing: ".18em",
    btnTransform: "uppercase",
    btnSize: "12px",
    ornament: "",
    logoFile: "icon-192.png",
  },

  // ---- MARIAGE : papier ivoire, or gravé, polices du site jourjstudio.com
  //      (Open Heart en script, Reem Kufi Ink pour les labels et le bouton)
  mariage: {
    scheme: "light",
    pageBg: "#f4f2ee",
    pageBgImage: "radial-gradient(520px 300px at 12% -6%, rgba(184,139,54,.16), transparent 70%), radial-gradient(460px 260px at 92% 4%, rgba(87,43,46,.08), transparent 70%), linear-gradient(180deg,#ffffff 0%,#f7f7f7 44%,#f1efea 100%)",
    card: "#ffffff",
    cardBorder: "rgba(45,36,24,.14)",
    cardRadius: "18px",
    cardShadow: "0 22px 70px rgba(63,42,16,.10)",
    heading: "#2d2418",
    body: "#6f5b40",
    muted: "#9b8664",
    accent: "#b88b36",
    accentSoft: "#7b5618",
    track: "rgba(45,36,24,.10)",
    rule: "rgba(45,36,24,.12)",
    footerBg: "#faf8f4",
    fontHead: "Georgia,'Palatino Linotype',Palatino,'Times New Roman',serif",
    fontBody: "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif",
    fontLabel: "'Reem Kufi Ink',Copperplate,'Copperplate Gothic Light','Trebuchet MS',Georgia,serif",
    // Reem Kufi Ink n'existe qu'en 400 : demander 700 déclencherait un faux gras
    // baveux sur une police à texture. On garde 400 et on joue sur l'interlettrage.
    labelWeight: "400",
    // Police dessinée d'abord pour l'arabe : son espace latin fait 0,13 em, contre
    // 0,25-0,30 em pour une latine. On rattrape la chasse comme sur le site.
    labelWordSpacing: ".14em",
    fontFace: `@font-face{font-family:'Open Heart';font-style:normal;font-weight:400;font-display:swap;src:url('{BASE}/assets/fonts/OpenHeart.woff2') format('woff2');}`
      + `@font-face{font-family:'Reem Kufi Ink';font-style:normal;font-weight:400;font-display:swap;src:url('{BASE}/assets/fonts/ReemKufiInk.woff2') format('woff2');}`,
    headSize: "24px",
    headWeight: "400",
    headSpacing: ".005em",
    labelSpacing: ".22em",
    brandFont: "'Open Heart','Snell Roundhand','Apple Chancery','Segoe Script',Georgia,serif",
    brandSize: "30px",
    brandColor: "#2d2418",
    brandSpacing: "0",
    brandTransform: "none",
    logoRadius: "10px",
    logoBorder: "1px solid rgba(184,139,54,.35)",
    eyebrowPill: false,
    btnBg: "#c99a3c",
    btnBgImage: "linear-gradient(112deg,#9a6e1e 0%,#c39536 28%,#f0d28a 52%,#bd8d35 74%,#8a6018 100%)",
    btnText: "#2a1e0a",
    btnRadius: "999px",
    btnSpacing: ".16em",
    btnTransform: "uppercase",
    btnSize: "12px",
    ornament: "&#10022;",
    logoFile: "logo-jourj.png",
  },
};

// Bouton : table + <a> (rendu correct jusque dans Outlook)
function button(t: Theme, href: string, label: string, ghost = false): string {
  const bg = ghost ? "transparent" : t.btnBg;
  const bgImg = ghost ? "none" : t.btnBgImage;
  const color = ghost ? t.accent : t.btnText;
  const border = ghost ? `border:1px solid ${t.accent};` : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td${ghost ? "" : ` bgcolor="${t.btnBg}"`} style="background-color:${bg};background-image:${bgImg};border-radius:${t.btnRadius};${border}">
      <a href="${href}" style="display:inline-block;padding:14px 30px;font-family:${t.fontLabel};font-size:${t.btnSize};font-weight:${t.labelWeight};letter-spacing:${t.btnSpacing};word-spacing:${t.labelWordSpacing};text-transform:${t.btnTransform};color:${color};text-decoration:none;">${label}</a>
    </td>
  </tr></table>`;
}

// Barre de progression segmentée = rappel de la timeline "table de montage"
function progress(t: Theme, cur: number, total: number, done: boolean): string {
  if (total < 2) return "";
  const cells: string[] = [];
  for (let i = 0; i < total; i++) {
    const filled = done || i <= cur;
    cells.push(`<td height="5" style="height:5px;line-height:5px;font-size:0;background-color:${filled ? t.accent : t.track};border-radius:3px;">&nbsp;</td>`);
    if (i < total - 1) cells.push(`<td width="4" style="width:4px;font-size:0;line-height:5px;">&nbsp;</td>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;"><tr>${cells.join("")}</tr></table>`;
}

// Séparateur : filet simple, ou filets + ornement doré (mariage)
function divider(t: Theme): string {
  if (!t.ornament) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${t.rule};">&nbsp;</td>
    </tr></table>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${t.rule};">&nbsp;</td>
    <td width="34" align="center" style="width:34px;font-family:${t.fontLabel};font-size:12px;color:${t.accent};line-height:1;">${t.ornament}</td>
    <td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${t.rule};">&nbsp;</td>
  </tr></table>`;
}

Deno.serve(async (req) => {
  const expected = Deno.env.get("WEBHOOK_SECRET");
  if (expected && req.headers.get("x-webhook-secret") !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }

  if (body.type !== "UPDATE" || body.table !== "projects") {
    return new Response("ignored", { status: 200 });
  }
  const p = body.record || {};
  const old = body.old_record || {};

  if (!p.client_email) return new Response("no email", { status: 200 });

  const steps: string[] = Array.isArray(p.steps) ? p.steps : [];
  const justDelivered = p.delivered === true && old.delivered !== true;
  // On ne prévient QUE sur une avancée. Revenir en arrière est une correction
  // d'erreur de l'admin : envoyer alors un « Nouvelle étape » annonçant une étape
  // déjà passée sèmerait le doute chez le client. Le retour se fait en silence.
  const stepForward = Number(p.current_step ?? 0) > Number(old.current_step ?? 0);
  // Le client vient de renseigner son email (porte email) → email de confirmation d'inscription.
  const justSubscribed = !old.client_email && !!p.client_email;
  if (!justDelivered && !stepForward && !justSubscribed) return new Response("no change", { status: 200 });

  const SITE_URL = (Deno.env.get("SITE_URL") || "https://suivi-client.vercel.app").replace(/\/$/, "");
  const link = `${SITE_URL}/suivi.html?p=${encodeURIComponent(p.public_token)}`;
  const studio = esc(p.studio_name || "Studio");
  const title = esc(p.project_title || "votre projet");
  const total = steps.length;
  const cur = Math.min(p.current_step ?? 0, Math.max(total - 1, 0));
  const stepName = esc(steps[cur] || "");

  // Le thème de l'email suit le style de la page client du projet.
  const style = p.style === "studio" || p.style === "mariage" ? p.style : "prismae";
  const t = THEMES[style];
  // Logo de la marque : le « J » Jour J pour le mariage, le triangle PRISMAE sinon.
  const logo = `${SITE_URL}/${t.logoFile}`;
  const isStudio = style === "studio";
  const isMariage = style === "mariage";

  // Lien d'avis Google (optionnel) : par marque (style) avec repli sur REVIEW_URL
  const reviewUrl = (isStudio ? Deno.env.get("REVIEW_URL_STUDIO")
      : isMariage ? Deno.env.get("REVIEW_URL_MARIAGE")
      : Deno.env.get("REVIEW_URL_PRISMAE"))
    || Deno.env.get("REVIEW_URL") || "";

  const subject = justSubscribed
    ? `Suivi activé — ${p.project_title || p.client_name || "votre suivi"}`
    : justDelivered
    ? `Votre projet est livré — ${p.project_title}`
    : `Nouvelle étape : ${steps[cur] || ""} — ${p.project_title}`;

  const eyebrow = justSubscribed ? "Suivi activé" : justDelivered ? "Projet livré" : `Étape ${cur + 1} / ${total}`;
  const accentSpan = `font-family:${t.fontHead};color:${t.accent};${isMariage ? "font-style:italic;" : ""}`;
  const heading = justSubscribed
    ? `C'est noté&nbsp;! Vous serez prévenu(e) par email à chaque nouvelle étape de votre projet.`
    : justDelivered
    ? `Votre projet «&nbsp;${title}&nbsp;» est <span style="${accentSpan}">livré</span>.`
    : `Votre projet «&nbsp;${title}&nbsp;» avance&nbsp;: <span style="${accentSpan}">${stepName}</span>.`;

  // Texte d'aperçu (inbox) — invisible dans le corps du message
  const preheader = esc(justSubscribed
    ? "Votre suivi est activé : vous serez prévenu(e) à chaque étape."
    : justDelivered
    ? "Votre livraison est disponible."
    : `Étape ${cur + 1} sur ${total} : ${steps[cur] || ""}`);

  // Pastille (prismae) ou label gravé/mono (studio, mariage) pour l'eyebrow
  const eyebrowHtml = t.eyebrowPill
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#0f2033" style="background-color:rgba(59,155,255,.12);border-radius:999px;padding:7px 14px;font-family:${t.fontLabel};font-size:11px;font-weight:${t.labelWeight};letter-spacing:${t.labelSpacing};word-spacing:${t.labelWordSpacing};text-transform:uppercase;color:${t.accentSoft};">${eyebrow}</td>
      </tr></table>`
    : `<p style="margin:0;font-family:${t.fontLabel};font-size:11px;font-weight:${t.labelWeight};letter-spacing:${t.labelSpacing};word-spacing:${t.labelWordSpacing};text-transform:uppercase;color:${isMariage ? t.accentSoft : t.accent};">${eyebrow}</p>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="${t.scheme}">
<meta name="supported-color-schemes" content="${t.scheme}">
<title>${esc(subject)}</title>
${t.fontFace ? `<style>${t.fontFace.replaceAll("{BASE}", SITE_URL)}</style>` : ""}
</head>
<body style="margin:0;padding:0;background-color:${t.pageBg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.pageBg}" style="background-color:${t.pageBg};background-image:${t.pageBgImage};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="width:520px;max-width:100%;background-color:${t.card};border-radius:${t.cardRadius};border:1px solid ${t.cardBorder};box-shadow:${t.cardShadow};overflow:hidden;">

        <!-- En-tête : logo + marque -->
        <tr><td style="padding:28px 32px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:middle;"><img src="${logo}" width="42" height="42" alt="" style="display:block;width:42px;height:42px;border-radius:${t.logoRadius};border:${t.logoBorder};"></td>
            <td style="vertical-align:middle;padding-left:14px;font-family:${t.brandFont};font-size:${t.brandSize};font-weight:${isMariage ? "400" : "700"};letter-spacing:${t.brandSpacing};text-transform:${t.brandTransform};color:${t.brandColor};line-height:1.2;">${studio}</td>
          </tr></table>
        </td></tr>

        <!-- Corps -->
        <tr><td style="padding:26px 32px 0;">
          ${eyebrowHtml}
          <h1 style="margin:14px 0 0;font-family:${t.fontHead};font-size:${t.headSize};font-weight:${t.headWeight};line-height:1.34;letter-spacing:${t.headSpacing};color:${t.heading};">${heading}</h1>
          ${total > 1 ? `<div style="margin-top:22px;">${progress(t, cur, total, justDelivered)}</div>` : ""}
          ${p.estimated_delivery && !justDelivered ? `<p style="margin:20px 0 0;font-family:${t.fontBody};font-size:14px;line-height:1.6;color:${t.body};">Livraison estimée&nbsp;: <strong style="font-family:${t.fontLabel};letter-spacing:${isStudio ? ".06em" : "0"};word-spacing:${t.labelWordSpacing};color:${t.heading};">${fmtDate(p.estimated_delivery)}</strong></p>` : ""}
        </td></tr>

        <!-- Bouton principal -->
        <tr><td style="padding:26px 32px ${justDelivered && reviewUrl ? "22px" : "30px"};">
          ${button(t, link, justDelivered ? "Voir ma livraison" : "Suivre mon projet")}
          <p style="margin:18px 0 0;font-family:${t.fontLabel};font-size:11px;line-height:1.5;color:${t.muted};word-break:break-all;">${link}</p>
        </td></tr>

        ${justDelivered && reviewUrl ? `<tr><td style="padding:0 32px 30px;">
          ${divider(t)}
          <p style="margin:20px 0 14px;font-family:${t.fontBody};font-size:14px;line-height:1.6;color:${t.body};">Votre film vous a plu&nbsp;? Votre avis nous aide énormément.</p>
          ${button(t, reviewUrl, "&#9733;&nbsp; Laisser un avis Google", true)}
        </td></tr>` : ""}

        <!-- Pied -->
        <tr><td bgcolor="${t.footerBg}" style="padding:20px 32px;background-color:${t.footerBg};border-top:1px solid ${t.rule};">
          <p style="margin:0;font-family:${t.fontLabel};font-size:${isMariage ? "10px" : "11px"};letter-spacing:${t.labelSpacing};word-spacing:${t.labelWordSpacing};text-transform:uppercase;color:${t.muted};">${studio} &middot; Production vidéo &amp; photo &middot; La Réunion</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Expéditeur sur le domaine vérifié chez Resend. Le nom affiché suit le studio
  // du projet ; l'adresse reste sur jourjstudio.com pour l'alignement SPF/DKIM.
  const fromName = p.studio_name || Deno.env.get("SENDER_NAME") || "Jour J Studio";
  const fromAddr = Deno.env.get("SENDER_EMAIL") || "site@jourjstudio.com";
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY") ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromAddr}>`,
      to: [p.client_email],
      reply_to: "contact@jourjstudio.com",
      subject,
      html,
    }),
  });

  if (!resp.ok) {
    console.error("Resend error", await resp.text());
    return new Response("email failed", { status: 502 });
  }
  return new Response("sent", { status: 200 });
});
