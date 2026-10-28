
/*
 * Archivo: src/app/mascotas/editarMascota.jsx
 *
 * Funciones:
 * - Cargar el perfil del usuario autenticado.
 * - Consultar los datos de la mascota.
 * - Editar los datos de la mascota.
 * - Solicitar confirmación antes de guardar.
 * - Actualizar la información mediante el DAO.
 * - Mostrar mensajes de error y éxito.
 *
 * Diseño:
 * - Estilo visual coherente con Nueva mascota.
 * - Sin botón inferior para volver a la ficha.
 * - Espacio en blanco debajo del formulario.
 */

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import { supabase } from '../../services/supabase';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';

import FormularioMascota from '../../components/mascotas/FormularioMascota';

import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

import {
  actualizarMascota,
  consultarMascotaPorId,
} from '../../dao/mascotaDAO';

// ======================================================
// PALETA VISUAL PETCARE
// ======================================================

const C = {
  primario: '#187C72',
  fondo: '#F3F7F7',
  blanco: '#FFFFFF',
  texto: '#243746',
  secundario: '#72818D',
  borde: '#E1EAE8',
  rojo: '#B42318',
  fondoError: '#FFF2F1',
  bordeError: '#F2C7C3',
  verde: '#15803D',
  fondoExito: '#F0FDF4',
  bordeExito: '#BBF7D0',
};

// ======================================================
// PANTALLA EDITAR MASCOTA
// ======================================================

