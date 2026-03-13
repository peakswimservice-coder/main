import { Beer, Pizza, Shield, Heart, Navigation, Target, Award } from 'lucide-react';

export default function GamificationInfo() {
  return (
    <div className="space-y-10 max-w-2xl mx-auto p-4 md:p-8 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="text-center">
        <div className="inline-flex items-center justify-center p-5 bg-amber-100 rounded-[2.5rem] mb-6 shadow-xl shadow-amber-200/50">
          <Beer className="w-16 h-16 text-amber-600" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-3 italic uppercase tracking-tighter">Regolamento Ufficiale</h1>
        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Il Trofeo della Birra</p>
      </header>

      {/* 1. SPIRITO */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-[3] pointer-events-none">
          <Heart className="w-24 h-24" />
        </div>
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-100 rounded-2xl">
            <Heart className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 italic uppercase">Lo Spirito</h2>
        </div>
        <p className="text-slate-600 leading-relaxed text-lg">
          Il <span className="font-black text-blue-600">Trofeo della Birra</span> non è una semplice competizione: è uno stimolo a superare i propri limiti, 
          a mantenere la costanza negli allenamenti e a vivere il nuoto con il giusto spirito di <span className="font-bold">goliardia e squadra</span>.
        </p>
      </section>

      {/* 2. IL VIAGGIO */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-4">
          <div className="p-3 bg-blue-100 rounded-2xl">
            <Navigation className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 italic uppercase">Il Viaggio (Le 5 Tappe)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { tag: 'T1', route: 'Genova → Elba', km: '190 km' },
            { tag: 'T2', route: 'Elba → Napoli', km: '310 km' },
            { tag: 'T3', route: 'Napoli → Olbia', km: '270 km' },
            { tag: 'T4', route: 'Olbia → Bastia', km: '170 km' },
            { tag: 'T5', route: 'Bastia → Genova', km: '200 km' },
          ].map((t) => (
            <div key={t.tag} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
              <div className="flex items-center gap-4">
                <span className="font-black text-blue-600 text-sm">{t.tag}</span>
                <span className="font-bold text-slate-700">{t.route}</span>
              </div>
              <span className="text-xs font-black text-slate-400 group-hover:text-blue-500">{t.km}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. CALCOLO POSIZIONE */}
      <section className="bg-slate-900 text-slate-300 p-10 rounded-[3rem] shadow-2xl relative">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-blue-500/20 rounded-2xl">
            <Target className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-2xl font-black text-white italic uppercase">Calcolo Posizione</h2>
        </div>
        <div className="space-y-8">
          <div>
            <h3 className="text-white font-black uppercase text-sm tracking-widest mb-3">La Formula dei KM Virtuali</h3>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-4">
              <p className="text-xl font-mono text-blue-400 text-center font-black">KM Totali × % Presenze = KM Virtuali</p>
            </div>
            <ul className="space-y-4 text-sm leading-relaxed">
              <li className="flex gap-4">
                <span className="text-white font-bold shrink-0">KM Totali:</span>
                <span className="flex-1 min-w-0">I chilometri dichiarati durante ogni allenamento in cui sei presente.</span>
              </li>
              <li className="flex gap-4">
                <span className="text-white font-bold shrink-0">% Presenze:</span>
                <span className="flex-1 min-w-0">Calcolata su base <span className="text-blue-400 font-bold">6 allenamenti a settimana</span>. Più sei costante, più i tuoi KM reali diventano KM virtuali validi per il trofeo.</span>
              </li>

            </ul>
          </div>

          <div className="pt-6 border-t border-white/10">
            <h3 className="text-white font-black uppercase text-sm tracking-widest mb-4">Avanzamento Tappe</h3>
            <p className="text-sm">
              Non si cambia tappa singolarmente. Il viaggio è di squadra: <span className="text-white font-bold">quando i primi 20 atleti</span> raggiungono il traguardo della tappa corrente, <span className="text-blue-400 font-bold">tutta la squadra</span> avanza alla tratta successiva. In quel momento vengono assegnati i punti tappa.
            </p>
          </div>
        </div>
      </section>

      {/* 4. PUNTEGGI */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-4">
          <div className="p-3 bg-amber-100 rounded-2xl">
            <Award className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 italic uppercase">Assegnazione Punti</h2>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                <th className="py-4 text-left">Posizione</th>
                <th className="py-4 text-right">Punti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { pos: '1° Posto', pts: '50 pt' },
                { pos: '2° Posto', pts: '45 pt' },
                { pos: '3° Posto', pts: '40 pt' },
                { pos: '4° Posto', pts: '30 pt' },
                { pos: 'Dal 5° al 22°', pts: 'Da 18 a 1 pt' },
                { pos: 'Oltre il 22°', pts: '0 pt' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 font-bold text-slate-700">{row.pos}</td>
                  <td className="py-4 text-right font-black text-blue-600 italic">{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-6 text-[11px] text-slate-400 italic text-center">
            I punti dal 5° posto in poi calano di 1 punto per ogni posizione (18, 17, 16...).
          </p>
        </div>
      </section>

      {/* 5. PERIODO E TRADIZIONI */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <Pizza className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 uppercase italic">Settembre</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Il periodo del trofeo va da <span className="font-bold">Settembre a Settembre</span>. 
            Il vincitore verrà premiato durante la tradizionale pizza di squadra, dove riceverà il trofeo fisico.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-slate-100 rounded-xl">
              <Shield className="w-5 h-5 text-slate-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 uppercase italic">Il Passaggio</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Il vincitore custodisce il trofeo per un anno. In caso di cessazione attività dell'atleta, il trofeo deve essere riconsegnato all'allenatore.
          </p>
        </div>
      </section>

      <footer className="text-center pt-10 border-t border-slate-100">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Buone Bracciate e Buona Birra</p>
      </footer>
    </div>
  );
}
