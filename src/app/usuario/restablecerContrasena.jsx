/**
 * RF03 - Pantalla para establecer una contraseña nueva.
 *
 * Procesa el enlace del correo en móvil y web:
 * - #access_token=...&refresh_token=... (flujo implícito) -> setSession
 * - ?code=... (PKCE)                                       -> exchangeCodeForSession
 * - ?token_hash=...&type=recovery                          -> verifyOtp
 * y escucha PASSWORD_RECOVERY de supabase.auth como respaldo.
 *
 * Estados de la pantalla:
 * - verificando: se está validando el enlace.
 * - invalido:    enlace inválido o vencido (botón "Solicitar nuevo enlace").
 * - listo:       formulario de contraseña nueva.
 * - exito:       contraseña actualizada (botón "Ir a iniciar sesión").
 */

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import {
  actualizarContrasenaRecuperada,
  cerrarSesionRecuperacion,
  establecerSesionDesdeEnlace,
  urlTieneDatosRecuperacion,
  validarContrasenaNueva,
} from '../../services/persistencia/recuperacionContrasenaServicio';
import { supabase } from '../../services/supabase';

const RUTA_SOLICITAR_ENLACE = '/usuario/recuperarContrasena';
const ESPERA_REDIRECCION_MS = 3000;
const MENSAJE_SIN_ENLACE =
  'No se encontró un enlace de recuperación válido. Solicite un nuevo enlace.';

// ============================================================
// RF03 - LECTURA DE LA URL DE ENTRADA
// ============================================================

const esWeb = Platform.OS === 'web' && typeof window !== 'undefined';

// En web el router puede reescribir la URL (y perder el #fragmento) al
// iniciar. Se guarda la URL completa en cuanto se carga este módulo.
let urlWebAlCargar =
  esWeb && urlTieneDatosRecuperacion(window.location.href)
    ? window.location.href
    : null;

// Obtener la URL con la que se abrió la pantalla.
async function obtenerUrlEntrada() {
  if (esWeb) {
    if (urlTieneDatosRecuperacion(window.location.href)) {
      return window.location.href;
    }
    return urlWebAlCargar;
  }

  return Linking.getInitialURL();
}

// Quitar los tokens de la barra de direcciones (solo web).
function limpiarUrlWeb() {
  urlWebAlCargar = null;

  if (!esWeb) return;

  try {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname
    );
  } catch (error) {
    // Ignorar: la URL limpia es solo estética.
  }
}

