import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Plus, Trash2, Mail, Building2, Check, X } from 'lucide-react';

interface Coach {
  id: string;
  email: string;
  full_name: string | null;
  company_id: string;
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
      
      // 2. Prendi gli allenatori di quella società
      const { data: coachesData, error: coachesError } = await supabase
        .from('coaches')
        .select('*')
        .eq('company_id', companyData.id)
        .order('email');
        
      if (!coachesError && coachesData) {
        setCoaches(coachesData);
      }
    }
    setLoading(false);
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Allenatore</th>
                  <th className="px-6 py-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coaches.map((coach) => (
                  <tr key={coach.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                          {coach.full_name?.[0].toUpperCase() || coach.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{coach.full_name || 'Allenatore Senza Nome'}</p>
                          <p className="text-sm text-slate-500">{coach.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {confirmingDeleteId === coach.id ? (
                        <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                          <span className="text-xs font-bold text-red-500">Confermi la rimozione?</span>
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
                          onClick={() => setConfirmingDeleteId(coach.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                          title="Rimuovi accesso"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
