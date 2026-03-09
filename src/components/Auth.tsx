import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (provider: 'google' | 'facebook') => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      // Per OAuth il caricamento si interrompe con il redirect, 
      // ma resettiamo per sicurezza in caso di errori immediati.
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LogIn className="w-8 h-8 text-blue-600" />
        </div>
        
        <h1 className="text-2xl font-black text-slate-900 mb-2">Benvenuto su PeakSwim</h1>
        <p className="text-slate-500 mb-8 font-medium">Gestisci i tuoi allenamenti e atleti in modo professionale.</p>
        
        <div className="space-y-4">
          <button
            onClick={() => handleLogin('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-3.5 px-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Accedi con Google
          </button>
          
          <button
            onClick={() => handleLogin('facebook')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] py-3.5 px-4 rounded-2xl font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Accedi con Facebook
          </button>
        </div>
        
        <p className="mt-8 text-xs text-slate-400 font-medium leading-relaxed">
          Accedendo accetti i nostri <a href="#" className="underline">Termini</a> e la <a href="#" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
