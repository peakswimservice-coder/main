import OneSignal from 'react-onesignal';
import { supabase } from '../supabaseClient';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || (import.meta as any).env?.ONESIGNAL_APP_ID; 

let isInitialized = false;
let lastError: string | null = null;
let initPromise: Promise<void> | null = null;

export const isOneSignalInitialized = () => isInitialized;
export const getOneSignalLastError = () => lastError;

export const getNotificationPermission = (): NotificationPermission | 'unknown' => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return (window as any).Notification.permission;
  }
  return 'unknown';
};

export const initializeOneSignal = async (userId: string, role: string = 'none') => {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    if (!ONESIGNAL_APP_ID) {
      lastError = "APP_ID_MISSING";
      console.error("OS_DEBUG: Impossibile inizializzare OneSignal: ONESIGNAL_APP_ID mancante.");
      return;
    }
  
  const OS: any = OneSignal;

  if (isInitialized) {
    try {
      if (typeof OS.login === 'function') {
        await OS.login(userId);
      } else if (typeof OS.setExternalUserId === 'function') {
        await OS.setExternalUserId(userId);
      }
      
      if (OS.User && typeof OS.User.addTag === 'function') {
        await OS.User.addTag("role", role);
      } else if (typeof OS.sendTag === 'function') {
        await OS.sendTag("role", role);
      }
      return;
    } catch (e) {
      console.warn("OS_DEBUG: Errore aggiornamento utente:", e);
    }
  }

  try {
    console.log(`OS_DEBUG: Inizializzazione OneSignal con ID: ${ONESIGNAL_APP_ID.substring(0, 5)}...`);
    
    await OS.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      safari_web_id: "web.onesignal.auto.69083167-7592-48a0-83ea-6b997c64c781",
      notifyButton: { enable: false },
      welcomeNotification: { disable: true }
    });

    isInitialized = true;

    // Registra l'utente esterno e il ruolo con compatibilità v15/v16
    try {
      if (typeof OS.login === 'function') {
        await OS.login(userId);
        console.log("OS_DEBUG: Login effettuato (v16)");
      } else if (typeof OS.setExternalUserId === 'function') {
        await OS.setExternalUserId(userId);
        console.log("OS_DEBUG: External User ID impostato (v15)");
      }

      if (OS.User && typeof OS.User.addTag === 'function') {
        await OS.User.addTag("role", role);
      } else if (typeof OS.sendTag === 'function') {
        await OS.sendTag("role", role);
      }
      console.log(`OS_DEBUG: Tag aggiornati: ${role}`);
    } catch (apiErr: any) {
      console.warn("OS_DEBUG: Errore durante l'impostazione di ID/Tags:", apiErr);
    }
    
    // Check state for debug
    let isPushEnabled = false;
    try {
      if (typeof OS.isPushNotificationsEnabled === 'function') {
        isPushEnabled = await OS.isPushNotificationsEnabled();
      } else if (OS.Notifications && typeof OS.Notifications.permission === 'boolean') {
        isPushEnabled = OS.Notifications.permission;
      }
    } catch (e) {}
    
    console.log(`OS_DEBUG: Inizializzato. Utente: ${userId}, Ruolo: ${role}, Sottoscritto: ${isPushEnabled}`);
    
    let playerId = null;
    try {
      if (typeof OS.getUserId === 'function') {
        playerId = await OS.getUserId();
      } else if (OS.User && OS.User.onesignalId) {
        playerId = OS.User.onesignalId;
      }
    } catch (e) {}

    if (playerId) {
      // Non attendiamo la sincronizzazione DB per non bloccare l'inizializzazione SDK
      syncPlayerId(userId, playerId).catch(e => console.error("OS_DEBUG: Sync error:", e));
    }

    // Proactive prompt for real users
    if (role !== 'none') {
      await promptForPushNotifications();
    }

    if (typeof OS.on === 'function') {
      OS.on('subscriptionChange', async (isSubscribed: boolean) => {
        if (isSubscribed) {
          try {
            let newPlayerId = null;
            if (typeof OS.getUserId === 'function') {
              newPlayerId = await OS.getUserId();
            } else if (OS.User && OS.User.onesignalId) {
              newPlayerId = OS.User.onesignalId;
            }
            if (newPlayerId) {
              syncPlayerId(userId, newPlayerId).catch(e => console.error("OS_DEBUG: Sync error:", e));
            }
          } catch (e) {}
        }
      });
    }

  } catch (error: any) {
    lastError = error?.message || "INIT_FAILED";
    console.error("OS_DEBUG: Errore inizializzazione:", error);
  } finally {
    // Reset promise so it can be retried if it failed
    if (!isInitialized) initPromise = null;
  }
  })();
  
  return initPromise;
};

