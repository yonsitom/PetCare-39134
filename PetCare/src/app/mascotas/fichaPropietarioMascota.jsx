/*
 * Archivo: src/app/mascotas/fichaPropietarioMascota.jsx
 *
 * RESPONSABILIDAD:
 * - Mostrar los datos del propietario asociado a una mascota.
 * - Consultar la información directamente desde Supabase.
 * - Mantener la navegación dentro del módulo Mascotas.
 * - Mostrar estados de carga y mensajes de error.
 * - Presentar el botón de regreso alineado con el encabezado.
 * - Mostrar los datos principales del propietario en una tarjeta horizontal.
 *
 * ARQUITECTURA:
 * Vista -> Supabase.
 *
 * NOTA:
 * La consulta y la navegación se mantienen sin cambios funcionales.
 */

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
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
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

// ======================================================
// PALETA DE COLORES PETCARE
// ======================================================

const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#F5F8F8',
  blanco: '#FFFFFF',
  texto: '#243746',
  secundario: '#64748B',
  borde: '#DCE5E5',
  verdeFondo: '#E4F3F0',
  error: '#B42318',
  errorFondo: '#FEF3F2',
};

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

function mostrarDato(valor) {
  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ''
  ) {
    return 'No registrado';
  }

  return String(valor);
}

function obtenerNombreCompleto(propietario) {
  if (!propietario) {
    return 'Propietario';
  }

  return [
    propietario.nombre,
    propietario.apellido,
  ]
    .filter((parte) => Boolean(parte))
    .join(' ')
    .trim() || 'Propietario';
}

function obtenerInicial(propietario) {
  const nombre = obtenerNombreCompleto(propietario);

  return nombre.charAt(0).toUpperCase() || 'P';
}

// Campo reutilizable para presentar los datos.
function Campo({ etiqueta, valor }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>
        {etiqueta}
      </Text>

      <Text style={styles.valor}>
        {mostrarDato(valor)}
      </Text>
    </View>
  );
}

// ======================================================
// PANTALLA DEL MÓDULO MASCOTAS
// ======================================================

