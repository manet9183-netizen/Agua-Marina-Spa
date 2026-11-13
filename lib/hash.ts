import * as Crypto from 'expo-crypto';

/**
 * Hash de contraseñas del MODO DEMOSTRACIÓN de la app móvil.
 *
 * La web usa PBKDF2 (WebCrypto), que Hermes no trae. Aquí se usa SHA-256 con sal aleatoria
 * única por usuario (expo-crypto). Formato guardado: `sha256$sal$hash` (hex).
 *
 * ⚠️ Es suficiente para el modo demostración (datos locales en el teléfono). El SERVIDOR real
 * (server/) usa bcrypt coste 12: con `EXPO_PUBLIC_API_URL` definida, la contraseña viaja por
 * HTTPS al servidor y este archivo no se usa. NUNCA se guarda ni se registra la contraseña en claro.
 */
const aHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const derivar = (password: string, sal: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, sal + password);

export async function hashPassword(password: string, sal?: string): Promise<string> {
  const s = sal ?? aHex(Crypto.getRandomBytes(16));
  return `sha256$${s}$${await derivar(password, s)}`;
}

/** Comparación en tiempo constante (no se corta en la primera diferencia). */
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verificarPassword(password: string, guardado: string): Promise<boolean> {
  const [alg, sal, hash] = guardado.split('$');
  if (alg !== 'sha256' || !sal || !hash) return false;
  return iguales(await derivar(password, sal), hash);
}

/** Hash "señuelo" para igualar el tiempo de respuesta cuando el usuario no existe. */
export const HASH_SENUELO = 'sha256$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
