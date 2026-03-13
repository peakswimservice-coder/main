import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Vite/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Ports coordinates [lat, lng]
export const PORTS: { name: string; lat: number; lng: number }[] = [
  { name: 'Genova',  lat: 44.407, lng: 8.934  },
  { name: 'Elba',   lat: 42.760, lng: 10.257 },
  { name: 'Napoli', lat: 40.850, lng: 14.268 },
  { name: 'Olbia',  lat: 40.922, lng: 9.506  },
  { name: 'Bastia', lat: 42.703, lng: 9.451  },
];

// Cumulative distances per leg (starts at 0 after each port)
const LEG_KM   = [190, 310, 270, 170, 200];
const CUMUL_KM = [0, 190, 500, 770, 940, 1140];

// Leg colors — distinct per leg
const LEG_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Create a custom marker icon
function createIcon(color: string, size = 14) {
  return L.divIcon({
    html: `<div style="
      width:${size}px; height:${size}px;
      background:${color};
      border:3px solid white;
      border-radius:50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    "></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function positionOnRoute(km: number): [number, number] {
  // Find which leg this km belongs to
  let leg = 0;
  while (leg < 4 && km > CUMUL_KM[leg + 1]) leg++;
  const start = PORTS[leg];
  const end   = PORTS[(leg + 1) % 5];
  const progress = Math.min(Math.max((km - CUMUL_KM[leg]) / LEG_KM[leg], 0), 1);
  return [
    start.lat + (end.lat - start.lat) * progress,
    start.lng + (end.lng - start.lng) * progress,
  ];
}

interface AthletePos {
  id: string;
  name: string;
  virtual_km: number;
  is_me?: boolean;
}

interface VirtualMapProps {
  currentLegIndex: number;
  athletes: AthletePos[];
}

export default function VirtualMap({ currentLegIndex, athletes }: VirtualMapProps) {
  // Build per-leg polylines
  const legLines: [number, number][][] = PORTS.map((p, i) => [
    [p.lat, p.lng],
    [PORTS[(i + 1) % 5].lat, PORTS[(i + 1) % 5].lng],
  ]);

  return (
    <div className="w-full rounded-3xl overflow-hidden border border-slate-200 shadow-xl" style={{ height: 380 }}>
      <MapContainer
        center={[42.5, 10.5]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Draw each leg with its color */}
        {legLines.map((positions, i) => (
          <Polyline
            key={i}
            positions={positions}
            pathOptions={{
              color: LEG_COLORS[i],
              weight: i === currentLegIndex ? 5 : 2.5,
              opacity: i === currentLegIndex ? 1 : 0.45,
              dashArray: i === currentLegIndex ? undefined : '6,6',
            }}
          />
        ))}

        {/* Port markers */}
        {PORTS.map((port, i) => (
          <Marker
            key={port.name}
            position={[port.lat, port.lng]}
            icon={createIcon(i === currentLegIndex || i === (currentLegIndex + 1) % 5 ? LEG_COLORS[currentLegIndex] : '#94a3b8', 12)}
          >
            <Popup>
              <strong>{port.name}</strong>
              {i === currentLegIndex && <div className="text-xs text-blue-600">Partenza tappa attuale</div>}
              {i === (currentLegIndex + 1) % 5 && <div className="text-xs text-emerald-600">Arrivo tappa attuale</div>}
            </Popup>
          </Marker>
        ))}

        {/* Athlete markers */}
        {athletes.map(a => {
          const pos = positionOnRoute(a.virtual_km);
          return (
            <Marker
              key={a.id}
              position={pos}
              icon={createIcon(a.is_me ? '#ef4444' : '#3b82f6', a.is_me ? 16 : 10)}
            >
              <Popup>
                <div className="font-bold text-sm">{a.name}</div>
                <div className="text-xs text-slate-500">{a.virtual_km.toFixed(1)} Kmv</div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
