
// src/app/mascotas/fichaMascota.jsx
// RF20: Consultar historial de atención de una mascota.

import React, { useCallback, useEffect, useState } from 'react';
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
import { consultarMascotaPorId } from '../../dao/mascotaDAO';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import { logger } from '../../utils/logger';

// Colores compartidos con las demás pantallas de PetCare.
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

// Muestra un texto alternativo cuando el dato está vacío.
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

// Obtiene el nombre completo del propietario asociado a la mascota.
function obtenerNombrePropietario(mascota) {
  const p = mascota?.propietarios;

  if (!p) return 'No registrado';

  return [p.nombre, p.apellido]
    .filter(Boolean)
    .join(' ')
    .trim() || 'No registrado';
}

// Calcula la edad a partir de la fecha de nacimiento.
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return 'No registrada';

  const fecha = new Date(`${fechaNacimiento}T00:00:00`);

  if (Number.isNaN(fecha.getTime())) return 'No registrada';

  const hoy = new Date();

  if (fecha > hoy) return 'Fecha por verificar';

  let anios = hoy.getFullYear() - fecha.getFullYear();
  let meses = hoy.getMonth() - fecha.getMonth();

  if (hoy.getDate() < fecha.getDate()) meses -= 1;

  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }

  if (anios > 0) {
    return `${anios} ${anios === 1 ? 'año' : 'años'}`;
  }

  if (meses > 0) {
    return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  }

  const dias = Math.max(
    0,
    Math.floor((hoy.getTime() - fecha.getTime()) / 86400000)
  );

  return `${dias} ${dias === 1 ? 'día' : 'días'}`;
}

// Presenta las fechas en formato legible para el usuario.
function formatearFecha(fecha) {
  if (!fecha) return 'No registrada';

  const valor = new Date(
    `${String(fecha).slice(0, 10)}T00:00:00`
  );

  if (Number.isNaN(valor.getTime())) return String(fecha);

  return valor.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// Componente reutilizable para mostrar un dato de la ficha.
function Campo({ etiqueta, valor }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.valor}>{mostrarDato(valor)}</Text>
    </View>
  );
}

// Sección reutilizable con título y tarjeta de contenido.
function Seccion({ titulo, children }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>{titulo}</Text>
      <View style={styles.tarjeta}>{children}</View>
    </View>
  );
}

