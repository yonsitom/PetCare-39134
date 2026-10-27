
/**
 * RF03 - Formulario para solicitar la recuperación de contraseña.
 * La pantalla recibe la función que envía el enlace y muestra su resultado.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { correoTieneFormatoValido } from '../../services/recuperacionContrasenaServicio';

export default function FormularioRecuperarContrasena({
  onEnviarEnlace,
  cargando = false,
  mensaje = '',
  tipoMensaje = 'advertencia',
  onLimpiarMensaje,
  onVolver,
}) {
  // ARRANGE: mantener el correo introducido por el usuario.
  const [correo, setCorreo] = useState('');

  const esExito = tipoMensaje === 'exito';
  const esError = tipoMensaje === 'error';

  // ACT: validar y enviar el formulario.
  const enviarFormulario = () => {
    if (cargando) return;

    const correoNormalizado = correo.trim().toLowerCase();

    if (!correoNormalizado) {
      onEnviarEnlace(null, 'Ingrese su correo electrónico.');
      return;
    }

    if (!correoTieneFormatoValido(correoNormalizado)) {
      onEnviarEnlace(null, 'Ingrese un correo electrónico válido.');
      return;
    }

    onEnviarEnlace(correoNormalizado);
  };

  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.titulo}>Recuperar contraseña</Text>

      <Text style={estilos.subtitulo}>
        Ingresa el correo asociado a tu cuenta. Te enviaremos un enlace
        para que puedas crear una contraseña nueva.
      </Text>

      {/* RF03: mostrar el resultado de la operación. */}
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

      {/* RF03: campo de correo electrónico. */}
      <Text style={estilos.etiqueta}>CORREO ELECTRÓNICO</Text>

      <TextInput
        style={[
          estilos.campo,
          mensaje !== '' && !esExito && estilos.campoConError,
        ]}
        value={correo}
        onChangeText={(texto) => {
          setCorreo(texto);
          onLimpiarMensaje?.();
        }}
        placeholder="Ingrese su correo electrónico"
        placeholderTextColor="#999999"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!cargando && !esExito}
        returnKeyType="done"
        onSubmitEditing={enviarFormulario}
        accessibilityLabel="Correo electrónico"
      />

      {/* RF03: solicitar el enlace. */}
      <TouchableOpacity
        style={[
          estilos.botonEnviar,
          (cargando || esExito) && estilos.botonDeshabilitado,
        ]}
        onPress={enviarFormulario}
        disabled={cargando || esExito}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {cargando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={estilos.textoBoton}>Enviar enlace</Text>
        )}
      </TouchableOpacity>

      {/* RF03: regresar al inicio de sesión. */}
      <TouchableOpacity
        style={estilos.botonVolver}
        onPress={onVolver}
        disabled={cargando}
        accessibilityRole="button"
      >
        <Text style={estilos.textoVolver}>Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
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
    fontSize: 26,
    fontWeight: '700',
    color: '#263238',
    marginBottom: 10,
  },
  subtitulo: {
    fontSize: 14,
    lineHeight: 21,
    color: '#737373',
    marginBottom: 24,
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
  },
  campo: {
    height: 49,
    borderWidth: 1,
    borderColor: '#D8DDE2',
    borderRadius: 9,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#263238',
    backgroundColor: '#FFFFFF',
    marginBottom: 22,
  },
  campoConError: {
    borderColor: '#D99A2B',
  },
  botonEnviar: {
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
    fontSize: 16,
    fontWeight: '700',
  },
  botonVolver: {
    alignItems: 'center',
    marginTop: 23,
  },
  textoVolver: {
    fontSize: 14,
    color: '#287A62',
    fontWeight: '600',
  },
});
