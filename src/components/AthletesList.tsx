import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Plus, UserPlus, Check, X } from 'lucide-react';

const athletes = [
  { id: 1, name: 'Alessandro Bianchi', group: 'Agonisti', age: 16, attendance: 92, status: 'active' },
  { id: 2, name: 'Martina Rossi', group: 'Agonisti', age: 15, attendance: 88, status: 'active' },
  { id: 3, name: 'Lorenzo Verdi', group: 'Esordienti A', age: 12, attendance: 95, status: 'active' },
  { id: 4, name: 'Giulia Neri', group: 'Esordienti B', age: 10, attendance: 80, status: 'active' },
];

const pending = [
  { id: 5, name: 'Matteo Ricci', group: 'Master', age: 28, requestDate: 'Oggi' },
  { id: 6, name: 'Sofia Conti', group: 'Agonisti', age: 14, requestDate: 'Ieri' },
];

export default function AthletesList() {
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Roster Atleti</h1>
          <p className="text-slate-500 mt-1">Gestisci i gruppi, approva i nuovi iscritti ed analizza le presenze.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-5 h-5 mr-2" /> Nuovo Atleta
        </button>
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
          <span className="ml-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pending.length}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {activeTab === 'active' ? (
          <>
            <div className="p-4 border-b border-slate-100 flex gap-4">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Cerca un atleta..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                />
              </div>
              <button className="px-4 py-2 border border-slate-200 rounded-xl flex items-center text-slate-600 font-bold hover:bg-slate-50 transition">
                <Filter className="w-5 h-5 mr-2" /> Filtra
              </button>
            </div>
            
            <div className="divide-y divide-slate-100">
              {athletes.map(athlete => (
                <div key={athlete.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50/50 transition">
                  <div className="flex items-center space-x-3 flex-1">
                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${athlete.name}&backgroundColor=e2e8f0`} alt={athlete.name} className="w-12 h-12 rounded-full shadow-sm" />
                    <div>
                      <span className="font-bold text-slate-800 block text-lg sm:text-base">{athlete.name}</span>
                      <span className="text-slate-500 text-sm font-medium">{athlete.age} anni</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:w-2/3 md:w-1/2 gap-4">
                    <div className="flex-1">
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">{athlete.group}</span>
                    </div>
                    
                    <div className="flex-1 flex items-center space-x-3">
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden max-w-[120px]">
                        <div className={`h-full rounded-full ${athlete.attendance > 85 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${athlete.attendance}%` }}></div>
                      </div>
                      <span className="text-sm font-bold text-slate-700 w-10 text-right">{athlete.attendance}%</span>
                    </div>

                    <div className="shrink-0 text-right">
                      <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"><MoreVertical className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.map(p => (
              <div key={p.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100 text-amber-600">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{p.name}</h3>
                    <p className="text-slate-500 font-medium text-sm">Età: {p.age} • Ha richiesto di unirsi a: <strong className="text-slate-700">{p.group}</strong></p>
                    <p className="text-xs text-slate-400 mt-1">Richiesto {p.requestDate.toLowerCase()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition flex items-center">
                    <X className="w-4 h-4 mr-1" /> Rifiuta
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center shadow-sm">
                    <Check className="w-4 h-4 mr-1" /> Approva e Assegna
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
