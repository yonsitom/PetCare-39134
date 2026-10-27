
/**
 * RF03 - Pantalla para establecer una contraseña nueva.
 * Procesa enlaces de recuperación compatibles con Supabase Auth.
 */

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import {
  actualizarContrasenaRecuperada,
} from '../services/recuperacionContrasenaServicio';
import { supabase } from '../services/supabase';

// Extraer parámetros tanto de la consulta como del fragmento del enlace.
function obtenerParametrosEnlace(url) {
  // ARRANGE: separar la consulta y el fragmento de la URL.
  const partes = String(url || '').split('#');
  const urlAntesDelFragmento = partes[0] || '';
  const fragmento = partes.slice(1).join('#');

  const consulta = urlAntesDelFragmento.includes('?')
    ? urlAntesDelFragmento.split('?').slice(1).join('?')
    : '';

  // ACT: convertir parámetros URL en un objeto sencillo.
  const parametros = {};

  const leerParametros = (texto) => {
    texto.split('&').forEach((elemento) => {
      if (!elemento) return;

      const [clave, ...resto] = elemento.split('=');

      try {
        parametros[decodeURIComponent(clave)] = decodeURIComponent(
          resto.join('=').replace(/\+/g, ' ')
        );
      } catch (error) {
        // Ignorar parámetros mal codificados.
      }
    });
  };

  leerParametros(consulta);
  leerParametros(fragmento);

  // ASSERT: devolver los parámetros encontrados.
  return parametros;
}

