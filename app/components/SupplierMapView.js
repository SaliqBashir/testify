"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function MapBounds({ coords }) {
  const map = useMap();
  const key = useMemo(() => JSON.stringify(coords), [coords]);

  useEffect(() => {
    if (!coords.length) return;
    const t = setTimeout(() => {
      map.invalidateSize();
      if (coords.length === 1) {
        map.setView(coords[0], 6);
        return;
      }
      const b = L.latLngBounds(coords);
      map.fitBounds(b, { padding: [48, 48], maxZoom: 8 });
    }, 80);
    return () => clearTimeout(t);
  }, [map, coords, key]);

  return null;
}

export default function SupplierMapView({ suppliers, onSelectCompany }) {
  const points = useMemo(
    () =>
      suppliers
        .filter(
          (s) =>
            typeof s.lat === "number" &&
            typeof s.lng === "number" &&
            !Number.isNaN(s.lat) &&
            !Number.isNaN(s.lng),
        )
        .map((s) => [s.lat, s.lng]),
    [suppliers],
  );

  const center = points[0] || [39.8283, -98.5795];

  return (
    <div className="w-full h-[min(70vh,520px)] min-h-[360px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50/50">
      <MapContainer
        center={center}
        zoom={4}
        scrollWheelZoom
        className="h-full w-full z-0"
        style={{ minHeight: "360px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds coords={points} />
        {suppliers.map((s) => {
          if (
            typeof s.lat !== "number" ||
            typeof s.lng !== "number" ||
            Number.isNaN(s.lat) ||
            Number.isNaN(s.lng)
          ) {
            return null;
          }
          return (
            <Marker key={s.id} position={[s.lat, s.lng]}>
              <Popup>
                <div className="text-slate-900 min-w-[180px]">
                  <p className="font-bold text-sm mb-1">{s.name}</p>
                  <p className="text-xs text-slate-600 mb-2">
                    Fit {s.fitScore ?? "—"} · {s.address || ""}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                    onClick={() => onSelectCompany(s)}
                  >
                    View profile
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
