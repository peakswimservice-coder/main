import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    try {
      setLoading(true);
      setMessage(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage({ type: 'error', text: error.error_description || error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Registrazione effettuata! Controlla la tua email per confermare l\'account.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl shadow-blue-900/10 border border-slate-100 p-8 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20 rotate-3 hover:rotate-0 transition-transform duration-300">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">PeakSwim</h1>
          <p className="text-slate-500 font-medium">{mode === 'login' ? 'Bentornato! Accedi al tuo pannello.' : 'Unisciti a noi e inizia ad allenarti.'}</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-2xl text-sm font-bold animate-in zoom-in-95 duration-300 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-8">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="es. mario.rossi@email.com"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 px-4 rounded-2xl font-black text-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Accedi' : 'Registrati'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-black tracking-tighter">Oppure continua con</span></div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 py-3.5 px-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Google
          </button>
          
          <button
            onClick={() => handleOAuthLogin('facebook')}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-[#1877F2] py-3.5 px-4 rounded-2xl font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-blue-600/10"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>
        </div>

        <button 
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="w-full text-center text-sm font-bold text-blue-600 hover:text-blue-700 transition"
        >
          {mode === 'login' ? (
            <span className="flex items-center justify-center gap-2">Non hai un account? <span className="underline decoration-2 underline-offset-4">Registrati ora</span></span>
          ) : (
            <span className="flex items-center justify-center gap-2">Hai già un account? <span className="underline decoration-2 underline-offset-4">Accedi qui</span></span>
          )}
        </button>
        
        <p className="mt-10 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center leading-relaxed opacity-50">
          Protetto da crittografia end-to-end
        </p>
      </div>
    </div>
  );
}
