// OneSignal UI Version: 1.0.9 - Auto-Repair & UI Fix
import { Home, Users, Activity, Calendar, MessageSquare, Shield, LogOut, Settings, Bell } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserRole } from '../App';
import { isOneSignalInitialized, forceRegister, initializeOneSignal, getNotificationPermission, getOneSignalSubscriptionState, autoRepairOneSignal, logoutOneSignal } from '../lib/onesignal';
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
    // Permission Polling
    const p = getNotificationPermission();
    setBrowserPerm(p);

    const permInterval = setInterval(() => {
      setBrowserPerm(getNotificationPermission());
      const OS: any = OneSignal;
      const sid = OS?.User?.PushSubscription?.id || OS?.getUserId?.() || 'N/A';
      if (typeof sid === 'string' && sid !== 'N/A') {
        setSubIdPrefix(sid.substring(0, 4).toUpperCase());
      } else if (sid instanceof Promise) {
        sid.then(id => { if (id) setSubIdPrefix(id.substring(0, 4).toUpperCase()); });
      }
    }, 2000);

    // Metadata
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
        
        // Aggiorna permessi browser contestualmente al check SDK
        setBrowserPerm(getNotificationPermission());
        
        if (isOneSignalInitialized() && enabled) {
          if (checkInterval) clearInterval(checkInterval);
        } else if (isOneSignalInitialized() && !enabled) {
          // Se siamo inizializzati ma non sottoscritti, tentiamo la riparazione automatica
          autoRepairOneSignal();
        }

        const OS: any = OneSignal;
        if (OS && typeof OS.on === 'function') {
          // Attacchiamo il listener se pronto
          OS.on('subscriptionChange', (newStatus: boolean) => {
            setIsSubscribed(newStatus);
          });
        }
      } catch (err) {
        console.error("OS_DEBUG: checkSubscription error:", err);
      }
    };

    checkSubscription();

    checkInterval = setInterval(() => {
      attempts++;
      if (attempts > 15 && document.visibilityState !== 'visible') {
        // Stop aggressive polling se in background dopo 15 tentativi su iOS
        return;
      }
      checkSubscription();
    }, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only force re-check if we are NOT already OK
        if (!isOneSignalInitialized() || !isSubscribed) {
          attempts = 0; // reset tentativi
          checkSubscription();
        }
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      clearInterval(permInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userRole, userEmail]);

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['coach', 'athlete'] },
    { id: 'athletes', label: 'Atleti', icon: Users, roles: ['coach'] },
    { id: 'training', label: 'Allenamenti', icon: Activity, roles: ['coach', 'athlete'] },
    { id: 'events', label: 'Gare / Eventi', icon: Calendar, roles: ['coach', 'athlete'] },
    { id: 'messages', label: 'Bacheca', icon: MessageSquare, roles: ['coach', 'athlete'], isMock: true },
    { id: 'admin', label: 'Admin', icon: Shield, roles: ['admin'] },
    { id: 'company_management', label: 'Società', icon: Settings, roles: ['company_manager'] },
  ];

  const filteredNavItems = allNavItems.filter(item => item.roles.includes(userRole));

  const handleLogout = async () => {
    await logoutOneSignal();
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 h-screen flex-col hidden md:flex shrink-0 shadow-sm z-20 sticky top-0">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="text-xl font-black tracking-tight text-slate-900">PeakSwim</span>
          </div>
          <button 
            onClick={async () => {
              alert("Click rilevato (PC)");
              if (!isOneSignalInitialized()) {
                const { data } = await supabase.auth.getUser();
                if (data.user) await initializeOneSignal(data.user.id, userRole);
              }
              await forceRegister();
            }}
            className={`p-2 rounded-xl transition-all ${isSubscribed ? 'text-emerald-500 hover:bg-emerald-50' : 'text-red-500 hover:bg-red-50 animate-pulse'}`}
          >
            <Bell className="w-5 h-5" />
          </button>
          <div className="flex flex-col text-[8px] text-slate-400 font-mono leading-tight ml-1">
            <span>APP: {import.meta.env.VITE_ONESIGNAL_APP_ID?.substring(0, 4) || 'NULL'}</span>
            <span>USR: {userIdPrefix}</span>
            {userRole === 'coach' && <span>CID: {coachIdPrefix}</span>}
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
                  isActive ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 flex flex-col space-y-4">
          <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium">
            <LogOut className="w-5 h-5" />
            <span>Esci</span>
          </button>
          <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0">{userEmail?.substring(0, 2).toUpperCase() || 'U'}</div>
            <div className="text-sm text-left truncate flex-1 min-w-0">
              <p className="font-bold text-slate-800 truncate">{userEmail?.split('@')[0] || 'Utente'}</p>
              <p className="text-slate-500 text-xs font-medium truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-0 pb-safe pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex justify-around items-center p-1 pointer-events-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button key={item.id} onClick={() => setCurrentView(item.id)} className={`flex flex-col items-center justify-center flex-1 py-1 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                <div className={`p-1.5 rounded-xl ${isActive ? 'bg-blue-50' : ''}`}><Icon className="w-6 h-6" /></div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-blue-700' : ''}`}>{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Top Header */}
      <div className="md:hidden bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 py-3 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
          <span className="text-lg font-black tracking-tight text-slate-900">PeakSwim</span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={async () => {
              alert("Click rilevato (Mobile)");
              if (!isOneSignalInitialized()) {
                const { data } = await supabase.auth.getUser();
                if (data.user) await initializeOneSignal(data.user.id, userRole);
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
          <button onClick={handleLogout} className="p-2 text-red-500 rounded-xl"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>
    </>
  );
}
