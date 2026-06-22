// =====================================================================
// Notifications client — Supabase Edge Function (Deno) — envoi via BREVO
// Déclenchée par un Database Webhook sur UPDATE de la table `projects`.
// Envoie un email au client quand l'étape change ou que le projet est livré.
// Brevo permet d'envoyer SANS nom de domaine (expéditeur unique vérifié).
//
// Secrets attendus (Edge Functions → Secrets) :
//   BREVO_API_KEY   clé API Brevo (Brevo → SMTP & API → API Keys)
//   SENDER_EMAIL    ton email vérifié comme expéditeur dans Brevo (ex. jeremie.fv@gmail.com)
//   SENDER_NAME     nom affiché (ex. PRISMAE)
//   SITE_URL        base publique, ex. "https://suivi-client.vercel.app"
//   WEBHOOK_SECRET  chaîne secrète (aussi mise dans l'en-tête du webhook)
// =====================================================================

const MONTHS = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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

  const SITE_URL = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
  const link = `${SITE_URL}/suivi.html?p=${encodeURIComponent(p.public_token)}`;
  const studio = p.studio_name || "Studio";
  const stepName = steps[Math.min(p.current_step ?? 0, steps.length - 1)] || "";

  const subject = justDelivered
    ? `Votre projet est livré — ${p.project_title}`
    : `Nouvelle étape : ${stepName} — ${p.project_title}`;

  const intro = justDelivered
    ? `Bonne nouvelle ! Votre projet « ${p.project_title} » est <strong>livré</strong>.`
    : `Votre projet « ${p.project_title} » avance : étape <strong>${stepName}</strong>.`;

  const html = `
    <div style="background:#07090c;color:#f4f1ec;font-family:Helvetica,Arial,sans-serif;padding:32px;border-radius:16px;max-width:520px;margin:auto">
      <p style="color:#9ecbff;letter-spacing:2px;font-size:12px;text-transform:uppercase;margin:0 0 8px">${studio}</p>
      <h1 style="font-size:24px;margin:0 0 16px">${intro}</h1>
      ${p.estimated_delivery && !justDelivered ? `<p style="color:#a3a8b2;margin:0 0 16px">Livraison estimée : ${fmtDate(p.estimated_delivery)}</p>` : ""}
      <a href="${link}" style="display:inline-block;background:#3b9bff;color:#07090c;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">Suivre mon projet</a>
      <p style="color:#6b7280;font-size:12px;margin:24px 0 0">${link}</p>
    </div>`;

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
