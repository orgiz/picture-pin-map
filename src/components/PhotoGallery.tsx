import { MapPin, MapPinOff, Trash2, Crosshair } from "lucide-react";
import type { PhotoWithUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";

interface Props {
  photos: PhotoWithUrl[];
  selectedId?: string | null;
  currentUserId?: string | null;
  onSelect: (p: PhotoWithUrl) => void;
  onPinManually: (p: PhotoWithUrl) => void;
  onDelete: (p: PhotoWithUrl) => void;
}

export function PhotoGallery({ photos, selectedId, currentUserId, onSelect, onPinManually, onDelete }: Props) {
  if (photos.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-10 text-center text-muted-foreground">
        <MapPin className="mb-3 h-10 w-10 text-primary/60" />
        <p className="font-display text-xl text-foreground">Tomt galleri</p>
        <p className="mt-1 text-sm">Ladda upp din första bild för att börja.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3 p-4">
      {photos.map((p) => {
        const hasLoc = p.latitude != null && p.longitude != null;
        const isMine = currentUserId && p.user_id === currentUserId;
        return (
          <li
            key={p.id}
            className={cn(
              "group cursor-pointer overflow-hidden rounded-xl border border-border bg-card/60 transition",
              selectedId === p.id ? "ring-2 ring-primary shadow-glow" : "hover:border-primary/40",
            )}
            onClick={() => onSelect(p)}
          >
            <div className="relative">
              <img src={p.url} alt={p.caption ?? ""} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                {p.caption && <div className="line-clamp-1 text-sm font-medium">{p.caption}</div>}
                <div className="mt-1 flex items-center gap-2 text-xs text-white/70">
                  {hasLoc ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      {p.location_source === "exif" ? "EXIF" : "Manuell"} · {p.latitude!.toFixed(3)}, {p.longitude!.toFixed(3)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <MapPinOff className="h-3 w-3" /> Saknar plats
                    </span>
                  )}
                </div>
              </div>
            </div>
            {isMine && (
              <div className="flex items-center justify-end gap-1 border-t border-border/60 bg-card/80 p-2 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); onPinManually(p); }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                  title="Pinna på kartan"
                >
                  <Crosshair className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(p); }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                  title="Ta bort"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
