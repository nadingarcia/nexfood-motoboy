// store/authStore.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const MOTOBOY_KEY = '@nex_motoboy';
const SLUG_KEY    = '@nex_slug';

export async function salvarMotoboy(motoboy, slug) {
  await AsyncStorage.setItem(MOTOBOY_KEY, JSON.stringify(motoboy));
  if (slug) await AsyncStorage.setItem(SLUG_KEY, slug);
}

export async function carregarMotoboy() {
  const json = await AsyncStorage.getItem(MOTOBOY_KEY);
  return json ? JSON.parse(json) : null;
}

export async function carregarSlug() {
  return await AsyncStorage.getItem(SLUG_KEY);
}

export async function limparMotoboy() {
  await AsyncStorage.multiRemove([MOTOBOY_KEY, SLUG_KEY]);
}