import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native'
import MapView, { Marker, Polyline } from 'react-native-maps'
import api from '../../services/api'
import { carregarMotoboy } from '../../store/authStore'

const RESTAURANTE_SLUG = 'nexfood'

export default function TesteMapa() {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [motoboy, setMotoboy] = useState(null)

  async function carregar(motoboyId) {
    try {
      const { data } = await api.get(`/motoboy/${motoboyId}/status`, {
        params: { restauranteSlug: RESTAURANTE_SLUG }
      })
      console.log('[STATUS]', data)
      setDados(data)
    } catch (err) {
      console.log(err?.response?.data || err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let interval

    async function iniciar() {
      const mb = await carregarMotoboy()
      if (!mb) return

      setMotoboy(mb)
      carregar(mb._id)

      interval = setInterval(() => {
        carregar(mb._id)
      }, 5000)
    }

    iniciar()
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={s.loading}>Carregando mapa...</Text>
      </View>
    )
  }

  const entrega = dados?.entregaAtual

  const latMotoboy = Number(dados?.localizacaoMotoboy?.lat)
  const lngMotoboy = Number(dados?.localizacaoMotoboy?.lng)

  const latCliente = Number(entrega?.endereco?.latitude)
  const lngCliente = Number(entrega?.endereco?.longitude)

  const temMotoboy = !isNaN(latMotoboy) && !isNaN(lngMotoboy) && latMotoboy !== 0
  const temMapa = !isNaN(latCliente) && !isNaN(lngCliente) && latCliente !== 0

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={s.title}>Tracking ao vivo</Text>

        <View style={s.card}>
          <Text style={s.label}>Online</Text>
          <Text style={s.value}>{dados?.online ? 'SIM' : 'NÃO'}</Text>

          <Text style={s.label}>Status</Text>
          <Text style={s.value}>{dados?.status || '—'}</Text>

          <Text style={s.label}>Pedido</Text>
          <Text style={s.value}>#{entrega?.numeroPedido || '—'}</Text>

          <Text style={s.label}>Cliente</Text>
          <Text style={s.value}>{entrega?.cliente?.nome || '—'}</Text>
        </View>

        {temMapa ? (
          <View style={s.mapWrapper}>
            <MapView
              style={s.map}
              initialRegion={{
                latitude: latCliente,
                longitude: lngCliente,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
            >
              {/* Marker do cliente — destino */}
              <Marker
                coordinate={{ latitude: latCliente, longitude: lngCliente }}
                title="Cliente"
                description="Destino da entrega"
                pinColor="red"
              />

              {/* Marker do motoboy — só quando tiver GPS */}
              {temMotoboy && (
                <Marker
                  coordinate={{ latitude: latMotoboy, longitude: lngMotoboy }}
                  title="Motoboy"
                  description="Posição atual"
                  pinColor="#8b5cf6"
                />
              )}

              {/* Linha entre motoboy e cliente */}
              {temMotoboy && (
                <Polyline
                  coordinates={[
                    { latitude: latMotoboy, longitude: lngMotoboy },
                    { latitude: latCliente, longitude: lngCliente },
                  ]}
                  strokeWidth={4}
                  strokeColor="#8b5cf6"
                />
              )}
            </MapView>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.error}>Coordenadas ainda não disponíveis.</Text>
          </View>
        )}

        <View style={s.card}>
          <Text style={s.jsonTitle}>Debug coordenadas</Text>
          <Text style={s.json}>latMotoboy: {String(dados?.localizacaoMotoboy?.lat)}</Text>
          <Text style={s.json}>lngMotoboy: {String(dados?.localizacaoMotoboy?.lng)}</Text>
          <Text style={s.json}>---</Text>
          <Text style={s.json}>endereco raw: {JSON.stringify(dados?.entregaAtual?.endereco)}</Text>
          <Text style={s.json}>---</Text>
          <Text style={s.json}>JSON bruto</Text>
          <Text style={s.json}>{JSON.stringify(dados, null, 2)}</Text>
        </View>

        <TouchableOpacity style={s.btn} onPress={() => motoboy && carregar(motoboy._id)}>
          <Text style={s.btnTxt}>Atualizar agora</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
  },
  loading: {
    color: '#fff',
    marginTop: 12,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  label: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 10,
  },
  value: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapWrapper: {
    height: 400,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    flex: 1,
  },
  btn: {
    backgroundColor: '#8b5cf6',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTxt: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    color: '#facc15',
  },
  jsonTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  json: {
    color: '#a1a1aa',
    fontSize: 12,
  },
})