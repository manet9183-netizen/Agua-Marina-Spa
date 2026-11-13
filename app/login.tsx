import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { loginStyles as styles } from '@/constants/Styles/login.styles';
import { useSession } from '@/hooks/useSession';
import { ApiError, iniciarSesion } from '@/lib/api';
import { CUENTA_DEMO_ADMIN } from '@/lib/seed';
import { validarCorreo } from '@/lib/validation';

/**
 * Inicio de sesión de la administradora. Conserva el diseño original de la app (fondo oscuro,
 * tarjeta blanca, botón morado; estilos en constants/Styles/login.styles.ts). La app es solo para
 * la administradora, así que ya no hay selector de rol ni registro de clientes.
 */
export default function Login() {
  const router = useRouter();
  const { listo, usuario } = useSession();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string>();
  const [cargando, setCargando] = useState(false);

  if (listo && usuario?.rol === 'admin') return <Redirect href="/agenda" />;

  const enviar = async () => {
    setError(undefined);
    const e = validarCorreo(correo);
    if (e) return setError(e);
    if (!password) return setError('Escribe tu contraseña.');
    setCargando(true);
    try {
      await iniciarSesion(correo, password, 'admin');
      router.replace('/agenda');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.logoText}>AGUA MARINA SPA</Text>
        <Text style={styles.heroTitle}>Todo lo que necesitas, en un solo lugar.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitle}>BIENVENIDA DE NUEVO</Text>
        <Text style={styles.title}>Inicia sesión</Text>
        <Text style={styles.description}>Administra citas, productos, inventario y promociones.</Text>

        {error ? <Text style={{ color: '#b91c1c', marginBottom: 12, fontSize: 13 }}>{error}</Text> : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="hola@ejemplo.com"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={correo}
            onChangeText={setCorreo}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="•••••••••"
              placeholderTextColor="#888"
              secureTextEntry={!ver}
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={enviar}
            />
            <Pressable style={styles.showButton} onPress={() => setVer((v) => !v)}>
              <Text style={styles.showText}>{ver ? 'Ocultar' : 'Ver'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.rowOptions}>
          <Text style={styles.checkboxText}>☑ Recordarme</Text>
          <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
        </View>

        <Pressable style={[styles.submitButton, cargando && { opacity: 0.6 }]} onPress={enviar} disabled={cargando}>
          {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Ingresar →</Text>}
        </Pressable>

        {/* Solo mientras no exista servidor: acceso rápido a la cuenta de demostración. */}
        <Pressable
          onPress={() => {
            setCorreo(CUENTA_DEMO_ADMIN.correo);
            setPassword(CUENTA_DEMO_ADMIN.password);
          }}
          style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={styles.linkText}>Rellenar cuenta demo</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
