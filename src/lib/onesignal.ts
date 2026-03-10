import OneSignal from 'react-onesignal';
import { supabase } from '../supabaseClient';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID; 

export const initializeOneSignal = async (userId: string) => {
  if (!ONESIGNAL_APP_ID) {
    console.error("OS_DEBUG: ONESIGNAL_APP_ID non trovato nelle variabili d'ambiente.");
    return;
  }

  try {
    const OS: any = OneSignal;
    
    await OS.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      safari_web_id: "web.onesignal.auto.69083167-7592-48a0-83ea-6b997c64c781",
      notifyButton: { enable: false },
      promptOptions: {
        slidedown: {
          enabled: true,
          autoPrompt: true,
          timeDelay: 5,
          pageViews: 1
        }
      },
      welcomeNotification: { disable: true }
    });

    await OS.setExternalUserId(userId);
    
    const playerId = await OS.getUserId();
    if (playerId) {
      console.log("OS_DEBUG: Registrato con ID:", playerId);
      await syncPlayerId(userId, playerId);
    }

    OS.on('subscriptionChange', async (isSubscribed: boolean) => {
      if (isSubscribed) {
        const newPlayerId = await OS.getUserId();
        if (newPlayerId) {
          alert(`Notifiche attivate! ID: ${newPlayerId.substring(0, 8)}...`);
          await syncPlayerId(userId, newPlayerId);
        }
      }
    });

  } catch (error) {
    console.error("OS_DEBUG: Errore:", error);
  }
};

export const promptForPushNotifications = async () => {
  try {
    const OS: any = OneSignal;
    const isSubscribed = await OS.isPushNotificationsEnabled();
    
    if (isSubscribed) {
      const pId = await OS.getUserId();
      alert(`Sei già registrato! ID: ${pId?.substring(0, 8)}...`);
      return;
    }

    console.log("OS_DEBUG: Apertura prompt...");
    await OS.showNativePrompt();
  } catch (error) {
    console.error("OS_DEBUG: Errore prompt:", error);
    alert("Errore nell'apertura del permesso. Verifica se le notifiche sono bloccate nelle impostazioni del browser.");
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
