import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { carregarMotoboy } from '../../store/authStore';

const SLUG_TESTE = 'nexfood';
const GPS_INTERVAL = 10000; // envia localização a cada 10s

export default function Pedido() {
  const router = useRouter();
  const [motoboy, setMotoboy] = useState(null);
  const [entrega, setEntrega] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const gpsIntervalo = useRef(null);

  // --- Carrega dados reais da entrega ---
  useEffect(() => {
    async function iniciar() {
      const mb = await carregarMotoboy();
      if (!mb) { router.replace('/(auth)/login'); return; }
      setMotoboy(mb);

      try {
        const { data } = await api.get(`/motoboy/${mb._id}/status`, {
          params: { restauranteSlug: SLUG_TESTE }
        });
        if (data.entregaAtual) {
          setEntrega(data.entregaAtual);
        } else {
          // Sem entrega ativa, volta pra fila
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
      iniciarGPS(mb);
    }

    iniciar();
    return () => pararGPS();
  }, []);

  // --- GPS: pede permissão e começa a enviar localização ---
  async function iniciarGPS(mb) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[pedido] permissão de localização negada');
      return;
    }

    async function enviarLocalizacao() {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        await api.post(`/motoboy/${mb._id}/localizacao`, {
          restauranteSlug: SLUG_TESTE,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      } catch (err) {
        console.log('[pedido] erro ao enviar localização', err.message);
      }
    }

    enviarLocalizacao(); // envia imediatamente
    gpsIntervalo.current = setInterval(enviarLocalizacao, GPS_INTERVAL);
  }

  function pararGPS() {
    if (gpsIntervalo.current) {
      clearInterval(gpsIntervalo.current);
      gpsIntervalo.current = null;
    }
  }

  // --- Abre Google Maps / Waze com o endereço ---
  function abrirNavegacao() {
    if (!entrega?.endereco) return;
    const { rua, numero, bairro, cidade } = entrega.endereco;
    const addr = encodeURIComponent(`${rua}, ${numero}, ${bairro}, ${cidade}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${addr}`;
    Linking.openURL(url);
  }

  // --- Finaliza a entrega ---
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
                restauranteSlug: SLUG_TESTE,
                entregaId: entrega._id,
              });
              Alert.alert('✅ Entregue!', 'Pedido finalizado com sucesso.', [
                { text: 'OK', onPress: () => router.replace('/(app)/fila') }
              ]);
            } catch (err) {
              setFinalizando(false);
              iniciarGPS(motoboy); // retoma GPS se falhar
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
        {/* Header com número do pedido */}
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

        {/* Ícone central */}
        <View style={s.iconWrapper}>
          <View style={s.iconBg}>
            <MaterialCommunityIcons name="package-variant-closed" size={52} color="#8b5cf6" />
          </View>
        </View>

        {/* Card: endereço */}
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

          {/* Botão navegar */}
          <TouchableOpacity style={s.btnNavegar} onPress={abrirNavegacao} activeOpacity={0.8}>
  <Feather name="navigation" size={16} color="#8b5cf6" />
  <Text style={s.btnNavegarTxt}>Abrir no Maps</Text>
</TouchableOpacity>

{/* 🧪 TESTE — remover depois */}
<TouchableOpacity
  style={[s.btnNavegar, { borderTopWidth: 0, marginTop: 0 }]}
  onPress={() => router.push('/(app)/testeMapa')}
  activeOpacity={0.8}
>
  <MaterialCommunityIcons name="map-marker-radius" size={16} color="#f59e0b" />
  <Text style={[s.btnNavegarTxt, { color: '#f59e0b' }]}>🧪 Ver mapa ao vivo</Text>
</TouchableOpacity>
        </View>

        {/* Card: cliente e pagamento */}
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
              {jaPago ? '✓ Já pago no app' : `Cobrar na entrega`}
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

        {/* Observações */}
        {entrega?.observacoes ? (
          <View style={[s.card, { borderColor: '#854d0e' }]}>
            <Text style={s.obsLabel}>⚠️ Observações do cliente</Text>
            <Text style={s.obsTxt}>{entrega.observacoes}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Botão fixo de finalizar */}
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