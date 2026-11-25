
/**
 * ============================================================
 * PETCARE - CONFIRMACIÓN DE CAMBIO DE CORREO
 * RF05
 *
 * Esta pantalla procesa exclusivamente enlaces de confirmación
 * de cambio de correo electrónico.
 *
 * No solicita ni modifica contraseñas.
 * No cierra la sesión del usuario.
 * ============================================================
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
  TouchableOpacity,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { supabase } from '../../services/supabase';

// ============================================================
// CONSTANTES
// ============================================================

const ESTADOS = {
  verificando: 'verificando',
  exito: 'exito',
  error: 'error',
};

const MENSAJE_ERROR =
  'No se pudo confirmar el cambio de correo. El enlace puede haber vencido, ya haber sido utilizado o no corresponder a una confirmación de correo.';

// ============================================================
// LEER PARÁMETROS DE LA URL
// ============================================================

function extraerParametros(url) {
  const resultado = {};

  if (!url) return resultado;

  const partes = String(url).split('#');
  const urlPrincipal = partes[0] || '';
  const fragmento = partes.slice(1).join('#');

  const consulta = urlPrincipal.includes('?')
    ? urlPrincipal.split('?').slice(1).join('?')
    : '';

  const leer = (texto) => {
    texto.split('&').forEach((elemento) => {
      if (!elemento) return;

      const [clave, ...resto] = elemento.split('=');

      try {
        resultado[decodeURIComponent(clave)] = decodeURIComponent(
          resto.join('=').replace(/\+/g, ' ')
        );
      } catch {
        // Ignorar parámetros mal codificados.
      }
    });
  };

  leer(consulta);
  leer(fragmento);

  return resultado;
}

// ============================================================
// OBTENER URL DE ENTRADA
// ============================================================

async function obtenerUrlEntrada() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.href;
  }

  return Linking.getInitialURL();
}

// ============================================================
// LIMPIAR TOKENS DE LA URL WEB
// ============================================================

function limpiarUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  try {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname
    );
  } catch (error) {
    console.warn('RF05 - No se pudo limpiar la URL de confirmación.');
  }
}

// ============================================================
// PROCESAR CONFIRMACIÓN DE CORREO
// ============================================================

async function procesarConfirmacionCorreo(url) {
  if (!url) {
    throw new Error('No se recibió el enlace de confirmación.');
  }

  const parametros = extraerParametros(url);

  // Rechazar errores devueltos por Supabase.
  if (parametros.error || parametros.error_code) {
    throw new Error(
      parametros.error_description || MENSAJE_ERROR
    );
  }

  // Esta pantalla no debe procesar enlaces de recuperación.
  if (
    parametros.type &&
    parametros.type !== 'email_change'
  ) {
    throw new Error(
      'El enlace recibido no corresponde a un cambio de correo.'
    );
  }

  let resultado;

  // ----------------------------------------------------------
  // CASO 1: enlace PKCE con código de autorización.
  // ----------------------------------------------------------

  if (parametros.code) {
    resultado = await supabase.auth.exchangeCodeForSession(
      parametros.code
    );
  }

  // ----------------------------------------------------------
  // CASO 2: enlace con token_hash.
  // ----------------------------------------------------------

  else if (parametros.token_hash) {
    resultado = await supabase.auth.verifyOtp({
      token_hash: parametros.token_hash,
      type: 'email_change',
    });
  }

  // ----------------------------------------------------------
  // CASO 3: enlace con tokens en el fragmento.
  // ----------------------------------------------------------

  else if (
    parametros.access_token &&
    parametros.refresh_token
  ) {
    resultado = await supabase.auth.setSession({
      access_token: parametros.access_token,
      refresh_token: parametros.refresh_token,
    });
  } else {
    throw new Error(
      'El enlace no contiene los datos necesarios para confirmar el correo.'
    );
  }

  if (resultado?.error) {
    throw resultado.error;
  }

  // Comprobar que Supabase haya procesado la operación.
  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario) {
    throw errorUsuario;
  }

  if (!user) {
    throw new Error(
      'No se pudo comprobar el resultado de la confirmación.'
    );
  }

  return {
    correo: user.email || '',
  };
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ConfirmarCambioCorreoScreen() {
  const [estado, setEstado] = useState(ESTADOS.verificando);
  const [mensaje, setMensaje] = useState('');
  const [correoConfirmado, setCorreoConfirmado] = useState('');

  const procesando = useRef(false);

  useEffect(() => {
    let activo = true;

    const procesar = async (url) => {
      if (!url || procesando.current) return;

      procesando.current = true;

      try {
        const resultado = await procesarConfirmacionCorreo(url);

        if (!activo) return;

        setCorreoConfirmado(resultado.correo);
        setMensaje(
          'La confirmación del enlace se procesó correctamente. Si Supabase solicita confirmar también el correo anterior, revisa ese mensaje y completa la segunda confirmación.'
        );
        setEstado(ESTADOS.exito);
      } catch (error) {
        console.error(
          'RF05 - Error al confirmar el cambio de correo:',
          {
            message: error?.message,
            code: error?.code,
            status: error?.status,
          }
        );

        if (!activo) return;

        setMensaje(error?.message || MENSAJE_ERROR);
        setEstado(ESTADOS.error);
      } finally {
        limpiarUrl();
      }
    };

    obtenerUrlEntrada().then((url) => {
      if (activo) procesar(url);
    });

    const suscripcion = Linking.addEventListener(
      'url',
      ({ url }) => {
        procesar(url);
      }
    );

    return () => {
      activo = false;
      suscripcion.remove();
    };
  }, []);

  // ==========================================================
  // VOLVER AL PERFIL
  // ==========================================================

  const volverAlPerfil = () => {
    router.replace('/perfil/perfil');
  };

  // ==========================================================
  // VOLVER AL LOGIN
  // ==========================================================

  const volverAlInicio = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F4F8F7"
      />

      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.encabezado}>
          <View style={estilos.logoContenedor}>
            <Text style={estilos.logo}>🐾</Text>
          </View>

          <Text style={estilos.nombreAplicacion}>
            PetCare
          </Text>

          <Text style={estilos.descripcion}>
            Clínica Veterinaria
          </Text>
        </View>

        <View style={estilos.tarjeta}>
          {estado === ESTADOS.verificando && (
            <>
              <ActivityIndicator
                size="large"
                color="#239B75"
              />

              <Text style={estilos.titulo}>
                Confirmando correo electrónico
              </Text>

              <Text style={estilos.texto}>
                Estamos verificando el enlace. Por favor, espera.
              </Text>
            </>
          )}

          {estado === ESTADOS.exito && (
            <>
              <View style={estilos.iconoExito}>
                <Text style={estilos.iconoExitoTexto}>✓</Text>
              </View>

              <Text style={estilos.titulo}>
                Confirmación procesada
              </Text>

              <Text style={estilos.texto}>
                {mensaje}
              </Text>

              {correoConfirmado !== '' && (
                <View style={estilos.correoContenedor}>
                  <Text style={estilos.correoEtiqueta}>
                    CORREO DE LA SESIÓN
                  </Text>

                  <Text style={estilos.correo}>
                    {correoConfirmado}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={estilos.botonPrincipal}
                onPress={volverAlPerfil}
                activeOpacity={0.8}
              >
                <Text style={estilos.textoBoton}>
                  Volver a mi perfil
                </Text>
              </TouchableOpacity>
            </>
          )}

          {estado === ESTADOS.error && (
            <>
              <View style={estilos.iconoError}>
                <Text style={estilos.iconoErrorTexto}>!</Text>
              </View>

              <Text style={estilos.titulo}>
                No se pudo confirmar el correo
              </Text>

              <View style={estilos.mensajeError}>
                <Text style={estilos.textoError}>
                  {mensaje || MENSAJE_ERROR}
                </Text>
              </View>

              <Text style={estilos.texto}>
                Regresa a PetCare e intenta solicitar nuevamente el cambio
                de correo si el enlace venció o ya fue utilizado.
              </Text>

              <TouchableOpacity
                style={estilos.botonPrincipal}
                onPress={volverAlInicio}
                activeOpacity={0.8}
              >
                <Text style={estilos.textoBoton}>
                  Ir al inicio de sesión
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// ESTILOS
// ============================================================

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
  logoContenedor: {
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
  descripcion: {
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
    paddingVertical: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  titulo: {
    width: '100%',
    fontSize: 23,
    fontWeight: '700',
    color: '#263238',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  texto: {
    width: '100%',
    fontSize: 14,
    lineHeight: 21,
    color: '#626E6A',
    textAlign: 'center',
    marginBottom: 18,
  },
  iconoExito: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#DDF4EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconoExitoTexto: {
    fontSize: 36,
    fontWeight: '800',
    color: '#239B75',
  },
  iconoError: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FDECEC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconoErrorTexto: {
    fontSize: 36,
    fontWeight: '800',
    color: '#B42318',
  },
  mensajeError: {
    width: '100%',
    padding: 13,
    backgroundColor: '#FDECEC',
    borderColor: '#E7A2A2',
    borderWidth: 1,
    borderRadius: 9,
    marginBottom: 18,
  },
  textoError: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B42318',
    textAlign: 'center',
  },
  correoContenedor: {
    width: '100%',
    backgroundColor: '#F1F8F5',
    borderRadius: 9,
    padding: 13,
    marginBottom: 20,
  },
  correoEtiqueta: {
    color: '#626E6A',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
    textAlign: 'center',
  },
  correo: {
    color: '#207A60',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  botonPrincipal: {
    width: '100%',
    minHeight: 50,
    backgroundColor: '#239B75',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 5,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
