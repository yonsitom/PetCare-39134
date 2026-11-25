/**
 * ======================================================
 * PETCARE - EDITAR MASCOTA
 * ======================================================
 *
 * RF18: Modificar la información registrada de una mascota.
 *
 * Responsabilidades:
 * - Cargar el perfil del usuario.
 * - Consultar los datos de la mascota.
 * - Validar los cambios.
 * - Solicitar confirmación antes de guardar.
 * - Actualizar mediante el DAO.
 * - Navegar a la ficha después de actualizar correctamente.
 * - Descartar cambios al cancelar.
 *
 * Arquitectura:
 * Vista -> Validaciones -> DAO -> Supabase.
 * ======================================================
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
} from '../../dao/mascotas/mascotaDAO';

import {
  validarDatosEdicionMascota,
  obtenerMensajeErrorEdicionMascota,
} from '../../utils/validacionesEdicionMascota';

// ======================================================
// MENSAJES RF18
// ======================================================

const MENSAJES = {
  exito:
    'Los datos de la mascota fueron actualizados correctamente.',

  errorActualizacion:
    'No se pudieron guardar los cambios. Intente nuevamente.',
};

// ======================================================
// PALETA VISUAL PETCARE
// ======================================================

const C = {
  primario: '#187C72',
  fondo: '#F5F8F8',
  blanco: '#FFFFFF',
  texto: '#243746',
  secundario: '#72818D',
  borde: '#DCE5E5',
  rojo: '#B42318',
  fondoError: '#FFF2F1',
  bordeError: '#F2C7C3',
};

// ======================================================
// PANTALLA EDITAR MASCOTA
// ======================================================

export default function EditarMascotaScreen() {
  const { numeroHistoria } = useLocalSearchParams();

  const historia = Array.isArray(numeroHistoria)
    ? numeroHistoria[0]
    : numeroHistoria;

  const [mascota, setMascota] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState('');

  const [datosPendientes, setDatosPendientes] = useState(null);

  const [
    modalConfirmacionVisible,
    setModalConfirmacionVisible,
  ] = useState(false);

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
            errorPerfil
          );
          return;
        }

        if (activo && data) {
          setNombreUsuario(
            data.nombre_completo || 'Usuario'
          );

          setRolUsuario(data.rol || '');
        }
      } catch (err) {
        console.error(
          'Error al cargar el perfil:',
          err
        );
      }
    }

    cargarPerfil();

    return () => {
      activo = false;
    };
  }, []);

  // ====================================================
  // 2. CARGAR MASCOTA
  // ====================================================

  const cargarMascota = useCallback(async () => {
    if (!historia) {
      setMascota(null);
      setError(
        'No se recibió el número de historia clínica.'
      );
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      const resultado = await consultarMascotaPorId(
        historia
      );

      setMascota(resultado || null);

      if (!resultado) {
        setError(
          'No se encontró la mascota que deseas editar.'
        );
      }
    } catch (err) {
      console.error(
        'Error al cargar la mascota para editar:',
        err
      );

      setMascota(null);

      setError(
        'No se pudieron cargar los datos de la mascota.'
      );
    } finally {
      setCargando(false);
    }
  }, [historia]);

  useFocusEffect(
    useCallback(() => {
      cargarMascota();
    }, [cargarMascota])
  );

  // ====================================================
  // 3. VOLVER A LA FICHA O PANTALLA ANTERIOR
  // ====================================================

  function volver() {
    if (guardando) return;

    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (historia) {
      router.replace({
        pathname: '/mascotas/fichaMascota',
        params: {
          numeroHistoria: String(historia),
        },
      });

      return;
    }

    router.replace('/mascotas');
  }

  // ====================================================
  // 4. CANCELAR EDICIÓN
  // CP04: DESCARTAR CAMBIOS
  // ====================================================

  function cancelarEdicion() {
    if (guardando) return;

    setModalConfirmacionVisible(false);
    setDatosPendientes(null);
    setError('');

    // No se invoca el DAO.
    // La información original permanece en Supabase.
    volver();
  }

  // ====================================================
  // 5. SOLICITAR CONFIRMACIÓN
  // ====================================================

  function solicitarConfirmacion(datos) {
    if (guardando) return;

    setError('');

    const resultado = validarDatosEdicionMascota(datos);

    if (!resultado.valido) {
      setError(resultado.mensaje);
      return;
    }

    setDatosPendientes(datos);
    setModalConfirmacionVisible(true);
  }

  // ====================================================
  // 6. CANCELAR CONFIRMACIÓN
  // ====================================================

  function cancelarConfirmacion() {
    if (guardando) return;

    setModalConfirmacionVisible(false);
    setDatosPendientes(null);
  }

  // ====================================================
  // 7. ACTUALIZAR MASCOTA
  // CP01 Y CP05
  // ====================================================

  async function confirmarGuardado() {
    if (
      guardando ||
      !datosPendientes ||
      !historia
    ) {
      return;
    }

    const datosParaGuardar = {
      ...datosPendientes,
    };

    // Validación final antes de solicitar la actualización.
    const resultado = validarDatosEdicionMascota(
      datosParaGuardar
    );

    if (!resultado.valido) {
      setModalConfirmacionVisible(false);
      setError(resultado.mensaje);
      return;
    }

    try {
      setGuardando(true);
      setError('');
      setModalConfirmacionVisible(false);

      // RF18: el DAO ejecuta la actualización en Supabase.
      const mascotaActualizada = await actualizarMascota(
        historia,
        datosParaGuardar
      );

      // Si el DAO no devuelve una mascota, no se considera
      // confirmada la operación.
      if (!mascotaActualizada) {
        throw new Error(
          'La actualización no devolvió el registro modificado.'
        );
      }

      setMascota(mascotaActualizada);
      setDatosPendientes(null);

      // La actualización terminó correctamente.
      // Navegar automáticamente a la ficha de la mascota.
      router.replace({
        pathname: '/mascotas/fichaMascota',
        params: {
          numeroHistoria: String(
            mascotaActualizada.numero_historia || historia
          ),
          exito: 'actualizada',
        },
      });
    } catch (err) {
      console.error(
        'Error técnico al actualizar la mascota:',
        err
      );

      const mensaje =
        obtenerMensajeErrorEdicionMascota(err) ||
        MENSAJES.errorActualizacion;

      setError(mensaje);

      Alert.alert(
        'No se pudo actualizar',
        MENSAJES.errorActualizacion
      );
    } finally {
      setGuardando(false);
    }
  }

  // ====================================================
  // 8. CERRAR SESIÓN
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
      console.error(
        'Error al cerrar sesión:',
        err
      );

      Alert.alert(
        'Error',
        'No se pudo cerrar la sesión. Inténtalo nuevamente.'
      );
    }
  }

  // ====================================================
  // 9. INTERFAZ
  // ====================================================

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
                Inicio / Mascotas / Edición
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
        <View style={styles.contenido}>
          {/* ENCABEZADO DE PÁGINA */}
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
                Inicio / Mascotas / Edición
              </Text>

              <Text style={styles.titulo}>
                Editar mascota
              </Text>

              <Text style={styles.subtitulo}>
                Modifica la información y guarda los cambios.
              </Text>
            </View>
          </View>

          {!!error && (
            <View style={styles.alertaError}>
              <Text style={styles.iconoError}>!</Text>

              <Text style={styles.textoError}>
                {error}
              </Text>
            </View>
          )}

          {/* FORMULARIO RF18 */}
          <View style={styles.areaFormulario}>
            <FormularioMascota
              modo="edicion"
              datosIniciales={mascota}
              onContinuar={solicitarConfirmacion}
              onCancelar={cancelarEdicion}
              cargando={guardando}
            />
          </View>

          <View style={styles.filaBlanca} />
        </View>
      )}

      {/* =================================================
          MODAL DE CONFIRMACIÓN
      ================================================= */}

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

      {/* =================================================
          INDICADOR DE GUARDADO
      ================================================= */}

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

      {/* MENÚ LATERAL */}
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
// 10. ESTILOS
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
    paddingTop: 14,
    paddingBottom: 0,
  },

  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    marginBottom: 12,
  },

  botonVolver: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    marginRight: 12,
  },

  flechaVolver: {
    color: C.primario,
    fontSize: 31,
    lineHeight: 36,
    marginTop: -3,
  },

  bloqueTitulo: {
    flex: 1,
    minWidth: 0,
  },

  migas: {
    color: C.secundario,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
  },

  titulo: {
    color: C.texto,
    fontSize: 21,
    fontWeight: '800',
  },

  subtitulo: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

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