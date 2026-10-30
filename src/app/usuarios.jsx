
import React, { useCallback, useState } from 'react';
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
import { supabase } from '../services/supabase';
import { consultarUsuarios } from '../services/administracion/usuariosService';
import EncabezadoPetCare from '../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../components/layout/MenuLateralDerecho';

const C = {
  primario: '#187C72',
  oscuro: '#12645C',
  primarioOscuro: '#12645C',
  texto: '#263238',
  secundario: '#718096',
  fondo: '#F5F8F8',
  blanco: '#FFFFFF',
  borde: '#E2E8F0',
  verdeClaro: '#E5F5F1',
  rojo: '#C0392B',
  rojoClaro: '#FDECEC',
};

const fechaRegistro = (fecha) => {
  if (!fecha) return 'No disponible';

  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return 'No disponible';

  return `${String(d.getDate()).padStart(2, '0')}/${String(
    d.getMonth() + 1
  ).padStart(2, '0')}/${d.getFullYear()}`;
};

const iniciales = (nombre = '') =>
  nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('') || 'US';

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  const cargarUsuarios = useCallback(async (refrescar = false) => {
    refrescar ? setActualizando(true) : setCargando(true);
    setError('');

    try {
      const { data: sesion, error: errorSesion } =
        await supabase.auth.getUser();

      if (errorSesion || !sesion?.user) {
        router.replace('/');
        return;
      }

      const { data: perfil, error: errorPerfil } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol, estado_cuenta')
        .eq('perfil_id', sesion.user.id)
        .maybeSingle();

      if (errorPerfil) throw errorPerfil;

      if (
        !perfil ||
        perfil.rol !== 'Administrador' ||
        perfil.estado_cuenta !== 'Activo'
      ) {
        Alert.alert(
          'Acceso restringido',
          'Solo un administrador activo puede gestionar usuarios.'
        );
        router.replace('/inicio');
        return;
      }

      setNombreUsuario(perfil.nombre_completo || 'Administrador');
      setRolUsuario(perfil.rol);

      const lista = await consultarUsuarios();
      setUsuarios(Array.isArray(lista) ? lista : []);
    } catch (e) {
      console.error('Error al consultar usuarios:', e);
      setError('No se pudieron cargar los usuarios.');
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarUsuarios();
    }, [cargarUsuarios])
  );

  const abrirDetalle = (usuario) => {
    if (!usuario?.perfil_id) {
      Alert.alert('Aviso', 'No se encontró el identificador del usuario.');
      return;
    }

    router.push({
      pathname: '/administracion/detalleUsuario',
      params: { id: String(usuario.perfil_id) },
    });
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const termino = busqueda.trim().toLowerCase();

    const coincideTexto =
      !termino ||
      (usuario.nombre_completo || '').toLowerCase().includes(termino) ||
      (usuario.documento_identidad || '').toLowerCase().includes(termino) ||
      (usuario.telefono || '').toLowerCase().includes(termino);

    const activo = usuario.estado_cuenta === 'Activo';

    const coincideEstado =
      filtro === 'Todos' ||
      (filtro === 'Activos' && activo) ||
      (filtro === 'Inactivos' && !activo);

    return coincideTexto && coincideEstado;
  });

  /**
   * RF07: Cerrar sesión.
   * La confirmación se muestra únicamente desde MenuLateralDerecho.
   * Esta función no debe mostrar un segundo Alert de confirmación.
   */
  const cerrarSesion = async () => {
    try {
      const { error: errorCerrar } = await supabase.auth.signOut();

      if (errorCerrar) {
        throw errorCerrar;
      }

      setMenuAbierto(false);
      router.replace('/');
    } catch (errorCerrar) {
      console.error('Error al cerrar sesión:', errorCerrar);

      Alert.alert(
        'Error',
        errorCerrar?.message || 'No se pudo cerrar la sesión.'
      );

      // Se propaga el error para que el menú también pueda gestionarlo,
      // si su implementación contempla un manejador de errores.
      throw errorCerrar;
    }
  };

  const volverAdministracion = () =>
    router.replace('/administracion/administracion');

  const abrirNuevoUsuario = () =>
    router.push('/administracion/nuevoUsuario');

  return (
    <SafeAreaView style={styles.pantalla}>
      <StatusBar barStyle="light-content" backgroundColor={C.oscuro} />

      <EncabezadoPetCare
        nombreUsuario={nombreUsuario}
        onAbrirMenu={() => setMenuAbierto(true)}
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => cargarUsuarios(true)}
            colors={[C.primario]}
          />
        }
      >
        <View style={styles.migas}>
          <TouchableOpacity onPress={volverAdministracion}>
            <Text style={styles.migaEnlace}>Inicio</Text>
          </TouchableOpacity>
          <Text style={styles.migaSeparador}> / </Text>
          <Text style={styles.migaActual}>Administración</Text>
        </View>

        <View style={styles.filaTitulo}>
          <TouchableOpacity
            style={styles.botonVolver}
            onPress={volverAdministracion}
            accessibilityLabel="Volver a administración"
          >
            <Text style={styles.flechaVolver}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.titulo}>Gestión de usuarios</Text>

          <TouchableOpacity
            style={styles.botonNuevo}
            onPress={abrirNuevoUsuario}
            activeOpacity={0.85}
          >
            <Text style={styles.textoNuevo}>＋ Nuevo</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.descripcion}>
          Administra las cuentas de los asistentes de la veterinaria.
        </Text>

        <View style={styles.filaHerramientas}>
          <View style={styles.cajaBusqueda}>
            <Text style={styles.iconoBusqueda}>⌕</Text>
            <TextInput
              style={styles.inputBusqueda}
              placeholder="Buscar usuario..."
              placeholderTextColor="#8A969F"
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
              accessibilityLabel="Buscar usuario"
            />
            {busqueda.length > 0 && (
              <TouchableOpacity onPress={() => setBusqueda('')}>
                <Text style={styles.limpiar}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filtros}>
            {['Todos', 'Activos', 'Inactivos'].map((opcion) => {
              const seleccionado = filtro === opcion;

              return (
                <TouchableOpacity
                  key={opcion}
                  style={[
                    styles.filtro,
                    seleccionado && styles.filtroActivo,
                  ]}
                  onPress={() => setFiltro(opcion)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.textoFiltro,
                      seleccionado && styles.textoFiltroActivo,
                    ]}
                  >
                    {opcion}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {cargando ? (
          <View style={styles.estado}>
            <ActivityIndicator size="large" color={C.primario} />
            <Text style={styles.textoEstado}>Cargando usuarios...</Text>
          </View>
        ) : error ? (
          <View style={styles.estado}>
            <Text style={styles.textoError}>{error}</Text>
            <TouchableOpacity
              style={styles.botonReintentar}
              onPress={() => cargarUsuarios()}
            >
              <Text style={styles.textoNuevo}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : usuariosFiltrados.length === 0 ? (
          <View style={styles.estado}>
            <Text style={styles.tituloVacio}>No hay usuarios para mostrar</Text>
            <Text style={styles.textoEstado}>
              Prueba otra búsqueda o cambia el filtro.
            </Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {usuariosFiltrados.map((usuario) => {
              const activo = usuario.estado_cuenta === 'Activo';

              return (
                <View key={usuario.perfil_id} style={styles.tarjeta}>
                  <View style={styles.filaUsuario}>
                    <View style={styles.avatar}>
                      <Text style={styles.textoAvatar}>
                        {iniciales(usuario.nombre_completo)}
                      </Text>
                    </View>

                    <View style={styles.datosUsuario}>
                      <Text style={styles.nombre} numberOfLines={2}>
                        {usuario.nombre_completo || 'Usuario sin nombre'}
                      </Text>

                      {usuario.email ? (
                        <Text style={styles.correo} numberOfLines={1}>
                          {usuario.email}
                        </Text>
                      ) : null}

                      <View style={styles.filaTelefono}>
                        <Text style={styles.telefono} numberOfLines={1}>
                          {usuario.telefono || 'Teléfono no registrado'}
                        </Text>

                        <TouchableOpacity
                          onPress={() => abrirDetalle(usuario)}
                          style={styles.botonDetalle}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.textoDetalle}>
                            Ver detalle →
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={styles.filaEtiquetas}>
                    <View style={styles.etiquetaRol}>
                      <Text style={styles.textoRol}>
                        {usuario.rol || 'Sin rol'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.etiquetaEstado,
                        activo ? styles.estadoActivo : styles.estadoInactivo,
                      ]}
                    >
                      <View
                        style={[
                          styles.puntoEstado,
                          { backgroundColor: activo ? C.primario : C.rojo },
                        ]}
                      />
                      <Text
                        style={[
                          styles.textoEstadoEtiqueta,
                          {
                            color: activo
                              ? C.primarioOscuro
                              : C.rojo,
                          },
                        ]}
                      >
                        {activo ? 'Activa' : 'Inactiva'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.registro}>
                    Reg. {fechaRegistro(usuario.fecha_registro)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

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
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 32,
  },
  migas: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  migaEnlace: {
    fontSize: 13,
    color: C.primario,
    fontWeight: '600',
  },
  migaSeparador: {
    color: C.secundario,
    fontSize: 13,
  },
  migaActual: {
    color: C.secundario,
    fontSize: 13,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  botonVolver: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechaVolver: {
    color: C.primario,
    fontSize: 36,
    lineHeight: 38,
    marginTop: -4,
  },
  titulo: {
    flex: 1,
    color: C.texto,
    fontSize: 21,
    fontWeight: '800',
  },
  botonNuevo: {
    backgroundColor: C.primario,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textoNuevo: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '700',
  },
  descripcion: {
    fontSize: 13,
    lineHeight: 19,
    color: C.secundario,
    marginTop: 9,
    marginBottom: 20,
  },
  filaHerramientas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  cajaBusqueda: {
    flex: 1,
    minWidth: 45,
    height: 45,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  iconoBusqueda: {
    fontSize: 24,
    color: C.secundario,
    marginRight: 5,
  },
  inputBusqueda: {
    flex: 1,
    color: C.texto,
    fontSize: 13,
    paddingVertical: 8,
  },
  limpiar: {
    color: C.secundario,
    fontSize: 22,
    paddingHorizontal: 3,
  },
  filtros: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    padding: 4,
    gap: 3,
  },
  filtro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 3,
    borderRadius: 7,
  },
  filtroActivo: {
    backgroundColor: C.verdeClaro,
  },
  textoFiltro: {
    fontSize: 11,
    color: C.secundario,
    fontWeight: '600',
  },
  textoFiltroActivo: {
    color: C.primarioOscuro,
    fontWeight: '800',
  },
  lista: {
    gap: 13,
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 13,
    padding: 16,
  },
  filaUsuario: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAvatar: {
    color: C.primarioOscuro,
    fontSize: 14,
    fontWeight: '800',
  },
  datosUsuario: {
    flex: 1,
    minWidth: 0,
  },
  nombre: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  correo: {
    color: C.secundario,
    fontSize: 12,
    marginBottom: 9,
  },
  filaTelefono: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
  },
  telefono: {
    color: C.secundario,
    fontSize: 11,
    flex: 1,
  },
  botonDetalle: {
    paddingVertical: 4,
    paddingLeft: 4,
  },
  textoDetalle: {
    color: C.primario,
    fontSize: 12,
    fontWeight: '700',
  },
  filaEtiquetas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 13,
  },
  etiquetaRol: {
    backgroundColor: '#EEF2F6',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  textoRol: {
    color: '#4A5568',
    fontSize: 11,
    fontWeight: '700',
  },
  etiquetaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  estadoActivo: {
    backgroundColor: C.verdeClaro,
  },
  estadoInactivo: {
    backgroundColor: C.rojoClaro,
  },
  puntoEstado: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  textoEstadoEtiqueta: {
    fontSize: 11,
    fontWeight: '700',
  },
  registro: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 10,
  },
  estado: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: C.blanco,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.borde,
  },
  textoEstado: {
    color: C.secundario,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  tituloVacio: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '700',
  },
  textoError: {
    color: C.rojo,
    textAlign: 'center',
    fontSize: 13,
  },
  botonReintentar: {
    backgroundColor: C.primario,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 12,
  },
});
