import { useEffect } from 'react';
import { Alert } from 'react-native';

export function useAppUpdates() {
  useEffect(() => {
    if (__DEV__) return; // em desenvolvimento não faz nada
    verificarAtualizacao();
  }, []);

  async function verificarAtualizacao() {
    try {
      const Updates = await import('expo-updates');
      const resultado = await Updates.checkForUpdateAsync();

      if (resultado.isAvailable) {
        Alert.alert(
          '🚀 Nova versão disponível',
          'Uma atualização foi encontrada. Deseja aplicar agora?',
          [
            { text: 'Agora não', style: 'cancel' },
            {
              text: 'Atualizar',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch (e) {
                  console.log('[update] erro ao aplicar:', e.message);
                }
              }
            }
          ]
        );
      }
    } catch (e) {
      console.log('[update] erro ao verificar:', e.message);
    }
  }
}