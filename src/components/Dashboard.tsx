import React from 'react';
import { Users, Activity, AlertCircle, ArrowRight, CheckCircle2, Droplets } from 'lucide-react';

export default function Dashboard({ setCurrentView }: { setCurrentView: (v: string) => void }) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <header className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Droplets className="w-6 h-6 text-blue-500" />
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bentornato, Coach</h1>
        </div>
        <p className="text-slate-500 text-lg">Ecco il riepilogo della tua squadra per oggi, Giovedì 24 Ottobre.</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-500">Atleti in Vasca Oggi</h3>
            <div className="bg-green-100 p-2.5 rounded-xl"><Users className="w-5 h-5 text-green-600" /></div>
          </div>
          <p className="text-4xl font-black text-slate-800">24<span className="text-lg text-slate-400 font-medium ml-1">/ 30</span></p>
          <p className="text-sm text-green-600 font-medium mt-2 flex items-center"><ArrowRight className="w-3 h-3 mr-1 -rotate-45" /> +2 rispetto a ieri</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-500">Volume Medio Previsto</h3>
            <div className="bg-blue-100 p-2.5 rounded-xl"><Activity className="w-5 h-5 text-blue-600" /></div>
          </div>
          <p className="text-4xl font-black text-slate-800">4.5<span className="text-lg text-slate-400 font-medium ml-1">km</span></p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-blue-500 h-full w-3/4 rounded-full"></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setCurrentView('athletes')}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-500">Richieste Iscrizione</h3>
            <div className="bg-amber-100 p-2.5 rounded-xl"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
          </div>
          <p className="text-4xl font-black text-slate-800">3<span className="text-lg text-slate-400 font-medium ml-1">in attesa</span></p>
          <p className="text-sm text-slate-500 font-medium mt-2">1 richiesta urgente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Quick Actions / Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Coda di Approvazione</h2>
            <button onClick={() => setCurrentView('athletes')} className="text-blue-600 text-sm font-bold hover:text-blue-700 flex items-center bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
              Vedi tutti
            </button>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {['Luca Bianchi', 'Sofia Neri', 'Matteo Ricci'].map((name, i) => (
              <div key={i} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${name}&backgroundColor=e2e8f0`} alt={name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                  <div>
                    <p className="text-base font-bold text-slate-800">{name}</p>
                    <p className="text-sm text-slate-500 font-medium">Richiesta Gruppo: <span className="text-blue-600">Agonisti</span></p>
                  </div>
                </div>
                <button className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-colors" title="Accetta">
                  <CheckCircle2 className="w-6 h-6" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Today's schedule */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800">Sessioni in Vasca</h2>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-start space-x-4 relative">
                <div className="absolute left-7 top-8 bottom-[-24px] w-0.5 bg-slate-100"></div>
                <div className="w-14 text-center shrink-0">
                  <span className="text-lg font-black text-slate-800 block">16:00</span>
                  <span className="text-xs font-bold text-slate-400">75 min</span>
                </div>
                <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100 relative z-10 hover:border-blue-200 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded mb-2">Esordienti A</span>
                      <p className="text-base font-bold text-slate-800">Lavoro Tecnico + Velocità</p>
                      <p className="text-sm text-slate-500 font-medium mt-1">2.5 km • Misti</p>
                    </div>
                    <div className="flex -space-x-2">
                       <div className="w-6 h-6 rounded-full bg-slate-300 border border-white"></div>
                       <div className="w-6 h-6 rounded-full bg-slate-400 border border-white"></div>
                       <div className="w-6 h-6 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[10px] font-bold">+12</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-4 relative">
                <div className="w-14 text-center shrink-0">
                  <span className="text-lg font-black text-slate-800 block">18:00</span>
                  <span className="text-xs font-bold text-slate-400">120 min</span>
                </div>
                <div className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-100 relative z-10 ring-2 ring-blue-500 ring-offset-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded mb-2">Agonisti</span>
                      <p className="text-base font-bold text-slate-900">Soglia Aerobica (B2)</p>
                      <p className="text-sm text-slate-600 font-medium mt-1">5.2 km • Stile Libero focus</p>
                    </div>
                    <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-lg animate-pulse">
                      In corso
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <button onClick={() => setCurrentView('training')} className="mt-8 w-full py-3 bg-white border-2 border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center">
              Gestisci Programmazione Allenamenti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
