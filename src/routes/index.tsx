import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, ImagePlus, Compass } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas — Bilder på kartan" },
      { name: "description", content: "Ladda upp bilder, se dem placerade på en interaktiv karta via GPS-data från EXIF." },
      { property: "og:title", content: "Atlas — Bilder på kartan" },
      { property: "og:description", content: "Ladda upp bilder, se dem placerade på en interaktiv karta." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <span className="font-display text-xl">Atlas</span>
          </div>
          <Link to="/auth" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
            Logga in
          </Link>
        </nav>

        <section className="flex flex-1 flex-col items-start justify-center py-20">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary" /> EXIF · GPS · Galleri
          </span>
          <h1 className="max-w-3xl text-5xl leading-[1.05] sm:text-7xl">
            Dina bilder, <em className="not-italic text-primary">på platsen</em> där de togs.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Ladda upp ett foto — vi läser GPS-koordinaterna ur EXIF och sätter en nål på kartan.
            Saknas data? Dra nålen dit den hör hemma.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90">
              <ImagePlus className="h-4 w-4" /> Kom igång
            </Link>
            <a href="#how" className="rounded-md border border-border px-5 py-3 text-sm hover:bg-secondary">
              Så funkar det
            </a>
          </div>

          <div id="how" className="mt-24 grid w-full gap-6 sm:grid-cols-3">
            {[
              { t: "Ladda upp", d: "Släpp in bilder direkt från telefonen eller datorn." },
              { t: "Auto-pinna", d: "Vi läser EXIF-GPS och placerar nålen automatiskt." },
              { t: "Manuell nål", d: "Saknas koordinater? Pinna manuellt på kartan." },
            ].map((s, i) => (
              <div key={s.t} className="glass rounded-xl p-6">
                <div className="text-xs text-primary">0{i + 1}</div>
                <div className="mt-2 font-display text-xl">{s.t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
