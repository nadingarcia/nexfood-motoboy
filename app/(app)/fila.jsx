import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import api from '../../services/api';
import { carregarMotoboy, limparMotoboy } from '../../store/authStore';

const SLUG_TESTE = 'nexfood';
const POLLING_INTERVAL = 30000; // 30s — só fallback, a notificação vem pelo WhatsApp

export default function Fila() {
  const router = useRouter();
  const [motoboy, setMotoboy] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buscando, setBuscando] = useState(false); // loading do botão manual

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 2000, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const buscarStatus = useCallback(async (mb, { silencioso = false } = {}) => {
    if (!silencioso) setBuscando(true);
    try {
      const { data } = await api.get(`/motoboy/${mb._id}/status`, {
        params: { restauranteSlug: SLUG_TESTE }
      });
      setStatus(data);
      if (data.temEntrega || data.entregaAtual) {
        router.replace('/(app)/pedido');
      }
    } catch (err) {
      console.log('[fila] erro ao buscar status', err.message);
      if (!silencioso) {
        Alert.alert('Erro', 'Não foi possível verificar o status. Tente novamente.');
      }
    } finally {
      if (!silencioso) setBuscando(false);
    }
  }, [router]);

  useEffect(() => {
    let intervalo;

    async function iniciar() {
      const mb = await carregarMotoboy();
      if (!mb) { router.replace('/(auth)/login'); return; }
      setMotoboy(mb);

      try {
        await api.post('/motoboy/checkin', {
          motoboyId: mb._id,
          restauranteSlug: SLUG_TESTE,
        });
      } catch (_) {}

      await buscarStatus(mb, { silencioso: true });
      setLoading(false);

      // Polling leve de 30s — só fallback caso a notificação WhatsApp falhe
      intervalo = setInterval(() => buscarStatus(mb, { silencioso: true }), POLLING_INTERVAL);
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
            await api.post('/motoboy/checkout', {
              motoboyId: motoboy._id,
              restauranteSlug: SLUG_TESTE,
            });
          } catch (_) {}
          await limparMotoboy();
          router.replace('/(auth)/login');
        }
      }
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
        <TouchableOpacity style={s.btnSair} onPress={handleSair}>
          <Feather name="power" size={18} color="#ef4444" />
          <Text style={s.sairTxt}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={s.radarContainer}>
        {isOnline ? (
          <>
            <Animated.View style={[s.radarCircle, { transform: [{ scale: pulseAnim }], opacity: opacityAnim }]} />
            <View style={s.radarInner}>
              <MaterialCommunityIcons name="radar" size={48} color="#10b981" />
            </View>
            <Text style={s.radarTitulo}>Você está Online</Text>
            <Text style={s.radarSub}>Quando receber o WhatsApp, toque o botão abaixo</Text>
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

      {/* Botão principal — motoboy toca depois de ver o WhatsApp */}
      <TouchableOpacity
        style={[s.btnBuscar, buscando && s.btnBuscarDisabled]}
        onPress={() => motoboy && buscarStatus(motoboy)}
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
            <Text style={s.infoValor}>{status?.restauranteNome || SLUG_TESTE}</Text>
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
});