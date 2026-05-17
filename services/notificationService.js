// services/notificationService.js
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';

// Handler global — exibe alerta mesmo com app em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

export async function registrarPushToken(motoboyId, slug) {
  if (!Device.isDevice) {
    console.log('[push] emulador — ignorando token');
    return null;
  }

  const { status: atual } = await Notifications.getPermissionsAsync();
  let finalStatus = atual;

  if (atual !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] permissão negada');
    return null;
  }

  // ⚠️ Substitua pelo seu projectId do app.json / eas.json
  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: '9d934d11-a93b-41e5-9c00-f39e29f8eb22',
  })).data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('entregas', {
      name: 'Entregas',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#8b5cf6',
      sound:            true,
    });
  }

  try {
    await api.post(`/motoboy/${motoboyId}/push-token`, {
      token,
      restauranteSlug: slug,
    });
    console.log('[push] token registrado:', token);
  } catch (err) {
    console.log('[push] erro ao salvar token no servidor', err.message);
  }

  return token;
}