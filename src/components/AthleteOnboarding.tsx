import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserPlus, Search, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AthleteOnboardingProps {
  userId: string;
  email: string;
  fullName: string | null;
  onComplete: () => void;
}

export default function AthleteOnboarding({ userId, email, fullName, onComplete }: AthleteOnboardingProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [coach, setCoach] = useState<{ id: string, full_name: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'enter_code' | 'confirm'>('enter_code');

  const handleFindCoach = async () => {
    if (inviteCode.length !== 6) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error: coachError } = await supabase
        .from('coaches')
        .select('id, full_name')
        .eq('invite_code', inviteCode.toUpperCase())
        .maybeSingle();

      if (coachError) throw coachError;
      
      if (data) {
        setCoach(data);
        setStep('confirm');
      } else {
        setError('Codice non valido. Riprova.');
      }
    } catch (err: any) {
      setError('Errore durante la ricerca del coach.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!coach) return;
    
    setLoading(true);
    try {
      // 1. Crea l'atleta nel database
      const { error: joinError } = await supabase
        .from('athletes')
        .insert({
          id: userId,
          email: email,
          full_name: fullName,
          coach_id: coach.id,
          status: 'pending'
        });

      if (joinError) throw joinError;

      // 2. Invia notifica al coach
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'join_request',
          coachId: coach.id,
          athleteName: fullName || email,
        })
      });

      onComplete();
    } catch (err: any) {
      setError('Errore durante l\'invio della richiesta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <UserPlus className="w-8 h-8 text-blue-600" />
        </div>

        {step === 'enter_code' ? (
          <>
            <h1 className="text-2xl font-black text-slate-900 text-center mb-2">Unisciti a un Coach</h1>
            <p className="text-slate-500 text-center mb-8 font-medium">Inserisci il codice di 6 caratteri fornito dal tuo allenatore.</p>

            <div className="space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ES: AB12CD"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-2xl tracking-[0.2em] text-center focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition uppercase"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm font-bold text-center bg-red-50 py-2 rounded-xl border border-red-100">{error}</p>
              )}

              <button
                onClick={handleFindCoach}
                disabled={loading || inviteCode.length !== 6}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {loading ? 'Ricerca...' : 'Trova il mio Coach'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-slate-900 text-center mb-2">Coach Trovato!</h1>
            <p className="text-slate-500 text-center mb-8 font-medium">Vuoi inviare una richiesta di iscrizione a:</p>

            <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100 text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm font-black text-blue-600 text-xl">
                {coach?.full_name?.[0] || '?'}
              </div>
              <p className="text-xl font-black text-slate-800">{coach?.full_name || 'Allenatore'}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {loading ? 'Inviando...' : 'Invia Richiesta'}
                <CheckCircle2 className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setStep('enter_code')}
                disabled={loading}
                className="w-full py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition"
              >
                Indietro
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
