import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import api from '../../services/api';
import { carregarMotoboy, carregarSlug } from '../../store/authStore';
import { LOCATION_TASK_NAME } from '../../tasks/locationTask';

export default function Pedido() {
  const router = useRouter();
  const [motoboy, setMotoboy] = useState(null);
  const [entrega, setEntrega] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [slug, setSlug] = useState(null);

  useEffect(() => {
    async function iniciar() {
      const mb = await carregarMotoboy();
      if (!mb) { router.replace('/(auth)/login'); return; }
      setMotoboy(mb);

      const sl = await carregarSlug();
      if (!sl) { router.replace('/(auth)/login'); return; }
      setSlug(sl);

      try {
        const { data } = await api.get(`/motoboy/${mb._id}/status`, {
          params: { restauranteSlug: sl }
        });
        if (data.entregaAtual) {
          setEntrega(data.entregaAtual);
        } else {
          Alert.alert('Sem pedido', 'Nenhuma entrega ativa encontrada.');
          router.replace('/(app)/fila');
          return;
        }
      } catch (err) {
        Alert.alert('Erro', 'Não foi possível carregar o pedido.');
        router.replace('/(app)/fila');
        return;
      }

      setLoading(false);
      iniciarGPS(mb, sl);
    }

    iniciar();
    return () => pararGPS();
  }, []);

  async function iniciarGPS(mb, restauranteSlug) {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.log('[pedido] permissão foreground negada');
      return;
    }

    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        console.log('[pedido] permissão background negada — GPS pausará ao minimizar');
      }
    } catch (e) {
      console.log('[pedido] background location não disponível neste build:', e.message);
    }

    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000,
      distanceInterval: 0,
      foregroundService: {
        notificationTitle: 'NexFood Motoboy',
        notificationBody: 'Rastreando sua entrega...',
        notificationColor: '#8b5cf6',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });

    console.log('[pedido] GPS background iniciado');
  }

  async function pararGPS() {
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('[pedido] GPS background parado');
      }
    } catch (e) {
      console.log('[pedido] erro ao parar GPS:', e.message);
    }
  }

  function abrirNavegacao() {
    if (!entrega?.endereco) return;
    const { rua, numero, bairro, cidade } = entrega.endereco;
    const addr = encodeURIComponent(`${rua}, ${numero}, ${bairro}, ${cidade}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${addr}`;
    Linking.openURL(url);
  }

  async function handleFinalizar() {
    Alert.alert(
      'Confirmar entrega',
      'Confirma que o pedido foi entregue ao cliente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setFinalizando(true);
            pararGPS();
            try {
              await api.post(`/motoboy/${motoboy._id}/finalizar-entrega`, {
                restauranteSlug: slug,
                entregaId: entrega._id,
              });
              Alert.alert('✅ Entregue!', 'Pedido finalizado com sucesso.', [
                { text: 'OK', onPress: () => router.replace('/(app)/fila') }
              ]);
            } catch (err) {
              setFinalizando(false);
              iniciarGPS(motoboy, slug);
              const msg = err.response?.data?.erro || 'Erro ao finalizar. Tente novamente.';
              Alert.alert('Erro', msg);
            }
          }
        }
      ]
    );
  }

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={s.loadingTxt}>Carregando pedido...</Text>
      </View>
    );
  }

  const end = entrega?.endereco;
  const enderecoFormatado = end
    ? `${end.rua}, ${end.numero}${end.complemento ? ` - ${end.complemento}` : ''}`
    : '—';
  const bairroFormatado = end ? `${end.bairro} · ${end.cidade}` : '—';
  const jaPago = entrega?.formaPagamento === 'online' || entrega?.pago === true;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <View>
            <Text style={s.headerLabel}>Pedido em andamento</Text>
            <Text style={s.headerNumero}>#{entrega?.numeroPedido || '—'}</Text>
          </View>
          <View style={s.gpsBadge}>
            <MaterialCommunityIcons name="crosshairs-gps" size={14} color="#10b981" />
            <Text style={s.gpsTxt}>GPS ativo</Text>
          </View>
        </View>

        <View style={s.iconWrapper}>
          <View style={s.iconBg}>
            <MaterialCommunityIcons name="package-variant-closed" size={52} color="#8b5cf6" />
          </View>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <Feather name="map-pin" size={15} color="#a1a1aa" />
            <Text style={s.cardLabel}>Endereço de entrega</Text>
          </View>
          <Text style={s.endereco}>{enderecoFormatado}</Text>
          <Text style={s.bairro}>{bairroFormatado}</Text>
          {end?.referencia ? (
            <Text style={s.referencia}>📍 {end.referencia}</Text>
          ) : null}
          <TouchableOpacity style={s.btnNavegar} onPress={abrirNavegacao} activeOpacity={0.8}>
            <Feather name="navigation" size={16} color="#8b5cf6" />
            <Text style={s.btnNavegarTxt}>Abrir no Maps</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.infoDesc}>Cliente</Text>
            <Text style={s.infoVal}>{entrega?.cliente?.nome || '—'}</Text>
          </View>
          <View style={s.divisor} />
          <View style={s.row}>
            <Text style={s.infoDesc}>Total</Text>
            <Text style={s.infoVal}>
              {entrega?.total != null
                ? `R$ ${Number(entrega.total).toFixed(2).replace('.', ',')}`
                : '—'}
            </Text>
          </View>
          <View style={s.divisor} />
          <View style={s.row}>
            <Text style={s.infoDesc}>Pagamento</Text>
            <Text style={[s.infoVal, jaPago ? s.verde : s.amarelo]}>
              {jaPago ? '✓ Já pago no app' : 'Cobrar na entrega'}
            </Text>
          </View>
          {!jaPago && entrega?.formaPagamento ? (
            <>
              <View style={s.divisor} />
              <View style={s.row}>
                <Text style={s.infoDesc}>Forma</Text>
                <Text style={s.infoVal}>{entrega.formaPagamento}</Text>
              </View>
            </>
          ) : null}
        </View>

        {entrega?.observacoes ? (
          <View style={[s.card, { borderColor: '#854d0e' }]}>
            <Text style={s.obsLabel}>⚠️ Observações do cliente</Text>
            <Text style={s.obsTxt}>{entrega.observacoes}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btnFinalizar, finalizando && s.btnFinalizarDisabled]}
          onPress={handleFinalizar}
          disabled={finalizando}
          activeOpacity={0.85}
        >
          {finalizando ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="check-circle" size={22} color="#fff" />
              <Text style={s.btnFinalizarTxt}>Confirmar entrega</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  scroll: { padding: 24, paddingBottom: 100 },
  loadingTxt: { color: '#a1a1aa', marginTop: 16, fontSize: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 48, marginBottom: 24 },
  headerLabel: { color: '#a1a1aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  headerNumero: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  gpsTxt: { color: '#10b981', fontSize: 12, fontWeight: '600' },
  iconWrapper: { alignItems: 'center', marginBottom: 28 },
  iconBg: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderWidth: 2, borderColor: 'rgba(139, 92, 246, 0.3)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#18181b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#27272a', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardLabel: { color: '#a1a1aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  endereco: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  bairro: { color: '#a1a1aa', fontSize: 15, marginBottom: 4 },
  referencia: { color: '#facc15', fontSize: 14, marginTop: 4, marginBottom: 4 },
  btnNavegar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: '#27272a', justifyContent: 'center' },
  btnNavegarTxt: { color: '#8b5cf6', fontWeight: '600', fontSize: 15 },
  divisor: { height: 1, backgroundColor: '#27272a', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoDesc: { color: '#a1a1aa', fontSize: 15 },
  infoVal: { color: '#fafafa', fontSize: 15, fontWeight: '600' },
  verde: { color: '#10b981' },
  amarelo: { color: '#facc15' },
  obsLabel: { color: '#f59e0b', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  obsTxt: { color: '#fafafa', fontSize: 15 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 40, backgroundColor: '#09090b', borderTopWidth: 1, borderColor: '#18181b' },
  btnFinalizar: { flexDirection: 'row', backgroundColor: '#10b981', borderRadius: 14, height: 58, alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnFinalizarDisabled: { backgroundColor: '#52525b' },
  btnFinalizarTxt: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
});