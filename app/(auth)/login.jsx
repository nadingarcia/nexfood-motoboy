import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import api from '../../services/api';
import { salvarMotoboy } from '../../store/authStore';

// --- Subcomponente para Inputs Modernos ---
const InputItem = ({ icon, label, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={s.inputContainer}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputWrapper, isFocused && s.inputFocused]}>
        <Feather 
          name={icon} 
          size={20} 
          color={isFocused ? '#8b5cf6' : '#52525b'} 
          style={s.inputIcon} 
        />
        <TextInput
          style={s.input}
          placeholderTextColor="#52525b"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
    </View>
  );
};

export default function Login() {
  const router = useRouter();
  const [restauranteSlug, setRestauranteSlug] = useState(''); // <-- Adicionado para login manual
  const [telefone, setTelefone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!restauranteSlug.trim() || !telefone.trim() || pin.length !== 4) {
      Alert.alert('Atenção', 'Informe o ID do restaurante, o telefone e o PIN de 4 dígitos');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/motoboy/login', {
        telefone: telefone.trim(),
        pin,
        restauranteSlug: restauranteSlug.trim().toLowerCase(), // Tratando maiúsculas
      });

      await salvarMotoboy(data.motoboy);
      router.replace('/(app)/fila');
    } catch (err) {
      console.log('ERRO LOGIN =>', err?.response?.data || err.message);
      const msg = err.response?.data?.erro || 'Erro ao fazer login';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <ScrollView 
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.card}>
          {/* Header do Card */}
          <View style={s.header}>
            <View style={s.iconWrapper}>
              <MaterialCommunityIcons name="moped" size={36} color="#8b5cf6" />
            </View>
            <Text style={s.logo}>NexFood</Text>
            <Text style={s.titulo}>Área do Entregador</Text>
          </View>

          {/* Inputs */}
          <View style={s.form}>
            <InputItem
              icon="link"
              label="ID do Restaurante (Slug)"
              placeholder="ex: meurestaurante"
              autoCapitalize="none"
              autoCorrect={false}
              value={restauranteSlug}
              onChangeText={setRestauranteSlug}
            />

            <InputItem
              icon="phone"
              label="Telefone"
              placeholder="(11) 99999-9999"
              keyboardType="phone-pad"
              value={telefone}
              onChangeText={setTelefone}
            />

            <InputItem
              icon="lock"
              label="PIN (Senha)"
              placeholder="4 dígitos"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={pin}
              onChangeText={setPin}
            />
          </View>

          {/* Botões */}
          <View style={s.footer}>
            <TouchableOpacity 
              style={s.btn} 
              activeOpacity={0.8}
              onPress={handleLogin} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.btnText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={s.linkBtn}
              activeOpacity={0.6}
              onPress={() => router.push('/(auth)/cadastro')}
            >
              <Text style={s.linkText}>Primeiro acesso? <Text style={s.linkBold}>Cadastre-se</Text></Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#09090b', 
  },
  scroll: { 
    flexGrow: 1, 
    justifyContent: 'center', // Centraliza o Card na tela
    padding: 24, 
  },
  card: { 
    backgroundColor: '#18181b', // Fundo um pouco mais claro que o fundo geral
    borderRadius: 24, 
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#09090b', // Fundo escuro pro ícone
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  logo: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: '800', 
    letterSpacing: 1,
    marginBottom: 4, 
  },
  titulo: { 
    fontSize: 16, 
    color: '#a1a1aa', 
    fontWeight: '500', 
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 4,
  },
  label: { 
    color: '#e4e4e7',
    fontSize: 14, 
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090b', // Contraste do input com o card
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#27272a',
    paddingHorizontal: 16,
    height: 54,
  },
  inputFocused: {
    borderColor: '#8b5cf6',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    height: '100%',
  },
  footer: {
    marginTop: 32,
    gap: 16,
  },
  btn: { 
    backgroundColor: '#8b5cf6', 
    borderRadius: 12, 
    height: 54,
    alignItems: 'center', 
    justifyContent: 'center',
  },
  btnText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
  },
  linkBtn: {
    alignItems: 'center',
    padding: 8,
  },
  linkText: { 
    color: '#a1a1aa', 
    fontSize: 14 
  },
  linkBold: { 
    color: '#8b5cf6', 
    fontWeight: 'bold' 
  },
});