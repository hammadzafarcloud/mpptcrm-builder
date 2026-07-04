import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  component: CrmHost,
});

function CrmHost() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getUserId() {
      const { data } = await supabase.auth.getUser();
      return data.user?.id;
    }

    async function handler(e: MessageEvent) {
      const msg = e.data;
      if (!msg) return;

      if (msg.__crmExternalUrl && typeof msg.url === "string") {
        try {
          const url = new URL(msg.url);
          const allowedHosts = new Set(["web.whatsapp.com", "api.whatsapp.com", "wa.me"]);
          if (url.protocol === "https:" && allowedHosts.has(url.hostname)) {
            window.open(url.toString(), "_blank", "noopener,noreferrer");
          }
        } catch {
          // Ignore malformed external URLs.
        }
        return;
      }

      if (!msg.__crmCall) return;
      const userId = await getUserId();
      if (!userId) return;
      const source = e.source as Window | null;
      const reply = (value: unknown) => source?.postMessage({ __crmReply: true, id: msg.id, value }, "*");

      if (msg.op === "get") {
        const { data } = await supabase
          .from("user_kv")
          .select("value")
          .eq("user_id", userId)
          .eq("key", msg.key)
          .maybeSingle();
        // HTML expects { value: string } or null
        reply(data && data.value != null ? { value: data.value as string } : null);
      } else if (msg.op === "set") {
        await supabase
          .from("user_kv")
          .upsert({ user_id: userId, key: msg.key, value: msg.value, updated_at: new Date().toISOString() });
        reply({ ok: true });
      }
    }

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <iframe
        ref={iframeRef}
        title="Solar Care CRM"
        src="/crm-app.html"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
      <button
        onClick={signOut}
        title="Sign out"
        style={{
          position: "fixed",
          top: 14,
          right: 18,
          zIndex: 10,
          background: "#FF3131",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
      >
        Sign out
      </button>
    </div>
  );
}
