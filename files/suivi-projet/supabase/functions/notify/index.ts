// =====================================================================
// Notifications client — Supabase Edge Function (Deno) — envoi via BREVO
// Déclenchée par un Database Webhook sur UPDATE de la table `projects`.
// Email responsive (tableau + styles en ligne) qui rend bien dans tous les
// clients mail. Sans nom de domaine (expéditeur unique vérifié Brevo).
//
// Secrets : BREVO_API_KEY, SENDER_EMAIL, SENDER_NAME, SITE_URL, WEBHOOK_SECRET
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
  const stepChanged = p.current_step !== old.current_step;
  if (!justDelivered && !stepChanged) return new Response("no change", { status: 200 });

  const SITE_URL = (Deno.env.get("SITE_URL") || "https://suivi-client.vercel.app").replace(/\/$/, "");
  const link = `${SITE_URL}/suivi.html?p=${encodeURIComponent(p.public_token)}`;
  const logo = `${SITE_URL}/icon-192.png`;
  const studio = esc(p.studio_name || "Studio");
  const title = esc(p.project_title || "votre projet");
  const total = steps.length;
  const cur = Math.min(p.current_step ?? 0, Math.max(total - 1, 0));
  const stepName = esc(steps[cur] || "");

  // Couleur d'accent selon le style du projet (or pour "studio", bleu sinon)
  const isStudio = p.style === "studio";
  const accent = isStudio ? "#c9a24a" : "#3b9bff";
  const btnText = isStudio ? "#1a1407" : "#ffffff";

  // Lien d'avis Google (optionnel) : par marque (style) avec repli sur REVIEW_URL
  const reviewUrl = (isStudio ? Deno.env.get("REVIEW_URL_STUDIO") : Deno.env.get("REVIEW_URL_PRISMAE"))
    || Deno.env.get("REVIEW_URL") || "";

  const subject = justDelivered
    ? `Votre projet est livré — ${p.project_title}`
    : `Nouvelle étape : ${steps[cur] || ""} — ${p.project_title}`;

  const eyebrow = justDelivered ? "Projet livré" : `Étape ${cur + 1} / ${total}`;
  const heading = justDelivered
    ? `Votre projet « ${title} » est livré.`
    : `Votre projet « ${title} » avance : <span style="color:${accent}">${stepName}</span>.`;

  const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;background:#eef0f3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f3;padding:28px 12px;font-family:Helvetica,Arial,sans-serif;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="480" style="width:480px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e8ec;">
        <tr><td style="padding:26px 30px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;"><img src="${logo}" width="40" height="40" alt="" style="display:block;border-radius:9px;"></td>
            <td style="vertical-align:middle;padding-left:12px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accent};">${studio}</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:22px 30px 6px;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a909c;">${eyebrow}</p>
          <h1 style="margin:0;font-size:22px;line-height:1.3;color:#14181f;font-weight:700;">${heading}</h1>
          ${p.estimated_delivery && !justDelivered ? `<p style="margin:16px 0 0;font-size:14px;color:#5a616e;">Livraison estimée : <strong style="color:#14181f;">${fmtDate(p.estimated_delivery)}</strong></p>` : ""}
        </td></tr>
        <tr><td style="padding:22px 30px ${justDelivered && reviewUrl ? "16px" : "28px"};">
          <a href="${link}" style="display:inline-block;background:${accent};color:${btnText};font-size:15px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:999px;">Suivre mon projet</a>
          <p style="margin:18px 0 0;font-size:12px;color:#aeb3bd;word-break:break-all;">${link}</p>
        </td></tr>
        ${justDelivered && reviewUrl ? `<tr><td style="padding:0 30px 28px;">
          <p style="margin:0 0 12px;font-size:14px;color:#5a616e;">Votre film vous a plu ? Votre avis nous aide énormément :</p>
          <a href="${reviewUrl}" style="display:inline-block;background:#ffffff;border:1px solid ${accent};color:${accent};font-size:14px;font-weight:700;text-decoration:none;padding:11px 24px;border-radius:999px;">★ Laisser un avis Google</a>
        </td></tr>` : ""}
        <tr><td style="padding:18px 30px;background:#f6f7f9;border-top:1px solid #eceef1;">
          <p style="margin:0;font-size:13px;color:#5a616e;">${studio} · Production vidéo &amp; photo · La Réunion</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`;

  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": Deno.env.get("BREVO_API_KEY") ?? "",
      "Content-Type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify({
      sender: { name: Deno.env.get("SENDER_NAME") || "PRISMAE", email: Deno.env.get("SENDER_EMAIL") },
      to: [{ email: p.client_email }],
      subject,
      htmlContent: html,
    }),
  });

  if (!resp.ok) {
    console.error("Brevo error", await resp.text());
    return new Response("email failed", { status: 502 });
  }
  return new Response("sent", { status: 200 });
});
