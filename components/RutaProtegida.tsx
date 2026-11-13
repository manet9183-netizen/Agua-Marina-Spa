import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Pantalla } from '@/components/Pantalla';
import { PaginaError } from '@/components/PaginaError';
import { Cargando } from '@/components/ui/Feedback';
import { useSession } from '@/hooks/useSession';
import type { Rol } from '@/lib/types';

/**
 * Guardia de acceso por rol en el CLIENTE (ALG-02, lado pantalla).
 *  - Sin sesión  → /login.
 *  - Rol distinto → pantalla 403 (sin permiso).
 * Es solo comodidad de UX: la autoridad real son las comprobaciones de
 * `exigirSesion` en lib/api.ts (y el middleware del servidor).
 */
export function RutaProtegida({ rol, children }: { rol: Rol; children: ReactNode }) {
  const { listo, usuario } = useSession();

  if (!listo) {
    return (
      <Pantalla>
        <Cargando />
      </Pantalla>
    );
  }
  if (!usuario) return <Redirect href="/login" />;
  if (usuario.rol !== rol) return <View style={{ flex: 1 }}><PaginaError codigo={403} /></View>;
  return <>{children}</>;
}
