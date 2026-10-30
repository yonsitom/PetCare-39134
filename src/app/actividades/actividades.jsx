
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { supabase } from '../../services/supabase';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import { logger } from '../../utils/logger';

// Paleta visual de PetCare.
const C = {
  fondo: '#F4F8F7',
  verde: '#12665E',
  verdeOscuro: '#104F49',
  verdeClaro: '#E6F4EF',
  texto: '#243746',
  secundario: '#718096',
  blanco: '#FFFFFF',
  borde: '#E0EAE7',
  naranja: '#FFF2D8',
  naranjaTexto: '#96620A',
  rojo: '#FCE8E8',
  rojoTexto: '#B42318',
};

// Únicos estados permitidos por los requisitos de PetCare.
const ESTADOS = [
  'Todas',
  'Pendiente',
  'Completada',
  'No realizada',
];

// Convierte una fecha a un formato legible.
function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha';

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return 'Fecha no disponible';
  }

  return fechaConvertida.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Convierte el nombre interno del tipo en una etiqueta legible.
function formatearTipo(tipo) {
  const tipos = {
    Consulta: 'Consulta',
    Medicacion: 'Medicación',
    Vacunacion: 'Vacunación',
    Ecografia: 'Ecografía',
    Esterilizacion: 'Esterilización',
    'Otro actividad': 'Otro',
  };

  return tipos[tipo] || tipo || 'Actividad';
}

// Devuelve el color correspondiente al estado.
function obtenerEstiloEstado(estado) {
  switch (estado) {
    case 'Completada':
      return {
        fondo: C.verdeClaro,
        texto: C.verdeOscuro,
      };

    case 'No realizada':
      return {
        fondo: C.rojo,
        texto: C.rojoTexto,
      };

    case 'Pendiente':
    default:
      return {
        fondo: C.naranja,
        texto: C.naranjaTexto,
      };
  }
}

