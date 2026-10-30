
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import FormularioInicioSesion from '../components/autenticacion/FormularioInicioSesion';
import { crearControladorInicioSesion } from '../services/iniciarSesionControlador';
import { iniciarSesionConCorreo } from '../services/autenticacionServicio';
import { verificarCuentaActiva } from '../services/perfilServicio';
import { verificarSesionPersistida } from '../services/sesionPersistenciaServicio';
import { supabase } from '../services/supabase';

const COLORES = {
  fondo: '#F4F8F7',
  verde: '#239B75',
  texto: '#263238',
  secundario: '#626E6A',
};

export default function PantallaInicioSesion() {
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('advertencia');
  const [inicioExitoso, setInicioExitoso] = useState(false);
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  const componenteActivo = useRef(false);
  const procesando = useRef(false);
  const temporizadorRedireccion = useRef(null);
  const controladorRef = useRef(null);

  // RF01: crear una sola instancia del controlador por montaje.
  if (!controladorRef.current) {
    controladorRef.current = crearControladorInicioSesion({
      autenticar: iniciarSesionConCorreo,
      verificarCuentaActiva,
      cerrarSesion: async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }
      },
      limiteIntentos: 5,
    });
  }

  // RF04: validar la sesión persistida y el estado de la cuenta.
  useEffect(() => {
    componenteActivo.current = true;
    let cancelado = false;

    const comprobarSesionGuardada = async () => {
      try {
        const resultado = await verificarSesionPersistida({
          auth: supabase.auth,
          verificarCuentaActiva,
        });

        if (cancelado || !componenteActivo.current) return;

        if (resultado?.autorizada) {
          router.replace('/inicio');
        }
      } catch (error) {
        console.error(
          'RF04 - Error al comprobar la sesión:',
          error?.message || error
        );
      } finally {
        if (!cancelado && componenteActivo.current) {
          setVerificandoSesion(false);
        }
      }
    };

    comprobarSesionGuardada();

    return () => {
      cancelado = true;
      componenteActivo.current = false;

      if (temporizadorRedireccion.current) {
        clearTimeout(temporizadorRedireccion.current);
        temporizadorRedireccion.current = null;
      }
    };
  }, []);

  // Muestra el mensaje devuelto por el controlador.
  const mostrarMensaje = useCallback((texto, tipo = 'advertencia') => {
    if (!componenteActivo.current) return;

    setMensaje(texto || '');
    setTipoMensaje(tipo || 'advertencia');
  }, []);

  // RF01: limpia el mensaje cuando el usuario modifica los campos.
  const limpiarMensaje = useCallback(() => {
    if (inicioExitoso) return;

    setMensaje('');
    setTipoMensaje('advertencia');
  }, [inicioExitoso]);

  // RF01: delegar la autenticación y las reglas al controlador.
  const iniciarSesion = async (correo, contrasena) => {
    if (procesando.current || inicioExitoso) return;

    procesando.current = true;
    setCargando(true);
    limpiarMensaje();

    try {
      const resultado = await controladorRef.current.iniciarSesion(
        correo,
        contrasena
      );

      if (!componenteActivo.current) return;

      mostrarMensaje(resultado?.mensaje, resultado?.tipoMensaje);

      if (!resultado?.autenticado || !resultado?.redirigir) {
        return;
      }

      setInicioExitoso(true);

      // Mantiene visible el mensaje de éxito antes de navegar.
      temporizadorRedireccion.current = setTimeout(() => {
        if (componenteActivo.current) {
          router.replace('/inicio');
        }
      }, 1500);
    } catch (error) {
      console.error('RF01 - Error al iniciar sesión:', error);

      mostrarMensaje(
        'No se pudo iniciar sesión. Inténtelo nuevamente.',
        'error'
      );
    } finally {
      procesando.current = false;

      if (componenteActivo.current) {
        setCargando(false);
      }
    }
  };

  // RF03: abrir la pantalla existente de recuperación.
  const recuperarContrasena = () => {
    if (cargando || inicioExitoso) return;

    limpiarMensaje();
    router.push('/recuperarContrasena');
  };

  if (verificandoSesion) {
    return (
      <SafeAreaView style={estilos.pantalla}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORES.fondo}
        />

        <View style={estilos.cargandoSesion}>
          <ActivityIndicator size="large" color={COLORES.verde} />

          <Text style={estilos.textoCargando}>
            Verificando acceso a PetCare...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORES.fondo}
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

        <FormularioInicioSesion
          onIniciarSesion={iniciarSesion}
          cargando={cargando}
          mensaje={mensaje}
          tipoMensaje={tipoMensaje}
          onLimpiarMensaje={limpiarMensaje}
          onRecuperarContrasena={recuperarContrasena}
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
    backgroundColor: COLORES.fondo,
  },

  contenido: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },

  cargandoSesion: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textoCargando: {
    marginTop: 12,
    fontSize: 14,
    color: COLORES.secundario,
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
    color: COLORES.verde,
  },

  descripcionAplicacion: {
    fontSize: 14,
    color: COLORES.secundario,
    marginTop: 3,
  },

  piePagina: {
    marginTop: 26,
    fontSize: 12,
    color: '#858D89',
    textAlign: 'center',
  },
});
