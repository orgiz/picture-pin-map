import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, ImagePlus, MapPin, Loader2 } from "lucide-react";
import { extractExifGps, uploadPhoto } from "@/lib/photos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onUploaded: () => void;
}

type PendingFile = {
  file: File;
  preview: string;
  caption: string;
  lat?: number;
  lng?: number;
  takenAt?: string;
  hasExif: boolean;
};

export function UploadDialog({ onUploaded }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PendingFile[]>([]);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: PendingFile[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const exif = await extractExifGps(file);
      next.push({
        file,
        preview: URL.createObjectURL(file),
        caption: "",
        lat: exif.lat,
        lng: exif.lng,
        takenAt: exif.takenAt,
        hasExif: exif.lat != null && exif.lng != null,
      });
    }
    setItems((prev) => [...prev, ...next]);
  };

  const update = (i: number, patch: Partial<PendingFile>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };

  const remove = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const handleUpload = async () => {
    if (items.length === 0) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");
      let ok = 0;
      for (const it of items) {
        try {
          await uploadPhoto({
            file: it.file,
            userId: user.id,
            caption: it.caption || undefined,
            lat: it.lat ?? null,
            lng: it.lng ?? null,
            source: it.hasExif ? "exif" : it.lat != null ? "manual" : "none",
            takenAt: it.takenAt,
          });
          ok++;
        } catch (e) {
          toast.error(`Misslyckades med ${it.file.name}`, { description: String((e as Error).message) });
        }
      }
      toast.success(`Laddade upp ${ok} bild${ok === 1 ? "" : "er"}`);
      items.forEach((it) => URL.revokeObjectURL(it.preview));
      setItems([]);
      setOpen(false);
      onUploaded();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground hover:opacity-90">
          <ImagePlus className="h-4 w-4" /> Ladda upp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Ladda upp bilder</DialogTitle>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/40 p-10 text-center transition hover:border-primary/60 hover:bg-card/60">
          <Upload className="mb-3 h-8 w-8 text-primary" />
          <div className="font-medium">Släpp filer eller klicka för att välja</div>
          <div className="mt-1 text-xs text-muted-foreground">EXIF-GPS läses automatiskt</div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>

        {items.length > 0 && (
          <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
            {items.map((it, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-border bg-card/60 p-3">
                <img src={it.preview} alt="" className="h-20 w-20 flex-none rounded-md object-cover" />
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Bildtext (valfri)"
                    value={it.caption}
                    onChange={(e) => update(i, { caption: e.target.value })}
                  />
                  <div className="flex items-center gap-2 text-xs">
                    {it.hasExif ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                        <MapPin className="h-3 w-3" /> GPS hittad ({it.lat!.toFixed(3)}, {it.lng!.toFixed(3)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                        <MapPin className="h-3 w-3" /> Ingen GPS — pinna manuellt efter uppladdning
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Latitud</Label>
                      <Input
                        type="number"
                        step="0.00001"
                        value={it.lat ?? ""}
                        onChange={(e) => update(i, { lat: e.target.value === "" ? undefined : Number(e.target.value), hasExif: false })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Longitud</Label>
                      <Input
                        type="number"
                        step="0.00001"
                        value={it.lng ?? ""}
                        onChange={(e) => update(i, { lng: e.target.value === "" ? undefined : Number(e.target.value), hasExif: false })}
                      />
                    </div>
                  </div>
                </div>
                <button onClick={() => remove(i)} className="text-xs text-muted-foreground hover:text-destructive">
                  Ta bort
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Avbryt</Button>
          <Button disabled={busy || items.length === 0} onClick={handleUpload} className="bg-primary text-primary-foreground hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Ladda upp {items.length > 0 ? `(${items.length})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