export default function EditarMascotaScreen() {
  // Número de historia recibido desde la ficha.
  const { numeroHistoria } = useLocalSearchParams();

  // Información de la mascota.
  const [mascota, setMascota] = useState(null);

  // Estados de carga y guardado.
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Mensajes de la pantalla.
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  // Datos que esperan la confirmación del usuario.
  const [datosPendientes, setDatosPendientes] = useState(null);

  // Visibilidad del modal de confirmación.
  const [modalConfirmacionVisible, setModalConfirmacionVisible] =
    useState(false);

  // Estados del menú lateral.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [rolUsuario, setRolUsuario] = useState('');

  // ====================================================
  // 1. CARGAR PERFIL DEL USUARIO
  // ====================================================

  useEffect(() => {
    let activo = true;

    async function cargarPerfil() {
      try {
        const {
          data: { user },
          error: errorUsuario,
        } = await supabase.auth.getUser();

        if (errorUsuario || !user) {
          return;
        }

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
      } catch (err) {
        console.error('Error al cargar el perfil:', err);
      }
    }

    cargarPerfil();

    return () => {
      activo = false;
    };
  }, []);

  // ====================================================
  // 2. CARGAR DATOS DE LA MASCOTA
  // ====================================================

  const cargarMascota = useCallback(async () => {
    if (!numeroHistoria) {
      setMascota(null);
      setError('No se recibió el número de historia clínica.');
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');
      setMensajeExito('');

      const resultado = await consultarMascotaPorId(
        String(numeroHistoria)
      );

      setMascota(resultado || null);

      if (!resultado) {
        setError('No se encontró la mascota que deseas editar.');
      }
    } catch (err) {
      console.error(
        'Error al cargar la mascota para editar:',
        err
      );

      setMascota(null);
      setError('No se pudieron cargar los datos de la mascota.');
    } finally {
      setCargando(false);
    }
  }, [numeroHistoria]);

  // Recargar los datos cuando la pantalla obtiene el foco.
  useFocusEffect(
    useCallback(() => {
      cargarMascota();
    }, [cargarMascota])
  );

  // ====================================================
  // 3. VOLVER A LA PANTALLA ANTERIOR
  // ====================================================

  function volver() {
    if (guardando) {
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (numeroHistoria) {
      router.replace({
        pathname: '/mascotas/fichaMascota',
        params: {
          numeroHistoria: String(numeroHistoria),
        },
      });
      return;
    }

    router.replace('/mascotas');
  }

  // ====================================================
  // 4. SOLICITAR CONFIRMACIÓN
  // ====================================================

  function solicitarConfirmacion(datos) {
    setError('');
    setMensajeExito('');
    setDatosPendientes(datos);
    setModalConfirmacionVisible(true);
  }

  // ====================================================
  // 5. CANCELAR CONFIRMACIÓN
  // ====================================================

  function cancelarConfirmacion() {
    if (guardando) {
      return;
    }

    setModalConfirmacionVisible(false);
    setDatosPendientes(null);
  }

  // ====================================================
  // 6. ACTUALIZAR MASCOTA EN SUPABASE
  // ====================================================

  async function confirmarGuardado() {
    if (
      guardando ||
      !datosPendientes ||
      !numeroHistoria
    ) {
      return;
    }

    try {
      setGuardando(true);
      setError('');
      setMensajeExito('');
      setModalConfirmacionVisible(false);

      // Actualizar los datos de la mascota mediante el DAO.
      await actualizarMascota(
        String(numeroHistoria),
        datosPendientes
      );

      // Consultar nuevamente los datos guardados.
      const mascotaActualizada = await consultarMascotaPorId(
        String(numeroHistoria)
      );

      if (mascotaActualizada) {
        setMascota(mascotaActualizada);
      } else {
        // Mantener los datos actualizados como respaldo.
        setMascota((anterior) => ({
          ...anterior,
          ...datosPendientes,
        }));
      }

      setDatosPendientes(null);

      // Mostrar el mensaje únicamente si el guardado funcionó.
      setMensajeExito(
        'Los cambios de la mascota se guardaron correctamente.'
      );
    } catch (err) {
      console.error(
        'Error al actualizar la mascota:',
        err
      );

      const mensaje =
        err?.message ||
        'No se pudieron guardar los cambios. Inténtalo nuevamente.';

      setError(mensaje);

      Alert.alert(
        'No se pudo actualizar',
        mensaje
      );
    } finally {
      setGuardando(false);
    }
  }

  // ====================================================
  // 7. CERRAR SESIÓN
  // ====================================================

  async function cerrarSesion() {
    try {
      const { error: errorSesion } =
        await supabase.auth.signOut();

      if (errorSesion) {
        Alert.alert(
          'No se pudo cerrar la sesión',
          'Inténtalo nuevamente.'
        );
        return;
      }

      setMenuAbierto(false);
      router.replace('/');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);

      Alert.alert(
        'Error',
        'No se pudo cerrar la sesión. Inténtalo nuevamente.'
      );
    }
  }

  // ====================================================
  // 8. INTERFAZ PRINCIPAL
  // ====================================================

  return (
    <SafeAreaView style={styles.pantalla}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.blanco}
      />

      {/* Encabezado compartido de PetCare. */}
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

      {/* Estado de carga inicial. */}
      {cargando ? (
        <View style={styles.estadoCentrado}>
          <ActivityIndicator
            size="large"
            color={C.primario}
          />

          <Text style={styles.textoCargaInicial}>
            Cargando datos de la mascota...
          </Text>
        </View>
      ) : !mascota ? (
        // Mensaje cuando no se encuentra la mascota.
        <View style={styles.contenido}>
          <View style={styles.encabezadoPagina}>
            <TouchableOpacity
              style={styles.botonVolver}
              onPress={volver}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Text style={styles.flechaVolver}>‹</Text>
            </TouchableOpacity>

            <View style={styles.bloqueTitulo}>
              <Text style={styles.migas}>
                MASCOTAS / EDICIÓN
              </Text>

              <Text style={styles.titulo}>
                Editar mascota
              </Text>

              <Text style={styles.subtitulo}>
                No se pudo cargar la información.
              </Text>
            </View>
          </View>

          <View style={styles.alertaError}>
            <Text style={styles.iconoError}>!</Text>

            <Text style={styles.textoError}>
              {error || 'Mascota no encontrada.'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.botonReintentar}
            onPress={cargarMascota}
            activeOpacity={0.8}
          >
            <Text style={styles.textoBotonReintentar}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Pantalla principal de edición.
        <View style={styles.contenido}>
          {/* Título y botón para volver. */}
          <View style={styles.encabezadoPagina}>
            <TouchableOpacity
              style={styles.botonVolver}
              onPress={volver}
              disabled={guardando}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Volver a la pantalla anterior"
            >
              <Text style={styles.flechaVolver}>‹</Text>
            </TouchableOpacity>

            <View style={styles.bloqueTitulo}>
              <Text style={styles.migas}>
                MASCOTAS / EDICIÓN
              </Text>

              <Text style={styles.titulo}>
                Editar mascota
              </Text>

              <Text style={styles.subtitulo}>
                Modifica la información y guarda los cambios.
              </Text>
            </View>
          </View>

          {/* Aviso de error. */}
          {!!error && (
            <View style={styles.alertaError}>
              <Text style={styles.iconoError}>!</Text>

              <Text style={styles.textoError}>
                {error}
              </Text>
            </View>
          )}

          {/* Aviso de actualización exitosa. */}
          {!!mensajeExito && (
            <View style={styles.alertaExito}>
              <View style={styles.iconoExito}>
                <Text style={styles.textoIconoExito}>
                  ✓
                </Text>
              </View>

              <View style={styles.contenidoExito}>
                <Text style={styles.tituloExito}>
                  ¡Actualización exitosa!
                </Text>

                <Text style={styles.textoExito}>
                  {mensajeExito}
                </Text>
              </View>
            </View>
          )}

          {/* Formulario original en modo edición. */}
          <View style={styles.areaFormulario}>
            <FormularioMascota
              modo="edicion"
              datosIniciales={mascota}
              onContinuar={solicitarConfirmacion}
              cargando={guardando}
            />
          </View>

          {/*
            Fila vacía para dejar un espacio visual
            debajo del formulario.
          */}
          <View style={styles.filaBlanca} />
        </View>
      )}

      {/* Modal de confirmación de cambios. */}
      <Modal
        visible={modalConfirmacionVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelarConfirmacion}
      >
        <View style={styles.fondoModal}>
          <View style={styles.tarjetaModal}>
            <View style={styles.iconoModal}>
              <Text style={styles.textoIconoModal}>?</Text>
            </View>

            <Text style={styles.tituloModal}>
              ¿Guardar los cambios?
            </Text>

            <Text style={styles.descripcionModal}>
              Se actualizará la información de esta mascota.
              ¿Deseas continuar?
            </Text>

            <View style={styles.botonesModal}>
              <TouchableOpacity
                style={styles.botonCancelarModal}
                onPress={cancelarConfirmacion}
                disabled={guardando}
                activeOpacity={0.8}
              >
                <Text style={styles.textoCancelarModal}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botonConfirmarModal}
                onPress={confirmarGuardado}
                disabled={guardando}
                activeOpacity={0.8}
              >
                <Text style={styles.textoConfirmarModal}>
                  Sí, guardar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Indicador de carga durante la actualización. */}
      {guardando && (
        <View style={styles.capaCarga}>
          <View style={styles.tarjetaCarga}>
            <ActivityIndicator
              size="large"
              color={C.primario}
            />

            <Text style={styles.textoCarga}>
              Guardando cambios...
            </Text>
          </View>
        </View>
      )}

      {/* Menú lateral compartido. */}
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

