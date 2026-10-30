
/*
 * Archivo: src/app/mascotas/nuevaMascota.jsx
 *
 * RESPONSABILIDAD:
 * - Mostrar la pantalla para registrar una nueva mascota.
 * - Consultar el perfil del usuario autenticado.
 * - Recibir y confirmar los datos del formulario.
 * - Registrar la mascota mediante el DAO y Supabase.
 * - Redirigir a la ficha de la mascota registrada.
 *
 * IMPORTANTE:
 * - No modifica editarMascota.jsx.
 * - No modifica FormularioMascota.jsx.
 * - Conserva el menú lateral y la confirmación existente.
 */

import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router } from 'expo-router';

import { supabase } from '../../services/supabase';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';

import FormularioMascota from '../../components/mascotas/FormularioMascota';

import ConfirmacionMascota from '../../components/mascotas/ConfirmacionMascota';

import { registrarMascota } from '../../dao/mascotaDAO';

import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import { logger } from '../../utils/logger';

// ======================================================
// PALETA DE COLORES DE PETCARE
// ======================================================

const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#F3F7F7',
  blanco: '#FFFFFF',
  texto: '#243746',
  secundario: '#72818D',
  borde: '#E1EAE8',
  rojo: '#B42318',
  verdeSuave: '#E8F5F2',
  fondoError: '#FFF2F1',
  bordeError: '#F2C7C3',
};

// ======================================================
// PANTALLA DE REGISTRO DE MASCOTAS
// ======================================================

