
import { Stack } from 'expo-router';

export default function LayoutAdministracion() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="administracion" />
      <Stack.Screen name="gestionUsuario" />
      <Stack.Screen name="nuevoUsuario" />
      <Stack.Screen name="detalleUsuario" />
    </Stack>
  );
}
