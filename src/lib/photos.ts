import { supabase } from "@/integrations/supabase/client";
import exifr from "exifr";

export type Photo = {
  id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  taken_at: string | null;
  location_source: "exif" | "manual" | "none";
  created_at: string;
};

export type PhotoWithUrl = Photo & { url: string };

export async function extractExifGps(file: File): Promise<{ lat?: number; lng?: number; takenAt?: string }> {
  try {
    const data = await exifr.parse(file, { gps: true, pick: ["latitude", "longitude", "DateTimeOriginal", "CreateDate"] });
    if (!data) return {};
    return {
      lat: typeof data.latitude === "number" ? data.latitude : undefined,
      lng: typeof data.longitude === "number" ? data.longitude : undefined,
      takenAt: data.DateTimeOriginal?.toISOString?.() ?? data.CreateDate?.toISOString?.(),
    };
  } catch {
    return {};
  }
}

export async function uploadPhoto(opts: {
  file: File;
  userId: string;
  caption?: string;
  lat?: number | null;
  lng?: number | null;
  source: "exif" | "manual" | "none";
  takenAt?: string;
}): Promise<Photo> {
  const ext = opts.file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${opts.userId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from("photos").upload(path, opts.file, {
    contentType: opts.file.type || "image/jpeg",
    upsert: false,
  });
  if (up.error) throw up.error;

  const { data, error } = await supabase.from("photos").insert({
    user_id: opts.userId,
    storage_path: path,
    caption: opts.caption ?? null,
    latitude: opts.lat ?? null,
    longitude: opts.lng ?? null,
    location_source: opts.source,
    taken_at: opts.takenAt ?? null,
  }).select("*").single();
  if (error) throw error;
  return data as Photo;
}

export async function listPhotosWithUrls(): Promise<PhotoWithUrl[]> {
  const { data, error } = await supabase.from("photos").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const photos = data as Photo[];
  if (photos.length === 0) return [];
  const paths = photos.map((p) => p.storage_path);
  const signed = await supabase.storage.from("photos").createSignedUrls(paths, 60 * 60);
  if (signed.error) throw signed.error;
  const urlMap = new Map(signed.data.map((d) => [d.path, d.signedUrl]));
  return photos.map((p) => ({ ...p, url: urlMap.get(p.storage_path) ?? "" }));
}

export async function updatePhotoLocation(id: string, lat: number, lng: number): Promise<void> {
  const { error } = await supabase
    .from("photos")
    .update({ latitude: lat, longitude: lng, location_source: "manual" })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePhoto(p: Photo): Promise<void> {
  await supabase.storage.from("photos").remove([p.storage_path]);
  const { error } = await supabase.from("photos").delete().eq("id", p.id);
  if (error) throw error;
}
