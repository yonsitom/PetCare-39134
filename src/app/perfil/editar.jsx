// ============================================================
// PETCARE
// RF05: Editar información del perfil.
// Ruta independiente de edición.
// ============================================================

import React from 'react';
import { router } from 'expo-router';

import PantallaEditarPerfil from '../../components/perfil/PantallaEditarPerfil';

export default function EditarPerfilScreen() {
  function volverAlPerfil() {
    router.replace('/perfil/perfil');
  }

  function regresarDespuesDeGuardar() {
    router.replace({
      pathname: '/perfil/perfil',
      params: {
        actualizado: '1',
      },
    });
  }

  return (
    <PantallaEditarPerfil
      onVolver={volverAlPerfil}
      onGuardado={regresarDespuesDeGuardar}
    />
  );
}