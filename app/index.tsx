import { Redirect } from 'expo-router';

import { useSession } from '@/hooks/useSession';

/** Pantalla inicial: con sesión de administradora va a la agenda; si no, al login. */
export default function Inicio() {
  const { listo, usuario } = useSession();
  if (!listo) return null;
  return <Redirect href={usuario?.rol === 'admin' ? '/agenda' : '/login'} />;
}
