
import React from 'react';
import { Stack } from 'expo-router';

// Configuración principal de navegación de PetCare.
export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
