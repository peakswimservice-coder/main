import React, { useState } from 'react';
import { Send, Users, AlertCircle, Edit3, Clock, CheckCircle2 } from 'lucide-react';

const mockMessages = [
  {
    id: 1,
    title: 'Variazione Orario Allenamento',
    content: 'Ciao ragazzi, per via di un guasto tecnico all\'impianto, l\'allenamento di stasera per gli Agonisti è posticipato alle 18:30. Confermatemi la lettura.',
    recipient: 'Agonisti',
    date: 'Oggi, 14:30',
    type: 'alert',
    reads: 12,
    total: 15
  },
  {
    id: 2,
    title: 'Convocazioni Trofeo Città di Milano',
    content: 'Ho caricato in app i risultati attesi per le gare di questo weekend. Assicuratevi di aver letto tutto il programma.',
    recipient: 'Tutti',
    date: 'Ieri, 09:15',
    type: 'info',
    reads: 45,
    total: 50
  }
];

export default function Messages() {
  const [isComposing, setIsComposing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('all');

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bacheca Messaggi</h1>
          <p className="text-slate-500 mt-1">Invia comunicazioni a tutti gli atleti o ai singoli gruppi.</p>
        </div>
        {!isComposing && (
          <button 
            onClick={() => setIsComposing(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center hover:bg-blue-700 transition shadow-sm w-full sm:w-auto"
          >
            <Edit3 className="w-5 h-5 mr-2" /> Nuovo Comunicato
          </button>
        )}
      </header>

      {isComposing && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-blue-500 overflow-hidden animate-in slide-in-from-top-4">
          <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 flex items-center"><Edit3 className="w-5 h-5 mr-2 text-blue-600" /> Componi Messaggio</h2>
            <button onClick={() => setIsComposing(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">Annulla</button>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Destinatari</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedGroup('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedGroup === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>Tutti gli Atleti</button>
                <button onClick={() => setSelectedGroup('agonisti')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedGroup === 'agonisti' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>Agonisti</button>
                <button onClick={() => setSelectedGroup('esordienti')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedGroup === 'esordienti' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>Esordienti A</button>
                <button onClick={() => setSelectedGroup('master')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedGroup === 'master' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>Master</button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Oggetto</label>
              <input type="text" placeholder="Es. Variazione orario allenamento..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Messaggio</label>
              <textarea rows={4} placeholder="Scrivi la tua comunicazione qui..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 resize-none"></textarea>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
               <label className="flex items-center space-x-2 cursor-pointer">
                 <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                 <span className="text-sm font-bold text-slate-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1 text-amber-500"/> Contrassegna come Importante</span>
               </label>
               <button className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center hover:bg-blue-700 transition shadow-sm">
                 Invia Ora <Send className="w-4 h-4 ml-2" />
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {mockMessages.map((msg) => (
          <div key={msg.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  {msg.type === 'alert' ? (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> Importante
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg">
                      Comunicazione
                    </span>
                  )}
                  <span className="text-slate-400 text-xs font-bold flex items-center"><Clock className="w-3 h-3 mr-1"/> {msg.date}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{msg.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{msg.content}</p>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[140px] shrink-0 flex flex-col justify-center">
                <span className="text-xs font-bold text-slate-500 mb-1 flex items-center"><Users className="w-3 h-3 mr-1"/> Destinatari</span>
                <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block w-fit mb-3">{msg.recipient}</span>
                
                <span className="text-xs font-bold text-slate-500 mb-1 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1 text-green-500"/> Letti</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: `${(msg.reads / msg.total) * 100}%`}}></div>
                  </div>
                  <span className="text-xs font-bold w-10 text-right text-slate-700">{msg.reads}/{msg.total}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