export default function FichaPropietarioMascotaScreen() {
  const parametros = useLocalSearchParams();

  const propietarioId = Array.isArray(parametros.propietarioId)
    ? parametros.propietarioId[0]
    : parametros.propietarioId;

  const numeroHistoria = Array.isArray(parametros.numeroHistoria)
    ? parametros.numeroHistoria[0]
    : parametros.numeroHistoria;

  // Datos del propietario.
  const [propietario, setPropietario] = useState(null);

  // Estados de carga y error.
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Estado del menú lateral.
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Datos del usuario autenticado.
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [rolUsuario, setRolUsuario] = useState('');

  // ====================================================
  // CARGAR PERFIL DEL USUARIO AUTENTICADO
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
            errorPerfil.message
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
  // CONSULTAR PROPIETARIO EN SUPABASE
  // ====================================================

  const cargarPropietario = useCallback(async () => {
    if (!propietarioId) {
      setPropietario(null);
      setError(
        'No se recibió el identificador del propietario.'
      );
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      const { data, error: errorConsulta } = await supabase
        .from('propietarios')
        .select(`
          propietario_id,
          nombre,
          apellido,
          documento_identidad,
          telefono,
          correo,
          direccion
        `)
        .eq('propietario_id', String(propietarioId))
        .maybeSingle();

      if (errorConsulta) {
        throw errorConsulta;
      }

      if (!data) {
        setPropietario(null);
        setError(
          'No se encontró el propietario solicitado.'
        );
        return;
      }

      setPropietario(data);
    } catch (err) {
      console.error(
        'Error al consultar propietario:',
        err
      );

      setPropietario(null);
      setError(
        'No se pudieron cargar los datos del propietario. Inténtalo nuevamente.'
      );
    } finally {
      setCargando(false);
    }
  }, [propietarioId]);

  // Actualiza los datos al entrar o regresar a la pantalla.
  useFocusEffect(
    useCallback(() => {
      cargarPropietario();
    }, [cargarPropietario])
  );

  // ====================================================
  // REGRESAR A LA FICHA DE LA MASCOTA
  // ====================================================

  function volverAMascota() {
    if (numeroHistoria) {
      router.replace({
        pathname: '/mascotas/fichaMascota',
        params: {
          numeroHistoria: String(numeroHistoria),
        },
      });

      return;
    }

    router.replace('/mascotas');
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
  // ENCABEZADO COMPARTIDO DE PETCARE
  // ====================================================

  function renderEncabezado() {
    return (
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
    );
  }

  // ====================================================
  // ESTADO DE CARGA
  // ====================================================

  if (cargando) {
    return (
      <SafeAreaView style={styles.pantalla}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={C.blanco}
        />

        {renderEncabezado()}

        <View style={styles.centrado}>
          <View style={styles.iconoCarga}>
            <ActivityIndicator
              size="large"
              color={C.primario}
            />
          </View>

          <Text style={styles.tituloEstado}>
            Cargando propietario
          </Text>

          <Text style={styles.textoEstado}>
            Estamos consultando su información.
          </Text>
        </View>

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

  // ====================================================
  // ESTADO DE ERROR
  // ====================================================

  if (error || !propietario) {
    return (
      <SafeAreaView style={styles.pantalla}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={C.blanco}
        />

        {renderEncabezado()}

        <View style={styles.centrado}>
          <View style={styles.iconoError}>
            <Text style={styles.signoError}>!</Text>
          </View>

          <Text style={styles.tituloEstado}>
            No se pudo mostrar el propietario
          </Text>

          <Text style={styles.textoError}>
            {error || 'No se encontró el propietario.'}
          </Text>

          <TouchableOpacity
            style={styles.botonPrimario}
            onPress={cargarPropietario}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.textoBotonPrimario}>
              Reintentar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonSecundario}
            onPress={volverAMascota}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.textoBotonSecundario}>
              Volver a la mascota
            </Text>
          </TouchableOpacity>
        </View>

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

  // ====================================================
  // INTERFAZ PRINCIPAL
  // ====================================================

  return (
    <SafeAreaView style={styles.pantalla}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.blanco}
      />

      {renderEncabezado()}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado ordenado con botón de regreso. */}
        <View style={styles.encabezadoPagina}>
          <TouchableOpacity
            style={styles.botonVolver}
            onPress={volverAMascota}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Volver a la ficha de la mascota"
          >
            <Text style={styles.flecha}>‹</Text>
          </TouchableOpacity>

          <View style={styles.textosEncabezado}>
            <Text style={styles.migas}>
              Inicio / Mascotas / Propietario
            </Text>

            <Text style={styles.titulo}>
              Datos del propietario
            </Text>

            <Text style={styles.subtitulo}>
              Información de contacto asociada a la mascota.
            </Text>
          </View>
        </View>

        {/* Tarjeta horizontal de identificación del propietario. */}
        <View style={styles.tarjetaPrincipal}>
          <View style={styles.avatar}>
            <Text style={styles.textoAvatar}>
              {obtenerInicial(propietario)}
            </Text>
          </View>

          <View style={styles.informacionPrincipal}>
            <Text style={styles.nombre}>
              {obtenerNombreCompleto(propietario)}
            </Text>

            <Text style={styles.documento}>
              DNI: {mostrarDato(propietario.documento_identidad)}
            </Text>

            <View style={styles.etiquetaRegistrado}>
              <Text style={styles.textoRegistrado}>
                Propietario registrado
              </Text>
            </View>
          </View>
        </View>

        {/* Información personal y de contacto. */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>
            INFORMACIÓN DE CONTACTO
          </Text>

          <View style={styles.tarjeta}>
            <Campo
              etiqueta="Nombres"
              valor={propietario.nombre}
            />

            <Campo
              etiqueta="Apellidos"
              valor={propietario.apellido}
            />

            <Campo
              etiqueta="Documento de identidad"
              valor={propietario.documento_identidad}
            />

            <Campo
              etiqueta="Teléfono"
              valor={propietario.telefono}
            />

            <Campo
              etiqueta="Correo electrónico"
              valor={propietario.correo}
            />

            <Campo
              etiqueta="Dirección"
              valor={propietario.direccion}
            />
          </View>
        </View>

        <Text style={styles.pie}>
          Información consultada desde el registro del propietario.
        </Text>

        <View style={styles.espacioFinal} />
      </ScrollView>

      {/* Menú lateral compartido de PetCare. */}
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
// ESTILOS DE LA PANTALLA
// ======================================================

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  scroll: {
    flex: 1,
  },

  contenido: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
  },

  // ----------------------------------------------------
  // ENCABEZADO Y BOTÓN DE REGRESO
  // ----------------------------------------------------

  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    gap: 12,
  },

  botonVolver: {
    width: 42,
    height: 42,
    flexShrink: 0,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  flecha: {
    color: C.primario,
    fontSize: 32,
    lineHeight: 36,
    marginTop: -3,
  },

  textosEncabezado: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },

  migas: {
    color: C.secundario,
    fontSize: 11,
    marginBottom: 5,
  },

  titulo: {
    color: C.texto,
    fontSize: 22,
    fontWeight: '800',
  },

  subtitulo: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  // ----------------------------------------------------
  // TARJETA PRINCIPAL DEL PROPIETARIO
  // ----------------------------------------------------

  tarjetaPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 16,
    padding: 17,
    marginBottom: 24,
    gap: 15,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },

  avatar: {
    width: 58,
    height: 58,
    flexShrink: 0,
    borderRadius: 17,
    backgroundColor: C.verdeFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoAvatar: {
    color: C.primario,
    fontSize: 25,
    fontWeight: '800',
  },

  informacionPrincipal: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  nombre: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'left',
  },

  documento: {
    color: C.secundario,
    fontSize: 13,
    marginTop: 5,
    textAlign: 'left',
  },

  etiquetaRegistrado: {
    backgroundColor: C.verdeFondo,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 9,
    alignSelf: 'flex-start',
  },

  textoRegistrado: {
    color: C.primarioOscuro,
    fontSize: 11,
    fontWeight: '700',
  },

  // ----------------------------------------------------
  // INFORMACIÓN DE CONTACTO
  // ----------------------------------------------------

  seccion: {
    marginBottom: 22,
  },

  tituloSeccion: {
    color: C.secundario,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  tarjeta: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },

  campo: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F1',
  },

  etiqueta: {
    color: C.secundario,
    fontSize: 12,
    marginBottom: 5,
  },

  valor: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },

  // ----------------------------------------------------
  // PIE DE PÁGINA
  // ----------------------------------------------------

  pie: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 17,
  },

  espacioFinal: {
    height: 28,
  },

  // ----------------------------------------------------
  // ESTADOS DE CARGA Y ERROR
  // ----------------------------------------------------

  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
    gap: 12,
  },

  iconoCarga: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: C.verdeFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tituloEstado: {
    color: C.texto,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },

  textoEstado: {
    color: C.secundario,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  iconoError: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.errorFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },

  signoError: {
    color: C.error,
    fontSize: 27,
    fontWeight: '800',
  },

  textoError: {
    color: C.error,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  botonPrimario: {
    backgroundColor: C.primario,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },

  textoBotonPrimario: {
    color: C.blanco,
    fontWeight: '800',
  },

  botonSecundario: {
    padding: 10,
  },

  textoBotonSecundario: {
    color: C.primario,
    fontWeight: '700',
  },
});