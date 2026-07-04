import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/book/$token")({
  head: () => ({
    meta: [
      { title: "Book a Service" },
      { name: "description", content: "Select services and submit your booking." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicBookingPage,
});

type Service = { name: string; price: number; unit?: string; description?: string };
type LinkRow = {
  id: string;
  token: string;
  owner_id: string;
  title: string;
  services: Service[];
  branding: { company?: string; phone?: string; address?: string };
  active: boolean;
};

function PublicBookingPage() {
  const { token } = Route.useParams();
  const [link, setLink] = useState<LinkRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ total: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("booking_links")
        .select("*")
        .eq("token", token)
        .eq("active", true)
        .maybeSingle();
      if (error) setError(error.message);
      else if (!data) setError("This booking link is not available.");
      else setLink(data as LinkRow);
      setLoading(false);
    })();
  }, [token]);

  const services: Service[] = link?.services || [];
  const items = useMemo(
    () =>
      services
        .map((s, i) => ({ ...s, idx: i, qty: qty[i] || 0 }))
        .filter((s) => s.qty > 0),
    [services, qty],
  );
  const subtotal = items.reduce((t, i) => t + i.qty * (Number(i.price) || 0), 0);

  async function submit() {
    if (!link) return;
    if (!form.name.trim()) return alert("Please enter your name.");
    if (!form.phone.trim() && !form.email.trim()) return alert("Please provide phone or email.");
    if (items.length === 0) return alert("Please select at least one service.");
    setSubmitting(true);
    const payload = {
      link_id: link.id,
      owner_id: link.owner_id,
      client_name: form.name.trim(),
      client_phone: form.phone.trim() || null,
      client_email: form.email.trim() || null,
      client_address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      items: items.map((i) => ({ name: i.name, price: i.price, unit: i.unit, qty: i.qty })),
      subtotal,
      tax: 0,
      total: subtotal,
      status: "new",
    };
    const { error } = await supabase.from("booking_submissions").insert(payload);
    setSubmitting(false);
    if (error) return alert("Could not submit booking: " + error.message);
    setConfirmation({ total: subtotal });
  }

  if (loading) return <Shell><p style={{ padding: 24 }}>Loading…</p></Shell>;
  if (error || !link)
    return (
      <Shell>
        <div style={{ padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Link unavailable</h1>
          <p style={{ color: "#666" }}>{error || "This booking link may have been disabled."}</p>
        </div>
      </Shell>
    );

  if (confirmation)
    return (
      <Shell brand={link.branding}>
        <div style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <h1 style={{ fontSize: 22, margin: "12px 0 8px" }}>Booking submitted</h1>
          <p style={{ color: "#555", marginBottom: 4 }}>Thanks {form.name.split(" ")[0]}!</p>
          <p style={{ color: "#555" }}>
            Total: <strong>Rs {confirmation.total.toLocaleString()}</strong>
          </p>
          <p style={{ color: "#666", marginTop: 12, fontSize: 14 }}>
            {link.branding?.company || "Our team"} will contact you shortly to confirm your booking and share the invoice.
          </p>
        </div>
      </Shell>
    );

  return (
    <Shell brand={link.branding}>
      <div style={{ padding: "20px 22px" }}>
        <h1 style={{ fontSize: 22, margin: "0 0 4px", fontWeight: 700 }}>{link.title}</h1>
        <p style={{ color: "#666", fontSize: 13, margin: "0 0 20px" }}>
          Select the services you need. Total updates automatically.
        </p>

        <section>
          {services.map((s, i) => {
            const q = qty[i] || 0;
            return (
              <div
                key={i}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  background: q > 0 ? "#fffbeb" : "#fff",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
                  {s.description && (
                    <div style={{ color: "#666", fontSize: 12, marginTop: 2 }}>{s.description}</div>
                  )}
                  <div style={{ marginTop: 6, fontFamily: "monospace", fontWeight: 600 }}>
                    Rs {Number(s.price).toLocaleString()}
                    {s.unit ? ` / ${s.unit}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <StepBtn onClick={() => setQty({ ...qty, [i]: Math.max(0, q - 1) })}>−</StepBtn>
                  <div style={{ width: 32, textAlign: "center", fontWeight: 700 }}>{q}</div>
                  <StepBtn onClick={() => setQty({ ...qty, [i]: q + 1 })}>+</StepBtn>
                </div>
              </div>
            );
          })}
        </section>

        <section
          style={{
            marginTop: 18,
            padding: 14,
            background: "#0f172a",
            color: "#fff",
            borderRadius: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Selected {items.length} item(s)</div>
            <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700 }}>
              Rs {subtotal.toLocaleString()}
            </div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Total</div>
        </section>

        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 15, margin: "0 0 10px" }}>Your details</h2>
          <Field label="Full name *" v={form.name} on={(v) => setForm({ ...form, name: v })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Phone / WhatsApp" v={form.phone} on={(v) => setForm({ ...form, phone: v })} />
            <Field label="Email" v={form.email} on={(v) => setForm({ ...form, email: v })} />
          </div>
          <Field label="Address / Area" v={form.address} on={(v) => setForm({ ...form, address: v })} />
          <Field
            label="Notes (optional)"
            v={form.notes}
            on={(v) => setForm({ ...form, notes: v })}
            textarea
          />
        </section>

        <button
          onClick={submit}
          disabled={submitting || items.length === 0}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "14px 16px",
            border: "none",
            background: items.length === 0 ? "#cbd5e1" : "#f59e0b",
            color: "#111",
            fontWeight: 700,
            fontSize: 15,
            borderRadius: 10,
            cursor: items.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Submitting…" : `Submit booking · Rs ${subtotal.toLocaleString()}`}
        </button>
        <p style={{ fontSize: 11, color: "#888", marginTop: 10, textAlign: "center" }}>
          Submitting sends your request to {link.branding?.company || "our team"} — they will confirm and share the final invoice.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children, brand }: { children: React.ReactNode; brand?: LinkRow["branding"] }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f4", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", background: "#fff", minHeight: "100vh", boxShadow: "0 0 40px rgba(0,0,0,0.04)" }}>
        <header style={{ padding: "18px 22px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{brand?.company || "Service Booking"}</div>
            {brand?.phone && <div style={{ fontSize: 12, color: "#666" }}>{brand.phone}</div>}
          </div>
          <div style={{ fontSize: 11, color: "#999" }}>Secure booking</div>
        </header>
        {children}
      </div>
    </div>
  );
}

function StepBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        background: "#fff",
        fontSize: 18,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function Field({
  label, v, on, textarea,
}: { label: string; v: string; on: (v: string) => void; textarea?: boolean }) {
  const style: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{label}</div>
      {textarea ? (
        <textarea value={v} onChange={(e) => on(e.target.value)} rows={3} style={style} />
      ) : (
        <input value={v} onChange={(e) => on(e.target.value)} style={style} />
      )}
    </label>
  );
}
