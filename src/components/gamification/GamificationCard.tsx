import { useState, useEffect } from 'react';
import { Beer, Trophy, Info, X, Star, Medal, Search, Navigation } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import VirtualMap from './VirtualMap';
import GamificationInfo from './GamificationInfo';

interface GamificationCardProps {
  userId?: string;
  isCoach?: boolean;
  refreshTrigger?: number;
}

interface LeaderboardEntry {
  rank: number;
  athlete_id: string;
  full_name: string;
  virtual_km: number;
  total_points: number;
  is_me: boolean;
  leg_points?: Record<number, number>;
}

export default function GamificationCard({ userId, isCoach = false, refreshTrigger = 0 }: GamificationCardProps) {
  const [loading, setLoading] = useState(true);
  const [currentLeg, setCurrentLeg] = useState<any>(null);
  const [legs, setLegs] = useState<any[]>([]);
  const [virtualKm, setVirtualKm] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [allAthletes, setAllAthletes] = useState<LeaderboardEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'total' | 'info'>('total');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: settings } = await supabase.from('gamification_settings').select('current_leg_id').maybeSingle();
      const legId = settings?.current_leg_id || 1;
      const { data: legData } = await supabase.from('gamification_legs').select('*').order('id');
      if (legData) {
        setLegs(legData);
        setCurrentLeg(legData.find(l => l.id === legId) || legData[0]);
      }

      if (userId && !isCoach) {
        const { data: myKm } = await supabase.rpc('calculate_athlete_virtual_km', { p_athlete_id: userId });
        setVirtualKm(myKm || 0);
      }

      const { data: leaderboard } = await supabase.rpc('get_gamification_leaderboard', { p_athlete_id: userId || null });
      if (leaderboard) {
        // Enrich with leg points
        const { data: allPoints } = await supabase.from('athlete_leg_points').select('athlete_id, leg_id, points');
        const enriched = (leaderboard as any[]).map(entry => {
          const lp: Record<number, number> = {};
          (allPoints || []).forEach(p => { if (p.athlete_id === entry.athlete_id) lp[p.leg_id] = p.points; });
          return { ...entry, leg_points: lp };
        });
        setAllAthletes(enriched);
        if (!isCoach) {
          const me = enriched.find(e => e.is_me);
          if (me) setRank(me.rank);
        }
      }
    } catch (err) {
      console.error("Gamification fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [userId, refreshTrigger]);

  const legProgress = currentLeg
    ? Math.min(Math.max(((virtualKm - (currentLeg.cumulative_km - currentLeg.distance_km)) / currentLeg.distance_km) * 100, 0), 100)
    : 0;

  const currentLegIndex = currentLeg ? legs.findIndex(l => l.id === currentLeg.id) : 0;

  // Top 5 leaderboard for inline display (current leg)
  const inlineLeaderboard = allAthletes.slice(0, 5);
  const filteredTotal = allAthletes.filter(e => e.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading && !currentLeg) return null;

  return (
    <>
      <div className="bg-white rounded-[2rem] shadow-xl shadow-amber-900/5 border border-amber-100 overflow-hidden">
        {/* HEADER */}
        <div className="p-6 md:p-8 border-b border-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-2xl">
              <Beer className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight">Trofeo della Birra</h3>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-0.5">
                {isCoach ? 'Classifica Atleti' : 'Il tuo viaggio virtuale'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {rank && !isCoach && (
              <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-black italic">#{rank}</span>
              </div>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="p-3 bg-slate-100 hover:bg-amber-100 rounded-2xl text-slate-500 hover:text-amber-600 transition-all"
              title="Regolamento e Classifica Generale"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAPPA INFO */}
        {!isCoach && currentLeg && (
          <div className="px-6 md:px-8 pt-6">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tappa Attuale</p>
                <p className="text-base font-black text-slate-800">{currentLeg.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">I tuoi Kmv</p>
                <p className="text-base font-black text-blue-600 italic">{virtualKm.toFixed(1)} <span className="text-xs uppercase">Kmv</span></p>
              </div>
            </div>
            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 mb-2">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${legProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-6">
              <span>{currentLeg.start_port}</span>
              <span>{currentLeg.end_port}</span>
            </div>
          </div>
        )}

        {/* MAP - INLINE */}
        <div className="px-6 md:px-8 pb-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mappa del Percorso</p>
          <VirtualMap
            currentLegIndex={currentLegIndex}
            athletes={allAthletes.map(a => ({
              id: a.athlete_id,
              name: a.full_name,
              virtual_km: a.virtual_km,
              is_me: a.is_me,
            }))}
          />
        </div>

        {/* CLASSIFICA TAPPA CORRENTE - INLINE TOP 5 */}
        <div className="border-t border-slate-100 px-6 md:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5" /> Tappa Corrente — Top 5
            </p>
            <button
              onClick={() => { setShowModal(true); setModalTab('total'); }}
              className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
            >
              Vedi Classifica Generale →
            </button>
          </div>
          <div className="space-y-2">
            {inlineLeaderboard.map(entry => (
              <div
                key={entry.athlete_id}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${entry.is_me ? 'bg-blue-600 text-white' : 'bg-slate-50'}`}
              >
                <span className={`text-sm font-black italic w-8 shrink-0 ${entry.is_me ? 'text-white' : 'text-slate-400'}`}>
                  #{entry.rank}
                </span>
                <span className={`flex-1 font-black text-sm truncate ${entry.is_me ? 'text-white' : 'text-slate-800'}`}>
                  {entry.full_name}
                </span>
                <span className={`text-xs font-black italic shrink-0 ${entry.is_me ? 'text-blue-100' : 'text-blue-600'}`}>
                  {entry.virtual_km.toFixed(1)} Kmv
                </span>
              </div>
            ))}
            {inlineLeaderboard.length === 0 && (
              <div className="text-center py-8 text-slate-300 text-xs font-black uppercase tracking-widest">Nessun dato disponibile</div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Classifica Generale + Regolamento */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full md:max-w-3xl md:rounded-[2.5rem] rounded-t-[2.5rem] max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-xl"><Beer className="w-5 h-5 text-amber-600" /></div>
                <h2 className="text-lg font-black text-slate-900 italic uppercase">Trofeo della Birra</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex bg-slate-100/50 p-1.5 mx-6 mt-4 rounded-2xl gap-1">
              <button
                onClick={() => setModalTab('total')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'total' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                <Star className="w-3.5 h-3.5" /> Classifica Generale
              </button>
              <button
                onClick={() => setModalTab('info')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                <Info className="w-3.5 h-3.5" /> Regolamento
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4">
              {modalTab === 'total' && (
                <div className="px-6 pb-8">
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cerca atleta..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 font-bold text-sm transition-all"
                    />
                  </div>
                  {/* Compact table: Name | T1..T5 | Tot */}
                  <div className="overflow-x-auto rounded-3xl border border-slate-100">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-4 py-3 font-black text-slate-400 uppercase tracking-wider">#</th>
                          <th className="text-left px-3 py-3 font-black text-slate-400 uppercase tracking-wider">Atleta</th>
                          {legs.map(leg => (
                            <th key={leg.id} className="text-center px-2 py-3 font-black text-slate-400 uppercase">
                              T{leg.id}
                            </th>
                          ))}
                          <th className="text-right px-4 py-3 font-black text-blue-600 uppercase tracking-wider">Tot</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredTotal.map(entry => (
                          <tr
                            key={entry.athlete_id}
                            className={`transition-all ${entry.is_me ? 'bg-blue-600' : 'hover:bg-slate-50'}`}
                          >
                            <td className={`px-4 py-3 font-black italic ${entry.is_me ? 'text-white' : 'text-slate-400'}`}>
                              {entry.rank <= 3 ? (
                                <Medal className={`w-4 h-4 inline ${entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-slate-300' : 'text-amber-700'}`} />
                              ) : `#${entry.rank}`}
                            </td>
                            <td className={`px-3 py-3 font-bold truncate max-w-[90px] ${entry.is_me ? 'text-white' : 'text-slate-800'}`}>
                              {entry.full_name}
                            </td>
                            {legs.map(leg => (
                              <td key={leg.id} className={`px-2 py-3 text-center font-bold ${entry.is_me ? 'text-blue-100' : 'text-slate-400'}`}>
                                {entry.leg_points?.[leg.id] !== undefined ? `${entry.leg_points[leg.id]}` : '—'}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right">
                              <span className={`font-black italic px-2 py-1 rounded-lg text-xs ${entry.is_me ? 'bg-white text-blue-600' : 'bg-slate-900 text-white'}`}>
                                {entry.total_points}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {modalTab === 'info' && <GamificationInfo />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
