import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { supabase } from "../supabaseClient";

// Sostituisci con i tuoi dati reali dalla Console Firebase (Impostazioni progetto)
// Note: Only the vapidKey is strictly required for Web Push, but the config 
// ensures full SDK functionality.
const firebaseConfig = {
  apiKey: "AIzaSy...", // Placeholder - the user should fill this from Firebase console
  authDomain: "peakswim-xxxx.firebaseapp.com",
  projectId: "peakswim-xxxx",
  storageBucket: "peakswim-xxxx.appspot.com",
  messagingSenderId: "xxxx",
  appId: "xxxx"
};

const vapidKey = "BAYiCV2NJseLXMX2OqL_K38YGHMqPlrfFpVryjB25DMH6b_MeHPg6W2lX85vi_BmvbEhPrlyckXtvS0hJQxvCTw";

export const initializeNotifications = async (userId: string) => {
  try {
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn("Permesso notifiche negato.");
      return;
    }

    const token = await getToken(messaging, { vapidKey });
    if (token) {
      console.log("FCM Token acquisito:", token);
      
      // Salva il token in Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({ 
          user_id: userId, 
          token: token, 
          platform: 'web' 
        }, { onConflict: 'token' });
      
      if (error) console.error("Errore salvataggio token:", error);
    }

    onMessage(messaging, (payload) => {
      console.log("Notifica ricevuta in foreground:", payload);
      // Qui puoi mostrare un toast personalizzato se vuoi
    });

  } catch (error) {
    console.error("Errore inizializzazione notifiche:", error);
  }
};
