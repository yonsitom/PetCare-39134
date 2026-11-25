// ============================================================
// PETCARE
// RF05: Cambiar contraseña de la cuenta.
// Ruta independiente para la gestión de contraseña.
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  StatusBar,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { supabase } from '../../services/supabase';
import ModalCambiarContrasena from '../../components/perfil/ModalCambiarContrasena';

export default function CambiarContrasenaScreen() {
  const [nombreUsuario, setNombreUsuario] = useState('Usuario PetCare');
  const [correo, setCorreo] = useState('');
  const [rolUsuario, setRolUsuario] = useState('Usuario');
  const [estadoCuenta, setEstadoCuenta] = useState('Activo');

  const [cambiandoContrasena, setCambiandoContrasena] = useState(false);
  const [errorContrasena, setErrorContrasena] = useState('');

  // Carga la información que se muestra en la cabecera de la pantalla.
  const cargarDatosUsuario = useCallback(async () => {
    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) throw errorUsuario;

      if (!user) {
        Alert.alert(
          'Sesión no disponible',
          'Inicia sesión nuevamente para continuar.',
          [
            {
              text: 'Aceptar',
              onPress: () => router.replace('/'),
            },
          ]
        );
        return;
      }

      setCorreo(user.email || '');

      const { data, error } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol, estado_cuenta')
        .eq('perfil_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setNombreUsuario(data.nombre_completo || 'Usuario PetCare');
        setRolUsuario(data.rol || 'Usuario');
        setEstadoCuenta(data.estado_cuenta || 'Activo');
      }
    } catch (error) {
      console.error(
        'Error al cargar los datos para cambiar la contraseña:',
        error
      );
    }
  }, []);

  useEffect(() => {
    cargarDatosUsuario();
  }, [cargarDatosUsuario]);

  // Regresa a la consulta del perfil.
  const cerrarPantalla = useCallback(() => {
    if (cambiandoContrasena) return;

    setErrorContrasena('');
    router.replace('/perfil/perfil');
  }, [cambiandoContrasena]);

  // RF05: verifica la contraseña actual y actualiza la nueva.
  const guardarNuevaContrasena = useCallback(
    async ({ contrasenaActual, nuevaContrasena }) => {
      setErrorContrasena('');

      if (!correo) {
        setErrorContrasena(
          'No se encontró el correo asociado a la sesión.'
        );
        return;
      }

      if (cambiandoContrasena) return;

      setCambiandoContrasena(true);

      try {
        // Primero verifica que la contraseña actual sea correcta.
        const { error: errorVerificacion } =
          await supabase.auth.signInWithPassword({
            email: correo,
            password: contrasenaActual,
          });

        if (errorVerificacion) {
          setErrorContrasena(
            'La contraseña actual es incorrecta. Verifica los datos.'
          );
          return;
        }

        // Actualiza la contraseña de la cuenta autenticada.
        const { error: errorActualizacion } =
          await supabase.auth.updateUser({
            password: nuevaContrasena,
          });

        if (errorActualizacion) {
          throw errorActualizacion;
        }

        Alert.alert(
          'Contraseña actualizada',
          'Tu contraseña se cambió correctamente.',
          [
            {
              text: 'Aceptar',
              onPress: () => router.replace('/perfil/perfil'),
            },
          ]
        );
      } catch (error) {
        console.error(
          'Error al cambiar la contraseña:',
          error
        );

        setErrorContrasena(
          error?.message ||
            'No se pudo cambiar la contraseña. Inténtalo nuevamente.'
        );
      } finally {
        setCambiandoContrasena(false);
      }
    },
    [correo, cambiandoContrasena]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F7F8' }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#12665E"
      />

      <ModalCambiarContrasena
        visible
        onCerrar={cerrarPantalla}
        onGuardar={guardarNuevaContrasena}
        cambiando={cambiandoContrasena}
        error={errorContrasena}
        nombre={nombreUsuario}
        correo={correo}
        rol={rolUsuario}
        estadoCuenta={estadoCuenta}
      />
    </View>
  );
}