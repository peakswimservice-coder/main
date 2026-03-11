// OneSignal UI Version: 1.0.6 - Fixed Syntax & Logic
import { Home, Users, Activity, Calendar, MessageSquare, Shield, LifeBuoy, LogOut, Settings, Bell } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserRole } from '../App';
import { isOneSignalInitialized, forceRegister, initializeOneSignal, getNotificationPermission, getOneSignalSubscriptionState } from '../lib/onesignal';
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
  const [subIdPrefix, setSubIdPrefix] = useState('N/A');
  const [browserPerm, setBrowserPerm] = useState('...');

  useEffect(() => {
    const p = getNotificationPermission();
    setBrowserPerm(p);

    const permInterval = setInterval(() => {
      setBrowserPerm(getNotificationPermission());
      const OS: any = OneSignal;
      if (OS?.User?.PushSubscription?.id) {
        setSubIdPrefix(OS.User.PushSubscription.id.substring(0, 4).toUpperCase());
      }
    }, 2000);

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
        const enabled = await getOneSignalSubscriptionState();
        setIsSubscribed(enabled);
        console.log("OS_DEBUG: Stato sottoscrizione (helper):", enabled);
        
        if (isOneSignalInitialized()) {
          // Se siamo qui e l'SDK è pronto, possiamo fermare il polling di inizializzazione
          // ma continuiamo a monitorare lo stato se non è attivo
          if (enabled && checkInterval) clearInterval(checkInterval);
        }

        const OS: any = OneSignal;
        if (OS && typeof OS.on === 'function') {
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
      clearInterval(permInterval);
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
            onClick={async () => {
              console.log("OS_DEBUG: Click su campanella desktop");
              alert("Click rilevato (PC)");
              if (!isOneSignalInitialized()) {
                console.log("OS_DEBUG: SDK non pronto, provo a inizializzare prima di forzare...");
                const { data } = await supabase.auth.getUser();
                if (data.user) {
                  const role = userRole || 'none';
                  await initializeOneSignal(data.user.id, role);
                }
              }
              await forceRegister();
            }}
            className={`p-2 rounded-xl transition-all ${isSubscribed ? 'text-emerald-500 hover:bg-emerald-50' : 'text-red-500 hover:bg-red-50 animate-pulse'}`}
            title={isSubscribed ? "Notifiche attive" : "Notifiche non attive - Clicca per attivare/riparare"}
          >
            <Bell className="w-5 h-5" />
          </button>
          <div className="flex flex-col text-[8px] text-slate-400 font-mono leading-tight ml-1">
            <span>APP: {import.meta.env.VITE_ONESIGNAL_APP_ID?.substring(0, 4) || 'NULL'}</span>
            <span>USR: {userIdPrefix}</span>
            {userRole === 'coach' && <span title="Coach ID">CID: {coachIdPrefix}</span>}
            <span>SUB: {subIdPrefix}</span>
            <div className="flex items-center gap-1 mt-1">
              <span className={isOneSignalInitialized() ? (isSubscribed ? 'text-emerald-500' : 'text-red-500') : 'text-slate-300'}>
                {isOneSignalInitialized() ? (isSubscribed ? 'STATO_OK' : 'DISATTIVE') : 'WAIT'}
              </span>
              <span className={`text-[7px] px-1 rounded ${browserPerm === 'granted' ? 'bg-emerald-100 text-emerald-700' : (browserPerm === 'denied' ? 'bg-red-100 text-red-700 font-bold' : 'bg-slate-100 text-slate-500')}`}>
                {browserPerm?.toUpperCase()}
              </span>
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
            onClick={async () => {
              console.log("OS_DEBUG: Click su campanella mobile");
              alert("Click rilevato (Mobile)");
              if (!isOneSignalInitialized()) {
                console.log("OS_DEBUG: Mobile - SDK non pronto, provo inizializzazione manuale...");
                const { data } = await supabase.auth.getUser();
                if (data.user) {
                  await initializeOneSignal(data.user.id, userRole);
                }
              }
              await forceRegister();
            }}
            className={`p-2 rounded-xl transition-colors ${isSubscribed ? 'text-emerald-500' : 'text-red-500 animate-pulse'}`}
          >
            <Bell className="w-5 h-5" />
          </button>
          <div className="flex flex-col text-[10px] text-slate-400 font-mono leading-tight bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 min-w-[70px]">
            <span className="font-bold text-[8px]">APP: {import.meta.env.VITE_ONESIGNAL_APP_ID?.substring(0, 4) || 'NULL'}</span>
            <span className="text-[8px]">USR: {userIdPrefix}</span>
            {userRole === 'coach' && <span className="text-[8px]">CID: {coachIdPrefix}</span>}
            <span className="text-[8px]">SUB: {subIdPrefix}</span>
            <span className={`font-black ${isOneSignalInitialized() ? (isSubscribed ? 'text-emerald-500' : 'text-red-500') : 'text-slate-300'}`}>
              {isOneSignalInitialized() ? (isSubscribed ? 'OK' : 'OFF') : 'WAIT'}
            </span>
            <span className={`text-[7px] px-1 rounded self-start ${browserPerm === 'granted' ? 'bg-emerald-100 text-emerald-700' : (browserPerm === 'denied' ? 'bg-red-100 text-red-700 font-bold' : 'bg-slate-100 text-slate-500')}`}>
              {browserPerm?.toUpperCase()}
            </span>
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
