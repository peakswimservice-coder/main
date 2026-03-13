import { useState } from 'react';

interface Point {
  x: number;
  y: number;
  name: string;
}

const PORTS: Point[] = [
  { name: 'Genova', x: 25, y: 15 },
  { name: 'Elba', x: 48, y: 45 },
  { name: 'Napoli', x: 88, y: 85 },
  { name: 'Olbia', x: 40, y: 80 },
  { name: 'Bastia', x: 35, y: 50 },
];

interface AthletePosition {
  id: string;
  name: string;
  virtual_km: number;
  is_me?: boolean;
}

interface VirtualMapProps {
  currentLegIndex: number; // 0 to 4
  athletes: AthletePosition[];
}

// Total distance is 1140 km
const LEG_DISTANCES = [190, 310, 270, 170, 200];
const CUMULATIVE_DISTANCES = [0, 190, 500, 770, 940, 1140];

export default function VirtualMap({ currentLegIndex, athletes }: VirtualMapProps) {
  const [hoveredAthlete, setHoveredAthlete] = useState<string | null>(null);

  const getPosOnRoute = (km: number) => {
    // Determine which leg the athlete is on based on KM
    let leg = 0;
    while (leg < 5 && km > CUMULATIVE_DISTANCES[leg + 1]) {
      leg++;
    }
    
    if (leg >= 5) return PORTS[0]; // Back to Genova

    const start = PORTS[leg];
    const end = PORTS[(leg + 1) % 5];
    const legProgress = (km - CUMULATIVE_DISTANCES[leg]) / LEG_DISTANCES[leg];
    const clampedProgress = Math.min(Math.max(legProgress, 0), 1);

    return {
      x: start.x + (end.x - start.x) * clampedProgress,
      y: start.y + (end.y - start.y) * clampedProgress,
    };
  };

  return (
    <div className="relative w-full aspect-[4/3] bg-blue-50/30 rounded-[2.5rem] border border-blue-100 overflow-hidden shadow-inner">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
        {/* Tyrrhenian Sea Pattern */}
        <defs>
          <pattern id="waves" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 5 Q 2.5 2.5 5 5 T 10 5" fill="none" stroke="#bfdbfe" strokeWidth="0.5" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#waves)" />

        {/* Route Path */}
        <path
          d={`M ${PORTS[0].x} ${PORTS[0].y} L ${PORTS[1].x} ${PORTS[1].y} L ${PORTS[2].x} ${PORTS[2].y} L ${PORTS[3].x} ${PORTS[3].y} L ${PORTS[4].x} ${PORTS[4].y} Z`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1.5"
          strokeDasharray="3,3"
        />

        {/* Active Leg Highlight */}
        {currentLegIndex >= 0 && currentLegIndex < 5 && (
          <path
            d={`M ${PORTS[currentLegIndex].x} ${PORTS[currentLegIndex].y} L ${PORTS[(currentLegIndex + 1) % 5].x} ${PORTS[(currentLegIndex + 1) % 5].y}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            className="animate-pulse"
          />
        )}

        {/* Port Markers */}
        {PORTS.map((port, i) => (
          <g key={port.name}>
            <circle cx={port.x} cy={port.y} r="1.5" fill={i === currentLegIndex ? '#3b82f6' : '#94a3b8'} />
            <text 
              x={port.x} 
              y={port.y - 3} 
              textAnchor="middle" 
              className="text-[3px] font-black uppercase tracking-tighter fill-slate-400"
            >
              {port.name}
            </text>
          </g>
        ))}

        {/* Athlete Markers */}
        {athletes.map((athlete) => {
          const pos = getPosOnRoute(athlete.virtual_km);
          return (
            <g 
              key={athlete.id}
              className="cursor-pointer transition-all duration-300"
              onMouseEnter={() => setHoveredAthlete(athlete.id)}
              onMouseLeave={() => setHoveredAthlete(null)}
              onClick={() => setHoveredAthlete(athlete.id)}
            >
              {/* Me focus ring */}
              {athlete.is_me && (
                <circle cx={pos.x} cy={pos.y} r="4" fill="#3b82f6" opacity="0.15">
                  <animate attributeName="r" from="3" to="5" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              
              <circle 
                cx={pos.x} 
                cy={pos.y} 
                r={athlete.is_me ? 1.8 : 1.2} 
                fill={athlete.is_me ? '#2563eb' : '#64748b'} 
                stroke="white"
                strokeWidth="0.5"
                className={athlete.is_me ? 'animate-bounce' : ''}
              />

              {/* Tooltip on hover/click */}
              {(hoveredAthlete === athlete.id || athlete.is_me) && (
                <g>
                  <rect 
                    x={pos.x - 10} 
                    y={pos.y - 10} 
                    width="20" 
                    height="6" 
                    rx="1" 
                    fill="white" 
                    className="shadow-sm" 
                  />
                  <text 
                    x={pos.x} 
                    y={pos.y - 5.5} 
                    textAnchor="middle" 
                    className={`text-[2.5px] font-black uppercase ${athlete.is_me ? 'fill-blue-600' : 'fill-slate-600'}`}
                  >
                    {athlete.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-white/50 shadow-sm flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-[10px] font-black uppercase text-slate-500">Tu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-500">Compagni</span>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Tappa: {PORTS[currentLegIndex]?.name} → {PORTS[(currentLegIndex + 1) % 5]?.name}
          </p>
        </div>
      </div>
    </div>
  );
}
