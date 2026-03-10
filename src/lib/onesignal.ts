import OneSignal from 'react-onesignal';
import { supabase } from '../supabaseClient';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID; 

export const initializeOneSignal = async (userId: string, role: string = 'none') => {
  if (!ONESIGNAL_APP_ID) {
    console.error("OS_DEBUG: ONESIGNAL_APP_ID non trovato");
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

    // Registra l'utente esterno e il ruolo
    await OS.setExternalUserId(userId);
    await OS.sendTag("role", role);
    console.log(`OS_DEBUG: Utente ${userId} registrato con ruolo: ${role}`);
    
    const playerId = await OS.getUserId();
    if (playerId) {
      await syncPlayerId(userId, playerId);
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

export const promptForPushNotifications = async () => {
  try {
    const OS: any = OneSignal;
    const isSubscribed = await OS.isPushNotificationsEnabled();
    
    if (isSubscribed) {
      console.log("OS_DEBUG: Già sottoscritto.");
      return;
    }

    await OS.showNativePrompt();
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
