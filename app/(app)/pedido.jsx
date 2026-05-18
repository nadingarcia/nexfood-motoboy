import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const ETAPA_KEY = 'motoboy_etapa_atual';

export default function Pedido() {
  const router = useRouter();
  const [motoboy, setMotoboy] = useState(null);
  const [entrega, setEntrega] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [slug, setSlug] = useState(null);
  const [etapa, setEtapa] = useState('iniciar'); // 'iniciar' | 'entregar'

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

          // Restaura etapa salva — motoboy fechou o app e voltou
          const etapaSalva = await AsyncStorage.getItem(ETAPA_KEY);
          if (etapaSalva) setEtapa(etapaSalva);

        } else {
          await AsyncStorage.removeItem(ETAPA_KEY);
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

  async function avancarEtapa(novaEtapa) {
    setEtapa(novaEtapa);
    await AsyncStorage.setItem(ETAPA_KEY, novaEtapa);
  }

  async function iniciarGPS(mb, restauranteSlug) {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.log('[pedido] permissão foreground negada');
      return;
    }
    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        console.log('[pedido] permissão background negada');
      }
    } catch (e) {
      console.log('[pedido] background location não disponível:', e.message);
    }

    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
    if (isRunning) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

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
  }

  async function pararGPS() {
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isRunning) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    } catch (e) {
      console.log('[pedido] erro ao parar GPS:', e.message);
    }
  }

  function abrirNavegacao() {
    if (!entrega?.endereco) return;
    const { rua, numero, bairro, cidade } = entrega.endereco;
    const addr = encodeURIComponent(`${rua}, ${numero}, ${bairro}, ${cidade}`);
    Alert.alert('Navegar com', '', [
      {
        text: 'Google Maps',
        onPress: () => Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${addr}&travelmode=driving`
        )
      },
      {
        text: 'Waze',
        onPress: () => Linking.openURL(`https://waze.com/ul?q=${addr}&navigate=yes`)
      },
      { text: 'Cancelar', style: 'cancel' }
    ]);
  }

  function ligarCliente() {
    const tel = entrega?.cliente?.telefone;
    if (!tel) return Alert.alert('Sem telefone', 'Telefone do cliente não disponível.');
    Linking.openURL(`tel:${tel}`);
  }

  function whatsappCliente() {
    const tel = entrega?.cliente?.telefone;
    if (!tel) return Alert.alert('Sem telefone', 'Telefone do cliente não disponível.');
    const numero = tel.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/55${numero}`);
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
              await AsyncStorage.removeItem(ETAPA_KEY);
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
  const jaPago = entrega?.formaPagamento === 'online' || entrega?.statusPagamento === 'pago';

  // Footer muda de altura entre etapas
  const footerHeight = etapa === 'entregar' ? 180 : 130;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: footerHeight + 24 }]}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerLabel}>Pedido em andamento</Text>
            <Text style={s.headerNumero}>#{entrega?.numeroPedido || '—'}</Text>
          </View>
          <View style={etapa === 'iniciar' ? s.badgeAmarelo : s.badgeVerde}>
            <MaterialCommunityIcons
              name={etapa === 'iniciar' ? 'store-clock-outline' : 'crosshairs-gps'}
              size={14}
              color={etapa === 'iniciar' ? '#f59e0b' : '#10b981'}
            />
            <Text style={[s.badgeTxt, { color: etapa === 'iniciar' ? '#f59e0b' : '#10b981' }]}>
              {etapa === 'iniciar' ? 'Passo 1 de 2' : 'Passo 2 de 2'}
            </Text>
          </View>
        </View>

        {/* Card endereço */}
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
        </View>

        {/* Card cliente */}
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
              {jaPago ? '✓ Já pago' : 'Cobrar na entrega'}
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

          {/* Ações do cliente */}
          {entrega?.cliente?.telefone ? (
            <>
              <View style={s.divisor} />
              <View style={s.acoesCliente}>
                <TouchableOpacity style={s.btnAcao} onPress={ligarCliente} activeOpacity={0.8}>
                  <Feather name="phone" size={17} color="#10b981" />
                  <Text style={s.btnAcaoTxt}>Ligar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btnAcao, { borderColor: '#25d366' }]} onPress={whatsappCliente} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="whatsapp" size={17} color="#25d366" />
                  <Text style={[s.btnAcaoTxt, { color: '#25d366' }]}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>

        {/* Observações */}
        {entrega?.observacoes ? (
          <View style={[s.card, { borderColor: '#854d0e' }]}>
            <Text style={s.obsLabel}>⚠️ Observações do cliente</Text>
            <Text style={s.obsTxt}>{entrega.observacoes}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer dinâmico */}
      <View style={s.footer}>
        {etapa === 'iniciar' ? (
          <>
            <View style={s.etapaHint}>
              <MaterialCommunityIcons name="store-check-outline" size={18} color="#f59e0b" />
              <Text style={s.etapaHintTxt}>Confirme que pegou o pedido para iniciar a entrega</Text>
            </View>
            <TouchableOpacity
              style={s.btnIniciar}
              onPress={() => avancarEtapa('entregar')}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="bike-fast" size={22} color="#fff" />
              <Text style={s.btnTxt}>Iniciar entrega</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={s.etapaHint}>
              <MaterialCommunityIcons name="map-marker-account-outline" size={18} color="#10b981" />
              <Text style={s.etapaHintTxt}>Entregue ao cliente e confirme</Text>
            </View>
            <TouchableOpacity style={s.btnMaps} onPress={abrirNavegacao} activeOpacity={0.85}>
              <Feather name="navigation" size={20} color="#fff" />
              <Text style={s.btnTxt}>Navegar até o cliente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnFinalizar, finalizando && s.btnDisabled]}
              onPress={handleFinalizar}
              disabled={finalizando}
              activeOpacity={0.85}
            >
              {finalizando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="check-circle" size={20} color="#fff" />
                  <Text style={s.btnTxt}>Confirmar entrega</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  scroll: { padding: 24 },
  loadingTxt: { color: '#a1a1aa', marginTop: 16, fontSize: 15 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 48, marginBottom: 24 },
  headerLabel: { color: '#a1a1aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  headerNumero: { color: '#fff', fontSize: 28, fontWeight: 'bold' },

  badgeVerde: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  badgeAmarelo: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  badgeTxt: { fontSize: 12, fontWeight: '600' },

  card: { backgroundColor: '#18181b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#27272a', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardLabel: { color: '#a1a1aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  endereco: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  bairro: { color: '#a1a1aa', fontSize: 15, marginBottom: 4 },
  referencia: { color: '#facc15', fontSize: 14, marginTop: 4 },

  divisor: { height: 1, backgroundColor: '#27272a', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoDesc: { color: '#a1a1aa', fontSize: 15 },
  infoVal: { color: '#fafafa', fontSize: 15, fontWeight: '600' },
  verde: { color: '#10b981' },
  amarelo: { color: '#facc15' },

  acoesCliente: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnAcao: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)' },
  btnAcaoTxt: { color: '#10b981', fontWeight: '600', fontSize: 14 },

  obsLabel: { color: '#f59e0b', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  obsTxt: { color: '#fafafa', fontSize: 15 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36, backgroundColor: '#09090b', borderTopWidth: 1, borderColor: '#18181b', gap: 10 },
  etapaHint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  etapaHintTxt: { color: '#a1a1aa', fontSize: 13, flex: 1 },

  btnIniciar: { flexDirection: 'row', backgroundColor: '#f59e0b', borderRadius: 14, height: 56, alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 4 },
  btnMaps: { flexDirection: 'row', backgroundColor: '#3b82f6', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 3 },
  btnFinalizar: { flexDirection: 'row', backgroundColor: '#10b981', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 4 },
  btnDisabled: { backgroundColor: '#52525b' },
  btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});