export default function PantallaRestablecerContrasena() {
  // ARRANGE: estados de la pantalla.
  const [estado, setEstado] = useState('verificando');
  const [mensajeEnlace, setMensajeEnlace] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errorFormulario, setErrorFormulario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  // Referencias que sobreviven al doble montaje de React (StrictMode).
  const urlEntrada = useRef(null);
  const enlacesProcesados = useRef(new Map());
  const sesionRecuperacion = useRef(false);
  const cambioCompletado = useRef(false);
  const temporizador = useRef(null);

  // RF03: convertir el enlace recibido en una sesión de recuperación.
  useEffect(() => {
    let activo = true;

    const aplicarResultado = (resultado) => {
      if (!activo) return;

      if (resultado.exito) {
        sesionRecuperacion.current = true;
        setEstado((actual) => (actual === 'exito' ? actual : 'listo'));
        return;
      }

      // Un enlace repetido o antiguo no debe tumbar una sesión ya válida.
      setMensajeEnlace(resultado.mensaje);
      setEstado((actual) =>
        actual === 'listo' || actual === 'exito' ? actual : 'invalido'
      );
    };

    // Los códigos y tokens son de un solo uso: cada URL se procesa una vez.
    const procesarUrl = (url) => {
      if (!url) return Promise.resolve();

      if (!enlacesProcesados.current.has(url)) {
        enlacesProcesados.current.set(
          url,
          establecerSesionDesdeEnlace(url).then((resultado) => {
            limpiarUrlWeb();
            return resultado;
          })
        );
      }

      return enlacesProcesados.current.get(url).then(aplicarResultado);
    };

    // Enlace con el que se abrió la pantalla.
    if (!urlEntrada.current) {
      urlEntrada.current = obtenerUrlEntrada();
    }

    urlEntrada.current.then((url) => {
      if (!activo) return;

      if (!url || !urlTieneDatosRecuperacion(url)) {
        setMensajeEnlace(MENSAJE_SIN_ENLACE);
        setEstado((actual) => (actual === 'verificando' ? 'invalido' : actual));
        return;
      }

      procesarUrl(url);
    });

    // Enlace abierto mientras la aplicación ya estaba en ejecución.
    const suscripcionUrl = Linking.addEventListener('url', ({ url }) => {
      if (urlTieneDatosRecuperacion(url)) procesarUrl(url);
    });

    // Respaldo: Supabase avisa cuando se establece una sesión de recuperación.
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'PASSWORD_RECOVERY' && sesion && activo) {
        sesionRecuperacion.current = true;
        setEstado((actual) => (actual === 'exito' ? actual : 'listo'));
      }
    });

    return () => {
      activo = false;
      suscripcionUrl.remove();
      data?.subscription?.unsubscribe();
      clearTimeout(temporizador.current);

      // Si se sale sin cambiar la contraseña, no dejar la sesión abierta.
      if (sesionRecuperacion.current && !cambioCompletado.current) {
        sesionRecuperacion.current = false;
        cerrarSesionRecuperacion();
      }
    };
  }, []);

  // RF03: salir de la pantalla cerrando antes la sesión de recuperación.
  // Sin esto, volver al login dejaría al usuario dentro sin contraseña.
  const salir = async (ruta) => {
    if (guardando) return;

    clearTimeout(temporizador.current);

    if (sesionRecuperacion.current && !cambioCompletado.current) {
      sesionRecuperacion.current = false;
      await cerrarSesionRecuperacion();
    }

    router.replace(ruta);
  };

  const irAIniciarSesion = () => salir('/');
  const solicitarNuevoEnlace = () => salir(RUTA_SOLICITAR_ENLACE);

  // RF03: guardar la contraseña nueva.
  const guardarContrasena = async () => {
    if (guardando) return;

    // ASSERT: validar mínimo de caracteres, requisitos y coincidencia.
    const validacion = validarContrasenaNueva(nuevaContrasena, confirmacion);

    if (!validacion.valida) {
      setErrorFormulario(validacion.mensaje);
      return;
    }

    // ARRANGE: iniciar la actualización.
    setErrorFormulario('');
    setGuardando(true);

    try {
      // ACT: actualizar la contraseña mediante Supabase Auth.
      const resultado = await actualizarContrasenaRecuperada(nuevaContrasena);

      // ASSERT: la sesión de recuperación venció.
      if (!resultado.exito && resultado.motivo === 'enlace-vencido') {
        sesionRecuperacion.current = false;
        setMensajeEnlace(resultado.mensaje);
        setEstado('invalido');
        return;
      }

      // ASSERT: otro error (por ejemplo, misma contraseña que la anterior).
      if (!resultado.exito) {
        setErrorFormulario(resultado.mensaje);
        return;
      }

      // RF03: cerrar la sesión de recuperación (también en otros dispositivos).
      cambioCompletado.current = true;
      await cerrarSesionRecuperacion(supabase.auth, 'global');
      sesionRecuperacion.current = false;

      setNuevaContrasena('');
      setConfirmacion('');
      setEstado('exito');

      // RF03: redirigir al inicio de sesión.
      temporizador.current = setTimeout(() => {
        router.replace('/');
      }, ESPERA_REDIRECCION_MS);
    } catch (error) {
      setErrorFormulario(
        'No se pudo actualizar la contraseña. Intente nuevamente.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const titulo = {
    verificando: 'Verificando enlace',
    invalido: 'Enlace no válido o vencido',
    listo: 'Crear nueva contraseña',
    exito: 'Contraseña actualizada',
  }[estado];

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F8F7" />

      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.encabezado}>
          <View style={estilos.contenedorLogo}>
            <Text style={estilos.logo}>🐾</Text>
          </View>
          <Text style={estilos.nombreAplicacion}>PetCare</Text>
          <Text style={estilos.descripcionAplicacion}>
            Clínica Veterinaria
          </Text>
        </View>

        <View style={estilos.tarjeta}>
          <Text style={estilos.titulo}>{titulo}</Text>

          {/* ESTADO: verificando el enlace. */}
          {estado === 'verificando' && (
            <View style={estilos.cargando}>
              <ActivityIndicator color="#239B75" size="large" />
              <Text style={estilos.textoCargando}>Verificando enlace...</Text>
            </View>
          )}

          {/* ESTADO: enlace inválido o vencido. */}
          {estado === 'invalido' && (
            <>
              <View
                style={[estilos.contenedorMensaje, estilos.mensajeError]}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <Text style={[estilos.textoMensaje, estilos.textoError]}>
                  {mensajeEnlace || MENSAJE_SIN_ENLACE}
                </Text>
              </View>

              <TouchableOpacity
                style={estilos.botonPrimario}
                onPress={solicitarNuevoEnlace}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={estilos.textoBoton}>Solicitar nuevo enlace</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.botonVolver}
                onPress={irAIniciarSesion}
                accessibilityRole="button"
              >
                <Text style={estilos.textoVolver}>
                  Volver al inicio de sesión
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ESTADO: formulario de contraseña nueva. */}
          {estado === 'listo' && (
            <>
              <Text style={estilos.subtitulo}>
                La contraseña debe tener al menos 8 caracteres, una
                mayúscula, una minúscula y un número.
              </Text>

              {errorFormulario !== '' && (
                <View
                  style={[estilos.contenedorMensaje, estilos.mensajeError]}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                >
                  <Text style={[estilos.textoMensaje, estilos.textoError]}>
                    {errorFormulario}
                  </Text>
                </View>
              )}

              <Text style={estilos.etiqueta}>NUEVA CONTRASEÑA</Text>

              <View
                style={[
                  estilos.contenedorContrasena,
                  errorFormulario !== '' && estilos.contenedorConError,
                ]}
              >
                <TextInput
                  style={estilos.campoContrasena}
                  value={nuevaContrasena}
                  onChangeText={(texto) => {
                    setNuevaContrasena(texto);
                    setErrorFormulario('');
                  }}
                  placeholder="Ingrese la contraseña nueva"
                  placeholderTextColor="#999999"
                  secureTextEntry={!mostrarContrasena}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!guardando}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  accessibilityLabel="Nueva contraseña"
                />
              </View>

              <Text style={estilos.etiqueta}>CONFIRMAR CONTRASEÑA</Text>

              <View
                style={[
                  estilos.contenedorContrasena,
                  errorFormulario !== '' && estilos.contenedorConError,
                ]}
              >
                <TextInput
                  style={estilos.campoContrasena}
                  value={confirmacion}
                  onChangeText={(texto) => {
                    setConfirmacion(texto);
                    setErrorFormulario('');
                  }}
                  placeholder="Repita la contraseña nueva"
                  placeholderTextColor="#999999"
                  secureTextEntry={!mostrarContrasena}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!guardando}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={guardarContrasena}
                  accessibilityLabel="Confirmar contraseña"
                />
              </View>

              <TouchableOpacity
                style={estilos.botonMostrar}
                onPress={() => setMostrarContrasena(!mostrarContrasena)}
                disabled={guardando}
                accessibilityRole="button"
              >
                <Text style={estilos.textoMostrar}>
                  {mostrarContrasena
                    ? 'Ocultar contraseñas'
                    : 'Mostrar contraseñas'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  estilos.botonPrimario,
                  guardando && estilos.botonDeshabilitado,
                ]}
                onPress={guardarContrasena}
                disabled={guardando}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                {guardando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBoton}>
                    Guardar nueva contraseña
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.botonVolver}
                onPress={irAIniciarSesion}
                disabled={guardando}
                accessibilityRole="button"
              >
                <Text style={estilos.textoVolver}>
                  Volver al inicio de sesión
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ESTADO: contraseña actualizada. */}
          {estado === 'exito' && (
            <>
              <View
                style={[estilos.contenedorMensaje, estilos.mensajeExito]}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <Text style={[estilos.textoMensaje, estilos.textoExito]}>
                  La contraseña se actualizó correctamente. Serás redirigido
                  al inicio de sesión en unos segundos.
                </Text>
              </View>

              <TouchableOpacity
                style={estilos.botonPrimario}
                onPress={irAIniciarSesion}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={estilos.textoBoton}>Ir a iniciar sesión</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#F4F8F7',
  },
  contenido: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  encabezado: {
    alignItems: 'center',
    marginBottom: 27,
  },
  contenedorLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#DDF4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logo: {
    fontSize: 35,
  },
  nombreAplicacion: {
    fontSize: 29,
    fontWeight: '800',
    color: '#239B75',
  },
  descripcionAplicacion: {
    fontSize: 14,
    color: '#626E6A',
    marginTop: 3,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 28,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  titulo: {
    fontSize: 25,
    fontWeight: '700',
    color: '#263238',
    marginBottom: 14,
  },
  subtitulo: {
    fontSize: 14,
    lineHeight: 21,
    color: '#737373',
    marginBottom: 22,
  },
  cargando: {
    alignItems: 'center',
    marginVertical: 20,
  },
  textoCargando: {
    marginTop: 10,
    color: '#626E6A',
  },
  contenedorMensaje: {
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  mensajeError: {
    backgroundColor: '#FDECEC',
    borderColor: '#E7A2A2',
  },
  mensajeExito: {
    backgroundColor: '#E8F7EC',
    borderColor: '#8CC99B',
  },
  textoMensaje: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  textoError: {
    color: '#B42318',
  },
  textoExito: {
    color: '#21834A',
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: '#424242',
    marginBottom: 9,
    marginTop: 8,
  },
  contenedorContrasena: {
    minHeight: 49,
    borderWidth: 1,
    borderColor: '#D8DDE2',
    borderRadius: 9,
    marginBottom: 18,
    backgroundColor: '#FFFFFF',
  },
  contenedorConError: {
    borderColor: '#D9534F',
  },
  campoContrasena: {
    minHeight: 49,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#263238',
  },
  botonMostrar: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 15,
  },
  textoMostrar: {
    fontSize: 13,
    color: '#287A62',
    fontWeight: '600',
  },
  botonPrimario: {
    minHeight: 50,
    backgroundColor: '#239B75',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  botonDeshabilitado: {
    opacity: 0.7,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  botonVolver: {
    alignItems: 'center',
    marginTop: 20,
  },
  textoVolver: {
    fontSize: 14,
    color: '#287A62',
    fontWeight: '600',
  },
});