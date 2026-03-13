import { Info, Beer, Pizza, Shield, Heart } from 'lucide-react';

export default function GamificationInfo() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="text-center">
        <div className="inline-flex items-center justify-center p-4 bg-amber-100 rounded-3xl mb-4">
          <Beer className="w-12 h-12 text-amber-600" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2 italic uppercase">Il Trofeo della Birra</h1>
        <p className="text-slate-500 font-medium">Spiegazione Goliardica e Regolamento Sperimentale</p>
      </header>

      <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Heart className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Lo Spirito del Gioco</h2>
        </div>
        <p className="text-slate-600 leading-relaxed mb-4">
          Il <span className="font-black text-blue-600">Trofeo della Birra</span> non è una gara olimpica, ma uno stimolo! 
          È un modo per invogliare tutti a scendere in vasca con costanza, per macinare chilometri virtuali 
          mentre ci godiamo il viaggio intorno alle coste italiane.
        </p>
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
          <p className="text-amber-800 text-sm font-bold italic">
            "Deve essere preso con lo spirito giusto: goliardia, sudore e voglia di stare insieme!"
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Pizza className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">La Premiazione</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            A settembre ci ritroveremo tutti per una <span className="font-bold">pizza di squadra</span>. 
            In quell'occasione, il vincitore riceverà il trofeo fisico.
          </p>
        </section>

        <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Il Passaggio</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Il vincitore terrà il trofeo per un anno intero, fino al prossimo passaggio di consegna. 
            In caso di cessazione attività, il trofeo tornerà all'allenatore.
          </p>
        </section>
      </div>

      <section className="bg-slate-900 text-slate-300 p-8 rounded-[2.5rem] shadow-2xl">
        <h2 className="text-white text-xl font-bold mb-6 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" /> Come si calcola la posizione?
        </h2>
        <ul className="space-y-4">
          <li className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0">1</div>
            <p className="text-sm"><span className="text-white font-bold">Km Dichiarati:</span> Ogni volta che sei presente, inserisci i KM fatti nell'allenamento.</p>
          </li>
          <li className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0">2</div>
            <p className="text-sm"><span className="text-white font-bold">Percentuale Presenze:</span> Calcolata da inizio anno (1 Settembre) rispetto a 6 allenamenti settimanali.</p>
          </li>
          <li className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0">3</div>
            <p className="text-sm"><span className="text-white font-bold">Km Virtuali:</span> Il totale dei KM dichiarati viene moltiplicato per la tua % di presenze. La costanza paga!</p>
          </li>
        </ul>
      </section>
    </div>
  );
}
