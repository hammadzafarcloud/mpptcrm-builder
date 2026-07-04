import { createFileRoute } from "@tanstack/react-router";

type Body = {
  action: "briefing" | "suggest_followups" | "draft_message" | "ask_crm";
  payload?: any;
};

const MODEL = "google/gemini-3-flash-preview";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function systemFor(action: Body["action"]) {
  if (action === "briefing") {
    return `You are an assistant for a solar CRM. Given today's date and a JSON list of open tasks (with title, priority, due date, category, lead name, notes), produce a concise morning briefing in Markdown:
- Start with a one-line summary (counts of overdue / due today / upcoming).
- Then a prioritized action list (max 6 items) as "1. **Task title** — one-line why-now + suggested next step".
- End with one motivational sentence.
Keep it under 180 words. Do not invent tasks that aren't in the input.`;
  }
  if (action === "suggest_followups") {
    return `You are an assistant for a solar CRM. Given a JSON list of leads (id, name, phone, stage, lastContactedAt, createdAt, notes) and existing open tasks, identify leads that need a follow-up (no contact in 3+ days, stuck in early stages, or missing next step).
Return STRICT JSON only, no prose, shape:
{"suggestions":[{"leadId": number, "title": string, "priority": "High"|"Medium"|"Low", "dueInDays": number, "category": "Follow-up"|"Callback"|"Quote follow-up"|"Payment reminder", "reason": string}]}
Max 6 suggestions. Skip leads that already have an open task.`;
  }
  if (action === "ask_crm") {
    return `You are an assistant for a solar CRM ("Ask your CRM"). The user asks a natural-language question about their business data. A JSON snapshot of the CRM is provided (leads, tasks, visits, quotes, invoices, team, settings).

Rules:
- Answer ONLY from the provided data. If the data doesn't contain the answer, say so plainly.
- Be concise: at most ~150 words.
- Prefer short bullet lists with names, phones, amounts, due dates.
- Use the currency symbol found in settings.currency if present, otherwise no currency symbol.
- Format in Markdown. Use **bold** for names/amounts.
- If the question is ambiguous, answer the most reasonable interpretation and note the assumption in one line.
- Never invent leads, quotes or numbers.`;
  }
  return `You are writing a short, warm, professional follow-up message from a solar company to a customer.
- Channel: WhatsApp/SMS (plain text, no markdown).
- Language: match the customer name; default English, keep it simple.
- 2-4 short sentences. Friendly, not pushy. Include one clear next step (call back, confirm site visit, review quote).
- Sign off with the company name.
Return only the message text.`;
}


export const Route = createFileRoute("/api/ai-assist")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let body: Body;
        try { body = (await request.json()) as Body; }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        if (!body?.action) return new Response("Missing action", { status: 400 });

        const userContent = JSON.stringify({
          today: new Date().toISOString(),
          ...body.payload,
        });

        const res = await fetch(GATEWAY, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: systemFor(body.action) },
              { role: "user", content: userContent },
            ],
          }),
        });

        if (!res.ok) {
          const txt = await res.text();
          return new Response(
            JSON.stringify({ error: "AI gateway error", status: res.status, detail: txt.slice(0, 500) }),
            { status: res.status === 429 || res.status === 402 ? res.status : 500,
              headers: { "Content-Type": "application/json" } },
          );
        }

        const data: any = await res.json();
        const text: string = data?.choices?.[0]?.message?.content ?? "";

        let parsed: any = null;
        if (body.action === "suggest_followups") {
          const m = text.match(/\{[\s\S]*\}/);
          if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
        }

        return Response.json({ text, parsed });
      },
    },
  },
});
