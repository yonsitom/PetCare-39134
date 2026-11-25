// ============================================================
// PETCARE
// RF05: Consultar información del perfil.
// Ruta independiente de consulta del perfil.
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { supabase } from '../../services/supabase';
import VerPerfil from '../../components/perfil/VerPerfil';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

const C = {
  fondo: '#F4F8F7',
};

export default function PerfilScreen() {
  const [mostrarMensajeExito, setMostrarMensajeExito] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [nombreUsuario, setNombreUsuario] = useState('Usuario PetCare');
  const [rolUsuario, setRolUsuario] = useState('Usuario');

  const { actualizado } = useLocalSearchParams();

  // Recupera los datos necesarios para el menú lateral.
  const cargarDatosUsuario = useCallback(async () => {
    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) throw errorUsuario;

      if (!user) {
        setNombreUsuario('Usuario PetCare');
        setRolUsuario('Usuario');
        return;
      }

      const { data, error } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol')
        .eq('perfil_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setNombreUsuario(data.nombre_completo || 'Usuario PetCare');
        setRolUsuario(data.rol || 'Usuario');
      }
    } catch (error) {
      console.error(
        'Error al cargar los datos del menú del perfil:',
        error
      );
    }
  }, []);

  useEffect(() => {
    cargarDatosUsuario();
  }, [cargarDatosUsuario]);

  // Muestra el aviso cuando se regresa de editar el perfil.
  useEffect(() => {
    if (actualizado === '1') {
      setMostrarMensajeExito(true);
    }
  }, [actualizado]);

  const abrirEdicion = useCallback(() => {
    setMostrarMensajeExito(false);
    router.push('/perfil/editar');
  }, []);

  const abrirCambioContrasena = useCallback(() => {
    router.push('/perfil/contrasena');
  }, []);

  return (
    <View style={styles.contenedor}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#12665E"
      />

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

      <View style={styles.contenido}>
        <VerPerfil
          onEditar={abrirEdicion}
          onCambiarContrasena={abrirCambioContrasena}
          mostrarMensajeExito={mostrarMensajeExito}
          onCerrarMensajeExito={() =>
            setMostrarMensajeExito(false)
          }
        />
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