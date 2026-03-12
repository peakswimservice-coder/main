import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, UserPlus, Check, X, Edit2, Trash2, CreditCard, Eye, FileText } from 'lucide-react';

import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

const TesserinoPreview = ({ url, onClick }: { url: string; onClick: () => void }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getUrl = async () => {
      if (!url.includes('federation-cards/')) {
        setSignedUrl(url);
        return;
      }
      setLoading(true);
      try {
        const cleanPath = url.split('federation-cards/').pop();
        if (cleanPath) {
          const { data, error } = await supabase.storage
            .from('federation-cards')
            .createSignedUrl(cleanPath, 3600);
          if (error) throw error;
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error("Error fetching preview URL:", err);
      } finally {
        setLoading(false);
      }
    };
    getUrl();
  }, [url]);

  if (loading) return <div className="w-full h-24 bg-slate-50 flex items-center justify-center rounded-xl animate-pulse text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">Caricamento...</div>;
  if (!signedUrl) return null;

  const isPdf = signedUrl.toLowerCase().includes('.pdf');

  return (
    <div className="w-full mt-4 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex flex-col">
      <div className="w-full flex items-center justify-center p-2">
        {isPdf ? (
          <div className="py-8 flex flex-col items-center gap-2">
            <FileText className="w-12 h-12 text-blue-600" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento PDF</span>
          </div>
        ) : (
          <img 
            src={signedUrl} 
            alt="Preview" 
            className="w-full h-auto object-contain max-h-[150px] cursor-zoom-in"
            onClick={onClick}
          />
        )}
      </div>
      <button 
        onClick={onClick}
        className="w-full py-3 bg-white border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-black text-blue-600 hover:bg-slate-50 transition-colors uppercase tracking-widest"
      >
        <Search className="w-3.5 h-3.5" /> Ingrandisci
      </button>
    </div>
  );
};

