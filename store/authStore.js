import AsyncStorage from '@react-native-async-storage/async-storage'

const CHAVE = '@nexfood_motoboy'

export async function salvarMotoboy(dados) {
  await AsyncStorage.setItem(CHAVE, JSON.stringify(dados))
}

export async function carregarMotoboy() {
  const raw = await AsyncStorage.getItem(CHAVE)
  return raw ? JSON.parse(raw) : null
}

export async function limparMotoboy() {
  await AsyncStorage.removeItem(CHAVE)
}
