import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AthletesList from './components/AthletesList';
import TrainingPlan from './components/TrainingPlan';
import EventsList from './components/EventsList';
import Messages from './components/Messages';
import AdminPanel from './components/AdminPanel';
import CompanyPanel from './components/CompanyPanel';
import Auth from './components/Auth';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

export type ViewType = 'dashboard' | 'athletes' | 'training' | 'events' | 'messages' | 'admin' | 'company_management';
export type UserRole = 'admin' | 'company_manager' | 'coach' | 'none';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('none');

  const detectRole = async (email: string) => {
    if (email === 'peakswimservice@gmail.com') {
      setUserRole('admin');
      setCurrentView('admin');
      return;
    }

    // Check if Company Manager
    const { data: companyData } = await supabase
      .from('companies')
      .select('id')
      .eq('account_manager_email', email)
      .maybeSingle();

    if (companyData) {
      setUserRole('company_manager');
      setCurrentView('company_management');
      return;
    }

    // Check if Coach
    const { data: coachData } = await supabase
      .from('coaches')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (coachData) {
      setUserRole('coach');
      setCurrentView('dashboard');
      return;
    }

    setUserRole('none');
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) {
        detectRole(session.user.email).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) {
        detectRole(session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex flex-col md:flex-row bg-slate-50 min-h-screen font-sans">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        userEmail={session.user.email} 
        userRole={userRole}
      />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 w-full max-w-full overflow-x-hidden md:h-screen md:overflow-y-auto">
        {userRole === 'admin' && currentView === 'admin' && <AdminPanel />}
        
        {userRole === 'company_manager' && currentView === 'company_management' && (
          <CompanyPanel userEmail={session.user.email!} />
        )}

        {userRole === 'coach' && (
          <>
            {currentView === 'dashboard' && <Dashboard setCurrentView={setCurrentView} />}
            {currentView === 'athletes' && <AthletesList />}
            {currentView === 'training' && <TrainingPlan />}
            {currentView === 'events' && <EventsList />}
            {currentView === 'messages' && <Messages />}
          </>
        )}

        {userRole === 'none' && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Accesso in attesa</h2>
            <p className="text-slate-500 max-w-md">Il tuo account non è ancora associato a una società o a un ruolo di allenatore. Contatta il tuo responsabile per l'abilitazione.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
