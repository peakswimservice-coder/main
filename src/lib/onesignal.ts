import OneSignal from 'react-onesignal';
import { supabase } from '../supabaseClient';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID; 

let isInitialized = false;

export const isOneSignalInitialized = () => isInitialized;

export const initializeOneSignal = async (userId: string, role: string = 'none') => {
  if (!ONESIGNAL_APP_ID) {
    console.error("OS_DEBUG: ONESIGNAL_APP_ID non trovato");
    return;
  }

  if (isInitialized) {
    const OS: any = OneSignal;
    await OS.setExternalUserId(userId);
    await OS.sendTag("role", role);
    console.log(`OS_DEBUG: Tag aggiornati per ${userId}: ${role}`);
    return;
  }

  try {
    const OS: any = OneSignal;
    
    await OS.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      safari_web_id: "web.onesignal.auto.69083167-7592-48a0-83ea-6b997c64c781",
      notifyButton: { enable: false },
      welcomeNotification: { disable: true }
    });

    isInitialized = true;

    // Registra l'utente esterno e il ruolo
    await OS.setExternalUserId(userId);
    await OS.sendTag("role", role);
    
    const isPushEnabled = await OS.isPushNotificationsEnabled();
    console.log(`OS_DEBUG: Inizializzato. Utente: ${userId}, Ruolo: ${role}, Sottoscritto: ${isPushEnabled}`);
    
    const playerId = await OS.getUserId();
    if (playerId) {
      await syncPlayerId(userId, playerId);
    }

    // Proactive prompt for real users
    if (role !== 'none') {
      await promptForPushNotifications();
    }

    OS.on('subscriptionChange', async (isSubscribed: boolean) => {
      if (isSubscribed) {
        const newPlayerId = await OS.getUserId();
        if (newPlayerId) {
          await syncPlayerId(userId, newPlayerId);
        }
      }
    });

  } catch (error) {
    console.error("OS_DEBUG: Errore inizializzazione:", error);
  }
};

export const getOneSignalSubscriptionState = async (): Promise<boolean> => {
  try {
    if (!isInitialized) return false;
    const OS: any = OneSignal;
    return await OS.isPushNotificationsEnabled();
  } catch (e) {
    return false;
  }
};

export const promptForPushNotifications = async () => {
  try {
    const OS: any = OneSignal;
    if (!isInitialized) {
      console.warn("OS_DEBUG: Prompt ignorato, SDK non ancora inizializzato");
      return;
    }
    
    console.log("OS_DEBUG: Tentativo di mostrare prompt slidedown...");
    // Try slidedown first
    await OS.slidedown.prompt();
    
    // Fallback logic could be added here if we detect it didn't show, 
    // but usually OneSignal handles the logic of whether to show it (already denied etc)
  } catch (error) {
    console.error("OS_DEBUG: Errore prompt:", error);
  }
};

const syncPlayerId = async (userId: string, playerId: string) => {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ 
      user_id: userId, 
      token: playerId, 
      platform: 'onesignal' 
    }, { onConflict: 'token' });
  
  if (error) console.error("OS_DEBUG: Errore salvataggio DB:", error);
  else console.log("OS_DEBUG: Player ID sincronizzato su DB");
};
