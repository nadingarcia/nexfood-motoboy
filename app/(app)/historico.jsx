// app/(app)/historico.jsx
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../../services/api';
import { carregarMotoboy, carregarSlug } from '../../store/authStore';

function horaFormatada(dataStr) {
  if (!dataStr) return '--:--';
  const d = new Date(dataStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function valorFormatado(v) {
  if (v == null) return '—';
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

export default function Historico() {
  const router  = useRouter();
  const [dados, setDados]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState(null);

  useEffect(() => {
    async function carregar() {
      const mb = await carregarMotoboy();
      const sl = await carregarSlug();
      if (!mb || !sl) { router.replace('/(auth)/login'); return; }

      try {
        const { data } = await api.get(`/motoboy/${mb._id}/historico`, {
          params: { restauranteSlug: sl },
        });
        setDados(data);
      } catch (err) {
        setErro('Não foi possível carregar o histórico.');
        console.log('[historico]', err.message);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={s.titulo}>Histórico do Dia</Text>
          <Text style={s.subtitulo}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={s.centro}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : erro ? (
        <View style={s.centro}>
          <Feather name="alert-circle" size={40} color="#ef4444" />
          <Text style={s.erroTxt}>{erro}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Cards de resumo */}
          <View style={s.resumoRow}>
            <View style={s.resumoCard}>
              <MaterialCommunityIcons name="package-variant-closed" size={24} color="#8b5cf6" />
              <Text style={s.resumoNum}>{dados.totalEntregas}</Text>
              <Text style={s.resumoLabel}>Entregas</Text>
            </View>
            <View style={s.resumoCard}>
              <MaterialCommunityIcons name="cash" size={24} color="#10b981" />
              <Text style={s.resumoNum}>{valorFormatado(dados.totalValor)}</Text>
              <Text style={s.resumoLabel}>Total entregue</Text>
            </View>
          </View>

          {/* Lista */}
          {dados.entregas.length === 0 ? (
            <View style={s.vazio}>
              <Feather name="inbox" size={36} color="#3f3f46" />
              <Text style={s.vazioTxt}>Nenhuma entrega hoje ainda</Text>
            </View>
          ) : (
            dados.entregas.map((e, i) => (
              <View key={e._id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.numeroBadge}>
                    <Text style={s.numeroBadgeTxt}>#{e.numeroPedido || i + 1}</Text>
                  </View>
                  <Text style={s.horario}>{horaFormatada(e.chegadaEm)}</Text>
                </View>

                {e.endereco ? (
                  <Text style={s.enderecoTxt} numberOfLines={1}>
                    <Feather name="map-pin" size={12} color="#71717a" />{' '}
                    {e.endereco.rua}, {e.endereco.numero} — {e.endereco.bairro}
                  </Text>
                ) : null}

                <View style={s.cardBottom}>
                  <Text style={s.formaPag}>{e.formaPagamento || 'N/A'}</Text>
                  <Text style={s.valor}>{valorFormatado(e.total)}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#09090b' },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, paddingTop: 56 },
  backBtn:       { padding: 6 },
  titulo:        { color: '#fff', fontSize: 18, fontWeight: '700' },
  subtitulo:     { color: '#71717a', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  centro:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  erroTxt:       { color: '#ef4444', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  scroll:        { padding: 20, paddingTop: 8, gap: 12 },
  resumoRow:     { flexDirection: 'row', gap: 12, marginBottom: 8 },
  resumoCard:    { flex: 1, backgroundColor: '#18181b', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  resumoNum:     { color: '#fff', fontSize: 20, fontWeight: '800' },
  resumoLabel:   { color: '#71717a', fontSize: 12 },
  vazio:         { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  vazioTxt:      { color: '#3f3f46', fontSize: 14 },
  card:          { backgroundColor: '#18181b', borderRadius: 12, padding: 14, gap: 8 },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numeroBadge:   { backgroundColor: '#1e1b4b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  numeroBadgeTxt:{ color: '#a78bfa', fontSize: 13, fontWeight: '700' },
  horario:       { color: '#71717a', fontSize: 13 },
  enderecoTxt:   { color: '#a1a1aa', fontSize: 13 },
  cardBottom:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  formaPag:      { color: '#52525b', fontSize: 12, textTransform: 'capitalize' },
  valor:         { color: '#10b981', fontSize: 16, fontWeight: '700' },
});