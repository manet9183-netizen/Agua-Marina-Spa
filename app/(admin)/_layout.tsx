import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { BotonSalir } from '@/components/BotonSalir';
import { RutaProtegida } from '@/components/RutaProtegida';
import { colors } from '@/constants/theme';

/**
 * Zona de la administradora: Agenda · Venta · Inventario · Catálogo · Promociones · Reportes. Solo rol "admin"
 * (RBAC, RNB-05). Toda la app es de la administradora.
 */
export default function AdminLayout() {
  return (
    <RutaProtegida rol="admin">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primario,
          headerRight: () => <BotonSalir />,
          headerTitleStyle: { color: colors.texto },
          tabBarLabelStyle: { fontSize: 10 },
        }}>
        <Tabs.Screen
          name="agenda"
          options={{
            title: 'Agenda',
            tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} tintColor={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="venta"
          options={{
            title: 'Venta',
            tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' }} tintColor={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="inventario"
          options={{
            title: 'Inventario',
            tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }} tintColor={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="gestion-catalogo"
          options={{
            title: 'Catálogo',
            tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'tag', android: 'sell', web: 'sell' }} tintColor={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="promociones"
          options={{
            title: 'Promos',
            tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }} tintColor={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="reportes"
          options={{
            title: 'Reportes',
            tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' }} tintColor={color} size={24} />,
          }}
        />
      </Tabs>
    </RutaProtegida>
  );
}
