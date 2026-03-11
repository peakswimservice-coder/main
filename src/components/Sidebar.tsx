import { Home, Users, Activity, Calendar, MessageSquare, Shield, LifeBuoy, LogOut, Settings, Bell } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserRole } from '../App';
import { promptForPushNotifications, isOneSignalInitialized, getOneSignalLastError } from '../lib/onesignal';
import OneSignal from 'react-onesignal';
import { useState, useEffect } from 'react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: any) => void;
  userEmail?: string;
  userRole: UserRole;
}

export default function Sidebar({ currentView, setCurrentView, userEmail, userRole }: SidebarProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userIdPrefix, setUserIdPrefix] = useState('...');
  const [coachIdPrefix, setCoachIdPrefix] = useState('...');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserIdPrefix(data.user.id.substring(0, 4).toUpperCase());
    });

    if (userRole === 'coach' && userEmail) {
      supabase
        .from('coaches')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle()
        .then(({data}) => {
          if (data) setCoachIdPrefix(data.id.substring(0, 4).toUpperCase());
        });
    }

    let checkInterval: any;
    let attempts = 0;

    const checkSubscription = async () => {
      try {
        const OS: any = OneSignal;
        if (OS && typeof OS.isPushNotificationsEnabled === 'function') {
          const enabled = await OS.isPushNotificationsEnabled();
          setIsSubscribed(enabled);
          console.log("OS_DEBUG: Stato sottoscrizione rilevato:", enabled);
          
          // Se siamo qui, l'SDK è pronto, possiamo fermare il polling
          if (checkInterval) clearInterval(checkInterval);

          // Attacchiamo il listener una volta sola quando l'SDK è pronto
          OS.on('subscriptionChange', (isSubscribed: boolean) => {
            console.log("OS_DEBUG: Cambio sottoscrizione:", isSubscribed);
            setIsSubscribed(isSubscribed);
          });
        }
      } catch (err) {
        console.error("OS_DEBUG: Errore durante il check sottoscrizione:", err);
      }
    };

    // Primo tentativo immediato
    checkSubscription();

    // Polling ogni 2 secondi per massimo 10 volte se non è ancora pronto
    checkInterval = setInterval(() => {
      attempts++;
      if (attempts > 10) {
        clearInterval(checkInterval);
        console.warn("OS_DEBUG: Timeout inizializzazione OneSignal per Sidebar");
        return;
      }
      checkSubscription();
    }, 2000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['coach', 'athlete'], isMock: true },
    { id: 'athletes', label: 'Atleti', icon: Users, roles: ['coach'], isMock: true },
    { id: 'training', label: 'Allenamenti', icon: Activity, roles: ['coach', 'athlete'] },
    { id: 'events', label: 'Gare / Eventi', icon: Calendar, roles: ['coach', 'athlete'], isMock: true },
    { id: 'messages', label: 'Bacheca', icon: MessageSquare, roles: ['coach', 'athlete'], isMock: true },
    { id: 'admin', label: 'Admin', icon: Shield, roles: ['admin'] },
    { id: 'company_management', label: 'Società', icon: Settings, roles: ['company_manager'] },
  ];

  const filteredNavItems = allNavItems.filter(item => item.roles.includes(userRole));

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 h-screen flex-col hidden md:flex shrink-0 shadow-sm z-20 sticky top-0">
        <div className="p-6 flex items-center justify-between text-blue-600">
          <div className="flex items-center space-x-3">
            <LifeBuoy className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight">PeakSwim</span>
          </div>
          <button 
            onClick={promptForPushNotifications}
            className={`p-2 rounded-xl transition-all ${isSubscribed ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
            title={isSubscribed ? "Notifiche attive" : "Attiva notifiche"}
          >
            <Bell className="w-5 h-5" />
          </button>
          <div className="flex flex-col text-[8px] text-slate-400 font-mono leading-tight ml-1">
            <span>APP: {import.meta.env.VITE_ONESIGNAL_APP_ID?.substring(0, 4) || 'NULL'}</span>
            <span>USR: {userIdPrefix}</span>
            {userRole === 'coach' && <span title="Coach ID">CID: {coachIdPrefix}</span>}
            <div className="flex items-center gap-1 mt-1">
              <span className={isOneSignalInitialized() ? 'text-emerald-500' : 'text-amber-500'}>
                {isOneSignalInitialized() ? 'INIT_OK' : (getOneSignalLastError() ? `ERR: ${getOneSignalLastError()?.substring(0, 8)}` : 'WAIT_INIT')}
              </span>
              {isOneSignalInitialized() && (
                <button 
                  onClick={async () => {
                    const { data } = await supabase.auth.getUser();
                    if (!data.user) return;
                    await fetch('/api/notify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'status_update',
                        athleteId: data.user.id,
                        status: 'active',
                        groupName: 'TEST DEBUG'
                      })
                    });
                    alert("Test inviato! Controlla se ricevi la notifica.");
                  }}
                  className="bg-slate-200 hover:bg-slate-300 px-1 rounded text-[7px] text-slate-600 font-bold"
                >
                  TEST
                </button>
              )}
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={item.isMock ? 'line-through opacity-60' : ''}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 flex flex-col space-y-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>Esci</span>
          </button>

          <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50 rounded-xl cursor-default transition-colors">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              {userEmail?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="text-sm text-left truncate flex-1 min-w-0">
              <p className="font-bold text-slate-800 truncate">{userEmail?.split('@')[0] || 'Utente'}</p>
              <p className="text-slate-500 text-xs font-medium truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-1 left-0 right-0 z-50 px-2 lg:px-4 pb-safe pointer-events-none">
        <div className="bg-white/80 backdrop-blur-lg border border-slate-200 shadow-lg shadow-blue-900/10 rounded-2xl flex justify-around items-center p-1 pointer-events-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                  isActive ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50' : ''}`}>
                  <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-blue-700' : ''} ${item.isMock ? 'line-through opacity-60' : ''}`}>
                  {item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Top Header */}
      <div className="md:hidden bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 py-3 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center space-x-2 text-blue-600">
          <LifeBuoy className="w-6 h-6" />
          <span className="text-lg font-black tracking-tight">PeakSwim</span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={promptForPushNotifications}
            className={`p-2 rounded-xl transition-colors ${isSubscribed ? 'text-emerald-500' : 'text-slate-500'}`}
          >
            <Bell className="w-5 h-5" />
          </button>
          <div className="flex flex-col text-[10px] text-slate-400 font-mono leading-tight bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 min-w-[70px]">
            <span className="font-bold text-[8px]">APP: {import.meta.env.VITE_ONESIGNAL_APP_ID?.substring(0, 4) || 'NULL'}</span>
            <span className="text-[8px]">USR: {userIdPrefix}</span>
            {userRole === 'coach' && <span className="text-[8px]">CID: {coachIdPrefix}</span>}
            <span className={`font-black ${isOneSignalInitialized() ? 'text-emerald-500' : 'text-amber-500'}`}>
              {isOneSignalInitialized() ? 'OK' : (getOneSignalLastError() ? 'ERR!' : 'WAIT')}
            </span>
            {isOneSignalInitialized() && (
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  const { data } = await supabase.auth.getUser();
                  if (!data.user) return;
                  await fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'status_update',
                      athleteId: data.user.id,
                      status: 'active',
                      groupName: 'TEST MOBILE'
                    })
                  });
                  alert("Test inviato!");
                }}
                className="mt-1 bg-white border border-slate-200 text-[8px] font-bold py-0.5 rounded shadow-sm text-slate-600"
              >
                TEST NOTIFICA
              </button>
            )}
            {getOneSignalLastError() && (
              <span className="text-[7px] text-red-500 truncate max-w-[60px]">{getOneSignalLastError()}</span>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}