export const getOneSignalSubscriptionState = async (): Promise<boolean> => {
  try {
    if (!isInitialized) return false;
    const OS: any = OneSignal;
    
    // Check v16 state
    if (OS.User && OS.User.PushSubscription) {
      const isSubscribed = !!OS.User.PushSubscription.id && OS.User.PushSubscription.optedIn !== false;
      console.log("OS_DEBUG: Stato v16 rilevato:", isSubscribed, "ID:", OS.User.PushSubscription.id, "OptedIn:", OS.User.PushSubscription.optedIn);
      return isSubscribed;
    }

    // Fallback v15
    if (typeof OS.isPushNotificationsEnabled === 'function') {
      return await OS.isPushNotificationsEnabled();
    }
    return false;
  } catch (e) {
    console.warn("OS_DEBUG: Errore nel recupero dello stato sottoscrizione:", e);
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
    
    // In v16, we might need to check if we are opted out
    if (OS.User && OS.User.PushSubscription && typeof OS.User.PushSubscription.optIn === 'function') {
      await OS.User.PushSubscription.optIn();
    }

    if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
      console.log("OS_DEBUG: Richiedo permessi nativi (v16)...");
      await OS.Notifications.requestPermission();
    } else if (OS.slidedown && typeof OS.slidedown.prompt === 'function') {
      await OS.slidedown.prompt();
    } else if (typeof OS.showHttpPrompt === 'function') {
      await OS.showHttpPrompt();
    } else if (typeof OS.registerForPushNotifications === 'function') {
      await OS.registerForPushNotifications();
    } else {
      console.warn("OS_DEBUG: Nessun metodo di prompt trovato");
    }
  } catch (error) {
    console.error("OS_DEBUG: Errore prompt:", error);
  }
};

export const forceRegister = async () => {
  console.log("OS_DEBUG: forceRegister chiamato");
  alert("Riparazione avviata...");
  try {
    const OS: any = OneSignal;
    
    // Se non è inizializzato, proviamo ad inizializzare ADESSO ma senza bloccare tutto
    if (!isInitialized) {
      console.log("OS_DEBUG: SDK non pronto durante forceRegister, tento init rapido...");
      // Non usiamo await qui se vogliamo che gli alert successivi compaiano comunque?
      // In realtà forceRegister ha bisogno dell'SDK. 
    }
    
    // Su iOS/Safari, OneSignal v16 talvolta si blocca. Un toggle optOut -> optIn aiuta.
    if (OS.User && OS.User.PushSubscription) {
      console.log("OS_DEBUG: [Toggle] Eseguo optOut...");
      try {
        if (typeof OS.User.PushSubscription.optOut === 'function') {
          await OS.User.PushSubscription.optOut();
        }
        await new Promise(resolve => setTimeout(resolve, 800));
        
        console.log("OS_DEBUG: [Toggle] Eseguo optIn...");
        if (typeof OS.User.PushSubscription.optIn === 'function') {
          await OS.User.PushSubscription.optIn();
        }
      } catch (toggleErr) {
        console.warn("OS_DEBUG: Errore durante il toggle:", toggleErr);
      }
    } else if (typeof OS.setSubscription === 'function') {
      await OS.setSubscription(true);
    }

    await promptForPushNotifications();
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const enabled = await getOneSubscriptionStatusFast();
    if (enabled) {
      alert("Successo! Notifiche attivate (OFF -> ON).");
    } else {
      alert("Ancora OFF. Se sei su iPhone: \n1. Ricarica la pagina\n2. Clicca Lucchetto -> Reset Permessi\n3. Riprova");
    }

  } catch (e) {
    console.error("OS_DEBUG: Errore critico forceRegister:", e);
    alert("Errore durante la riparazione: " + (e as any).message);
  }
};

const getOneSubscriptionStatusFast = async (): Promise<boolean> => {
  try {
    const OS: any = OneSignal;
    if (OS.User?.PushSubscription) return !!OS.User.PushSubscription.id && OS.User.PushSubscription.optedIn !== false;
    return (await OS.isPushNotificationsEnabled?.()) || false;
  } catch (e) { return false; }
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
