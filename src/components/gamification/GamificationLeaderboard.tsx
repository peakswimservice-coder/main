import { useState, useEffect } from 'react';
import { Search, Trophy, Medal, Star, User, Navigation, ChevronRight, Hash } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface LeaderboardEntry {
  rank: number;
  athlete_id: string;
  full_name: string;
  virtual_km: number;
  total_points: number;
  is_me: boolean;
  leg_points?: Record<number, number>; // leg_id -> points
}

interface GamificationLeaderboardProps {
  userId?: string;
}

export default function GamificationLeaderboard({ userId }: GamificationLeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'leg' | 'total'>('leg');
  const [searchTerm, setSearchTerm] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [fullEntries, setFullEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [legs, setLegs] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch ranking from RPC
      const { data: leaderboard, error } = await supabase.rpc('get_gamification_leaderboard', { 
        p_athlete_id: userId 
      });
      if (error) throw error;

      // 2. Fetch all legs
      const { data: legData } = await supabase.from('gamification_legs').select('*').order('id');
      setLegs(legData || []);

      // 3. Fetch all leg points for the participants to show the grid in "total" view
      const { data: allPoints } = await supabase
        .from('athlete_leg_points')
        .select('athlete_id, leg_id, points');

      // 4. Enrich entries with leg-by-leg points
      const enrichedEntries = (leaderboard || []).map((entry: any) => {
        const entryLegPoints: Record<number, number> = {};
        (allPoints || []).forEach(p => {
          if (p.athlete_id === entry.athlete_id) {
            entryLegPoints[p.leg_id] = p.points;
          }
        });
        return {
          ...entry,
          leg_points: entryLegPoints
        };
      });

      setEntries(enrichedEntries);
      
      // Also fetch all athletes for a "fake" full list for searching positions if they are hidden
      // (The RPC only returns Top 5 + Neighbors, so search only works on those. 
      // If user wants to search ANY athlete, we would need a different RPC or a full fetch)
      // Since it's a small app, let's just fetch all names and positions once.
      // For now, search works on the visible entries based on the rule.

    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, activeTab]);

  const filteredEntries = entries.filter(e => e.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col h-full max-h-[85vh]">
      <header className="p-6 md:p-8 bg-slate-50 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 italic uppercase">
              <Trophy className="w-8 h-8 text-amber-500" /> Il Trofeo della Birra
            </h2>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Classifiche Ufficiali</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Cerca atleta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl w-full md:w-64 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm"
            />
          </div>
        </div>

        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1">
          <button 
            onClick={() => setActiveTab('leg')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'leg' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Navigation className="w-4 h-4" /> Tappa Corrente
          </button>
          <button 
            onClick={() => setActiveTab('total')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'total' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Star className="w-4 h-4" /> Classifica Generale
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-8 bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 opacity-50">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Caricamento Classifica...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <User className="w-12 h-12 mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black">Nessun atleta in questa sezione</p>
          </div>
        ) : (
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-6 py-2">Pos</th>
                <th className="px-6 py-2">Atleta</th>
                {activeTab === 'leg' && <th className="px-6 py-2 text-right">Km Virtuali</th>}
                {activeTab === 'total' && (
                  <>
                    {legs.map(leg => (
                      <th key={leg.id} className="px-4 py-2 text-center text-[9px] min-w-[70px]">
                        T{leg.id} <span className="block opacity-50 font-normal">{leg.name.split(' → ')[1] || leg.name}</span>
                      </th>
                    ))}
                    <th className="px-6 py-2 text-right text-blue-600">Tot Punti</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr 
                  key={entry.athlete_id}
                  className={`group transition-all ${
                    entry.is_me 
                      ? 'bg-blue-600 shadow-xl shadow-blue-200' 
                      : 'bg-white hover:bg-slate-50 border border-slate-100'
                  }`}
                >
                  <td className={`px-6 py-5 rounded-l-[1.5rem] font-black italic text-lg ${entry.is_me ? 'text-white' : 'text-slate-400'}`}>
                    {entry.rank <= 3 && !searchTerm ? (
                      <div className="flex items-center gap-2">
                        <Medal className={`w-6 h-6 ${entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-slate-300' : 'text-amber-700'}`} />
                        <span>{entry.rank}</span>
                      </div>
                    ) : (
                      <span>#{entry.rank}</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <p className={`font-black uppercase truncate text-sm ${entry.is_me ? 'text-white' : 'text-slate-900'}`}>{entry.full_name}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${entry.is_me ? 'text-blue-100' : 'text-slate-400'}`}>
                        {entry.is_me ? 'Il Tuo Profilo' : 'Atleta Attivo'}
                      </p>
                    </div>
                  </td>

                  {activeTab === 'leg' && (
                    <td className="px-6 py-5 text-right rounded-r-[1.5rem]">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs italic ${
                        entry.is_me ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {entry.virtual_km.toFixed(1)} km
                      </div>
                    </td>
                  )}

                  {activeTab === 'total' && (
                    <>
                      {legs.map(leg => (
                        <td key={leg.id} className={`px-4 py-5 text-center font-bold text-xs ${entry.is_me ? 'text-blue-100' : 'text-slate-500'}`}>
                          {entry.leg_points?.[leg.id] !== undefined ? `${entry.leg_points[leg.id]}pt` : '-'}
                        </td>
                      ))}
                      <td className="px-6 py-5 text-right rounded-r-[1.5rem]">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm italic ${
                          entry.is_me ? 'bg-white text-blue-600' : 'bg-slate-900 text-white'
                        }`}>
                          {entry.total_points} pt
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <footer className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-[10px] font-black uppercase text-slate-400">Tu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] font-black uppercase text-slate-400">Podio</span>
          </div>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggiornato in tempo reale</p>
      </footer>
    </div>
  );
}
