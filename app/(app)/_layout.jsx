// app/(app)/_layout.jsx
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function AppLayout() {
  const router = useRouter();

  useEffect(() => {
    // Usuário tocou na notificação com app em background/fechado
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const dados = response.notification.request.content.data;
      if (dados?.tipo === 'nova_entrega') {
        router.replace('/(app)/pedido');
      }
    });
    return () => sub.remove();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}