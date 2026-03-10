import OneSignal from 'react-onesignal';
import { supabase } from '../supabaseClient';

// L'App ID viene ora recuperato dalle variabili d'ambiente
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID; 

export const initializeOneSignal = async (userId: string) => {
  try {
    const OS: any = OneSignal;
    
    await OS.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: false,
      },
      welcomeNotification: {
        disable: true,
        message: "Benvenuto su PeakSwim!",
        title: "PeakSwim"
      }
    });

    const playerId = await OS.getUserId();
    
    if (playerId) {
      console.log("OneSignal Player ID:", playerId);
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({ 
          user_id: userId, 
          token: playerId, 
          platform: 'onesignal' 
        }, { onConflict: 'token' });
      
      if (error) console.error("Errore salvataggio player_id:", error);
    }

    await OS.setExternalUserId(userId);

  } catch (error) {
    console.error("Errore inizializzazione OneSignal:", error);
  }
};