export default function PantallaRestablecerContrasena() {
  // ARRANGE: estados de la pantalla.
  const [cargandoEnlace, setCargandoEnlace] = useState(true);
  const [enlaceValido, setEnlaceValido] = useState(false);
  const [cargandoCambio, setCargandoCambio] = useState(false);
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('advertencia');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  // Evitar procesar dos veces el mismo enlace.
  const enlacesProcesados = useRef(new Set());

  const mostrarMensaje = (texto, tipo = 'advertencia') => {
    setMensaje(texto);
    setTipoMensaje(tipo);
  };

  // RF03: convertir el enlace recibido en una sesión válida.
useEffect(() => {
  let componenteActivo = true;

  const procesarEnlace = async (url) => {
    if (!url || enlacesProcesados.current.has(url)) return;
    enlacesProcesados.current.add(url);

    try {
      const parametros = obtenerParametrosEnlace(url);

      if (parametros.code) {
        const { error } =
          await supabase.auth.exchangeCodeForSession(parametros.code);
        if (error) throw error;
      } else if (parametros.token_hash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: parametros.token_hash,
          type: 'recovery',
        });
        if (error) throw error;
      } else if (parametros.access_token && parametros.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: parametros.access_token,
          refresh_token: parametros.refresh_token,
        });
        if (error) throw error;
      } else {
        throw new Error('El enlace no contiene datos de recuperación.');
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        throw new Error('No existe una sesión de recuperación válida.');
      }

      if (componenteActivo) {
        setEnlaceValido(true);
        mostrarMensaje(
          'Enlace verificado. Puedes establecer tu contraseña nueva.',
          'exito'
        );
      }
    } catch (error) {
      console.error('RF03 - Error al validar enlace:', error?.message || error);

      if (componenteActivo) {
        setEnlaceValido(false);
        mostrarMensaje(
          'No se pudo validar el enlace. Solicita uno nuevo.',
          'error'
        );
      }
    } finally {
      if (componenteActivo) setCargandoEnlace(false);
    }
  };

  Linking.getInitialURL().then((url) => {
    if (url) {
      procesarEnlace(url);
    } else {
      supabase.auth.getSession().then(({ data, error }) => {
        if (!componenteActivo) return;

        if (!error && data.session) {
          setEnlaceValido(true);
          mostrarMensaje(
            'Sesión disponible. Puedes establecer tu contraseña nueva.',
            'exito'
          );
        } else {
          setEnlaceValido(false);
          mostrarMensaje(
            'Abre el enlace de recuperación que recibiste en tu correo.',
            'advertencia'
          );
        }

        setCargandoEnlace(false);
      });
    }
  });

  const suscripcion = Linking.addEventListener('url', ({ url }) => {
    procesarEnlace(url);
  });

  return () => {
    componenteActivo = false;
    suscripcion.remove();
  };
}, []);

  // RF03: guardar la contraseña nueva.
  const guardarContrasena = async () => {
    // ASSERT: validar que se hayan ingresado ambos campos.
    if (!nuevaContrasena || !confirmacion) {
      mostrarMensaje(
        'Ingrese y confirme la nueva contraseña.',
        'advertencia'
      );
      return;
    }

    // ASSERT: exigir que ambos campos coincidan.
    if (nuevaContrasena !== confirmacion) {
      mostrarMensaje(
        'Las contraseñas no coinciden.',
        'advertencia'
      );
      return;
    }

    // ARRANGE: iniciar la actualización.
    setCargandoCambio(true);
    mostrarMensaje('', 'advertencia');

    try {
      // ACT: actualizar la contraseña mediante Supabase Auth.
      const resultado =
        await actualizarContrasenaRecuperada(nuevaContrasena);

      // ASSERT: mostrar el resultado del servicio.
      mostrarMensaje(
        resultado.mensaje,
        resultado.exito ? 'exito' : 'error'
      );

      if (resultado.exito) {
        setEnlaceValido(false);
        setNuevaContrasena('');
        setConfirmacion('');

        // Cerrar la sesión de recuperación después del cambio.
        await supabase.auth.signOut({ scope: 'local' });

        setTimeout(() => {
          router.replace('/');
        }, 1800);
      }
    } catch (error) {
      mostrarMensaje(
        'No se pudo actualizar la contraseña. Intente nuevamente.',
        'error'
      );
    } finally {
      setCargandoCambio(false);
    }
  };

  const esExito = tipoMensaje === 'exito';
  const esError = tipoMensaje === 'error';

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
          <View style={estilos.contenedorLogo}>
            <Text style={estilos.logo}>🐾</Text>
          </View>
          <Text style={estilos.nombreAplicacion}>PetCare</Text>
          <Text style={estilos.descripcionAplicacion}>
            Clínica Veterinaria
          </Text>
        </View>

        <View style={estilos.tarjeta}>
          <Text style={estilos.titulo}>Crear nueva contraseña</Text>

          <Text style={estilos.subtitulo}>
            La contraseña debe tener al menos 8 caracteres, una mayúscula,
            una minúscula y un número.
          </Text>

          {cargandoEnlace && (
            <View style={estilos.cargando}>
              <ActivityIndicator color="#239B75" size="large" />
              <Text style={estilos.textoCargando}>
                Verificando enlace...
              </Text>
            </View>
          )}

          {mensaje !== '' && (
            <View
              style={[
                estilos.contenedorMensaje,
                esExito
                  ? estilos.mensajeExito
                  : esError
                    ? estilos.mensajeError
                    : estilos.mensajeAdvertencia,
              ]}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <Text
                style={[
                  estilos.textoMensaje,
                  esExito
                    ? estilos.textoExito
                    : esError
                      ? estilos.textoError
                      : estilos.textoAdvertencia,
                ]}
              >
                {mensaje}
              </Text>
            </View>
          )}

          {enlaceValido && (
            <>
              <Text style={estilos.etiqueta}>NUEVA CONTRASEÑA</Text>

              <View style={estilos.contenedorContrasena}>
                <TextInput
                  style={estilos.campoContrasena}
                  value={nuevaContrasena}
                  onChangeText={setNuevaContrasena}
                  placeholder="Ingrese la contraseña nueva"
                  placeholderTextColor="#999999"
                  secureTextEntry={!mostrarContrasena}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!cargandoCambio}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  accessibilityLabel="Nueva contraseña"
                />
              </View>

              <Text style={estilos.etiqueta}>
                CONFIRMAR CONTRASEÑA
              </Text>

              <View style={estilos.contenedorContrasena}>
                <TextInput
                  style={estilos.campoContrasena}
                  value={confirmacion}
                  onChangeText={setConfirmacion}
                  placeholder="Repita la contraseña nueva"
                  placeholderTextColor="#999999"
                  secureTextEntry={!mostrarContrasena}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!cargandoCambio}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  onSubmitEditing={guardarContrasena}
                  accessibilityLabel="Confirmar contraseña"
                />
              </View>

              <TouchableOpacity
                style={estilos.botonMostrar}
                onPress={() => setMostrarContrasena(!mostrarContrasena)}
                disabled={cargandoCambio}
              >
                <Text style={estilos.textoMostrar}>
                  {mostrarContrasena
                    ? 'Ocultar contraseñas'
                    : 'Mostrar contraseñas'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  estilos.botonGuardar,
                  cargandoCambio && estilos.botonDeshabilitado,
                ]}
                onPress={guardarContrasena}
                disabled={cargandoCambio}
                activeOpacity={0.8}
              >
                {cargandoCambio ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBoton}>
                    Guardar nueva contraseña
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {!enlaceValido && !cargandoEnlace && (
            <TouchableOpacity
              style={estilos.botonVolver}
              onPress={() => router.replace('/recuperarContrasena')}
            >
              <Text style={estilos.textoVolver}>
                Solicitar un nuevo enlace
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={estilos.botonVolver}
            onPress={() => router.replace('/')}
            disabled={cargandoCambio}
          >
            <Text style={estilos.textoVolver}>
              Volver al inicio de sesión
            </Text>
          </TouchableOpacity>
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
    marginBottom: 10,
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
  mensajeAdvertencia: {
    backgroundColor: '#FFF7E6',
    borderColor: '#E6B450',
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
  textoAdvertencia: {
    color: '#855B10',
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
  botonGuardar: {
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
