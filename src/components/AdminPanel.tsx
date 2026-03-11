import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Plus, Trash2, Pencil, Check, X, Building2, ChevronRight, ChevronDown, Clock, Users } from 'lucide-react';

type Company = {
  id: string;
  name: string;
  account_manager_email: string | null;
  account_manager_last_active_at: string | null;
  created_at: string;
  coach_count?: number;
};

type Coach = {
  id: string;
  email: string;
  full_name: string | null;
  last_active_at: string | null;
};

export default function AdminPanel() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [companyCoaches, setCompanyCoaches] = useState<Record<string, Coach[]>>({});
  const [loadingCoaches, setLoadingCoaches] = useState<string | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    // Fetch companies and their coach counts
    const { data, error } = await supabase
      .from('companies')
      .select('*, coaches(count)')
      .order('name');
    
    if (!error && data) {
      const formattedData = data.map((c: any) => ({
        ...c,
        coach_count: c.coaches?.[0]?.count || 0
      }));
      setCompanies(formattedData);
    }
    setLoading(false);
  };

  const fetchCoachesForCompany = async (companyId: string) => {
    if (companyCoaches[companyId]) return;
    
    setLoadingCoaches(companyId);
    const { data, error } = await supabase
      .from('coaches')
      .select('id, email, full_name, last_active_at')
      .eq('company_id', companyId)
      .order('email');
    
    if (!error && data) {
      setCompanyCoaches(prev => ({ ...prev, [companyId]: data }));
    }
    setLoadingCoaches(null);
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchCoachesForCompany(id);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('companies')
      .insert({ name: newName.trim(), account_manager_email: newEmail.trim() || null });
    
    if (!error) {
      setNewName('');
      setNewEmail('');
      setShowAddForm(false);
      await fetchCompanies();
    } else {
      alert('Errore durante il salvataggio.');
    }
    setIsSaving(false);
  };

  const handleEdit = (company: Company) => {
    setEditingId(company.id);
    setEditName(company.name);
    setEditEmail(company.account_manager_email || '');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('companies')
      .update({ name: editName.trim(), account_manager_email: editEmail.trim() || null })
      .eq('id', id);
    if (!error) {
      setEditingId(null);
      await fetchCompanies();
    } else {
      alert('Errore durante il salvataggio.');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    const { error, data } = await supabase.from('companies').delete().eq('id', id).select();
    
    if (!error) {
      if (data && data.length > 0) {
        setConfirmingDeleteId(null);
        await fetchCompanies();
      } else {
        alert('Errore: L\'operazione è stata completata ma nessuna riga è stata cancellata. Verifica i permessi RLS.');
      }
    } else {
      alert(`Errore: ${error.message || 'Impossibile eliminare questa società.'}`);
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center">
          <Shield className="w-8 h-8 mr-3 text-purple-600 bg-purple-100 p-1.5 rounded-xl" />
          Pannello Admin
        </h1>
        <p className="text-slate-500 mt-1 pl-11">Gestione delle Società e degli Account Manager.</p>
      </header>

      {/* Companies Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-purple-500" />
            Società registrate
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              showAddForm
                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
            }`}
          >
            {showAddForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
            {showAddForm ? 'Annulla' : 'Aggiungi Società'}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="p-5 border-b border-slate-100 bg-purple-50/40">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome società *"
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition"
              />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email account manager"
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition"
              />
              <button
                onClick={handleAdd}
                disabled={isSaving || !newName.trim()}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition disabled:opacity-50 flex items-center shrink-0"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Salva
              </button>
            </div>
          </div>
        )}

        {/* Company List */}
        {loading ? (
          <div className="p-10 text-center text-slate-400 font-medium animate-pulse">Caricamento...</div>
        ) : companies.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-medium">
            Nessuna società registrata. Aggiungine una con il pulsante sopra.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {companies.map((company) => (
              <div key={company.id} className="group transition-all">
                {/* Company Header Row */}
                <div 
                  className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-slate-50 transition cursor-pointer ${expandedId === company.id ? 'bg-slate-50' : ''}`}
                  onClick={(e) => {
                    // Prevent toggle when clicking action buttons
                    if ((e.target as HTMLElement).closest('button')) return;
                    toggleExpand(company.id);
                  }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-400 group-hover:text-purple-500 transition">
                      {expandedId === company.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>

                    {editingId === company.id ? (
                      <div className="flex flex-1 gap-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                        />
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Email account manager"
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                        />
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleSaveEdit(company.id)}
                            disabled={isSaving}
                            className="p-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 text-slate-400 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800">{company.name}</p>
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-wider border border-purple-100">
                              {company.coach_count} COACH
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5">
                            <p className="text-sm text-slate-400 font-medium flex items-center">
                              {company.account_manager_email ? (
                                <>
                                  <Building2 className="w-3 h-3 mr-1" />
                                  {company.account_manager_email}
                                </>
                              ) : (
                                <span className="italic">Nessun account manager assegnato</span>
                              )}
                            </p>
                            {company.account_manager_last_active_at && (
                              <p className="text-[11px] text-slate-400 font-medium flex items-center">
                                <Clock className="w-3 h-3 mr-1 text-slate-300" />
                                Login: {new Date(company.account_manager_last_active_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 transition shrink-0">
                          {confirmingDeleteId === company.id ? (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300" onClick={e => e.stopPropagation()}>
                              <span className="text-xs font-bold text-red-500 mr-1">Confermi?</span>
                              <button
                                onClick={() => handleDelete(company.id)}
                                disabled={isSaving}
                                className="p-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition shadow-sm"
                                title="Conferma eliminazione"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setConfirmingDeleteId(null)}
                                className="p-2 text-slate-400 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition"
                                title="Annulla"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(company)}
                                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-100 border border-slate-200 rounded-lg transition"
                                title="Modifica"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setConfirmingDeleteId(company.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-100 border border-slate-200 rounded-lg transition"
                                title="Elimina"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Collapsible Content: Coach List */}
                {expandedId === company.id && (
                  <div className="bg-slate-50/50 border-t border-slate-100 px-12 py-4 animate-in slide-in-from-top-2 duration-300">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                      <Users className="w-3 h-3 mr-1.5" />
                      Coach invitati ({company.coach_count})
                    </h3>
                    
                    {loadingCoaches === company.id ? (
                      <div className="text-xs text-slate-400 italic py-2">Caricamento coach...</div>
                    ) : (companyCoaches[company.id]?.length || 0) === 0 ? (
                      <div className="text-xs text-slate-400 italic py-2">Nessun coach ancora invitato per questa società.</div>
                    ) : (
                      <div className="space-y-2">
                        {companyCoaches[company.id].map(coach => (
                          <div key={coach.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-purple-200 transition">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                                {coach.full_name?.[0] || coach.email[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700">{coach.full_name || 'Coach Senza Nome'}</p>
                                <p className="text-[11px] text-slate-400 font-medium">{coach.email}</p>
                              </div>
                            </div>
                            <div className="mt-2 sm:mt-0 flex items-center gap-1.5 text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span className="text-[10px] font-bold">
                                {coach.last_active_at 
                                  ? `Ultimo accesso: ${new Date(coach.last_active_at).toLocaleString('it-IT')}`
                                  : 'Mai effettuato login'}
                              </span>
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
