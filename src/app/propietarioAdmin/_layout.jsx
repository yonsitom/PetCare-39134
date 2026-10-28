
import React from 'react';
import { Stack } from 'expo-router';

export default function LayoutPropietarioAdmin() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="gestionPropietarios" />
    </Stack>
  );
}