export default function ActividadesScreen() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [actividades, setActividades] = useState([]);
  const [filtro, setFiltro] = useState('Todas');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);

  // Datos básicos del usuario que se completarán desde el perfil.
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  // Evita solicitudes simultáneas de cierre de sesión.
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  /**
   * Carga las actividades que no han sido eliminadas.
   * Consulta también la atención y la mascota asociadas.
   */
  const cargarActividades = useCallback(async (esActualizacion = false) => {
    if (esActualizacion) {
      setActualizando(true);
    } else {
      setCargando(true);
    }

    setErrorCarga(false);

    try {
      // Consulta las actividades vigentes.
      const { data: datosActividades, error: errorActividades } =
        await supabase
          .from('actividades')
          .select(`
            actividad_id,
            atencion_id,
            tipo,
            tipo_id,
            estado,
            fecha_prevista,
            fecha_inicio,
            fecha_fin,
            motivo_no_realizada,
            observaciones,
            fecha_registro,
            detalle,
            atenciones (
              atencion_id,
              estado,
              numero_historia
            )
          `)
          .eq('eliminado', false)
          .order('fecha_registro', { ascending: false });

      if (errorActividades) {
        throw errorActividades;
      }

      const listaActividades = datosActividades || [];

      // Obtiene los números de historia asociados a las atenciones.
      const historias = [
        ...new Set(
          listaActividades
            .map((actividad) => actividad.atenciones?.numero_historia)
            .filter(Boolean)
        ),
      ];

      let mascotasPorHistoria = {};

      // Consulta los nombres de las mascotas sin asumir
      // una relación anidada adicional en Supabase.
      if (historias.length > 0) {
        const { data: mascotas, error: errorMascotas } = await supabase
          .from('mascotas')
          .select('numero_historia, nombre')
          .in('numero_historia', historias);

        if (errorMascotas) {
          throw errorMascotas;
        }

        mascotasPorHistoria = (mascotas || []).reduce((resultado, mascota) => {
          resultado[mascota.numero_historia] = mascota.nombre;
          return resultado;
        }, {});
      }

      // Combina la actividad con la información de su atención y mascota.
      const actividadesPreparadas = listaActividades.map((actividad) => {
        const historia = actividad.atenciones?.numero_historia;

        return {
          ...actividad,
          nombre_mascota: historia
            ? mascotasPorHistoria[historia] || 'Mascota no disponible'
            : 'Mascota no disponible',
          estado_atencion: actividad.atenciones?.estado || '',
        };
      });

      setActividades(actividadesPreparadas);
    } catch (error) {
      logger.error('Error al cargar actividades:', error);

      setErrorCarga(true);

      Alert.alert(
        'Error',
        'No se pudo cargar la información de las actividades. Intente nuevamente.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  // Carga inicial de las actividades.
  useEffect(() => {
    cargarActividades();
  }, [cargarActividades]);

  // Filtra la lista sin volver a consultar la base de datos.
  const actividadesFiltradas = actividades.filter((actividad) => {
    if (filtro === 'Todas') return true;

    return actividad.estado === filtro;
  });

  // Calcula los totales para los indicadores.
  const pendientes = actividades.filter(
    (actividad) => actividad.estado === 'Pendiente'
  ).length;

  const completadas = actividades.filter(
    (actividad) => actividad.estado === 'Completada'
  ).length;

  const noRealizadas = actividades.filter(
    (actividad) => actividad.estado === 'No realizada'
  ).length;

  /**
   * RF07: Cerrar sesión.
   * La confirmación se muestra únicamente desde MenuLateralDerecho.
   */
  async function cerrarSesion() {
    if (cerrandoSesion) return;

    setCerrandoSesion(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setMenuAbierto(false);
      router.replace('/');
    } catch (error) {
      // El menú lateral recibe el error y muestra su mensaje.
      throw error;
    } finally {
      setCerrandoSesion(false);
    }
  }

  // Muestra una notificación informativa.
  function abrirNotificaciones() {
    Alert.alert(
      'Notificaciones',
      'No tienes notificaciones nuevas.'
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={abrirNotificaciones}
      />

      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => cargarActividades(true)}
            tintColor={C.verde}
          />
        }
      >
        {/* Ruta de navegación. */}
        <View style={estilos.migas}>
          <Text style={estilos.migaInicio}>Inicio</Text>
          <Text style={estilos.separadorMigas}> / </Text>
          <Text style={estilos.migaActual}>Actividades</Text>
        </View>

        {/* Título de la pantalla. */}
        <View style={estilos.encabezadoSeccion}>
          <View style={estilos.textosSeccion}>
            <Text style={estilos.tituloSeccion}>Actividades</Text>

            <Text style={estilos.descripcion}>
              Consulta las actividades registradas en las atenciones
              veterinarias.
            </Text>
          </View>

          <View style={estilos.iconoSeccion}>
            <Text style={estilos.iconoSeccionTexto}>✓</Text>
          </View>
        </View>

        {/* Indicadores resumidos de actividades. */}
        <View style={estilos.resumen}>
          <View style={estilos.tarjetaResumen}>
            <Text style={estilos.numeroResumen}>{actividades.length}</Text>
            <Text style={estilos.textoResumen}>Total</Text>
          </View>

          <View style={estilos.tarjetaResumen}>
            <Text style={estilos.numeroPendiente}>{pendientes}</Text>
            <Text style={estilos.textoResumen}>Pendientes</Text>
          </View>

          <View style={estilos.tarjetaResumen}>
            <Text style={estilos.numeroCompletada}>{completadas}</Text>
            <Text style={estilos.textoResumen}>Completadas</Text>
          </View>

          <View style={estilos.tarjetaResumen}>
            <Text style={estilos.numeroNoRealizada}>{noRealizadas}</Text>
            <Text style={estilos.textoResumen}>No realizadas</Text>
          </View>
        </View>

        {/* Filtros por estado: no incluye En proceso. */}
        <Text style={estilos.tituloFiltros}>Filtrar actividades</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.contenedorFiltros}
        >
          {ESTADOS.map((estado) => {
            const seleccionado = filtro === estado;

            return (
              <Pressable
                key={estado}
                accessibilityRole="button"
                accessibilityState={{ selected: seleccionado }}
                onPress={() => setFiltro(estado)}
                style={[
                  estilos.botonFiltro,
                  seleccionado && estilos.botonFiltroSeleccionado,
                ]}
              >
                <Text
                  style={[
                    estilos.textoFiltro,
                    seleccionado && estilos.textoFiltroSeleccionado,
                  ]}
                >
                  {estado}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Encabezado del listado. */}
        <View style={estilos.encabezadoListado}>
          <Text style={estilos.tituloListado}>Listado de actividades</Text>

          <Text style={estilos.contadorListado}>
            {actividadesFiltradas.length}
          </Text>
        </View>

        {/* Estado de carga. */}
        {cargando ? (
          <View style={estilos.estadoVacio}>
            <ActivityIndicator size="large" color={C.verde} />
            <Text style={estilos.textoEstadoVacio}>
              Cargando actividades...
            </Text>
          </View>
        ) : errorCarga ? (
          /* Opción para reintentar si falló la consulta. */
          <View style={estilos.estadoVacio}>
            <Text style={estilos.iconoVacio}>!</Text>
            <Text style={estilos.tituloVacio}>
              No se pudieron cargar las actividades
            </Text>
            <Pressable
              style={estilos.botonReintentar}
              onPress={() => cargarActividades()}
            >
              <Text style={estilos.textoBotonReintentar}>
                Intentar nuevamente
              </Text>
            </Pressable>
          </View>
        ) : actividadesFiltradas.length === 0 ? (
          /* Mensaje cuando no existen resultados. */
          <View style={estilos.estadoVacio}>
            <Text style={estilos.iconoVacio}>▤</Text>

            <Text style={estilos.tituloVacio}>
              {actividades.length === 0
                ? 'No hay actividades registradas para esta atención.'
                : 'No hay actividades con este estado.'}
            </Text>

            <Text style={estilos.descripcionVacio}>
              Prueba con otro filtro o actualiza la información.
            </Text>

            <Pressable
              style={estilos.botonReintentar}
              onPress={() => cargarActividades(true)}
            >
              <Text style={estilos.textoBotonReintentar}>
                Actualizar lista
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Tarjetas de actividades consultadas desde Supabase. */
          actividadesFiltradas.map((actividad) => {
            const estiloEstado = obtenerEstiloEstado(actividad.estado);

            return (
              <View
                key={String(actividad.actividad_id)}
                style={estilos.tarjetaActividad}
              >
                <View style={estilos.filaTarjeta}>
                  <View style={estilos.iconoActividad}>
                    <Text style={estilos.iconoActividadTexto}>▤</Text>
                  </View>

                  <View style={estilos.informacionPrincipal}>
                    <Text style={estilos.nombreTipo}>
                      {formatearTipo(actividad.tipo)}
                    </Text>

                    <Text style={estilos.nombreMascota}>
                      {actividad.nombre_mascota}
                    </Text>

                    <Text style={estilos.textoAtencion}>
                      Atención N.° {actividad.atencion_id}
                    </Text>
                  </View>
                </View>

                <View style={estilos.separadorTarjeta} />

                <View style={estilos.filaDetalle}>
                  <Text style={estilos.etiquetaDetalle}>Estado</Text>

                  <View
                    style={[
                      estilos.etiquetaEstado,
                      { backgroundColor: estiloEstado.fondo },
                    ]}
                  >
                    <Text
                      style={[
                        estilos.textoEtiquetaEstado,
                        { color: estiloEstado.texto },
                      ]}
                    >
                      {actividad.estado}
                    </Text>
                  </View>
                </View>

                <View style={estilos.filaDetalle}>
                  <Text style={estilos.etiquetaDetalle}>Fecha prevista</Text>
                  <Text style={estilos.valorDetalle}>
                    {formatearFecha(actividad.fecha_prevista)}
                  </Text>
                </View>

                <View style={estilos.filaDetalle}>
                  <Text style={estilos.etiquetaDetalle}>Fecha de registro</Text>
                  <Text style={estilos.valorDetalle}>
                    {formatearFecha(actividad.fecha_registro)}
                  </Text>
                </View>

                {actividad.estado === 'No realizada' &&
                  actividad.motivo_no_realizada ? (
                    <View style={estilos.contenedorMotivo}>
                      <Text style={estilos.tituloMotivo}>
                        Motivo de no realización
                      </Text>

                      <Text style={estilos.textoMotivo}>
                        {actividad.motivo_no_realizada}
                      </Text>
                    </View>
                  ) : null}

                {actividad.observaciones ? (
                  <View style={estilos.contenedorObservaciones}>
                    <Text style={estilos.tituloObservaciones}>
                      Observaciones
                    </Text>

                    <Text style={estilos.textoObservaciones}>
                      {actividad.observaciones}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        <Text style={estilos.pie}>
          PetCare · Sistema de seguimiento de atención veterinaria
        </Text>
      </ScrollView>

      {/* Menú lateral común de la aplicación. */}
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

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  contenido: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },

  migas: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  migaInicio: {
    color: C.secundario,
    fontSize: 13,
  },

  separadorMigas: {
    color: C.secundario,
    fontSize: 13,
  },

  migaActual: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '700',
  },

  encabezadoSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  textosSeccion: {
    flex: 1,
    paddingRight: 12,
  },

  tituloSeccion: {
    color: C.texto,
    fontSize: 25,
    fontWeight: '800',
  },

  descripcion: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },

  iconoSeccion: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconoSeccionTexto: {
    color: C.verde,
    fontSize: 25,
    fontWeight: '800',
  },

  resumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 25,
  },

  tarjetaResumen: {
    flexGrow: 1,
    flexBasis: '43%',
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    paddingVertical: 16,
    paddingHorizontal: 13,
  },

  numeroResumen: {
    color: C.texto,
    fontSize: 25,
    fontWeight: '800',
  },

  numeroPendiente: {
    color: C.naranjaTexto,
    fontSize: 25,
    fontWeight: '800',
  },

  numeroCompletada: {
    color: C.verde,
    fontSize: 25,
    fontWeight: '800',
  },

  numeroNoRealizada: {
    color: C.rojoTexto,
    fontSize: 25,
    fontWeight: '800',
  },

  textoResumen: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 5,
  },

  tituloFiltros: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },

  contenedorFiltros: {
    gap: 9,
    paddingBottom: 5,
  },

  botonFiltro: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },

  botonFiltroSeleccionado: {
    backgroundColor: C.verde,
    borderColor: C.verde,
  },

  textoFiltro: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '600',
  },

  textoFiltroSeleccionado: {
    color: C.blanco,
  },

  encabezadoListado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 13,
  },

  tituloListado: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },

  contadorListado: {
    color: C.verde,
    backgroundColor: C.verdeClaro,
    borderRadius: 9,
    overflow: 'hidden',
    paddingHorizontal: 11,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '800',
  },

  tarjetaActividad: {
    backgroundColor: C.blanco,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 16,
    marginBottom: 13,
  },

  filaTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoActividad: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  iconoActividadTexto: {
    color: C.verde,
    fontSize: 22,
    fontWeight: '800',
  },

  informacionPrincipal: {
    flex: 1,
  },

  nombreTipo: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '800',
  },

  nombreMascota: {
    color: C.verde,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },

  textoAtencion: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 4,
  },

  separadorTarjeta: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 14,
  },

  filaDetalle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 11,
  },

  etiquetaDetalle: {
    color: C.secundario,
    fontSize: 12,
    flex: 1,
  },

  valorDetalle: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },

  etiquetaEstado: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  textoEtiquetaEstado: {
    fontSize: 11,
    fontWeight: '800',
  },

  contenedorMotivo: {
    backgroundColor: C.rojo,
    borderRadius: 10,
    padding: 12,
    marginTop: 5,
  },

  tituloMotivo: {
    color: C.rojoTexto,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 5,
  },

  textoMotivo: {
    color: C.texto,
    fontSize: 13,
    lineHeight: 19,
  },

  contenedorObservaciones: {
    backgroundColor: C.fondo,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },

  tituloObservaciones: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 5,
  },

  textoObservaciones: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 19,
  },

  estadoVacio: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 25,
    alignItems: 'center',
    marginTop: 5,
  },

  iconoVacio: {
    color: C.verde,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
  },

  tituloVacio: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  textoEstadoVacio: {
    color: C.secundario,
    fontSize: 13,
    marginTop: 12,
  },

  descripcionVacio: {
    color: C.secundario,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },

  botonReintentar: {
    backgroundColor: C.verde,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 15,
  },

  textoBotonReintentar: {
    color: C.blanco,
    fontSize: 12,
    fontWeight: '800',
  },

  pie: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 25,
  },
});
