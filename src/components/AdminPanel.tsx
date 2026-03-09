import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Plus, Trash2, Pencil, Check, X, Building2 } from 'lucide-react';

type Company = {
  id: string;
  name: string;
  account_manager_email: string | null;
  created_at: string;
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

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name');
    if (!error && data) {
      setCompanies(data);
    }
    setLoading(false);
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
          <div className="p-10 text-center text-slate-400 font-medium">Caricamento...</div>
        ) : companies.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-medium">
            Nessuna società registrata. Aggiungine una con il pulsante sopra.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {companies.map((company) => (
              <li key={company.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-slate-50 transition group">
                {editingId === company.id ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{company.name}</p>
                      <p className="text-sm text-slate-400 font-medium">
                        {company.account_manager_email ? (
                          <a
                            href={`mailto:${company.account_manager_email}`}
                            className="hover:text-purple-600 transition"
                          >
                            {company.account_manager_email}
                          </a>
                        ) : (
                          <span className="italic">Nessun account manager assegnato</span>
                        )}
                      </p>
                    </div>
                      <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition shrink-0">
                        {confirmingDeleteId === company.id ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
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
                              className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 border border-slate-200 rounded-lg transition"
                              title="Modifica"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmingDeleteId(company.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 rounded-lg transition"
                              title="Elimina"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
