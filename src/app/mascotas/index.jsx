
// src/app/mascotas/index.jsx

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { supabase } from '../../services/supabase';
import { consultarMascotas } from '../../dao/mascotas/mascotaDAO';
import {
  validarTerminoBusquedaMascotas,
  filtrarMascotasPorBusqueda,
  obtenerMensajeResultadoBusqueda,
} from '../../utils/validacionesBusquedaMascotas';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#F5F8F8',
  blanco: '#FFFFFF',
  texto: '#243746',
  secundario: '#64748B',
  borde: '#DCE5E5',
  error: '#B42318',
  errorFondo: '#FEF3F2',
  verdeFondo: '#E4F3F0',
};

// Devuelve el nombre completo del propietario.
function nombrePropietario(mascota) {
  const propietario = mascota?.propietarios;

  if (!propietario) return 'No registrado';

  return [
    propietario.nombre,
    propietario.apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || 'No registrado';
}

// Obtiene la inicial del nombre de la mascota.
function obtenerInicial(nombre) {
  return nombre?.trim()?.charAt(0)?.toUpperCase() || '?';
}

export default function ListaMascotasScreen() {
  const [mascotas, setMascotas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [rolUsuario, setRolUsuario] = useState('');

  // Obtiene el perfil del usuario que inició sesión.
  useEffect(() => {
    let activo = true;

    async function cargarPerfil() {
      try {
        const {
          data: { user },
          error: errorUsuario,
        } = await supabase.auth.getUser();

        if (errorUsuario || !user) return;

        const { data, error: errorPerfil } = await supabase
          .from('perfiles')
          .select('nombre_completo, rol')
          .eq('perfil_id', user.id)
          .single();

        if (errorPerfil) {
          console.error(
            'Error al consultar el perfil:',
            errorPerfil.message
          );
          return;
        }

        if (activo && data) {
          setNombreUsuario(data.nombre_completo || 'Usuario');
          setRolUsuario(data.rol || '');
        }
      } catch (e) {
        console.error('Error al cargar el perfil:', e);
      }
    }

    cargarPerfil();

    return () => {
      activo = false;
    };
  }, []);

  // Consulta las mascotas registradas en Supabase.
  const cargarMascotas = useCallback(async () => {
    try {
      setError('');

      const resultado = await consultarMascotas();

      setMascotas(Array.isArray(resultado) ? resultado : []);
    } catch (e) {
      console.error('Error al cargar mascotas:', e);
      setError('No se pudieron cargar las mascotas.');
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  // Recarga la lista cuando la pantalla vuelve a estar activa.
  useFocusEffect(
    useCallback(() => {
      cargarMascotas();
    }, [cargarMascotas])
  );

  // RF16: valida y filtra automáticamente mientras se escribe.
  const validacionBusqueda = validarTerminoBusquedaMascotas(busqueda);

  const terminoBusqueda = validacionBusqueda.valido
    ? validacionBusqueda.termino
    : '';

  const mascotasFiltradas = filtrarMascotasPorBusqueda(
    mascotas,
    terminoBusqueda
  );

  // RF16: actualiza y valida el texto de búsqueda.
  function cambiarBusqueda(texto) {
    setBusqueda(texto);

    const validacion = validarTerminoBusquedaMascotas(texto);

    if (!validacion.valido) {
      setError(validacion.mensaje);
    } else {
      setError('');
    }
  }

  // RF16: limpia el campo y recupera todas las mascotas.
  function limpiarBusqueda() {
    setBusqueda('');
    setError('');
  }

  // RF16: mensaje cuando no existen coincidencias.
  const mensajeSinResultados = obtenerMensajeResultadoBusqueda(
    terminoBusqueda,
    mascotasFiltradas
  );

  // Abre la ficha de la mascota seleccionada.
  function abrirFicha(mascota) {
    if (!mascota?.numero_historia) {
      setError('La mascota no tiene número de historia clínica.');
      return;
    }

    router.push({
      pathname: '/mascotas/fichaMascota',
      params: {
        numeroHistoria: String(mascota.numero_historia),
      },
    });
  }

  // Abre el formulario de registro.
  function abrirRegistro() {
    router.push('/mascotas/nuevaMascota');
  }

  // Regresa a la pantalla anterior.
  function volver() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/inicio');
    }
  }

  // Cierra la sesión.
  async function cerrarSesion() {
    try {
      const { error: errorSesion } = await supabase.auth.signOut();

      if (errorSesion) {
        Alert.alert(
          'No se pudo cerrar la sesión',
          'Inténtalo nuevamente.'
        );
        return;
      }

      setMenuAbierto(false);
      router.replace('/');
    } catch (e) {
      console.error('Error al cerrar sesión:', e);

      Alert.alert(
        'Error',
        'No se pudo cerrar la sesión. Inténtalo nuevamente.'
      );
    }
  }

  // Renderiza cada mascota con la inicial de su nombre.
  const renderMascota = ({ item }) => (
    <TouchableOpacity
      style={styles.filaMascota}
      activeOpacity={0.75}
      onPress={() => abrirFicha(item)}
      accessibilityRole="button"
      accessibilityLabel={`Ver ficha de ${item.nombre || 'mascota'}`}
    >
      <View style={styles.iconoMascota}>
        <Text style={styles.inicialMascota}>
          {obtenerInicial(item.nombre)}
        </Text>
      </View>

      <View style={styles.datosMascota}>
        <Text style={styles.nombreMascota} numberOfLines={1}>
          {item.nombre || 'Sin nombre'}
        </Text>

        <Text style={styles.detalleMascota} numberOfLines={1}>
          {[item.especie, item.raza].filter(Boolean).join(' · ') ||
            'Especie no registrada'}
        </Text>

        <Text style={styles.historiaMascota}>
          Historia clínica: {item.numero_historia || 'Sin asignar'}
        </Text>

        <Text style={styles.propietarioMascota} numberOfLines={2}>
          Propietario: {nombrePropietario(item)}
        </Text>
      </View>

      <Text style={styles.flecha}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.pantalla}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.blanco}
      />

      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() =>
          Alert.alert(
            'Notificaciones',
            'No hay notificaciones nuevas.'
          )
        }
      />

      <View style={styles.contenido}>
        <Text style={styles.migas}>Inicio / Mascotas</Text>

        <View style={styles.encabezadoPagina}>
          <View style={styles.bloqueTitulo}>
            <View style={styles.filaTitulo}>
              <TouchableOpacity
                style={styles.botonVolver}
                onPress={volver}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Volver a la pantalla anterior"
              >
                <Text style={styles.flechaVolver}>‹</Text>
              </TouchableOpacity>

              <Text style={styles.titulo}>Mascotas</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.botonNueva}
            onPress={abrirRegistro}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Registrar nueva mascota"
          >
            <Text style={styles.textoBotonNueva}>
              + Nuevo
            </Text>
          </TouchableOpacity>
        </View>

        {/* RF16: búsqueda automática sin botón Buscar. */}
        <View style={styles.buscador}>
          <Text style={styles.iconoBuscar}>⌕</Text>

          <TextInput
            style={styles.inputBusqueda}
            value={busqueda}
            onChangeText={cambiarBusqueda}
            placeholder="Buscar por nombre, historia o propietario..."
            placeholderTextColor="#8A9996"
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Buscar mascotas"
          />

          {busqueda.length > 0 && (
            <TouchableOpacity
              onPress={limpiarBusqueda}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              style={styles.botonLimpiar}
            >
              <Text style={styles.limpiar}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cantidad total de mascotas registradas. */}
        <Text style={styles.subtitulo}>
          {mascotas.length}{' '}
          {mascotas.length === 1
            ? 'mascota registrada'
            : 'mascotas registradas'}
        </Text>

        {/* Mensaje de validación o error. */}
        {!!error && (
          <TouchableOpacity
            style={styles.alertaError}
            onPress={() => setError('')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Cerrar mensaje"
          >
            <Text style={styles.textoError}>
              {error}   ×
            </Text>
          </TouchableOpacity>
        )}

        {cargando ? (
          <View style={styles.centrado}>
            <ActivityIndicator
              size="large"
              color={C.primario}
            />
            <Text style={styles.textoCarga}>
              Cargando mascotas...
            </Text>
          </View>
        ) : (
          <FlatList
            style={styles.lista}
            data={mascotasFiltradas}
            keyExtractor={(item, index) =>
              String(
                item.numero_historia ??
                item.mascota_id ??
                index
              )
            }
            renderItem={renderMascota}
            contentContainerStyle={styles.contenidoLista}
            ItemSeparatorComponent={() => (
              <View style={styles.separador} />
            )}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={actualizando}
                onRefresh={() => {
                  setActualizando(true);
                  cargarMascotas();
                }}
                colors={[C.primario]}
                tintColor={C.primario}
              />
            }
            ListEmptyComponent={
              <View style={styles.vacio}>
                <Text style={styles.huellaVacia}>🐾</Text>

                <Text style={styles.nombreVacio}>
                  {terminoBusqueda
                    ? 'No se encontraron mascotas'
                    : mascotas.length === 0
                      ? 'No hay mascotas registradas'
                      : 'No se encontraron mascotas'}
                </Text>

                <Text style={styles.descripcionVacia}>
                  {terminoBusqueda
                    ? mensajeSinResultados
                    : 'Puedes registrar una nueva mascota para comenzar.'}
                </Text>
              </View>
            }
          />
        )}
      </View>

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
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },

  migas: {
    fontSize: 12,
    color: C.secundario,
    marginBottom: 16,
  },

  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },

  bloqueTitulo: {
    flex: 1,
    minWidth: 0,
  },

  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  botonVolver: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 9,
  },

  flechaVolver: {
    color: C.primario,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '400',
    marginTop: -3,
  },

  titulo: {
    color: C.texto,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  subtitulo: {
    color: C.secundario,
    fontSize: 13,
    marginTop: -7,
    marginBottom: 16,
    lineHeight: 19,
  },

  botonNueva: {
    minHeight: 44,
    backgroundColor: C.primario,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBotonNueva: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '700',
  },

  buscador: {
    width: '100%',
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    paddingHorizontal: 12,
    marginBottom: 16,
  },

  iconoBuscar: {
    fontSize: 23,
    color: C.secundario,
    marginRight: 8,
  },

  inputBusqueda: {
    flex: 1,
    minWidth: 0,
    color: C.texto,
    paddingVertical: 10,
    fontSize: 13,
  },

  botonLimpiar: {
    paddingHorizontal: 4,
  },

  limpiar: {
    fontSize: 24,
    color: C.secundario,
    paddingHorizontal: 5,
  },

  lista: {
    flex: 1,
  },

  contenidoLista: {
    paddingBottom: 80,
    flexGrow: 1,
  },

  filaMascota: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 12,
    backgroundColor: C.blanco,
    borderBottomWidth: 1,
    borderBottomColor: C.borde,
    borderRadius: 10,
  },

  iconoMascota: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.verdeFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inicialMascota: {
    color: C.primarioOscuro,
    fontSize: 21,
    fontWeight: '800',
  },

  datosMascota: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },

  nombreMascota: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '800',
  },

  detalleMascota: {
    color: C.secundario,
    fontSize: 13,
  },

  historiaMascota: {
    color: C.primarioOscuro,
    fontSize: 12,
    fontWeight: '700',
  },

  propietarioMascota: {
    color: C.texto,
    fontSize: 12,
    lineHeight: 17,
  },

  flecha: {
    color: '#93A6A1',
    fontSize: 28,
    paddingLeft: 2,
  },

  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  textoCarga: {
    color: C.secundario,
    fontSize: 13,
  },

  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 45,
    gap: 9,
  },

  huellaVacia: {
    fontSize: 40,
    marginBottom: 5,
  },

  nombreVacio: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  descripcionVacia: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  alertaError: {
    backgroundColor: C.errorFondo,
    borderColor: '#F3B7B4',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 9,
    marginBottom: 12,
  },

  textoError: {
    color: C.error,
    fontSize: 13,
    lineHeight: 19,
  },

  separador: {
    height: 9,
  },
});
