import { useState, useEffect } from 'react';
import { Beer, ChevronRight, Map as MapIcon, Trophy, Info, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import VirtualMap from './VirtualMap';
import GamificationLeaderboard from './GamificationLeaderboard';
import GamificationInfo from './GamificationInfo';

interface GamificationCardProps {
  userId?: string;
}

export default function GamificationCard({ userId }: GamificationCardProps) {
  const [loading, setLoading] = useState(true);
  const [currentLeg, setCurrentLeg] = useState<any>(null);
  const [virtualKm, setVirtualKm] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [showFullView, setShowFullView] = useState(false);
  const [fullViewTab, setFullViewTab] = useState<'map' | 'leaderboard' | 'info'>('map');
  const [allAthletes, setAllAthletes] = useState<any[]>([]);

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Fetch current leg and settings
      const { data: settings } = await supabase.from('gamification_settings').select('current_leg_id').maybeSingle();
      const legId = settings?.current_leg_id || 1;

      const { data: legs } = await supabase.from('gamification_legs').select('*').order('id');
      if (legs) {
        const current = legs.find(l => l.id === legId);
        setCurrentLeg(current);
      }

      // 2. Calculate my virtual KM
      const { data: myKm } = await supabase.rpc('calculate_athlete_virtual_km', { p_athlete_id: userId });
      setVirtualKm(myKm || 0);

      // 3. Get rank (from a simple query or RPC if we had a non-filtered one)
      // For the card, we'll just use the RPC but might need to fetch all if we want real rank
      const { data: leaderboard } = await supabase.rpc('get_gamification_leaderboard', { p_athlete_id: userId });
      if (leaderboard) {
        const me = (leaderboard as any[]).find(e => e.is_me);
        if (me) setRank(me.rank);
        setAllAthletes(leaderboard);
      }

    } catch (err) {
      console.error("Error fetching gamification data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  if (loading && !currentLeg) return null;

  const legProgress = currentLeg ? ((virtualKm - (currentLeg.cumulative_km - currentLeg.distance_km)) / currentLeg.distance_km) * 100 : 0;
  const clampedProgress = Math.min(Math.max(legProgress, 0), 100);

  return (
    <>
      <div className="bg-white rounded-[2rem] shadow-xl shadow-amber-900/5 border border-amber-100 overflow-hidden transition-all hover:shadow-2xl hover:shadow-amber-900/10 group">
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <Beer className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight">Trofeo della Birra</h3>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-0.5">Il tuo viaggio virtuale</p>
              </div>
            </div>
            {rank && (
              <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg shadow-slate-200">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-black italic">#{rank}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tappa Attuale</p>
                <p className="text-lg font-black text-slate-800">{currentLeg?.name || 'In rotta...'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Km Totali</p>
                <p className="text-lg font-black text-blue-600 italic">{virtualKm.toFixed(1)} <span className="text-xs uppercase ml-1">km</span></p>
              </div>
            </div>

            <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full shadow-lg shadow-amber-200 transition-all duration-1000 ease-out"
                style={{ width: `${clampedProgress}%` }}
              >
                <div className="absolute top-0 right-0 h-full w-8 bg-white/20 skew-x-[-20deg] animate-pulse" />
              </div>
            </div>

            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              <span>{currentLeg?.start_port}</span>
              <span>{currentLeg?.end_port}</span>
            </div>
          </div>

          <button 
            onClick={() => { setShowFullView(true); setFullViewTab('map'); }}
            className="mt-8 w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
          >
            Esplora Mappa e Classifica <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* FULL VIEW MODAL */}
      {showFullView && (
        <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col animate-in slide-in-from-bottom-8 duration-300">
          <header className="bg-white p-4 md:p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 p-2 rounded-xl">
                <Beer className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900 italic uppercase">Trofeo della Birra</h2>
            </div>
            <button 
              onClick={() => setShowFullView(false)}
              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </header>

          <nav className="bg-white border-b border-slate-200 px-4 flex gap-6 overflow-x-auto no-scrollbar">
            {[
              { id: 'map', label: 'Mappa', icon: MapIcon },
              { id: 'leaderboard', label: 'Classifica', icon: Trophy },
              { id: 'info', label: 'Regolamento', icon: Info },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFullViewTab(tab.id as any)}
                className={`py-4 px-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${
                  fullViewTab === tab.id 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </nav>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
            <div className="max-w-4xl mx-auto h-full">
              {fullViewTab === 'map' && (
                <div className="animate-in fade-in zoom-in-95 duration-300 h-full flex flex-col gap-6">
                  <VirtualMap 
                    currentLegIndex={(currentLeg?.id || 1) - 1} 
                    athletes={allAthletes.map(a => ({
                      id: a.athlete_id,
                      name: a.full_name,
                      virtual_km: a.virtual_km,
                      is_me: a.is_me
                    }))}
                  />
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-black text-slate-900 uppercase mb-2">Tappa: {currentLeg?.name}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Siamo sulla rotta da <span className="font-bold">{currentLeg?.start_port}</span> a <span className="font-bold">{currentLeg?.end_port}</span>. 
                      Hai percorso <span className="text-blue-600 font-bold">{virtualKm.toFixed(1)} km</span> virtuali su un totale di {currentLeg?.cumulative_km} km necessari per questa tappa.
                    </p>
                  </div>
                </div>
              )}
              {fullViewTab === 'leaderboard' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full">
                  <GamificationLeaderboard userId={userId} />
                </div>
              )}
              {fullViewTab === 'info' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <GamificationInfo />
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </>
  );
}
