import { Link, useNavigate } from "@tanstack/react-router";
import { Compass, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function Header() {
  const nav = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      const meta = data.user?.user_metadata as { avatar_url?: string } | undefined;
      setAvatar(meta?.avatar_url ?? null);
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/app" className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          <span className="font-display text-lg">Atlas</span>
        </Link>
        <div className="flex items-center gap-3">
          {avatar ? (
            <img src={avatar} alt="" className="h-8 w-8 rounded-full ring-1 ring-border" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-secondary" />
          )}
          <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
          <button onClick={signOut} className="rounded-md border border-border p-2 text-muted-foreground hover:bg-secondary" title="Logga ut">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
