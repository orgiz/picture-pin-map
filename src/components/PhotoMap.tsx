import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";
import type { PhotoWithUrl } from "@/lib/photos";

interface Props {
  photos: PhotoWithUrl[];
  selectedId?: string | null;
  onSelect?: (p: PhotoWithUrl) => void;
  pendingPin?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
}

export function PhotoMap({ photos, selectedId, onSelect, pendingPin, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const pendingMarkerRef = useRef<google.maps.Marker | null>(null);
  const clickHandlerRef = useRef<typeof onMapClick>(onMapClick);
  clickHandlerRef.current = onMapClick;

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((google) => {
      if (cancelled || !containerRef.current) return;
      mapRef.current = new google.maps.Map(containerRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        disableDefaultUI: false,
        clickableIcons: false,
        styles: darkMapStyle,
      });
      mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        clickHandlerRef.current?.(e.latLng.lat(), e.latLng.lng());
      });
    });
    return () => { cancelled = true; };
  }, []);

  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    const existing = markersRef.current;
    const seen = new Set<string>();
    const bounds = new google.maps.LatLngBounds();
    let anyBounds = false;

    for (const p of photos) {
      if (p.latitude == null || p.longitude == null) continue;
      seen.add(p.id);
      bounds.extend({ lat: p.latitude, lng: p.longitude });
      anyBounds = true;
      let m = existing.get(p.id);
      if (!m) {
        m = new google.maps.Marker({
          position: { lat: p.latitude, lng: p.longitude },
          map,
          icon: pinIcon(p.id === selectedId),
        });
        m.addListener("click", () => onSelect?.(p));
        existing.set(p.id, m);
      } else {
        m.setPosition({ lat: p.latitude, lng: p.longitude });
        m.setIcon(pinIcon(p.id === selectedId));
      }
    }
    for (const [id, m] of existing) {
      if (!seen.has(id)) { m.setMap(null); existing.delete(id); }
    }
    if (anyBounds && photos.length > 1) {
      map.fitBounds(bounds, 80);
    } else if (anyBounds && photos.length === 1) {
      const only = photos.find((p) => p.latitude != null)!;
      map.setCenter({ lat: only.latitude!, lng: only.longitude! });
      map.setZoom(8);
    }
  }, [photos, selectedId, onSelect]);

  // Pending pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    if (pendingMarkerRef.current) { pendingMarkerRef.current.setMap(null); pendingMarkerRef.current = null; }
    if (pendingPin) {
      pendingMarkerRef.current = new google.maps.Marker({
        position: pendingPin,
        map,
        icon: pinIcon(true, true),
        zIndex: 9999,
      });
      map.panTo(pendingPin);
    }
  }, [pendingPin]);

  return <div ref={containerRef} className="h-full w-full rounded-xl" />;
}

function pinIcon(active: boolean, pending = false): google.maps.Symbol {
  return {
    path: "M12 2C7 2 3 6 3 11c0 7 9 13 9 13s9-6 9-13c0-5-4-9-9-9z",
    fillColor: pending ? "#22c55e" : active ? "#f5a524" : "#e88a3b",
    fillOpacity: 1,
    strokeColor: "#1a1a1a",
    strokeWeight: 1.5,
    scale: active || pending ? 1.8 : 1.4,
    anchor: new google.maps.Point(12, 22),
  };
}

const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1e2230" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1e2230" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa3b2" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d3d8e0" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2f3d" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1421" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3b4252" }] },
  { featureType: "landscape", stylers: [{ color: "#202535" }] },
];
