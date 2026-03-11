import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Plus, Trash2, Mail, Building2, Check, X, ChevronRight, ChevronDown, Clock, UserCheck } from 'lucide-react';

interface Coach {
  id: string;
  email: string;
  full_name: string | null;
  company_id: string;
  last_active_at: string | null;
  athlete_count?: number;
}

interface Athlete {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  last_active_at: string | null;
}

interface Company {
  id: string;
  name: string;
}

export default function CompanyPanel({ userEmail }: { userEmail: string }) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [coachAthletes, setCoachAthletes] = useState<Record<string, Athlete[]>>({});
  const [loadingAthletes, setLoadingAthletes] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Trova la società di cui l'utente è manager
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('account_manager_email', userEmail)
      .maybeSingle();

    if (companyError) {
      // Silently handle or use a better error UI
    } else if (companyData) {
      setCompany(companyData);
      
      // 2. Prendi gli allenatori di quella società con il conteggio degli atleti
      const { data: coachesData, error: coachesError } = await supabase
        .from('coaches')
        .select('*, athletes(count)')
        .eq('company_id', companyData.id)
        .order('email');
        
      if (!coachesError && coachesData) {
        const formattedData = coachesData.map((c: any) => ({
          ...c,
          athlete_count: c.athletes?.[0]?.count || 0
        }));
        setCoaches(formattedData);
      }
    }
    setLoading(false);
  };

  const fetchAthletesForCoach = async (coachId: string) => {
    if (coachAthletes[coachId]) return;
    
    setLoadingAthletes(coachId);
    const { data, error } = await supabase
      .from('athletes')
      .select('id, email, full_name, status, last_active_at')
      .eq('coach_id', coachId)
      .order('full_name');
    
    if (!error && data) {
      setCoachAthletes(prev => ({ ...prev, [coachId]: data }));
    }
    setLoadingAthletes(null);
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchAthletesForCoach(id);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userEmail]);

  const handleAddCoach = async () => {
    if (!newEmail.trim() || !company) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('coaches')
      .insert({
        email: newEmail.trim().toLowerCase(),
        full_name: newName.trim() || null,
        company_id: company.id
      });
      
    if (!error) {
      setNewEmail('');
      setNewName('');
      setShowAddForm(false);
      await fetchData();
    } else {
      if (error.code === '23505') {
        alert('Questo allenatore è già registrato (anche presso un\'altra società).');
      } else {
        alert('Errore durante l\'aggiunta dell\'allenatore: ' + error.message);
      }
    }
    setIsSaving(false);
  };

  const handleDeleteCoach = async (id: string) => {
    setIsSaving(true);
    const { error } = await supabase
      .from('coaches')
      .delete()
      .eq('id', id);
      
    if (!error) {
      setConfirmingDeleteId(null);
      await fetchData();
    } else {
      alert('Errore durante la rimozione: ' + error.message);
    }
    setIsSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-amber-800">
        <h2 className="text-xl font-bold mb-2">Accesso Limitato</h2>
        <p>Il tuo account non è attualmente associato come manager di alcuna società. Contatta l'amministratore di sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center">
            <Building2 className="w-8 h-8 mr-3 text-blue-600 bg-blue-100 p-1.5 rounded-xl" />
            {company.name}
          </h1>
          <p className="text-slate-500 mt-1 pl-11">Gestione degli allenatori abilitati sulla piattaforma.</p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-600/20"
        >
          {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showAddForm ? 'Annulla' : 'Aggiungi Allenatore'}
        </button>
      </header>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm animate-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            Nuovo invito allenatore
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Email (obbligatoria)</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="allenatore@email.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Nome Completo</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="es. Mario Rossi"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleAddCoach}
              disabled={isSaving || !newEmail.trim()}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              Invia invito / Abilita
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            Elenco Allenatori
          </h2>
        </div>

        {coaches.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium">Nessun allenatore ancora abilitato.</p>
            <p className="text-slate-400 text-sm">Usa il pulsante in alto per aggiungere il primo membro del team.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {coaches.map((coach) => (
              <div key={coach.id} className="group transition-all">
                {/* Coach Header Row */}
                <div 
                  className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition cursor-pointer ${expandedId === coach.id ? 'bg-slate-50 border-l-4 border-blue-500' : ''}`}
                  onClick={() => toggleExpand(coach.id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-1 rounded-lg bg-white border border-slate-100 text-slate-400 group-hover:text-blue-500 transition">
                      {expandedId === coach.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                        {coach.full_name?.[0].toUpperCase() || coach.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">{coach.full_name || 'Allenatore Senza Nome'}</p>
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider border border-blue-100">
                            {coach.athlete_count} ATLETI
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{coach.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {coach.last_active_at && (
                      <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Ultimo Accesso
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          {new Date(coach.last_active_at).toLocaleString('it-IT')}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      {confirmingDeleteId === coach.id ? (
                        <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-2 duration-300" onClick={e => e.stopPropagation()}>
                          <span className="text-xs font-bold text-red-500">Rimuovi?</span>
                          <button
                            onClick={() => handleDeleteCoach(coach.id)}
                            className="p-2 text-white bg-red-500 rounded-lg hover:bg-red-600"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(null)}
                            className="p-2 text-slate-400 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingDeleteId(coach.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 rounded-lg transition-all"
                          title="Rimuovi accesso"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible Content: Athlete List */}
                {expandedId === coach.id && (
                  <div className="bg-slate-50/50 border-t border-slate-100 px-16 py-6 animate-in slide-in-from-top-2 duration-300">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                      <Users className="w-3 h-3 mr-1.5" />
                      Atleti in carico ({coach.athlete_count})
                    </h3>
                    
                    {loadingAthletes === coach.id ? (
                      <div className="text-xs text-slate-400 italic py-2">Caricamento atleti...</div>
                    ) : (coachAthletes[coach.id]?.length || 0) === 0 ? (
                      <div className="text-sm text-slate-400 italic py-4 bg-white border border-dashed border-slate-200 rounded-xl text-center">
                        Nessun atleta associato a questo coach.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {coachAthletes[coach.id].map(athlete => (
                          <div key={athlete.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition group/row">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${athlete.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                {athlete.full_name?.[0] || athlete.email[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-700">{athlete.full_name || 'Atleta Senza Nome'}</p>
                                  {athlete.status === 'active' ? (
                                    <UserCheck className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Clock className="w-3 h-3 text-amber-500" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium">{athlete.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider mb-0.5">Ultimo Accesso</p>
                              <p className="text-[11px] font-bold text-slate-500">
                                {athlete.last_active_at 
                                  ? new Date(athlete.last_active_at).toLocaleString('it-IT')
                                  : 'Nessuna attività'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
