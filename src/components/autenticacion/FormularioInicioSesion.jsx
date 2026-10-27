
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function FormularioInicioSesion({
  onIniciarSesion,
  cargando = false,
  mensaje = '',
  tipoMensaje = 'advertencia',
  onLimpiarMensaje,
  onRecuperarContrasena,
}) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const cambiarCorreo = (texto) => {
    setCorreo(texto);
    onLimpiarMensaje?.();
  };

  const cambiarContrasena = (texto) => {
    setContrasena(texto);
    onLimpiarMensaje?.();
  };

  const enviarFormulario = () => {
    if (cargando) return;

    onIniciarSesion(correo.trim(), contrasena);
  };

  const esExito = tipoMensaje === 'exito';
  const esError = tipoMensaje === 'error';

  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.titulo}>Bienvenido</Text>

      <Text style={estilos.subtitulo}>
        Inicia sesión para continuar
      </Text>

      {/* MENSAJE DE ESTADO */}
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
          <Text style={estilos.iconoMensaje}>
            {esExito ? '✓' : '⚠️'}
          </Text>

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

      {/* CORREO ELECTRÓNICO */}
      <Text style={estilos.etiqueta}>
        CORREO ELECTRÓNICO
      </Text>

      <TextInput
        style={[
          estilos.campo,
          mensaje !== '' &&
            !esExito &&
            estilos.campoConError,
        ]}
        value={correo}
        onChangeText={cambiarCorreo}
        placeholder="Ingrese su correo electrónico"
        placeholderTextColor="#999999"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!cargando && !esExito}
        returnKeyType="next"
      />

      {/* CONTRASEÑA */}
      <Text style={estilos.etiqueta}>CONTRASEÑA</Text>

      <View
        style={[
          estilos.contenedorContrasena,
          mensaje !== '' &&
            !esExito &&
            estilos.campoConError,
        ]}
      >
        <TextInput
          style={estilos.entradaContrasena}
          value={contrasena}
          onChangeText={cambiarContrasena}
          placeholder="Ingrese su contraseña"
          placeholderTextColor="#999999"
          secureTextEntry={!mostrarContrasena}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          editable={!cargando && !esExito}
          returnKeyType="done"
          onSubmitEditing={enviarFormulario}
        />

        <TouchableOpacity
          style={estilos.botonMostrar}
          onPress={() =>
            setMostrarContrasena(!mostrarContrasena)
          }
          disabled={cargando || esExito}
          accessibilityRole="button"
          accessibilityLabel={
            mostrarContrasena
              ? 'Ocultar contraseña'
              : 'Mostrar contraseña'
          }
        >
          <Text style={estilos.iconoOjo}>
            {mostrarContrasena ? '🙈' : '👁️'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* BOTÓN DE INICIO DE SESIÓN */}
      <TouchableOpacity
        style={[
          estilos.botonIniciar,
          (cargando || esExito) &&
            estilos.botonDeshabilitado,
        ]}
        onPress={enviarFormulario}
        disabled={cargando || esExito}
        activeOpacity={0.8}
      >
        {cargando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={estilos.textoBoton}>
            Iniciar sesión
          </Text>
        )}
      </TouchableOpacity>

      {/* RECUPERAR CONTRASEÑA */}
      <TouchableOpacity
        style={estilos.botonRecuperar}
        onPress={onRecuperarContrasena}
        disabled={cargando || esExito}
      >
        <Text style={estilos.textoRecuperar}>
          ¿Olvidaste tu contraseña?
        </Text>
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
    fontSize: 27,
    fontWeight: '700',
    color: '#263238',
    marginBottom: 6,
  },

  subtitulo: {
    fontSize: 15,
    color: '#737373',
    marginBottom: 25,
  },

  // CONTENEDOR COMÚN PARA TODOS LOS MENSAJES
  contenedorMensaje: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 22,
    borderWidth: 1,
  },

  // ADVERTENCIAS: CAMPOS VACÍOS O CORREO INVÁLIDO
  mensajeAdvertencia: {
    backgroundColor: '#FFF7E6',
    borderColor: '#E6B450',
  },

  textoAdvertencia: {
    color: '#855B10',
  },

  // ERRORES: CREDENCIALES INCORRECTAS O CONEXIÓN
  mensajeError: {
    backgroundColor: '#FDECEC',
    borderColor: '#E7A2A2',
  },

  textoError: {
    color: '#B42318',
  },

  // ÉXITO: INICIO DE SESIÓN CORRECTO
  mensajeExito: {
    backgroundColor: '#E8F7EC',
    borderColor: '#8CC99B',
  },

  textoExito: {
    color: '#21834A',
  },

  iconoMensaje: {
    fontSize: 17,
    marginRight: 9,
  },

  textoMensaje: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
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

  contenedorContrasena: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 49,
    borderWidth: 1,
    borderColor: '#D8DDE2',
    borderRadius: 9,
    marginBottom: 26,
    backgroundColor: '#FFFFFF',
  },

  entradaContrasena: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#263238',
  },

  botonMostrar: {
    height: '100%',
    paddingHorizontal: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconoOjo: {
    fontSize: 19,
  },

  botonIniciar: {
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

  botonRecuperar: {
    alignItems: 'center',
    marginTop: 23,
  },

  textoRecuperar: {
    fontSize: 14,
    color: '#287A62',
    fontWeight: '500',
  },
});