// ======================================================
// 9. ESTILOS DE LA PANTALLA
// ======================================================

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  contenido: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 0,
  },

  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    marginBottom: 12,
  },

  botonVolver: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 13,
    marginRight: 12,

    shadowColor: '#173B36',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  flechaVolver: {
    color: C.primario,
    fontSize: 35,
    lineHeight: 40,
    marginTop: -3,
  },

  bloqueTitulo: {
    flex: 1,
    minWidth: 0,
  },

  migas: {
    color: C.primario,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },

  titulo: {
    color: C.texto,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  subtitulo: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  // Área del formulario con fondo blanco y bordes redondeados.
  areaFormulario: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: C.blanco,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.borde,
  },

  // Fila blanca debajo del formulario.
  filaBlanca: {
    height: 25,
    width: '100%',
    backgroundColor: C.fondo,
  },

  estadoCentrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },

  textoCargaInicial: {
    color: C.secundario,
    fontSize: 13,
    textAlign: 'center',
  },

  alertaError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.fondoError,
    borderColor: C.bordeError,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  iconoError: {
    color: C.rojo,
    fontSize: 17,
    fontWeight: '800',
    marginRight: 10,
  },

  textoError: {
    flex: 1,
    color: C.rojo,
    fontSize: 12,
    lineHeight: 18,
  },

  botonReintentar: {
    alignSelf: 'flex-start',
    backgroundColor: C.primario,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },

  textoBotonReintentar: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '700',
  },

  alertaExito: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.fondoExito,
    borderColor: C.bordeExito,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  iconoExito: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  textoIconoExito: {
    color: C.verde,
    fontSize: 18,
    fontWeight: '800',
  },

  contenidoExito: {
    flex: 1,
  },

  tituloExito: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },

  textoExito: {
    color: '#166534',
    fontSize: 12,
    lineHeight: 18,
  },

  // Fondo del modal de confirmación.
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },

  tarjetaModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.blanco,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },

  iconoModal: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F5F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  textoIconoModal: {
    color: C.primario,
    fontSize: 28,
    fontWeight: '800',
  },

  tituloModal: {
    color: C.texto,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },

  descripcionModal: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
  },

  botonesModal: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },

  botonCancelarModal: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  textoCancelarModal: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
  },

  botonConfirmarModal: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: C.primario,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  textoConfirmarModal: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '700',
  },

  // Capa de carga durante el guardado.
  capaCarga: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },

  tarjetaCarga: {
    minWidth: 190,
    backgroundColor: C.blanco,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 12,
  },

  textoCarga: {
    color: C.primario,
    fontSize: 13,
    fontWeight: '700',
  },
});