export default function NuevaMascota() {
  // Datos recibidos del formulario.
  const [datosFormulario, setDatosFormulario] = useState(null);

  // Controla el modal de confirmación.
  const [mostrarConfirmacion, setMostrarConfirmacion] =
    useState(false);

  // Indica si se está registrando la mascota.
  const [guardando, setGuardando] = useState(false);

  // Mensaje de error del registro.
  const [error, setError] = useState('');

  // Controla la apertura del menú lateral.
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Información del usuario autenticado.
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [rolUsuario, setRolUsuario] = useState('');

  // ====================================================
  // CONSULTAR PERFIL DEL USUARIO AUTENTICADO
  // ====================================================

  useEffect(() => {
    let activo = true;

    async function cargarPerfil() {
      try {
        // Obtener el usuario de la sesión actual.
        const {
          data: { user },
          error: errorUsuario,
        } = await supabase.auth.getUser();

        if (errorUsuario || !user) {
          return;
        }

        // Consultar el nombre y el rol del perfil.
        const { data, error: errorPerfil } = await supabase
          .from('perfiles')
          .select('nombre_completo, rol')
          .eq('perfil_id', user.id)
          .single();

        if (errorPerfil) {
          logger.error(
            'Error al consultar el perfil:',
            errorPerfil.message
          );

          return;
        }

        // Actualizar los datos si la pantalla sigue activa.
        if (activo && data) {
          setNombreUsuario(
            data.nombre_completo || 'Usuario'
          );

          setRolUsuario(data.rol || '');
        }
      } catch (err) {
        logger.error(
          'Error al cargar el perfil:',
          err
        );
      }
    }

    cargarPerfil();

    // Evitar actualizar el estado después de desmontar.
    return () => {
      activo = false;
    };
  }, []);

  // ====================================================
  // RECIBIR LOS DATOS DEL FORMULARIO
  // ====================================================

  function continuarRegistro(datos) {
    // Guardar temporalmente los datos ingresados.
    setDatosFormulario(datos);

    // Limpiar errores anteriores.
    setError('');

    // Mostrar la confirmación antes de guardar.
    setMostrarConfirmacion(true);
  }

  // ====================================================
  // CONFIRMAR Y REGISTRAR LA MASCOTA
  // ====================================================

  async function confirmarRegistro() {
    // Evitar registros duplicados por pulsaciones repetidas.
    if (guardando || !datosFormulario) {
      return;
    }

    try {
      setGuardando(true);
      setError('');

      // Registrar la mascota mediante la función DAO.
      const mascotaCreada = await registrarMascota(
        datosFormulario
      );

      // Cerrar la confirmación después de guardar.
      setMostrarConfirmacion(false);

      // Abrir la ficha de la mascota recién registrada.
      router.replace({
        pathname: '/mascotas/fichaMascota',
        params: {
          numeroHistoria: String(
            mascotaCreada.numero_historia
          ),
          exito: '1',
        },
      });
    } catch (err) {
      logger.error(
        'Error al registrar la mascota:',
        err
      );

      const mensaje =
        err?.message ||
        'No se pudo registrar la mascota. Verifica los datos e inténtalo nuevamente.';

      // Mostrar el error en la pantalla.
      setError(mensaje);

      // Cerrar la confirmación si el registro falló.
      setMostrarConfirmacion(false);

      // Informar al usuario del problema.
      Alert.alert(
        'No se pudo registrar',
        mensaje
      );
    } finally {
      setGuardando(false);
    }
  }

  // ====================================================
  // CANCELAR LA CONFIRMACIÓN
  // ====================================================

  function cancelarConfirmacion() {
    if (guardando) {
      return;
    }

    setMostrarConfirmacion(false);
    setError('');
  }

  // ====================================================
  // VOLVER A LA PANTALLA ANTERIOR
  // ====================================================

  function volver() {
    if (guardando) {
      return;
    }

    router.back();
  }

  // ====================================================
  // CERRAR SESIÓN
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

      // Regresar a la pantalla de inicio de sesión.
      router.replace('/');
    } catch (err) {
      logger.error(
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
  // INTERFAZ
  // ====================================================

  return (
    <SafeAreaView style={styles.pantalla}>
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

      {/*
        Contenedor principal sin ScrollView exterior.
        El desplazamiento de los campos queda a cargo
        del ScrollView que ya utiliza FormularioMascota.
      */}
      <View style={styles.contenido}>
        {/* Título de la página y botón para volver. */}
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

          <View style={styles.textosEncabezado}>
            <Text style={styles.rutaPagina}>
              MASCOTAS / REGISTRO
            </Text>

            <Text style={styles.titulo}>
              Nueva mascota
            </Text>

            <Text style={styles.subtituloEncabezado}>
              Registra la información de la mascota.
            </Text>
          </View>
        </View>

        {/* Mensaje de error cuando no está abierta la confirmación. */}
        {!!error && !mostrarConfirmacion && (
          <View style={styles.alertaError}>
            <View style={styles.iconoErrorContenedor}>
              <Text style={styles.iconoError}>!</Text>
            </View>

            <Text style={styles.textoError}>
              {error}
            </Text>
          </View>
        )}

        {/*
          Área del formulario.
          Se elimina la tarjeta decorativa externa para
          aprovechar mejor el espacio disponible.
          El formulario original permanece sin cambios.
        */}
        <View style={styles.areaFormulario}>
          <FormularioMascota
            onContinuar={continuarRegistro}
          />
        </View>
      </View>

      {/* Menú lateral compartido. */}
      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
        onCerrarSesion={cerrarSesion}
      />

      {/* Modal original de confirmación del registro. */}
      <ConfirmacionMascota
        visible={mostrarConfirmacion}
        datos={datosFormulario}
        onVolver={cancelarConfirmacion}
        onConfirmar={confirmarRegistro}
        guardando={guardando}
        error={error}
      />

      {/* Indicador de carga mientras se registra la mascota. */}
      {guardando && (
        <View style={styles.fondoCarga}>
          <View style={styles.tarjetaCarga}>
            <View style={styles.indicadorContenedor}>
              <ActivityIndicator
                size="large"
                color={C.primario}
              />
            </View>

            <Text style={styles.textoCarga}>
              Registrando mascota...
            </Text>

            <Text style={styles.subtextoCarga}>
              Estamos guardando la información.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ======================================================
// ESTILOS DE LA PANTALLA
// ======================================================

const styles = StyleSheet.create({
  // Pantalla completa.
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  // Contenedor debajo del encabezado.
contenido: {
  flex: 1,
  minHeight: 0,
  paddingHorizontal: 18,
  paddingTop: 16,
  paddingBottom: 25, // Más espacio en la parte inferior
},
  // Encabezado compacto con botón de retorno.
  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    marginBottom: 12,
  },

  // Botón para volver.
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

  // Flecha de retorno.
  flechaVolver: {
    color: C.primario,
    fontSize: 35,
    lineHeight: 40,
    marginTop: -3,
  },

  // Columna de títulos.
  textosEncabezado: {
    flex: 1,
  },

  // Texto pequeño que indica la ubicación dentro de la app.
  rutaPagina: {
    color: C.primario,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },

  // Título principal.
  titulo: {
    color: C.texto,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  // Descripción de la pantalla.
  subtituloEncabezado: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },

  /*
   * El formulario ocupa el espacio restante.
   * minHeight: 0 permite que su ScrollView interno
   * pueda desplazarse correctamente en pantallas pequeñas.
   */
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

  // Aviso visual de error.
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

  // Círculo del icono de error.
  iconoErrorContenedor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FADBD8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  // Signo de exclamación.
  iconoError: {
    color: C.rojo,
    fontSize: 15,
    fontWeight: '800',
  },

  // Texto del error.
  textoError: {
    flex: 1,
    color: C.rojo,
    fontSize: 12,
    lineHeight: 18,
  },

  // Fondo semitransparente durante el guardado.
  fondoCarga: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 40, 38, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 20,
    elevation: 20,
  },

  // Tarjeta del indicador de carga.
  tarjetaCarga: {
    width: '100%',
    maxWidth: 310,
    backgroundColor: C.blanco,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
  },

  // Fondo del indicador.
  indicadorContenedor: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: C.verdeSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Mensaje principal de carga.
  textoCarga: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 17,
    textAlign: 'center',
  },

  // Mensaje secundario de carga.
  subtextoCarga: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 7,
    textAlign: 'center',
    lineHeight: 18,
  },
});
