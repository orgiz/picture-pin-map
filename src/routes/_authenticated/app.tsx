import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { PhotoMap } from "@/components/PhotoMap";
import { PhotoGallery } from "@/components/PhotoGallery";
import { UploadDialog } from "@/components/UploadDialog";
import { Button } from "@/components/ui/button";
import { deletePhoto, listPhotosWithUrls, updatePhotoLocation, type PhotoWithUrl } from "@/lib/photos";
import { toast } from "sonner";
import { Crosshair, X, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Galleri & Karta — Atlas" }] }),
  component: AppPage,
});

function AppPage() {
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["photos"],
    queryFn: listPhotosWithUrls,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pinningFor, setPinningFor] = useState<PhotoWithUrl | null>(null);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["photos"] });

  const startPinning = (p: PhotoWithUrl) => {
    setPinningFor(p);
    setPendingPin(p.latitude != null && p.longitude != null ? { lat: p.latitude, lng: p.longitude } : null);
    toast.info("Klicka på kartan för att placera nålen");
  };

  const cancelPinning = () => { setPinningFor(null); setPendingPin(null); };

  const confirmPin = async () => {
    if (!pinningFor || !pendingPin) return;
    try {
      await updatePhotoLocation(pinningFor.id, pendingPin.lat, pendingPin.lng);
      toast.success("Plats sparad");
      setPinningFor(null); setPendingPin(null);
      refresh();
    } catch (e) {
      toast.error("Kunde inte spara plats", { description: (e as Error).message });
    }
  };

  const handleDelete = async (p: PhotoWithUrl) => {
    if (!confirm("Ta bort den här bilden?")) return;
    try {
      await deletePhoto(p);
      toast.success("Bild borttagen");
      refresh();
    } catch (e) {
      toast.error("Kunde inte ta bort", { description: (e as Error).message });
    }
  };

  const unplaced = photos.filter((p) => p.latitude == null || p.longitude == null).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 lg:flex-row">
        {/* Sidebar / Gallery */}
        <aside className="glass flex w-full flex-col overflow-hidden rounded-2xl shadow-elegant lg:w-[380px]">
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <div>
              <h2 className="font-display text-xl">Galleri</h2>
              <p className="text-xs text-muted-foreground">
                {photos.length} bild{photos.length === 1 ? "" : "er"}
                {unplaced > 0 && ` · ${unplaced} utan plats`}
              </p>
            </div>
            <UploadDialog onUploaded={refresh} />
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Laddar…</div>
            ) : (
              <PhotoGallery
                photos={photos}
                selectedId={selectedId}
                currentUserId={user.id}
                onSelect={(p) => {
                  setSelectedId(p.id);
                  if (p.latitude == null) startPinning(p);
                }}
                onPinManually={startPinning}
                onDelete={handleDelete}
              />
            )}
          </div>
        </aside>

        {/* Map */}
        <section className="glass relative flex-1 overflow-hidden rounded-2xl shadow-elegant">
          {pinningFor && (
            <div className="absolute inset-x-0 top-0 z-10 m-3 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-background/90 p-3 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-sm">
                <Crosshair className="h-4 w-4 text-primary" />
                <span>Pinnar: <span className="font-medium">{pinningFor.caption || "bild"}</span></span>
                {pendingPin && (
                  <span className="text-muted-foreground">
                    · {pendingPin.lat.toFixed(4)}, {pendingPin.lng.toFixed(4)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={cancelPinning}><X className="mr-1 h-4 w-4" />Avbryt</Button>
                <Button size="sm" disabled={!pendingPin} onClick={confirmPin} className="bg-primary text-primary-foreground">
                  <Check className="mr-1 h-4 w-4" />Spara
                </Button>
              </div>
            </div>
          )}
          <PhotoMap
            photos={photos}
            selectedId={selectedId}
            onSelect={(p) => setSelectedId(p.id)}
            pendingPin={pendingPin}
            onMapClick={pinningFor ? (lat, lng) => setPendingPin({ lat, lng }) : undefined}
          />
        </section>
      </div>
    </div>
  );
}
