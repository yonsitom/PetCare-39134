
/**
 * RF03 - Pantalla para solicitar el enlace de recuperación.
 * Expo Router utiliza esta ruta para abrir la pantalla desde el login.
 */

import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import FormularioRecuperarContrasena from '../components/autenticacion/formularioRecuperarContrasena';
import { enviarEnlaceRecuperacion } from '../services/recuperacionContrasenaServicio';

export default function PantallaRecuperarContrasena() {
  // ARRANGE: estados de carga y mensajes del formulario.
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('advertencia');

  const mostrarMensaje = (texto, tipo = 'advertencia') => {
    setMensaje(texto);
    setTipoMensaje(tipo);
  };

  const limpiarMensaje = () => {
    setMensaje('');
    setTipoMensaje('advertencia');
  };

  // RF03: solicitar el enlace mediante Supabase Auth.
  const enviarEnlace = async (correo, errorValidacion) => {
    // ASSERT: mostrar errores de validación sin llamar a Supabase.
    if (errorValidacion) {
      mostrarMensaje(errorValidacion, 'advertencia');
      return;
    }

    if (!correo || cargando) {
      return;
    }

    // ARRANGE: iniciar el envío.
    setCargando(true);
    limpiarMensaje();

    try {
      // ACT: solicitar el enlace de recuperación.
      const resultado = await enviarEnlaceRecuperacion(correo);

      // ASSERT: mostrar el resultado del servicio.
      mostrarMensaje(
        resultado.mensaje,
        resultado.exito ? 'exito' : 'error'
      );
    } catch (error) {
      // ASSERT: manejar errores inesperados de forma controlada.
      mostrarMensaje(
        'No se pudo enviar el enlace de recuperación. Intente nuevamente más tarde.',
        'error'
      );
    } finally {
      setCargando(false);
    }
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
          <View style={estilos.contenedorLogo}>
            <Text style={estilos.logo}>🐾</Text>
          </View>

          <Text style={estilos.nombreAplicacion}>PetCare</Text>
          <Text style={estilos.descripcionAplicacion}>
            Clínica Veterinaria
          </Text>
        </View>

        <FormularioRecuperarContrasena
          onEnviarEnlace={enviarEnlace}
          cargando={cargando}
          mensaje={mensaje}
          tipoMensaje={tipoMensaje}
          onLimpiarMensaje={limpiarMensaje}
          onVolver={() => router.replace('/')}
        />

        <Text style={estilos.piePagina}>
          © PetCare - Clínica Veterinaria
        </Text>
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
  piePagina: {
    marginTop: 26,
    fontSize: 12,
    color: '#858D89',
    textAlign: 'center',
  },
});
