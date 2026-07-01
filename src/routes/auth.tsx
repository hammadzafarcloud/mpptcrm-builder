import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setErr(null);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) setErr(res.error.message ?? "Google sign-in failed");
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.mark}>M</div>
          <div>
            <div style={styles.name}>MPPT Care</div>
            <div style={styles.tag}>SOLAR SERVICE CRM</div>
          </div>
        </div>

        <h1 style={styles.h1}>{mode === "signin" ? "Sign in" : "Create account"}</h1>
        <p style={styles.sub}>
          {mode === "signin"
            ? "Access your solar service pipeline."
            : "Set up your workspace in seconds."}
        </p>

        <button type="button" onClick={handleGoogle} style={styles.google}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.6 2.1 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.3 17.7 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>
            <path fill="#FBBC05" d="M10.5 28.7c-.6-1.7-.9-3.5-.9-5.2s.3-3.5.9-5.2l-7.9-6.1C1 15.6 0 19.7 0 24s1 8.4 2.6 12l7.9-6.1z"/>
            <path fill="#34A853" d="M24 48c6.1 0 11.2-2 15-5.4l-7.5-5.8c-2.1 1.4-4.8 2.2-7.5 2.2-6.3 0-11.6-3.8-13.5-9.3l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <div style={styles.divider}><span>or</span></div>

        <form onSubmit={handleEmail}>
          <label style={styles.label}>Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} placeholder="you@company.com" />
          <label style={styles.label}>Password</label>
          <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} placeholder="••••••••" />
          {err && <div style={styles.err}>{err}</div>}
          <button disabled={busy} type="submit" style={styles.primary}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div style={styles.switch}>
          {mode === "signin" ? (
            <>New here? <button type="button" onClick={() => setMode("signup")} style={styles.linkBtn}>Create an account</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => setMode("signin")} style={styles.linkBtn}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F1826", padding: "24px", fontFamily: "'Inter', system-ui, sans-serif" },
  card: { width: "100%", maxWidth: 420, background: "#FAF6EE", borderRadius: 14, padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" },
  brand: { display: "flex", gap: 12, alignItems: "center", marginBottom: 24 },
  mark: { width: 44, height: 44, borderRadius: "50%", background: "#FF3131", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, boxShadow: "0 0 0 3px rgba(255,49,49,0.22)" },
  name: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#0F1826" },
  tag: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#666B76", letterSpacing: 0.6, textTransform: "uppercase" },
  h1: { fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 6px", fontSize: 24, color: "#20242C" },
  sub: { margin: "0 0 20px", color: "#666B76", fontSize: 14 },
  google: { width: "100%", padding: "11px 14px", background: "#fff", border: "1px solid #E7DFCB", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 600, color: "#20242C", cursor: "pointer" },
  divider: { textAlign: "center", margin: "16px 0", color: "#9AA0AB", fontSize: 12, position: "relative" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#20242C", margin: "10px 0 6px" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #E7DFCB", borderRadius: 8, background: "#fff", fontSize: 14, outline: "none" },
  primary: { width: "100%", marginTop: 16, padding: "11px 14px", background: "#FF3131", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" },
  err: { marginTop: 10, padding: "8px 10px", background: "#F7E2E0", color: "#B93A3A", borderRadius: 6, fontSize: 13 },
  switch: { textAlign: "center", marginTop: 16, fontSize: 13, color: "#666B76" },
  linkBtn: { background: "none", border: "none", color: "#FF3131", fontWeight: 600, cursor: "pointer", padding: 0 },
};
