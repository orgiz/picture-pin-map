import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Logga in — Atlas" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  const signIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) {
      toast.error("Inloggning misslyckades", { description: String(result.error.message ?? result.error) });
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app", replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="glass w-full max-w-md rounded-2xl p-8 shadow-elegant">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Compass className="h-4 w-4 text-primary" /> Atlas
        </Link>
        <h1 className="text-3xl">Välkommen tillbaka</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Logga in med Google för att börja ladda upp bilder till din karta.
        </p>

        <button
          onClick={signIn}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
        >
          <GoogleIcon /> {loading ? "Loggar in…" : "Fortsätt med Google"}
        </button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Vi använder bara ditt konto för inloggning.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5c-2 1.4-4.5 2.2-7.1 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.1 5c-.4.4 6.6-4.8 6.6-14.5 0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
