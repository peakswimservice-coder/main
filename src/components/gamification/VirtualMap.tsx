import { useState } from 'react';

interface Point {
  x: number;
  y: number;
  name: string;
}

// Adjusted PORTS to fit the new map coordinates (0-200 for better detail scale)
const PORTS: Point[] = [
  { name: 'Genova', x: 74, y: 35 },
  { name: 'Elba', x: 86, y: 70 },
  { name: 'Napoli', x: 135, y: 110 },
  { name: 'Olbia', x: 80, y: 105 },
  { name: 'Bastia', x: 70, y: 75 },
];

// Simplified coastline paths for Italy and islands
const ITALY_PATH = "M 70,30 L 75,32 L 85,35 L 95,45 L 105,60 L 115,80 L 130,100 L 140,115 L 150,135 L 165,155 L 175,170 L 160,175 L 150,165 L 140,150 L 125,130 L 100,100 L 90,85 L 80,70 L 75,60 L 70,50 L 65,40 Z";
const SARDINIA_PATH = "M 70,100 L 85,100 L 90,110 L 85,130 L 70,135 L 65,120 Z";
const CORSICA_PATH = "M 68,65 L 75,68 L 78,85 L 70,95 L 63,85 L 62,75 Z";
const ELBA_PATH = "M 84,68 L 88,68 L 88,72 L 84,72 Z";

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

const LEG_DISTANCES = [190, 310, 270, 170, 200];
const CUMULATIVE_DISTANCES = [0, 190, 500, 770, 940, 1140];

export default function VirtualMap({ currentLegIndex, athletes }: VirtualMapProps) {
  const [hoveredAthlete, setHoveredAthlete] = useState<string | null>(null);

  const getPosOnRoute = (km: number) => {
    let leg = 0;
    while (leg < 5 && km > CUMULATIVE_DISTANCES[leg + 1]) {
      leg++;
    }
    
    if (leg >= 5) return PORTS[0];

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
    <div className="relative w-full aspect-[4/3] bg-[#e0f2fe] rounded-[2.5rem] border border-blue-200 overflow-hidden shadow-inner">
      <svg viewBox="0 0 200 180" className="w-full h-full drop-shadow-md">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="1" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Landmasses */}
        <g fill="#fef3c7" stroke="#d97706" strokeWidth="0.5" filter="url(#shadow)">
          <path d={ITALY_PATH} />
          <path d={SARDINIA_PATH} />
          <path d={CORSICA_PATH} />
          <path d={ELBA_PATH} />
        </g>

        {/* Route Path */}
        <path
          d={`M ${PORTS[0].x} ${PORTS[0].y} L ${PORTS[1].x} ${PORTS[1].y} L ${PORTS[2].x} ${PORTS[2].y} L ${PORTS[3].x} ${PORTS[3].y} L ${PORTS[4].x} ${PORTS[4].y} Z`}
          fill="none"
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.3"
        />

        {/* Active Leg Highlight */}
        {currentLegIndex >= 0 && currentLegIndex < 5 && (
          <path
            d={`M ${PORTS[currentLegIndex].x} ${PORTS[currentLegIndex].y} L ${PORTS[(currentLegIndex + 1) % 5].x} ${PORTS[(currentLegIndex + 1) % 5].y}`}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinecap="round"
            className="animate-pulse"
          />
        )}

        {/* Port Markers */}
        {PORTS.map((port, i) => (
          <g key={port.name}>
            <circle cx={port.x} cy={port.y} r="2.5" fill="white" stroke="#2563eb" strokeWidth="1" />
            <text 
              x={port.x} 
              y={port.y - 5} 
              textAnchor="middle" 
              className="text-[5px] font-black uppercase tracking-tighter fill-slate-700"
            >
              {port.name}
            </text>
          </g>
        ))}

        {/* Athlete Markers */}
        {athletes.map((athlete) => {
          const pos = getPosOnRoute(athlete.virtual_km);
          const isMe = athlete.is_me;
          return (
            <g 
              key={athlete.id}
              className="cursor-pointer transition-all duration-300"
              onMouseEnter={() => setHoveredAthlete(athlete.id)}
              onMouseLeave={() => setHoveredAthlete(null)}
              onClick={() => setHoveredAthlete(athlete.id)}
            >
              {isMe && (
                <circle cx={pos.x} cy={pos.y} r="6" fill="#2563eb" opacity="0.2">
                  <animate attributeName="r" from="4" to="8" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              
              <circle 
                cx={pos.x} 
                cy={pos.y} 
                r={isMe ? 2.5 : 1.8} 
                fill={isMe ? '#ef4444' : '#3b82f6'} 
                stroke="white"
                strokeWidth="0.8"
              />

              {/* Enhanced Tooltip */}
              {(hoveredAthlete === athlete.id || isMe) && (
                <g>
                  <rect 
                    x={pos.x - 15} 
                    y={pos.y - 12} 
                    width="30" 
                    height="8" 
                    rx="2" 
                    fill="white" 
                    filter="url(#shadow)"
                  />
                  <text 
                    x={pos.x} 
                    y={pos.y - 7} 
                    textAnchor="middle" 
                    className={`text-[4px] font-black uppercase ${isMe ? 'fill-red-600' : 'fill-blue-600'}`}
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
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl border border-white/50 shadow-xl flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
            <span className="text-[12px] font-black uppercase text-slate-600">Tu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
            <span className="text-[12px] font-black uppercase text-slate-600">Squadra</span>
          </div>
        </div>
      </div>
    </div>
  );
}
