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

export default function Cadastro() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    pin: '',
    veiculo: 'moto',
    placa: '',
    restauranteSlug: '', // <-- Novo campo para o slug manual
  });
  const [loading, setLoading] = useState(false);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleCadastro() {
    if (!form.nome.trim() || !form.telefone.trim() || form.pin.length !== 4 || !form.restauranteSlug.trim()) {
      Alert.alert('Atenção', 'Nome, telefone, PIN e Slug do restaurante são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/motoboy/cadastro', {
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        pin: form.pin,
        veiculo: form.veiculo,
        placa: form.placa.trim() || undefined,
        restauranteSlug: form.restauranteSlug.trim().toLowerCase(), // enviando o slug digitado
      });

      await salvarMotoboy(data.motoboy, form.restauranteSlug.trim().toLowerCase());
      router.replace('/(app)/fila');
    } catch (err) {
      console.log('ERRO CADASTRO =>', err?.response?.data || err.message);
      const msg = err?.response?.data?.erro || err?.message || 'Erro ao cadastrar';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  }

  const veiculos = [
    { id: 'moto', nome: 'Moto', icon: 'motorbike' },
    { id: 'bicicleta', nome: 'Bicicleta', icon: 'bicycle' },
    { id: 'carro', nome: 'Carro', icon: 'car' },
    { id: 'van', nome: 'Van/Furgão', icon: 'van-utility' },
  ];

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <ScrollView 
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <View style={s.iconWrapper}>
            <MaterialCommunityIcons name="moped" size={32} color="#8b5cf6" />
          </View>
          <Text style={s.logo}>NexFood</Text>
          <Text style={s.titulo}>Crie sua conta</Text>
        </View>

        <View style={s.form}>
          <InputItem
            icon="link" // Ícone para representar o link/slug
            label="ID do Restaurante (Slug)"
            placeholder="ex: meurestaurante"
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            value={form.restauranteSlug}
            onChangeText={(v) => set('restauranteSlug', v)}
          />

          <InputItem
            icon="user"
            label="Nome completo"
            placeholder="Como devemos te chamar?"
            keyboardType="default"
            autoCapitalize="words"
            value={form.nome}
            onChangeText={(v) => set('nome', v)}
          />

          <InputItem
            icon="phone"
            label="Telefone (WhatsApp)"
            placeholder="(11) 99999-9999"
            keyboardType="phone-pad"
            value={form.telefone}
            onChangeText={(v) => set('telefone', v)}
          />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <InputItem
                icon="lock"
                label="PIN (Senha)"
                placeholder="4 dígitos"
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                value={form.pin}
                onChangeText={(v) => set('pin', v)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputItem
                icon="hash"
                label="Placa (Opcional)"
                placeholder="ABC-1234"
                autoCapitalize="characters"
                value={form.placa}
                onChangeText={(v) => set('placa', v)}
              />
            </View>
          </View>

          {/* Seleção de Veículo Compacta */}
          <View style={s.veiculoContainer}>
            <Text style={s.label}>Veículo de entrega</Text>
            <View style={s.veiculoGrid}>
              {veiculos.map((v) => {
                const isSelected = form.veiculo === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    activeOpacity={0.7}
                    style={[s.veiculoBtn, isSelected && s.veiculoAtivo]}
                    onPress={() => set('veiculo', v.id)}
                  >
                    <MaterialCommunityIcons 
                      name={v.icon} 
                      size={20} // Ícone menor
                      color={isSelected ? '#fff' : '#71717a'} 
                    />
                    <Text style={[s.veiculoTxt, isSelected && s.veiculoTxtAtivo]}>
                      {v.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity 
            style={s.btn} 
            activeOpacity={0.8}
            onPress={handleCadastro} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>Concluir Cadastro</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={s.linkBtn} 
            activeOpacity={0.6}
            onPress={() => router.back()}
          >
            <Text style={s.linkText}>Já tenho uma conta. <Text style={s.linkBold}>Entrar</Text></Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24, 
    paddingTop: 60,
    paddingBottom: 80, // Aumentado para garantir que o botão não sobreponha nada
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  logo: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  titulo: { 
    fontSize: 24, 
    color: '#fafafa', 
    fontWeight: 'bold', 
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#27272a',
    paddingHorizontal: 16,
    height: 54, // Ligeiramente mais baixo
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

  // Novo layout compacto para veículos
  veiculoContainer: {
    marginTop: 4,
  },
  veiculoGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    rowGap: 12, // Espaçamento vertical entre as linhas
  },
  veiculoBtn: {
    width: '48%', // Garante 2 por linha com precisão
    backgroundColor: '#18181b',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row', // Ícone e texto lado a lado
    gap: 8, // Espaço entre ícone e texto
  },
  veiculoAtivo: { 
    backgroundColor: '#8b5cf6', 
    borderColor: '#8b5cf6',
  },
  veiculoTxt: { 
    color: '#a1a1aa', 
    fontSize: 13, 
    fontWeight: '600',
  },
  veiculoTxtAtivo: { 
    color: '#fff', 
  },

  // Footer
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
    padding: 12,
  },
  linkText: { 
    color: '#a1a1aa', 
    fontSize: 14 
  },
  linkBold: {
    color: '#8b5cf6',
    fontWeight: 'bold',
  }
});