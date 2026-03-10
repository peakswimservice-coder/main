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
import AthleteOnboarding from './components/AthleteOnboarding';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { initializeOneSignal } from './lib/onesignal';

export type ViewType = 'dashboard' | 'athletes' | 'training' | 'events' | 'messages' | 'admin' | 'company_management';
export type UserRole = 'admin' | 'company_manager' | 'coach' | 'athlete' | 'none';
export type AthleteStatus = 'pending' | 'active' | 'rejected' | 'none';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('none');
  const [athleteStatus, setAthleteStatus] = useState<AthleteStatus>('none');

  const detectRole = async (email: string, currentSession: Session) => {
    if (email === 'peakswimservice@gmail.com') {
      setUserRole('admin');
      setCurrentView('admin');
      initializeOneSignal(currentSession.user.id, 'admin');
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
      initializeOneSignal(currentSession.user.id, 'company_manager');
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
      initializeOneSignal(currentSession.user.id, 'coach');
      return;
    }

    // Check if Athlete
    const { data: athleteData } = await supabase
      .from('athletes')
      .select('status')
      .eq('id', currentSession.user.id)
      .maybeSingle();

    if (athleteData) {
      setUserRole('athlete');
      setAthleteStatus(athleteData.status as AthleteStatus);
      setCurrentView('dashboard');
      initializeOneSignal(currentSession.user.id, 'athlete');
      return;
    }

    setUserRole('none');
    setAthleteStatus('none');
    initializeOneSignal(currentSession.user.id, 'athlete');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user?.email) {
        detectRole(initialSession.user.email, initialSession).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.email) {
        detectRole(newSession.user.email, newSession);
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

        {userRole === 'athlete' && (
          <>
            {athleteStatus === 'active' && (
              <>
                {currentView === 'dashboard' && <Dashboard setCurrentView={setCurrentView} />}
                {currentView === 'messages' && <Messages />}
              </>
            )}
            
            {athleteStatus === 'pending' && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 animate-in fade-in duration-700">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 text-3xl flex items-center justify-center">
                  ⏳
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Richiesta in sospeso</h2>
                <p className="text-slate-500 max-w-md font-medium">La tua richiesta è stata inviata al tuo coach. Riceverai una notifica non appena verrai approvato.</p>
              </div>
            )}

            {athleteStatus === 'rejected' && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 animate-in fade-in duration-700">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-3xl flex items-center justify-center">
                  ❌
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Richiesta non accettata</h2>
                <p className="text-slate-500 max-w-md font-medium">Il coach non ha potuto accettare la tua richiesta. Contattalo direttamente o riprova con un altro codice.</p>
                <button 
                  onClick={() => setAthleteStatus('none')}
                  className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition"
                >
                  Riprova
                </button>
              </div>
            )}
            
            {athleteStatus === 'none' && (
              <AthleteOnboarding 
                userId={session.user.id}
                email={session.user.email!}
                fullName={session.user.user_metadata.full_name || null}
                onComplete={() => detectRole(session.user.email!, session)}
              />
            )}
          </>
        )}

        {userRole === 'none' && athleteStatus === 'none' && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 animate-in fade-in duration-700">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Benvenuto su PeakSwim</h2>
            <p className="text-slate-500 max-w-md font-medium mb-8">Il tuo account sta venendo configurato. Come vuoi procedere?</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setUserRole('athlete')}
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
              >
                Sono un Atleta
              </button>
              <div className="text-slate-300 flex items-center px-2">oppure</div>
              <p className="text-slate-400 text-sm flex items-center">Contatta il tuo manager per l'abilitazione come Coach.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