export default function FichaMascotaScreen() {
  // Parámetros recibidos al abrir la ficha de una mascota.
  const { numeroHistoria, exito } = useLocalSearchParams();

  // Estados de la ficha.
  const [mascota, setMascota] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Estados del menú lateral compartido.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [rolUsuario, setRolUsuario] = useState('');

  // Consulta los datos del usuario para el menú lateral.
  useEffect(() => {
    let activo = true;

    async function cargarPerfil() {
      try {
        const {
          data: { user },
          error: errorUsuario,
        } = await supabase.auth.getUser();

        if (errorUsuario || !user) return;

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

        if (activo && data) {
          setNombreUsuario(data.nombre_completo || 'Usuario');
          setRolUsuario(data.rol || '');
        }
      } catch (e) {
        logger.error('Error al cargar el perfil:', e);
      }
    }

    cargarPerfil();

    return () => {
      activo = false;
    };
  }, []);

  // Consulta la ficha mediante el DAO existente.
  const cargarFicha = useCallback(async () => {
    const historia = Array.isArray(numeroHistoria)
      ? numeroHistoria[0]
      : numeroHistoria;

    if (!historia) {
      setError('No se recibió el número de historia clínica.');
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      const resultado = await consultarMascotaPorId(String(historia));

      if (!resultado) {
        setMascota(null);
        setError('No se encontró la ficha de esta mascota.');
      } else {
        setMascota(resultado);
      }
    } catch (e) {
      logger.error('Error al cargar ficha de mascota:', e);
      setError('No se pudo cargar la ficha. Inténtalo nuevamente.');
    } finally {
      setCargando(false);
    }
  }, [numeroHistoria]);

  // Actualiza la ficha cuando se vuelve a esta pantalla.
  useFocusEffect(
    useCallback(() => {
      cargarFicha();
    }, [cargarFicha])
  );

  // Abre el formulario de edición de la mascota actual.
  const abrirEdicion = () => {
    if (!mascota?.numero_historia) return;

    router.push({
      pathname: '/mascotas/editarMascota',
      params: {
        numeroHistoria: String(mascota.numero_historia),
      },
    });
  };

  // Obtiene los datos del propietario y el estado de la mascota.
  const nombrePropietario = obtenerNombrePropietario(mascota);
  const estado = String(mascota?.estado || 'Activo');
  const inactiva = estado.toLowerCase() === 'inactivo';

  // Regresa a la pantalla anterior o abre la lista de mascotas.
  const volver = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/mascotas');
    }
  };

  // Cierra la sesión del usuario desde el menú lateral.
  async function cerrarSesion() {
    try {
      const { error: errorSesion } = await supabase.auth.signOut();

      if (errorSesion) {
        Alert.alert(
          'No se pudo cerrar la sesión',
          'Inténtalo nuevamente.'
        );
        return;
      }

      setMenuAbierto(false);
      router.replace('/');
    } catch (e) {
      logger.error('Error al cerrar sesión:', e);

      Alert.alert(
        'Error',
        'No se pudo cerrar la sesión. Inténtalo nuevamente.'
      );
    }
  }

  // Abre la ficha del propietario asociado a la mascota.
  const abrirPropietario = () => {
    if (!mascota?.propietario_id) {
      Alert.alert(
        'Propietario no disponible',
        'Esta mascota no tiene un propietario asociado.'
      );
      return;
    }

    router.push({
      pathname: '/mascotas/fichaPropietarioMascota',
      params: {
        propietarioId: String(mascota.propietario_id),
        numeroHistoria: String(mascota.numero_historia),
      },
    });
  };

  // RF20: abre el historial de atenciones de esta mascota.
  const abrirHistorial = () => {
    if (!mascota?.numero_historia) {
      Alert.alert(
        'Historial no disponible',
        'La mascota no tiene número de historia clínica.'
      );
      return;
    }

    router.push({
      pathname: '/historiaMascota',
      params: {
        numeroHistoria: String(mascota.numero_historia),
        nombre: String(mascota.nombre || ''),
      },
    });
  };

  // Pantalla de carga.
  if (cargando) {
    return (
      <SafeAreaView style={styles.contenedor}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={C.blanco}
        />

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

        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.primario} />
          <Text style={styles.textoSecundario}>
            Cargando ficha...
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

  // Pantalla de error si no se pudo consultar la ficha.
  if (error || !mascota) {
    return (
      <SafeAreaView style={styles.contenedor}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={C.blanco}
        />

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

        <View style={styles.errorPantalla}>
          <Text style={styles.errorTitulo}>
            No se pudo mostrar la ficha
          </Text>

          <Text style={styles.errorTexto}>
            {error || 'No se encontró la mascota.'}
          </Text>

          <TouchableOpacity
            style={styles.botonPrimario}
            onPress={cargarFicha}
            accessibilityRole="button"
          >
            <Text style={styles.textoBotonPrimario}>
              Reintentar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonSecundario}
            onPress={volver}
            accessibilityRole="button"
            accessibilityLabel="Volver a la lista de mascotas"
          >
            <Text style={styles.textoBotonSecundario}>
              Volver a mascotas
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

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.blanco}
      />

      {/* Encabezado común de PetCare y acceso al menú lateral. */}
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

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        {/* Título con flecha y botón de edición. */}
        <View style={styles.encabezado}>
          <View style={styles.encabezadoTexto}>
            <Text style={styles.migas}>
              Inicio / Mascotas / Ficha
            </Text>

            <View style={styles.filaTitulo}>
              <TouchableOpacity
                style={styles.botonVolver}
                onPress={volver}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Volver a la pantalla anterior"
              >
                <Text style={styles.flecha}>‹</Text>
              </TouchableOpacity>

              <Text style={styles.titulo}>
                Ficha de mascota
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.botonEditar}
            onPress={abrirEdicion}
            accessibilityRole="button"
          >
            <Text style={styles.textoEditar}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* Aviso de registro exitoso. */}
        {exito === '1' && (
          <View style={styles.alertaExito}>
            <Text style={styles.textoExito}>
              ✓ Mascota registrada correctamente.
            </Text>
          </View>
        )}

        {/* Tarjeta principal de identificación de la mascota. */}
        <View style={styles.tarjetaHero}>
          <View style={styles.heroSuperior}>
            <View style={styles.iconoMascota}>
              <Text style={styles.huella}>🐾</Text>
            </View>

            <View style={styles.heroDatos}>
              <Text style={styles.nombreMascota}>
                {mostrarDato(mascota.nombre)}
              </Text>

              <Text style={styles.especie}>
                {[mascota.especie, mascota.raza]
                  .filter(Boolean)
                  .join(' · ') || 'Especie no registrada'}
              </Text>

              <Text style={styles.historia}>
                Historia clínica: {mostrarDato(mascota.numero_historia)}
              </Text>
            </View>
          </View>

          <View style={styles.divisor} />

          <View style={styles.heroEtiquetas}>
            <View style={styles.etiquetaSexo}>
              <Text style={styles.textoEtiqueta}>
                {mostrarDato(mascota.sexo)}
              </Text>
            </View>

            <View
              style={[
                styles.etiquetaEstado,
                inactiva && styles.etiquetaInactiva,
              ]}
            >
              <Text
                style={[
                  styles.textoEstado,
                  inactiva && styles.textoEstadoInactivo,
                ]}
              >
                {estado}
              </Text>
            </View>
          </View>
        </View>

        {/* RF20: acceso al historial de atenciones de la mascota. */}
        <TouchableOpacity
          style={styles.botonHistorial}
          onPress={abrirHistorial}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Consultar historial de atenciones"
        >
          <View style={styles.contenidoBotonHistorial}>
            <Text style={styles.iconoHistorial}>▤</Text>

            <View style={styles.textosBotonHistorial}>
              <Text style={styles.tituloBotonHistorial}>
                Historial de atenciones
              </Text>

              <Text style={styles.subtituloBotonHistorial}>
                Consultar las atenciones registradas de esta mascota
              </Text>
            </View>

            <Text style={styles.flechaHistorial}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Información general de la mascota. */}
        <Seccion titulo="INFORMACIÓN GENERAL">
          <View style={styles.cuadricula}>
            <Campo
              etiqueta="Número de historia"
              valor={mascota.numero_historia}
            />

            <Campo
              etiqueta="Nombre"
              valor={mascota.nombre}
            />

            <Campo
              etiqueta="Especie"
              valor={mascota.especie}
            />

            <Campo
              etiqueta="Raza"
              valor={mascota.raza}
            />

            <Campo
              etiqueta="Sexo"
              valor={mascota.sexo}
            />

            <Campo
              etiqueta="Fecha de nacimiento"
              valor={formatearFecha(mascota.fecha_nacimiento)}
            />

            <Campo
              etiqueta="Edad"
              valor={calcularEdad(mascota.fecha_nacimiento)}
            />

            <Campo
              etiqueta="Color / pelaje"
              valor={mascota.color}
            />

            <Campo
              etiqueta="Esterilización"
              valor={mascota.estado_esterilizacion}
            />

            <Campo
              etiqueta="Fecha de registro"
              valor={formatearFecha(mascota.fecha_registro)}
            />
          </View>
        </Seccion>

        {/* Observaciones de la mascota. */}
        <Seccion titulo="OBSERVACIONES">
          <Text style={styles.observaciones}>
            {mostrarDato(mascota.observaciones)}
          </Text>
        </Seccion>

        {/* Propietario: resumen y acceso a su ficha. */}
        <Seccion titulo="PROPIETARIO">
          <View style={styles.propietarioEncabezado}>
            <View style={styles.iconoPropietario}>
              <Text style={styles.iconoPersona}>♙</Text>
            </View>

            <View style={styles.datosPropietario}>
              <Text style={styles.nombrePropietario}>
                {nombrePropietario}
              </Text>

              <Text style={styles.propietarioRegistrado}>
                Propietario registrado
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.botonVerPropietario,
              !mascota.propietario_id && styles.botonDeshabilitado,
            ]}
            onPress={abrirPropietario}
            disabled={!mascota.propietario_id}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Ver ficha del propietario"
          >
            <Text style={styles.textoVerPropietario}>
              Ver propietario →
            </Text>
          </TouchableOpacity>
        </Seccion>

        <Text style={styles.pie}>
          Información correspondiente al registro de la mascota.
        </Text>

        {/* Espacio al final para que el contenido no quede pegado al borde. */}
        <View style={styles.espacioFinal} />
      </ScrollView>

      {/* Menú lateral compartido con las demás pantallas. */}
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

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  contenido: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 32,
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },

  encabezadoTexto: {
    flex: 1,
    minWidth: 0,
  },

  migas: {
    fontSize: 11,
    color: C.secundario,
    marginBottom: 8,
  },

  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  botonVolver: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },

  flecha: {
    fontSize: 31,
    lineHeight: 34,
    color: C.primario,
    fontWeight: '400',
    marginTop: -3,
  },

  titulo: {
    flexShrink: 1,
    fontSize: 21,
    fontWeight: '800',
    color: C.texto,
  },

  botonEditar: {
    backgroundColor: C.primario,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  textoEditar: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },

  tarjetaHero: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 17,
    padding: 17,
    marginBottom: 23,
  },

  heroSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  iconoMascota: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.verdeFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },

  huella: {
    fontSize: 32,
  },

  heroDatos: {
    flex: 1,
    minWidth: 0,
  },

  nombreMascota: {
    fontSize: 23,
    fontWeight: '800',
    color: C.texto,
  },

  especie: {
    color: C.secundario,
    fontSize: 13,
    marginTop: 4,
  },

  historia: {
    color: C.primario,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },

  divisor: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 15,
  },

  heroEtiquetas: {
    flexDirection: 'row',
    gap: 8,
  },

  etiquetaSexo: {
    backgroundColor: '#F0F3F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  textoEtiqueta: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '700',
  },

  etiquetaEstado: {
    backgroundColor: C.verdeFondo,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  textoEstado: {
    color: C.primario,
    fontSize: 12,
    fontWeight: '700',
  },

  etiquetaInactiva: {
    backgroundColor: '#FEECEC',
  },

  textoEstadoInactivo: {
    color: C.error,
  },

  seccion: {
    marginBottom: 22,
  },

  tituloSeccion: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.secundario,
    marginBottom: 10,
  },

  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 16,
  },

  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  campo: {
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F1',
  },

  etiqueta: {
    fontSize: 12,
    color: C.secundario,
    marginBottom: 5,
  },

  valor: {
    fontSize: 14,
    color: C.texto,
    fontWeight: '600',
    lineHeight: 20,
  },

  observaciones: {
    color: C.texto,
    fontSize: 14,
    lineHeight: 22,
  },

  propietarioEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },

  iconoPropietario: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.verdeFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconoPersona: {
    color: C.primario,
    fontSize: 28,
  },

  datosPropietario: {
    flex: 1,
    minWidth: 0,
  },

  nombrePropietario: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '800',
  },

  propietarioRegistrado: {
    color: C.primario,
    fontSize: 12,
    marginTop: 4,
  },

  botonVerPropietario: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    marginTop: 4,
  },

  textoVerPropietario: {
    color: C.primario,
    fontWeight: '800',
    fontSize: 13,
  },

  botonDeshabilitado: {
    opacity: 0.4,
  },

  alertaExito: {
    backgroundColor: C.verdeFondo,
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },

  textoExito: {
    color: C.primarioOscuro,
    fontSize: 13,
    fontWeight: '700',
  },

  pie: {
    textAlign: 'center',
    color: C.secundario,
    fontSize: 11,
    marginTop: 2,
  },

  espacioFinal: {
    height: 28,
  },

  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  textoSecundario: {
    color: C.secundario,
  },

  errorPantalla: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    gap: 12,
  },

  errorTitulo: {
    color: C.texto,
    fontSize: 19,
    fontWeight: '800',
  },

  errorTexto: {
    color: C.error,
    textAlign: 'center',
    lineHeight: 21,
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

  // RF20: botón para consultar el historial clínico.
  botonHistorial: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 16,
    marginBottom: 22,
  },

  contenidoBotonHistorial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconoHistorial: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.verdeFondo,
    color: C.primario,
    fontSize: 26,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
  },

  textosBotonHistorial: {
    flex: 1,
    minWidth: 0,
  },

  tituloBotonHistorial: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
  },

  subtituloBotonHistorial: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  flechaHistorial: {
    color: C.primario,
    fontSize: 28,
  },
});
