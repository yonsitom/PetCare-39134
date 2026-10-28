
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
import { consultarMascotas } from '../../dao/mascotaDAO';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

// Colores compartidos con las demás pantallas de PetCare.
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

// Devuelve el nombre completo del propietario de la mascota.
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

export default function ListaMascotasScreen() {
  // Datos de la lista y estados de carga.
  const [mascotas, setMascotas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');

  // Estado y datos necesarios para el menú lateral.
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

  // Recarga la lista cada vez que la pantalla vuelve a estar activa.
  useFocusEffect(
    useCallback(() => {
      cargarMascotas();
    }, [cargarMascotas])
  );

  // Filtra por nombre, historia clínica, especie, raza o propietario.
  const mascotasFiltradas = mascotas.filter((mascota) => {
    const propietario = mascota?.propietarios;

    const texto = [
      mascota?.nombre,
      mascota?.numero_historia,
      mascota?.especie,
      mascota?.raza,
      propietario?.nombre,
      propietario?.apellido,
      propietario?.documento_identidad,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return texto.includes(busqueda.trim().toLowerCase());
  });

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

  // Navega al formulario de registro de una nueva mascota.
  function abrirRegistro() {
    router.push('/mascotas/nuevaMascota');
  }

  // Regresa a la pantalla anterior usando únicamente la flecha.
  function volver() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/inicio');
    }
  }

  // Cierra la sesión desde el menú lateral.
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

  // Cada mascota se muestra como una fila amplia, no como una tarjeta pequeña.
  const renderMascota = ({ item }) => (
    <TouchableOpacity
      style={styles.filaMascota}
      activeOpacity={0.75}
      onPress={() => abrirFicha(item)}
      accessibilityRole="button"
      accessibilityLabel={`Ver ficha de ${item.nombre || 'mascota'}`}
    >
      <View style={styles.iconoMascota}>
        <Text style={styles.huella}>🐾</Text>
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

      {/* Encabezado común de PetCare con acceso al menú lateral. */}
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

      {/* El contenido utiliza el ancho de la pantalla, sin una tarjeta exterior. */}
      <View style={styles.contenido}>
        <Text style={styles.migas}>Inicio / Mascotas</Text>

        {/* Título, flecha de volver y botón de registro en la misma fila. */}
        <View style={styles.encabezadoPagina}>
          <View style={styles.bloqueTitulo}>
            <View style={styles.filaTitulo}>
              {/* Botón de volver: flecha dentro de una caja blanca. */}
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

            <Text style={styles.subtitulo}>
              {mascotasFiltradas.length}{' '}
              {mascotasFiltradas.length === 1
                ? 'mascota encontrada'
                : 'mascotas encontradas'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.botonNueva}
            onPress={abrirRegistro}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.textoBotonNueva}>
              + Nueva mascota
            </Text>
          </TouchableOpacity>
        </View>

        {/* Buscador a todo el ancho disponible. */}
        <View style={styles.buscador}>
          <Text style={styles.iconoBuscar}>⌕</Text>

          <TextInput
            style={styles.inputBusqueda}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre, historia o propietario..."
            placeholderTextColor="#8A9996"
            returnKeyType="search"
            autoCapitalize="none"
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

        {/* Mensaje de error que no encierra el resto del contenido. */}
        {!!error && (
          <TouchableOpacity
            style={styles.alertaError}
            onPress={() => setError('')}
            activeOpacity={0.8}
          >
            <Text style={styles.textoError}>
              {error}   ×
            </Text>
          </TouchableOpacity>
        )}

        {/* Lista de mascotas con actualización por gesto. */}
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
                  No se encontraron mascotas
                </Text>

                <Text style={styles.descripcionVacia}>
                  Prueba otra búsqueda o registra una nueva mascota.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Menú lateral compartido con las demás pantallas. */}
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

  // Contenedor general sin borde ni tarjeta exterior.
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

  // Agrupa la flecha de volver y el título sin cambiar el estilo general.
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Cajita blanca para el botón de volver.
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
    marginTop: 5,
    lineHeight: 19,
  },

  botonNueva: {
    minHeight: 44,
    backgroundColor: C.primario,
    borderRadius: 10,
    paddingHorizontal: 13,
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

  limpiar: {
    fontSize: 24,
    color: C.secundario,
    paddingHorizontal: 5,
  },

  lista: {
    flex: 1,
  },

  // Espacio en blanco debajo de la última mascota.
  contenidoLista: {
    paddingBottom: 80,
    flexGrow: 1,
  },

  // Las filas ocupan todo el ancho y tienen un borde discreto.
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

  huella: {
    fontSize: 23,
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
