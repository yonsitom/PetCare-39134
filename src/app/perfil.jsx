
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { supabase } from '../services/supabase';
import VerPerfil from '../components/perfil/VerPerfil';
import PantallaEditarPerfil from '../components/perfil/PantallaEditarPerfil';
import ModalCambiarContrasena from '../components/perfil/ModalCambiarContrasena';
import EncabezadoPetCare from '../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../components/layout/MenuLateralDerecho';

const C = {
  fondo: '#F4F8F7',
};

export default function PerfilScreen() {
  const [modo, setModo] = useState('resumen');
  const [mostrarMensajeExito, setMostrarMensajeExito] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [modalContrasenaVisible, setModalContrasenaVisible] =
    useState(false);

  const [nombreUsuario, setNombreUsuario] = useState('Usuario PetCare');
  const [correo, setCorreo] = useState('');
  const [rolUsuario, setRolUsuario] = useState('Usuario');
  const [estadoCuenta, setEstadoCuenta] = useState('Activo');
  const [cambiandoContrasena, setCambiandoContrasena] = useState(false);
  const [errorContrasena, setErrorContrasena] = useState('');

  const cargarDatosUsuario = useCallback(async () => {
    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) throw errorUsuario;

      if (!user) {
        setCorreo('');
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
      console.error('Error al cargar datos del perfil:', error);
    }
  }, []);

  useEffect(() => {
    cargarDatosUsuario();
  }, [cargarDatosUsuario]);

  const volver = useCallback(() => {
    if (modo === 'editar') {
      setModo('resumen');
      return;
    }

    router.replace('/inicio');
  }, [modo]);

  const editar = useCallback(() => {
    setMostrarMensajeExito(false);
    setModo('editar');
  }, []);

  const guardado = useCallback(() => {
    setModo('resumen');
    setMostrarMensajeExito(true);
    cargarDatosUsuario();
  }, [cargarDatosUsuario]);

  const abrirCambioContrasena = useCallback(() => {
    setErrorContrasena('');
    setModalContrasenaVisible(true);
  }, []);

  const cerrarCambioContrasena = useCallback(() => {
    if (cambiandoContrasena) return;

    setModalContrasenaVisible(false);
    setErrorContrasena('');
  }, [cambiandoContrasena]);

  const guardarNuevaContrasena = useCallback(
    async ({ contrasenaActual, nuevaContrasena }) => {
      setErrorContrasena('');

      if (!correo) {
        setErrorContrasena(
          'No se encontró el correo asociado a la sesión.'
        );
        return;
      }

      setCambiandoContrasena(true);

      try {
        // Verifica que la contraseña actual sea correcta.
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

        // Cambia la contraseña de la cuenta autenticada.
        const { error: errorActualizacion } =
          await supabase.auth.updateUser({
            password: nuevaContrasena,
          });

        if (errorActualizacion) throw errorActualizacion;

        setModalContrasenaVisible(false);
        Alert.alert(
          'Contraseña actualizada',
          'Tu contraseña se cambió correctamente.'
        );
      } catch (error) {
        console.error('Error al cambiar la contraseña:', error);

        setErrorContrasena(
          error?.message ||
            'No se pudo cambiar la contraseña. Inténtalo nuevamente.'
        );
      } finally {
        setCambiandoContrasena(false);
      }
    },
    [correo]
  );

  if (modalContrasenaVisible) {
    return (
      <View style={styles.contenedor}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#12665E"
        />

        <ModalCambiarContrasena
          visible
          onCerrar={cerrarCambioContrasena}
          onGuardar={guardarNuevaContrasena}
          cambiando={cambiandoContrasena}
          error={errorContrasena}
          nombre={nombreUsuario}
          correo={correo}
          rol={rolUsuario}
          estadoCuenta={estadoCuenta}
          onAbrirMenu={() => setMenuVisible(true)}
          onAbrirNotificaciones={() =>
            Alert.alert(
              'Notificaciones',
              'No tienes notificaciones nuevas.'
            )
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#12665E"
      />

      {modo === 'resumen' && (
        <EncabezadoPetCare
          titulo="PetCare"
          onAbrirMenu={() => setMenuVisible(true)}
          onAbrirNotificaciones={() =>
            Alert.alert(
              'Notificaciones',
              'No tienes notificaciones nuevas.'
            )
          }
        />
      )}

      <View style={styles.contenido}>
        {modo === 'resumen' ? (
          <VerPerfil
            onEditar={editar}
            onCambiarContrasena={abrirCambioContrasena}
            mostrarMensajeExito={mostrarMensajeExito}
            onCerrarMensajeExito={() =>
              setMostrarMensajeExito(false)
            }
          />
        ) : (
          <PantallaEditarPerfil
            onVolver={volver}
            onGuardado={guardado}
          />
        )}
      </View>

      <MenuLateralDerecho
        visible={menuVisible}
        onCerrar={() => setMenuVisible(false)}
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenido: {
    flex: 1,
  },
});
