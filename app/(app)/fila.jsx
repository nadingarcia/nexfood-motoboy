// app/(app)/fila.jsx
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,          // ← adicionar
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import api from '../../services/api';
import { registrarPushToken } from '../../services/notificationService';
import { carregarMotoboy, carregarSlug, limparMotoboy } from '../../store/authStore';
import * as Location from 'expo-location';

const POLLING_INTERVAL = 30000;

export default function Fila() {
  const router   = useRouter();
  const [motoboy, setMotoboy] = useState(null);
  const [slug,    setSlug]    = useState(null);
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [buscando, setBuscando] = useState(false);

  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useFocusEffect(
  useCallback(() => {
    verificarPermissoes();
  }, [])
);

async function verificarPermissoes() {
  const { status: fg } = await Location.getForegroundPermissionsAsync();
  const { status: bg } = await Location.getBackgroundPermissionsAsync();

  if (fg !== 'granted' || bg !== 'granted') {
    Alert.alert(
      '📍 Localização necessária',
      'Para receber entregas, ative a localização como "Permitir sempre" nas configurações do celular.',
      [
        {
          text: 'Abrir configurações',
          onPress: () => Linking.openSettings(),
        },
        {
          text: 'Já ativei',
          onPress: () => verificarPermissoes(),
        }
      ],
      { cancelable: false }
    );
  }
}

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim,   { toValue: 1.5, duration: 2000, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0,   duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const buscarStatus = useCallback(async (mb, sl, { silencioso = false } = {}) => {
    if (!silencioso) setBuscando(true);
    try {
      const { data } = await api.get(`/motoboy/${mb._id}/status`, {
        params: { restauranteSlug: sl },
      });
      setStatus(data);
      if (data.temEntrega || data.entregaAtual) {
        router.replace('/(app)/pedido');
      }
    } catch (err) {
      console.log('[fila] erro ao buscar status', err.message);
      if (!silencioso) Alert.alert('Erro', 'Não foi possível verificar o status.');
    } finally {
      if (!silencioso) setBuscando(false);
    }
  }, [router]);

  useEffect(() => {
    let intervalo;

    async function iniciar() {
      const mb = await carregarMotoboy();
      const sl = await carregarSlug();

      if (!mb || !sl) { router.replace('/(auth)/login'); return; }

      setMotoboy(mb);
      setSlug(sl);

      // Check-in silencioso
      try {
        await api.post('/motoboy/checkin', { motoboyId: mb._id, restauranteSlug: sl });
      } catch (_) {}

      // Registra push token (permissão + envia ao servidor)
      await registrarPushToken(mb._id, sl);

      await buscarStatus(mb, sl, { silencioso: true });
      setLoading(false);

      intervalo = setInterval(() => buscarStatus(mb, sl, { silencioso: true }), POLLING_INTERVAL);
    }

    iniciar();
    return () => clearInterval(intervalo);
  }, [buscarStatus, router]);

  async function handleSair() {
    Alert.alert('Ficar Offline', 'Deseja encerrar o expediente e sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/motoboy/checkout', { motoboyId: motoboy._id, restauranteSlug: slug });
          } catch (_) {}
          await limparMotoboy();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const isOnline = status?.online;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />

      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Painel de Entregas</Text>
          <Text style={s.headerSub}>Olá, {motoboy?.nome?.split(' ')[0]} 👋</Text>
        </View>
        <View style={s.headerActions}>
          {/* Histórico do dia */}
          <TouchableOpacity
            style={s.btnHistorico}
            onPress={() => router.push('/(app)/historico')}
          >
            <Feather name="clock" size={18} color="#a1a1aa" />
          </TouchableOpacity>

          <TouchableOpacity style={s.btnSair} onPress={handleSair}>
            <Feather name="power" size={18} color="#ef4444" />
            <Text style={s.sairTxt}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.radarContainer}>
        {isOnline ? (
          <>
            <Animated.View style={[s.radarCircle, { transform: [{ scale: pulseAnim }], opacity: opacityAnim }]} />
            <View style={s.radarInner}>
              <MaterialCommunityIcons name="radar" size={48} color="#10b981" />
            </View>
            <Text style={s.radarTitulo}>Você está Online</Text>
            <Text style={s.radarSub}>Aguarde a notificação ou toque o botão abaixo</Text>
          </>
        ) : (
          <>
            <View style={[s.radarInner, { backgroundColor: '#27272a', borderColor: '#3f3f46' }]}>
              <Feather name="moon" size={40} color="#a1a1aa" />
            </View>
            <Text style={s.radarTitulo}>Você está Offline</Text>
            <Text style={s.radarSub}>Conecte-se para receber entregas</Text>
          </>
        )}
      </View>

      <TouchableOpacity
        style={[s.btnBuscar, buscando && s.btnBuscarDisabled]}
        onPress={() => motoboy && slug && buscarStatus(motoboy, slug)}
        disabled={buscando}
        activeOpacity={0.8}
      >
        {buscando ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons name="package-variant-closed" size={20} color="#fff" />
            <Text style={s.btnBuscarTxt}>Buscar meu pedido</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={s.infoCard}>
        <View style={s.infoRow}>
          <View style={s.infoIcon}>
            <MaterialCommunityIcons name="storefront-outline" size={20} color="#8b5cf6" />
          </View>
          <View>
            <Text style={s.infoLabel}>Conectado ao restaurante</Text>
            <Text style={s.infoValor}>{status?.restauranteNome || slug}</Text>
          </View>
        </View>
      </View>

      <View style={s.rodape}>
        <ActivityIndicator size="small" color="#52525b" />
        <Text style={s.rodapeTxt}>Verificando a cada 30s automaticamente</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 48, marginBottom: 40 },
  headerTitle: { color: '#a1a1aa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  headerSub: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  btnSair: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#27272a', gap: 6 },
  sairTxt: { color: '#ef4444', fontSize: 14, fontWeight: '600' },

  radarContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  radarCircle: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  radarInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 2, borderColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 24, zIndex: 10 },
  radarTitulo: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  radarSub: { color: '#a1a1aa', fontSize: 15, textAlign: 'center', maxWidth: '80%' },

  // Botão buscar pedido
  btnBuscar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#8b5cf6', borderRadius: 14, height: 56, marginBottom: 20, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnBuscarDisabled: { backgroundColor: '#52525b' },
  btnBuscarTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  infoCard: { backgroundColor: '#18181b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#27272a', marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  infoIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  infoLabel: { color: '#a1a1aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValor: { color: '#fafafa', fontSize: 16, fontWeight: 'bold' },

  rodape: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 },
  rodapeTxt: { color: '#52525b', fontSize: 13 },

  // Adicione dentro do seu StyleSheet.create, junto com os outros:
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnHistorico:  { padding: 8, backgroundColor: '#18181b', borderRadius: 10, marginRight: 4 },
});