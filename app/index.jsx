import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { carregarMotoboy } from '../store/authStore'
import { View, ActivityIndicator } from 'react-native'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    async function verificarSessao() {
      const motoboy = await carregarMotoboy()
      if (motoboy?._id) {
        router.replace('/(app)/fila')
      } else {
        router.replace('/(auth)/login')
      }
    }
    verificarSessao()
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}>
      <ActivityIndicator size="large" color="#f97316" />
    </View>
  )
}
