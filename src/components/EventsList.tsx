import { useState, useEffect } from 'react';
import { Calendar, MapPin, ExternalLink, Plus, Clock, Trash2, Edit2, X, Check, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

interface Race {
  id: string;
  coach_id: string;
  name: string;
  location: string;
  date: string;
  flyer_url: string | null;
  registration_deadline: string;
  is_fin: boolean;
  group_id: string;
  groups?: {
    name: string;
    color: string;
  };
}

interface EventsListProps {
  userRole?: 'admin' | 'company_manager' | 'coach' | 'athlete' | 'none';
}

export default function EventsList({ userRole: initialRole = 'coach' }: EventsListProps) {
  const [races, setRaces] = useState<Race[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState(initialRole);
  const [isDelegated, setIsDelegated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);
  const [expandedRaceId, setExpandedRaceId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    date: '',
    flyer_url: '',
    registration_deadline: '',
    is_fin: false,
    group_id: '',
  });

  const fetchData = async (currentSession: Session) => {
    setLoading(true);
    try {
      // 1. Get User Info & Role
      let role = initialRole;
      let delegated = false;

      if (role === 'athlete') {
        const { data: athleteData } = await supabase
          .from('athletes')
          .select('is_delegated, group_id')
          .eq('id', currentSession.user.id)
          .maybeSingle();
        
        if (athleteData) {
          delegated = athleteData.is_delegated;
          setIsDelegated(delegated);
        }
      }
      setUserRole(role);

      // 2. Fetch Groups
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .order('name');
      if (groupsData) setGroups(groupsData);

      // 3. Fetch Races
      let query = supabase
        .from('races')
        .select(`
          *,
          groups ( name, color )
        `);

      const { data: racesData, error } = await query.order('registration_deadline', { ascending: true });
      
      if (error) throw error;
      if (racesData) setRaces(racesData);

    } catch (err) {
      console.error('Error fetching races:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData(session);
    });
  }, []);

  const handleOpenModal = (race: Race | null = null) => {
    if (race) {
      setEditingRace(race);
      setFormData({
        name: race.name,
        location: race.location,
        date: race.date,
        flyer_url: race.flyer_url || '',
        registration_deadline: new Date(race.registration_deadline).toISOString().slice(0, 16),
        is_fin: race.is_fin,
        group_id: race.group_id,
      });
    } else {
      setEditingRace(null);
      setFormData({
        name: '',
        location: '',
        date: '',
        flyer_url: '',
        registration_deadline: '',
        is_fin: false,
        group_id: groups[0]?.id || '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      // Get Coach ID
      const { data: userData } = await supabase
        .from(userRole === 'coach' ? 'coaches' : 'athletes')
        .select('coach_id, id')
        .eq(userRole === 'coach' ? 'email' : 'id', userRole === 'coach' ? session.user.email : session.user.id)
        .maybeSingle();

      const coachId = userRole === 'coach' ? userData?.id : userData?.coach_id;

      if (!coachId) throw new Error('Coach ID non trovato');

      const racePayload = {
        ...formData,
        coach_id: coachId,
        registration_deadline: new Date(formData.registration_deadline).toISOString(),
      };

      if (editingRace) {
        const { error } = await supabase
          .from('races')
          .update(racePayload)
          .eq('id', editingRace.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('races')
          .insert(racePayload);
        if (error) throw error;
      }

      // Notify athletes
      const group = groups.find(g => g.id === formData.group_id);
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'race_update',
          groupId: formData.group_id,
          groupName: group?.name,
          raceName: formData.name,
          date: formData.date,
        })
      });

      setShowModal(false);
      fetchData(session);
    } catch (err) {
      console.error('Error saving race:', err);
      alert('Errore durante il salvataggio.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa gara?')) return;
    try {
      const { error } = await supabase.from('races').delete().eq('id', id);
      if (error) throw error;
      if (session) fetchData(session);
    } catch (err) {
      console.error('Error deleting race:', err);
    }
  };

  const getDeadlineStatus = (deadline: string) => {
    const now = new Date();
    const target = new Date(deadline);
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Iscrizioni Chiuse', color: 'text-slate-500', bg: 'bg-slate-100' };
    if (diffDays <= 7) return { label: `Scade in ${diffDays}gg`, color: 'text-white', bg: 'bg-red-500' };
    if (diffDays <= 19) return { label: `Scade in ${diffDays}gg`, color: 'text-slate-900', bg: 'bg-yellow-400' };
    return { label: `Scade in ${diffDays}gg`, color: 'text-white', bg: 'bg-emerald-500' };
  };

  const canManage = userRole === 'coach' || isDelegated;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Calendario Gare ed Eventi</h1>
          <p className="text-slate-500 mt-1">
            {canManage ? 'Gestisci la programmazione competitiva e delega gli atleti.' : 'Visualizza il calendario delle gare e degli eventi.'}
          </p>
        </div>
        {canManage && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5 mr-2" /> Nuovo Evento
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6">
        {races.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Calendar className="w-8 h-8" />
            </div>
            <p className="text-slate-500 font-medium text-lg">Nessuna gara in programma.</p>
          </div>
        ) : (
          races.map((race) => {
            const status = getDeadlineStatus(race.registration_deadline);
            const isExpanded = expandedRaceId === race.id;
            
            return (
              <div 
                key={race.id} 
                className="bg-white rounded-2xl shadow-sm border-l-8 overflow-hidden hover:shadow-md transition-all group"
                style={{ borderLeftColor: race.groups?.color || '#3B82F6' }}
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center gap-6">
                  {/* Status Badge */}
                  <div className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-center min-w-[120px] ${status.bg} ${status.color}`}>
                    {status.label}
                  </div>

                  <div className="flex-1 cursor-pointer" onClick={() => setExpandedRaceId(isExpanded ? null : race.id)}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${race.is_fin ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {race.is_fin ? 'FIN' : 'NON FIN'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{race.groups?.name}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{race.name}</h3>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                       <div className="flex items-center text-sm font-bold text-slate-600">
                        <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                        {new Date(race.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-sm font-bold text-slate-600">
                        <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                        {race.location}
                      </div>
                      <div className="flex items-center text-sm font-bold text-slate-600">
                        <Clock className="w-4 h-4 mr-2 text-blue-500" />
                        Scadenza: {new Date(race.registration_deadline).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => setExpandedRaceId(isExpanded ? null : race.id)}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                    {canManage && (
                      <>
                        <button 
                          onClick={() => handleOpenModal(race)}
                          className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(race.id)}
                          className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-6 pt-2 border-t border-slate-50 animate-in slide-in-from-top-4 duration-300">
                    {race.flyer_url && (
                      <div className="mt-4 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 relative group/flyer">
                        <a 
                          href={race.flyer_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/0 hover:bg-slate-900/20 transition-all opacity-0 group-hover/flyer:opacity-100"
                        >
                          <div className="bg-white p-3 rounded-full shadow-xl"><ExternalLink className="w-6 h-6 text-blue-600" /></div>
                        </a>
                        <iframe 
                          src={race.flyer_url} 
                          className="w-full h-[600px] border-none"
                          title="Locandina"
                        />
                      </div>
                    )}
                    {!race.flyer_url && (
                      <div className="p-8 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">Nessuna locandina disponibile.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nuovo/Modifica Gara */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {editingRace ? 'Modifica Gara' : 'Nuova Gara'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Nome Evento</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-800"
                  placeholder="Es. Trofeo Città di Milano"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Luogo</label>
                  <input 
                    type="text" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-800"
                    placeholder="Luogo evento"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Data Gara</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">URL Locandina</label>
                <input 
                  type="url" 
                  value={formData.flyer_url}
                  onChange={(e) => setFormData({...formData, flyer_url: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-800"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Termine Iscrizioni</label>
                <input 
                  type="datetime-local" 
                  value={formData.registration_deadline}
                  onChange={(e) => setFormData({...formData, registration_deadline: e.target.value})}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Gruppo Atleti</label>
                  <select 
                    value={formData.group_id}
                    onChange={(e) => setFormData({...formData, group_id: e.target.value})}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-800"
                  >
                    <option value="" disabled>Seleziona Gruppo</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tipo Gara</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl h-full">
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, is_fin: true})}
                      className={`flex-1 py-1 rounded-lg text-xs font-black transition-all ${formData.is_fin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      FIN
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, is_fin: false})}
                      className={`flex-1 py-1 rounded-lg text-xs font-black transition-all ${!formData.is_fin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                      NON FIN
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" /> {editingRace ? 'Aggiorna Gara' : 'Salva Gara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