export default function AthletesList() {
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [athletes, setAthletes] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [coach, setCoach] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);

  const fetchData = async (currentSession: Session) => {
    setLoading(true);
    try {
      // 1. Fetch coach data
      const { data: coachData } = await supabase
        .from('coaches')
        .select('*')
        .eq('email', currentSession.user.email)
        .maybeSingle();

      if (coachData) {
        setCoach(coachData);

        // 2. Fetch athletes for this coach
        const { data: athletesData } = await supabase
          .from('athletes')
          .select(`
            *,
            groups ( name )
          `)
          .eq('coach_id', coachData.id)
          .order('full_name', { ascending: true });

        if (athletesData) {
          setAthletes(athletesData.filter(a => a.status === 'active'));
          setPending(athletesData.filter(a => a.status === 'pending'));
        }

        // 3. Fetch groups for assignment
        const { data: groupsData } = await supabase
          .from('groups')
          .select('*')
          .order('name');
          
        if (groupsData) setGroups(groupsData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchData(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchData(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleApprove = async (athleteId: string, groupId: string | null) => {
    if (!groupId) {
      alert('Seleziona un gruppo per l\'atleta prima di approvare.');
      return;
    }

    try {
      const { error } = await supabase
        .from('athletes')
        .update({ status: 'active', group_id: groupId })
        .eq('id', athleteId);

      if (error) throw error;

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'status_update',
          athleteId: athleteId,
          status: 'active',
          groupName: groups.find(g => g.id === groupId)?.name
        })
      });

      if (session) fetchData(session);
    } catch (err) {
      console.error('Errore durante l\'approvazione:', err);
      alert('Errore durante l\'approvazione.');
    }
  };

  const handleReject = async (athleteId: string) => {
    if (!confirm('Sei sicuro di voler rifiutare questa richiesta?')) return;

    try {
      const { error } = await supabase
        .from('athletes')
        .update({ status: 'rejected' })
        .eq('id', athleteId);

      if (error) throw error;

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'status_update',
          athleteId: athleteId,
          status: 'rejected'
        })
      });

      if (session) fetchData(session);
    } catch (err) {
      console.error('Errore durante il rifiuto:', err);
    }
  };

  const handleRemoveAthlete = async (athleteId: string) => {
    if (!confirm('Sei sicuro di voler rimuovere questo atleta? Dovrà inserire nuovamente il codice invito per rientrare.')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('athletes')
        .delete()
        .eq('id', athleteId);

      if (error) throw error;
      
      setShowOptionsId(null);
      if (session) await fetchData(session);
    } catch (err) {
      console.error('Errore durante la rimozione:', err);
      alert('Errore durante la rimozione.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async (athleteId: string, newGroupId: string) => {
    if (!newGroupId) return;
    try {
      const { error } = await supabase
        .from('athletes')
        .update({ group_id: newGroupId })
        .eq('id', athleteId);

      if (error) throw error;
      
      setEditingAthleteId(null);
      if (session) fetchData(session);
    } catch (err) {
      console.error('Errore durante l\'aggiornamento del gruppo:', err);
      alert('Errore durante l\'aggiornamento.');
    }
  };

  const handleViewCard = async (url: string) => {
    if (!url) {
      alert("L'atleta non ha ancora caricato un tesserino.");
      return;
    }
    setLoadingCard(true);
    try {
      if (url.includes('federation-cards/')) {
        const cleanPath = url.split('federation-cards/').pop();
        if (cleanPath) {
          const { data, error } = await supabase.storage
            .from('federation-cards')
            .createSignedUrl(cleanPath, 3600);
          if (error) throw error;
          setCardUrl(data.signedUrl);
        }
      } else {
        setCardUrl(url);
      }
      setShowCardModal(true);
    } catch (err) {
      console.error("Error generating signed URL:", err);
      alert("Impossibile caricare il tesserino.");
    } finally {
      setLoadingCard(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Roster Atleti</h1>
          <p className="text-slate-500 mt-1">Gestisci i gruppi, approva i nuovi iscritti e analizza le presenze.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {coach?.invite_code && (
            <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">Codice Invito:</span>
              <span className="font-black tracking-widest text-lg text-blue-600 uppercase">{coach.invite_code}</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
        >
          Iscritti ({athletes.length})
        </button>
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
        >
          In Attesa
          {pending.length > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black tracking-wider">
              {pending.length}
            </span>
          )}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 shadow-blue-900/5">
        {activeTab === 'active' ? (
          <>
            <div className="p-4 border-b border-slate-100 flex gap-4">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Cerca un atleta..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                />
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`px-4 py-2 border rounded-xl flex items-center font-bold transition ${selectedGroupFilter !== 'all' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <Filter className="w-5 h-5 mr-2" /> 
                  {selectedGroupFilter === 'all' ? 'Filtra' : groups.find(g => g.id === selectedGroupFilter)?.name}
                </button>
                
                {showFilterMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-20">
                    <button 
                      onClick={() => { setSelectedGroupFilter('all'); setShowFilterMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Tutti i gruppi
                    </button>
                    {groups.map(g => (
                      <button 
                        key={g.id}
                        onClick={() => { setSelectedGroupFilter(g.id); setShowFilterMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 border-t border-slate-50"
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {athletes
                .filter(a => {
                  const matchesSearch = (a.full_name || a.email).toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesGroup = selectedGroupFilter === 'all' || a.group_id === selectedGroupFilter;
                  return matchesSearch && matchesGroup;
                }).length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-medium">Nessun atleta trovato con i filtri selezionati.</div>
              ) : (
                athletes
                  .filter(a => {
                    const matchesSearch = (a.full_name || a.email).toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesGroup = selectedGroupFilter === 'all' || a.group_id === selectedGroupFilter;
                    return matchesSearch && matchesGroup;
                  })
                  .map(athlete => (
                  <div key={athlete.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50/50 transition relative">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center font-bold text-blue-600 text-lg">
                        {athlete.full_name?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 block text-lg sm:text-base">{athlete.full_name || athlete.email}</span>
                        {athlete.federation_card_url && (
                          <TesserinoPreview 
                            url={athlete.federation_card_url} 
                            onClick={() => handleViewCard(athlete.federation_card_url)} 
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:w-2/3 md:w-1/2 gap-4">
                      <div className="flex-1">
                        {editingAthleteId === athlete.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              id={`edit-group-${athlete.id}`}
                              defaultValue={athlete.group_id || ''}
                              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 flex-1 min-w-[120px]"
                            >
                              <option value="" disabled>Seleziona</option>
                              {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                            <button 
                              onClick={() => {
                                const sel = document.getElementById(`edit-group-${athlete.id}`) as HTMLSelectElement;
                                handleUpdateGroup(athlete.id, sel.value);
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingAthleteId(null)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                            {athlete.groups?.name || 'Nessun Gruppo'}
                          </span>
                        )}
                      </div>
                      
                      <div className="shrink-0 text-right relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowOptionsId(showOptionsId === athlete.id ? null : athlete.id);
                          }}
                          className={`p-2 rounded-lg transition ${showOptionsId === athlete.id ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        {showOptionsId === athlete.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-10">
                            <button 
                              onClick={() => {
                                setEditingAthleteId(athlete.id);
                                setShowOptionsId(null);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center"
                            >
                              <Edit2 className="w-4 h-4 mr-2" /> Cambia Gruppo
                            </button>
                            <button 
                              onClick={() => {
                                setShowOptionsId(null);
                                handleRemoveAthlete(athlete.id);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center border-t border-slate-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Rimuovi Atleta
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Nessuna richiesta in attesa.</div>
            ) : (
              pending.map(p => (
                <div key={p.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100 text-amber-600 shrink-0">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{p.full_name || p.email}</h3>
                      <p className="text-xs text-slate-400 mt-1">Richiesto il: {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <select
                      id={`group-${p.id}`}
                      defaultValue=""
                      className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium"
                    >
                      <option value="" disabled>Seleziona Gruppo</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleReject(p.id)}
                        className="flex-1 sm:flex-none px-4 py-2 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition flex items-center justify-center"
                      >
                        <X className="w-4 h-4 mr-1" /> Rifiuta
                      </button>
                      <button 
                        onClick={() => {
                          const select = document.getElementById(`group-${p.id}`) as HTMLSelectElement;
                          handleApprove(p.id, select.value);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center shadow-sm shadow-blue-600/20"
                      >
                        <Check className="w-4 h-4 mr-1" /> Approva
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {/* Modal Visualizzazione Tesserino */}
      {showCardModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowCardModal(false)}
        >
          <div 
            className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-xl"><CreditCard className="w-5 h-5 text-blue-600" /></div>
                <h3 className="text-xl font-bold text-slate-900">Tesserino Federale</h3>
              </div>
              <button 
                onClick={() => setShowCardModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-0 flex items-center justify-center bg-slate-50 min-h-[400px] relative">
              {loadingCard ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Caricamento sicuro...</p>
                </div>
              ) : cardUrl?.toLowerCase().includes('.pdf') ? (
                <div className="p-12 text-center">
                  <FileText className="w-20 h-20 text-blue-600 mx-auto mb-4" />
                  <p className="text-slate-900 font-bold text-xl mb-4">Documento PDF</p>
                  <a 
                    href={cardUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition"
                  >
                    <Eye className="w-5 h-5" /> Apri PDF Completo
                  </a>
                </div>
              ) : (
                <img 
                  src={cardUrl || ''} 
                  alt="Tesserino" 
                  className="w-full h-auto max-h-[70vh] object-contain shadow-2xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
