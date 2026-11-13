import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius } from '@/constants/theme';

interface Props extends Omit<TextInputProps, 'style'> {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  /** Muestra el botón "Ver/Ocultar" (campo de contraseña, igual que la app). */
  alternarVisibilidad?: boolean;
}

/**
 * Campo de formulario: etiqueta + input + mensaje de error JUNTO al campo
 * (el diseño pide errores junto al campo afectado y no al final del formulario).
 * Estilos tomados de `input`, `label` y `passwordWrapper` de login.styles.ts.
 */
export function Field({ etiqueta, error, ayuda, alternarVisibilidad, secureTextEntry, multiline, ...rest }: Props) {
  const [oculto, setOculto] = useState(true);
  const esPassword = !!alternarVisibilidad;

  return (
    <View style={styles.grupo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View>
        <TextInput
          {...rest}
          accessibilityLabel={etiqueta}
          multiline={multiline}
          secureTextEntry={esPassword ? oculto : secureTextEntry}
          placeholderTextColor={colors.textoTenue}
          style={[
            styles.input,
            multiline && styles.multilinea,
            esPassword && { paddingRight: 56 },
            !!error && styles.inputError,
          ]}
        />
        {esPassword && (
          <Pressable accessibilityRole="button" style={styles.ver} onPress={() => setOculto((o) => !o)}>
            <Text style={styles.verTexto}>{oculto ? 'Ver' : 'Ocultar'}</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : ayuda ? <Text style={styles.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { marginBottom: 15 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: colors.textoEtiqueta, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.bordeInput,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.texto,
    backgroundColor: colors.superficie,
  },
  multilinea: { minHeight: 84, textAlignVertical: 'top' },
  inputError: { borderColor: colors.peligro },
  ver: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  verTexto: { color: colors.primario, fontWeight: '600' },
  error: { color: colors.peligro, fontSize: 12, marginTop: 4 },
  ayuda: { color: colors.textoTenue, fontSize: 12, marginTop: 4 },
});
