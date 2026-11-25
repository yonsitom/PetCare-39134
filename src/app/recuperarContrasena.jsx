
import { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import {
  correoTieneFormatoValido,
  enviarEnlaceRecuperacion,
} from '../services/persistencia/recuperacionContrasenaServicio';

export default function RecuperarContrasena() {
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);

  const solicitarRecuperacion = async () => {
    if (cargando) return;

    const correoNormalizado = correo.trim().toLowerCase();

    if (!correoNormalizado) {
      setTipoMensaje('error');
      setMensaje('Ingrese su correo electrónico.');
      return;
    }

    if (!correoTieneFormatoValido(correoNormalizado)) {
      setTipoMensaje('error');
      setMensaje('Ingrese un correo electrónico válido.');
      return;
    }

    setCargando(true);
    setMensaje('');

    try {
      const resultado = await enviarEnlaceRecuperacion(
        correoNormalizado
      );

      setTipoMensaje(resultado.exito ? 'exito' : 'error');
      setMensaje(resultado.mensaje);

      if (resultado.exito) {
        setSolicitudEnviada(true);
      }
    } catch (error) {
      setTipoMensaje('error');
      setMensaje(
        'No se pudo procesar la solicitud. Inténtelo nuevamente.'
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <View style={estilos.contenedor}>
        <View style={estilos.tarjeta}>
          <Text style={estilos.icono}>🔐</Text>

          <Text style={estilos.titulo}>
            Recuperar contraseña
          </Text>

          <Text style={estilos.descripcion}>
            Ingrese el correo electrónico asociado a su cuenta.
            Le enviaremos un enlace para restablecer su contraseña.
          </Text>

          <Text style={estilos.etiqueta}>
            CORREO ELECTRÓNICO
          </Text>

          <TextInput
            style={estilos.campo}
            value={correo}
            onChangeText={(texto) => {
              setCorreo(texto);
              setMensaje('');
              setSolicitudEnviada(false);
            }}
            placeholder="Ingrese su correo electrónico"
            placeholderTextColor="#999999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!cargando && !solicitudEnviada}
          />

          {mensaje !== '' && (
            <View
              style={[
                estilos.mensajeContenedor,
                tipoMensaje === 'exito'
                  ? estilos.mensajeExito
                  : estilos.mensajeError,
              ]}
            >
              <Text
                style={[
                  estilos.mensajeTexto,
                  tipoMensaje === 'exito'
                    ? estilos.textoExito
                    : estilos.textoError,
                ]}
              >
                {mensaje}
              </Text>
            </View>
          )}

          {!solicitudEnviada && (
            <TouchableOpacity
              style={[
                estilos.boton,
                cargando && estilos.botonDeshabilitado,
              ]}
              onPress={solicitarRecuperacion}
              disabled={cargando}
              activeOpacity={0.8}
            >
              {cargando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={estilos.textoBoton}>
                  Enviar enlace de recuperación
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={estilos.botonVolver}
            onPress={() => router.replace('/')}
            disabled={cargando}
          >
            <Text style={estilos.textoVolver}>
              Volver al inicio de sesión
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#F4F8F7',
  },
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 26,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  icono: {
    fontSize: 38,
    textAlign: 'center',
    marginBottom: 14,
  },
  titulo: {
    fontSize: 25,
    fontWeight: '700',
    color: '#263238',
    textAlign: 'center',
    marginBottom: 12,
  },
  descripcion: {
    fontSize: 14,
    lineHeight: 21,
    color: '#626E6A',
    textAlign: 'center',
    marginBottom: 27,
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: '#424242',
    marginBottom: 9,
  },
  campo: {
    height: 49,
    borderWidth: 1,
    borderColor: '#D8DDE2',
    borderRadius: 9,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#263238',
    marginBottom: 18,
  },
  mensajeContenedor: {
    borderRadius: 9,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
  },
  mensajeExito: {
    backgroundColor: '#E8F7EC',
    borderColor: '#8CC99B',
  },
  mensajeError: {
    backgroundColor: '#FDECEC',
    borderColor: '#E7A2A2',
  },
  mensajeTexto: {
    fontSize: 13,
    lineHeight: 19,
  },
  textoExito: {
    color: '#21834A',
  },
  textoError: {
    color: '#B42318',
  },
  boton: {
    height: 50,
    backgroundColor: '#239B75',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 22,
  },
  textoVolver: {
    color: '#287A62',
    fontSize: 14,
    fontWeight: '600',
  },
});
