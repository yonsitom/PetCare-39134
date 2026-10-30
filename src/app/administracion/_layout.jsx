import React from 'react';
import { Stack } from 'expo-router';

// Layout del módulo Administración.
// Expo Router detecta automáticamente las rutas de esta carpeta.
export default function LayoutAdministracion() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}