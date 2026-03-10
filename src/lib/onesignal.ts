import OneSignal from 'react-onesignal';
import { supabase } from '../supabaseClient';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID; 

export const initializeOneSignal = async (userId: string) => {
  try {
    const OS: any = OneSignal;
    
    await OS.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      safari_web_id: "web.onesignal.auto.69083167-7592-48a0-83ea-6b997c64c781", // Opzionale ma consigliato per Safari legacy
      notifyButton: {
        enable: false,
      },
      promptOptions: {
        slidedown: {
          enabled: true,
          autoPrompt: true,
          timeDelay: 5,
          pageViews: 1
        }
      },
      welcomeNotification: {
        disable: true
      }
    });

    // Registra l'utente esterno
    await OS.setExternalUserId(userId);
    
    // Controlla e salva il Player ID se già sottoscritto
    const playerId = await OS.getUserId();
    if (playerId) {
      console.log("OS_DEBUG: Player ID esistente:", playerId);
      await syncPlayerId(userId, playerId);
    }

    // Ascolta i cambiamenti di sottoscrizione
    OS.on('subscriptionChange', async (isSubscribed: boolean) => {
      console.log("OS_DEBUG: Sottoscrizione cambiata:", isSubscribed);
      if (isSubscribed) {
        const newPlayerId = await OS.getUserId();
        if (newPlayerId) await syncPlayerId(userId, newPlayerId);
      }
    });

  } catch (error) {
    console.error("OS_DEBUG: Errore inizializzazione:", error);
  }
};

export const promptForPushNotifications = async () => {
  try {
    const OS: any = OneSignal;
    console.log("OS_DEBUG: Richiesta permessi manuale...");
    await OS.showNativePrompt();
  } catch (error) {
    console.error("OS_DEBUG: Errore richiesta permessi:", error);
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
