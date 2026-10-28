
import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../services/supabase';

import {
  consultarUsuarios,
} from '../../services/administracion/usuariosService';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import TarjetaUsuario from '../../components/administracion/TarjetaUsuario';

const C = {
  primario: '#187C72',
  primarioOscuro: '#12645C',
  texto: '#263238',
  secundario: '#718096',
  fondo: '#F5F8F8',
  blanco: '#FFFFFF',
  borde: '#E2E8F0',
  rojo: '#C0392B',
  verdeClaro: '#E5F5F1',
};

export default function GestionUsuario() {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [rolUsuario, setRolUsuario] = useState('Administrador');

  const cargarUsuarios = useCallback(
    async (esActualizacion = false) => {
      try {
        if (esActualizacion) {
          setActualizando(true);
        } else {
          setCargando(true);
        }

        setError('');

        const {
          data: { user },
          error: errorSesion,
        } = await supabase.auth.getUser();

        if (errorSesion) {
          throw errorSesion;
        }

        if (!user) {
          router.replace('/');
          return;
        }

        const {
          data: perfil,
          error: errorPerfil,
        } = await supabase
          .from('perfiles')
          .select('nombre_completo, rol, estado_cuenta')
          .eq('perfil_id', user.id)
          .single();

        if (errorPerfil) {
          throw errorPerfil;
        }

        if (
          perfil?.rol !== 'Administrador' ||
          perfil?.estado_cuenta !== 'Activo'
        ) {
          Alert.alert(
            'Acceso restringido',
            'Solo un administrador activo puede gestionar usuarios.',
            [
              {
                text: 'Volver',
                onPress: () => router.replace('/inicio'),
              },
            ]
          );
          return;
        }

        setNombreUsuario(
          perfil.nombre_completo || 'Administrador'
        );
        setRolUsuario(perfil.rol);

        const datos = await consultarUsuarios();

        setUsuarios(Array.isArray(datos) ? datos : []);
      } catch (e) {
        console.error('Error al cargar usuarios:', e);

        setError(
          e?.message ||
            'No se pudieron consultar las cuentas de usuarios.'
        );
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      cargarUsuarios();
    }, [cargarUsuarios])
  );

  const conteos = useMemo(
    () => ({
      Todos: usuarios.length,
      Activos: usuarios.filter(
        (u) => u.estado_cuenta === 'Activo'
      ).length,
      Inactivos: usuarios.filter(
        (u) => u.estado_cuenta === 'Inactivo'
      ).length,
    }),
    [usuarios]
  );

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const coincideBusqueda = [
        usuario.nombre_completo,
        usuario.documento_identidad,
        usuario.telefono,
        usuario.email,
      ].some((valor) =>
        String(valor || '').toLowerCase().includes(texto)
      );

      const coincideEstado =
        filtro === 'Todos' ||
        (filtro === 'Activos' &&
          usuario.estado_cuenta === 'Activo') ||
        (filtro === 'Inactivos' &&
          usuario.estado_cuenta === 'Inactivo');

      return coincideBusqueda && coincideEstado;
    });
  }, [usuarios, busqueda, filtro]);

  const volverAdministracion = () => {
    router.replace('/administracion/administracion');
  };

  const abrirDetalle = (usuario) => {
    if (!usuario?.perfil_id) {
      Alert.alert(
        'No se puede abrir el detalle',
        'No se encontró el identificador del usuario.'
      );
      return;
    }

    router.push({
      pathname: '/administracion/detalleUsuario',
      params: { id: usuario.perfil_id },
    });
  };

  const abrirNuevoUsuario = () => {
    router.push('/administracion/nuevoUsuario');
  };

  /**
   * RF07: Cerrar sesión.
   * La confirmación se muestra únicamente en MenuLateralDerecho.
   * Esta función solo cierra la sesión después de confirmar.
   */
  const cerrarSesion = async () => {
    try {
      const { error: errorCerrar } =
        await supabase.auth.signOut();

      if (errorCerrar) {
        throw errorCerrar;
      }

      setMenuAbierto(false);
      router.replace('/');
    } catch (e) {
      // Se propaga el error para que el menú lo gestione.
      throw e;
    }
  };

  return (
    <SafeAreaView style={styles.pantalla}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.primarioOscuro}
      />

      {/* Encabezado principal */}
      <EncabezadoPetCare
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() =>
          Alert.alert(
            'Notificaciones',
            'No tienes notificaciones nuevas.'
          )
        }
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => cargarUsuarios(true)}
            colors={[C.primario]}
            tintColor={C.primario}
          />
        }
      >
        {/* Ruta de navegación */}
        <View style={styles.ruta}>
          <TouchableOpacity
            onPress={() => router.replace('/inicio')}
          >
            <Text style={styles.enlaceRuta}>
              Inicio
            </Text>
          </TouchableOpacity>

          <Text style={styles.separador}> / </Text>

          <TouchableOpacity
            onPress={volverAdministracion}
          >
            <Text style={styles.enlaceRuta}>
              Administración
            </Text>
          </TouchableOpacity>

          <Text style={styles.separador}> / </Text>

          <Text style={styles.rutaActual}>
            Gestión de usuarios
          </Text>
        </View>

        {/* Título con botón de regreso */}
        <View style={styles.encabezado}>
          <View style={styles.tituloContenedor}>
            <View style={styles.filaTitulo}>
              <TouchableOpacity
                style={styles.botonVolver}
                onPress={volverAdministracion}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Volver a Administración"
              >
                <Text style={styles.iconoVolver}>‹</Text>
              </TouchableOpacity>

              <Text style={styles.titulo}>
                Gestión de usuarios
              </Text>
            </View>

            <Text style={styles.descripcion}>
              Administra las cuentas y los accesos del personal
              de la veterinaria.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.botonNuevo}
            onPress={abrirNuevoUsuario}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Registrar nuevo usuario"
          >
            <Text style={styles.textoBotonNuevo}>
              + Nuevo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Resumen de usuarios */}
        <View style={styles.resumen}>
          <View style={styles.resumenIcono}>
            <Text style={styles.resumenEmoji}>👥</Text>
          </View>

          <View style={styles.resumenTexto}>
            <Text style={styles.resumenTitulo}>
              Personal registrado
            </Text>

            <Text style={styles.resumenDescripcion}>
              Consulta las cuentas y su estado actual.
            </Text>
          </View>

          <Text style={styles.totalUsuarios}>
            {cargando ? '…' : usuarios.length}
          </Text>
        </View>

        {/* Búsqueda */}
        <View style={styles.busqueda}>
          <Text style={styles.iconoBusqueda}>⌕</Text>

          <TextInput
            style={styles.entradaBusqueda}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre, DNI o teléfono"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            returnKeyType="search"
          />

          {busqueda.length > 0 && (
            <TouchableOpacity
              onPress={() => setBusqueda('')}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
            >
              <Text style={styles.limpiar}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros */}
        <View style={styles.filtros}>
          {['Todos', 'Activos', 'Inactivos'].map((opcion) => {
            const seleccionado = filtro === opcion;

            return (
              <TouchableOpacity
                key={opcion}
                style={[
                  styles.filtro,
                  seleccionado && styles.filtroSeleccionado,
                ]}
                onPress={() => setFiltro(opcion)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.textoFiltro,
                    seleccionado &&
                      styles.textoFiltroSeleccionado,
                  ]}
                >
                  {opcion} ({conteos[opcion]})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Lista, carga, errores o estado vacío */}
        {cargando ? (
          <View style={styles.centro}>
            <ActivityIndicator
              size="large"
              color={C.primario}
            />

            <Text style={styles.textoCargando}>
              Consultando usuarios...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.mensajeError}>
            <Text style={styles.tituloError}>
              No se pudo cargar la lista
            </Text>

            <Text style={styles.textoError}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.botonReintentar}
              onPress={() => cargarUsuarios()}
              activeOpacity={0.8}
            >
              <Text style={styles.textoBotonReintentar}>
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        ) : usuariosFiltrados.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.iconoVacio}>♙</Text>

            <Text style={styles.tituloVacio}>
              {usuarios.length === 0
                ? 'No hay usuarios registrados'
                : 'No se encontraron usuarios'}
            </Text>

            <Text style={styles.textoVacio}>
              {usuarios.length === 0
                ? 'Verifica que las cuentas tengan su registro correspondiente en la tabla perfiles.'
                : 'Prueba con otra búsqueda o filtro.'}
            </Text>

            {usuarios.length === 0 && (
              <TouchableOpacity
                style={styles.botonVacio}
                onPress={abrirNuevoUsuario}
                activeOpacity={0.8}
              >
                <Text style={styles.textoBotonVacio}>
                  + Nuevo usuario
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.lista}>
            {usuariosFiltrados.map((usuario) => (
              <TarjetaUsuario
                key={usuario.perfil_id}
                usuario={usuario}
                onVerDetalle={abrirDetalle}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Menú lateral */}
      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
        onCerrarSesion={cerrarSesion}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  contenido: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 35,
  },

  ruta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },

  enlaceRuta: {
    fontSize: 12,
    color: C.primario,
    fontWeight: '700',
  },

  separador: {
    fontSize: 12,
    color: C.secundario,
  },

  rutaActual: {
    fontSize: 12,
    color: C.secundario,
    fontWeight: '600',
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },

  tituloContenedor: {
    flex: 1,
    minWidth: 0,
  },

  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  botonVolver: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.verdeClaro,
    borderWidth: 1,
    borderColor: '#C6E6DF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  iconoVolver: {
    fontSize: 32,
    lineHeight: 34,
    color: C.primarioOscuro,
    fontWeight: '500',
    marginTop: -4,
  },

  titulo: {
    flexShrink: 1,
    fontSize: 23,
    fontWeight: '800',
    color: C.texto,
  },

  descripcion: {
    fontSize: 13,
    lineHeight: 20,
    color: C.secundario,
    marginTop: 7,
  },

  botonNuevo: {
    backgroundColor: C.primario,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBotonNuevo: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },

  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blanco,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 15,
    marginBottom: 17,
  },

  resumenIcono: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.verdeClaro,
    marginRight: 12,
  },

  resumenEmoji: {
    fontSize: 22,
  },

  resumenTexto: {
    flex: 1,
  },

  resumenTitulo: {
    fontSize: 14,
    color: C.texto,
    fontWeight: '800',
  },

  resumenDescripcion: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 4,
  },

  totalUsuarios: {
    color: C.primario,
    fontSize: 24,
    fontWeight: '800',
    marginLeft: 8,
  },

  busqueda: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    paddingHorizontal: 12,
  },

  iconoBusqueda: {
    fontSize: 25,
    color: C.secundario,
    marginRight: 9,
  },

  entradaBusqueda: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    color: C.texto,
    fontSize: 13,
  },

  limpiar: {
    fontSize: 23,
    color: C.secundario,
    paddingHorizontal: 5,
  },

  filtros: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
    marginBottom: 19,
  },

  filtro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },

  filtroSeleccionado: {
    backgroundColor: C.verdeClaro,
    borderColor: C.primario,
  },

  textoFiltro: {
    fontSize: 11,
    color: C.secundario,
    fontWeight: '600',
  },

  textoFiltroSeleccionado: {
    color: C.primarioOscuro,
    fontWeight: '800',
  },

  lista: {
    gap: 12,
  },

  centro: {
    paddingVertical: 45,
    alignItems: 'center',
  },

  textoCargando: {
    marginTop: 12,
    color: C.secundario,
    fontSize: 13,
  },

  mensajeError: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: '#F2CACA',
  },

  tituloError: {
    color: C.rojo,
    fontSize: 15,
    fontWeight: '800',
  },

  textoError: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: C.secundario,
  },

  botonReintentar: {
    alignSelf: 'flex-start',
    backgroundColor: C.primario,
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 14,
  },

  textoBotonReintentar: {
    color: C.blanco,
    fontWeight: '700',
  },

  vacio: {
    backgroundColor: C.blanco,
    borderRadius: 14,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borde,
  },

  iconoVacio: {
    fontSize: 32,
    color: C.primario,
    marginBottom: 10,
  },

  tituloVacio: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  textoVacio: {
    color: C.secundario,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 19,
  },

  botonVacio: {
    marginTop: 16,
    backgroundColor: C.primario,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },

  textoBotonVacio: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
});
