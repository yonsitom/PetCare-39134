
import React, { useCallback, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../services/supabase';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import TarjetaGestion from '../../components/administracion/TarjetaGestion';
import { administracionStyles as styles } from '../../styles/administracionStyles';

const INDICADORES_VACIOS = {
  total: 0,
  activos: 0,
  inactivos: 0,
};

import { Stack } from 'expo-router';
import { logger } from '../../utils/logger';


export default function AdministracionScreen() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');
  const [estadoCuenta, setEstadoCuenta] = useState('');

  const [cargandoIndicadores, setCargandoIndicadores] = useState(true);

  const [totales, setTotales] = useState({
    usuarios: { ...INDICADORES_VACIOS },
    mascotas: { ...INDICADORES_VACIOS },
    propietarios: { ...INDICADORES_VACIOS },
  });

  // Consulta el total y los estados de los registros.
  const contarPorEstado = async (tabla, columnaEstado) => {
    const { data, error } = await supabase
      .from(tabla)
      .select(columnaEstado);

    if (error) {
      logger.error(`Error al consultar ${tabla}:`, error.message);
      throw error;
    }

    const registros = data ?? [];

    return {
      total: registros.length,
      activos: registros.filter(
        (registro) => registro[columnaEstado] === 'Activo'
      ).length,
      inactivos: registros.filter(
        (registro) => registro[columnaEstado] === 'Inactivo'
      ).length,
    };
  };

  // Carga los contadores de las tarjetas.
  const cargarIndicadores = useCallback(async () => {
    setCargandoIndicadores(true);

    try {
      const resultados = await Promise.allSettled([
        contarPorEstado('perfiles', 'estado_cuenta'),
        contarPorEstado('mascotas', 'estado'),
        contarPorEstado('propietarios', 'estado'),
      ]);

      setTotales((anteriores) => ({
        usuarios:
          resultados[0].status === 'fulfilled'
            ? resultados[0].value
            : anteriores.usuarios,

        mascotas:
          resultados[1].status === 'fulfilled'
            ? resultados[1].value
            : anteriores.mascotas,

        propietarios:
          resultados[2].status === 'fulfilled'
            ? resultados[2].value
            : anteriores.propietarios,
      }));
    } catch (error) {
      logger.error('Error al cargar los contadores:', error);
    } finally {
      setCargandoIndicadores(false);
    }
  }, []);

  // Valida la sesión y los permisos del administrador.
  const cargarPerfil = useCallback(async () => {
    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario || !user) {
        router.replace('/');
        return;
      }

      const { data: perfil, error } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol, estado_cuenta')
        .eq('perfil_id', user.id)
        .maybeSingle();

      if (error || !perfil) {
        Alert.alert(
          'Error',
          'No se pudo verificar tu perfil de usuario.'
        );
        router.replace('/');
        return;
      }

      setNombreUsuario(
        perfil.nombre_completo || user.email?.split('@')[0] || 'Usuario'
      );
      setRolUsuario(perfil.rol || '');
      setEstadoCuenta(perfil.estado_cuenta || '');

      if (perfil.estado_cuenta !== 'Activo') {
        Alert.alert(
          'Cuenta inactiva',
          'Tu cuenta no está activa. Contacta con el administrador.',
          [{ text: 'Aceptar', onPress: () => router.replace('/') }]
        );
        return;
      }

      if (perfil.rol !== 'Administrador') {
        Alert.alert(
          'Acceso restringido',
          'No tienes permisos para acceder a Administración.',
          [{ text: 'Aceptar', onPress: () => router.replace('/inicio') }]
        );
        return;
      }

      cargarIndicadores();
    } catch (error) {
      logger.error('Error al validar el perfil:', error);
      router.replace('/');
    }
  }, [cargarIndicadores]);

  useFocusEffect(
    useCallback(() => {
      cargarPerfil();
    }, [cargarPerfil])
  );

  const crearIndicadores = (datos) => [
    { etiqueta: 'Total', valor: datos.total },
    { etiqueta: 'Activos', valor: datos.activos },
    { etiqueta: 'Inactivos', valor: datos.inactivos },
  ];

  const cerrarSesion = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setMenuAbierto(false);
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar la sesión.');
      logger.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <SafeAreaView style={styles.pantalla}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#12665E"
      />

      <EncabezadoPetCare
        onAbrirMenu={() => setMenuAbierto(true)}
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ruta}>
          <Text style={styles.textoRuta}>Inicio</Text>
          <Text style={styles.separadorRuta}> / </Text>
          <Text style={styles.rutaActual}>Administración</Text>
        </View>

        <View style={styles.encabezadoSeccion}>
          <View style={styles.filaTitulo}>
            <View>
              <Text style={styles.tituloPagina}>Administración</Text>
              <Text style={styles.subtituloPagina}>
                Gestiona la información del sistema PetCare.
              </Text>
            </View>

            <View style={styles.iconoUsuario}>
              <Text style={styles.textoIconoUsuario}>
                {nombreUsuario
                  ? nombreUsuario
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((parte) => parte.charAt(0).toUpperCase())
                      .join('')
                  : 'U'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>
            Gestión de información
          </Text>
          <Text style={styles.descripcionSeccion}>
            Consulta y administra los registros de la veterinaria.
          </Text>

          <View style={styles.listaTarjetas}>
            <TarjetaGestion
              icono="👥"
              titulo="Usuarios"
              descripcion="Administra las cuentas y los accesos al sistema."
              indicadores={crearIndicadores(totales.usuarios)}
              cargando={cargandoIndicadores}
              textoBoton="Gestionar usuarios"
              onPress={() => router.push('/usuarios')}
            />

            <TarjetaGestion
              icono="🐾"
              titulo="Mascotas"
              descripcion="Consulta y administra las mascotas registradas."
              indicadores={crearIndicadores(totales.mascotas)}
              cargando={cargandoIndicadores}
              textoBoton="Gestionar mascotas"
              onPress={() => router.push('/mascotaAdmin/gestionMascotas')}
            />

            <TarjetaGestion
              icono="🏠"
              titulo="Propietarios"
              descripcion="Consulta y administra los propietarios registrados."
              indicadores={crearIndicadores(totales.propietarios)}
              cargando={cargandoIndicadores}
              textoBoton="Gestionar propietarios"
              onPress={() =>
                router.push('/propietarioAdmin/gestionPropietarios')
              }
            />
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>
            Seguimiento del sistema
          </Text>
          <Text style={styles.descripcionSeccion}>
            Revisa los indicadores y el historial de cambios.
          </Text>

          <View style={styles.listaTarjetas}>
            <TarjetaGestion
              icono="📊"
              titulo="Indicadores"
              descripcion="Consulta los indicadores generales de la veterinaria."
              textoBoton="Ver indicadores"
              onPress={() => router.push('/indicadores')}
            />

            <TarjetaGestion
              icono="📋"
              titulo="Historial de cambios"
              descripcion="Consulta los cambios registrados en el sistema."
              textoBoton="Consultar historial"
              onPress={() => router.push('/historialCambios')}
            />
          </View>
        </View>
      </ScrollView>

      <MenuLateralDerecho
        visible={menuAbierto}
        onClose={() => setMenuAbierto(false)}
        nombre={nombreUsuario}
        rol={rolUsuario}
        estadoCuenta={estadoCuenta}
        onCerrarSesion={cerrarSesion}
      />
    </SafeAreaView>
  );
}
