
import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
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

import {
  listarActividadesPorEstado,
} from '../controllers/actividades/actividadesControlador';
import { logger } from '../utils/logger';

/**
 * RF10: consultar actividades pendientes, completadas y no realizadas.
 *
 * MVC:
 * - Vista: actividades.jsx
 * - Controlador: actividadesControlador.js
 * - Servicio: actividadesServicio.js
 * - DAO: actividadesDAO.js
 *
 * Las actividades eliminadas lógicamente no se muestran.
 * Esta pantalla consulta información; el registro y la actualización
 * de actividades se realizan mediante sus respectivos controladores.
 */

const ESTADOS = [
  {
    etiqueta: 'Pendientes',
    valor: 'Pendiente',
    color: '#B54708',
    fondo: '#FFF4E5',
    icono: '◷',
  },
  {
    etiqueta: 'Completadas',
    valor: 'Completada',
    color: '#067647',
    fondo: '#D1FADF',
    icono: '✓',
  },
  {
    etiqueta: 'No realizadas',
    valor: 'No realizada',
    color: '#B42318',
    fondo: '#FEE4E2',
    icono: '!',
  },
];

const MENSAJE_ERROR =
  'No se pudo cargar el resumen de actividades. Intente nuevamente.';

function obtenerEstadoValido(valor) {
  const estado = Array.isArray(valor) ? valor[0] : valor;

  return ESTADOS.some((item) => item.valor === estado)
    ? estado
    : 'Pendiente';
}

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha prevista';

  const valor = String(fecha).split('T')[0];
  const partes = valor.split('-');

  if (partes.length !== 3) return String(fecha);

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obtenerConfiguracionEstado(estado) {
  return (
    ESTADOS.find((item) => item.valor === estado) || {
      color: '#475467',
      fondo: '#F2F4F7',
      icono: '•',
    }
  );
}

function obtenerNombreTipo(actividad) {
  return (
    actividad?.tipos_actividad?.nombre ||
    actividad?.tipo ||
    'Actividad'
  );
}

export default function ActividadesScreen() {
  const parametros = useLocalSearchParams();

  const [estadoSeleccionado, setEstadoSeleccionado] = useState(
    () => obtenerEstadoValido(parametros.estado)
  );

  const [actividades, setActividades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarActividades = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      const resultado = await listarActividadesPorEstado(
        estadoSeleccionado
      );

      if (!Array.isArray(resultado)) {
        throw new Error(MENSAJE_ERROR);
      }

      setActividades(
        resultado.filter(
          (actividad) =>
            actividad &&
            actividad.eliminado !== true
        )
      );
    } catch (errorConsulta) {
      logger.error(
        'RF10 - Error al consultar actividades:',
        errorConsulta
      );

      setActividades([]);
      setError(errorConsulta?.message || MENSAJE_ERROR);
    } finally {
      setCargando(false);
    }
  }, [estadoSeleccionado]);

  useFocusEffect(
    useCallback(() => {
      cargarActividades();
    }, [cargarActividades])
  );

  function seleccionarEstado(estado) {
    if (estado !== estadoSeleccionado) {
      setEstadoSeleccionado(estado);
    }
  }

  function abrirDetalleActividad(actividad) {
    if (!actividad?.actividad_id) {
      return;
    }

    router.push({
      pathname: '/detalleActividad',
      params: {
        actividad_id: String(actividad.actividad_id),
      },
    });
  }

  const configuracionSeleccionada =
    obtenerConfiguracionEstado(estadoSeleccionado);

  const tituloEstado =
    ESTADOS.find(
      (item) => item.valor === estadoSeleccionado
    )?.etiqueta || 'Actividades';

  const renderActividad = ({ item }) => {
    const configuracion = obtenerConfiguracionEstado(item.estado);

    return (
      <TouchableOpacity
        style={styles.tarjetaActividad}
        onPress={() => abrirDetalleActividad(item)}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle de ${obtenerNombreTipo(item)}`}
      >
        <View style={styles.acentoTarjeta} />

        <View style={styles.contenidoTarjeta}>
          <View style={styles.filaTitulo}>
            <View style={styles.iconoActividad}>
              <Text style={styles.textoIconoActividad}>✚</Text>
            </View>

            <View style={styles.datosTitulo}>
              <Text style={styles.nombreActividad}>
                {obtenerNombreTipo(item)}
              </Text>

              <Text style={styles.identificador}>
                Actividad #{item.actividad_id}
              </Text>
            </View>

            <View
              style={[
                styles.etiquetaEstado,
                { backgroundColor: configuracion.fondo },
              ]}
            >
              <Text
                style={[
                  styles.textoEtiquetaEstado,
                  { color: configuracion.color },
                ]}
              >
                {item.estado || 'Sin estado'}
              </Text>
            </View>
          </View>

          <View style={styles.separador} />

          <View style={styles.filaInformacion}>
            <View style={styles.iconoInformacion}>
              <Text style={styles.textoIconoInformacion}>▦</Text>
            </View>

            <View style={styles.bloqueInformacion}>
              <Text style={styles.etiquetaInformacion}>
                Atención
              </Text>

              <Text style={styles.valorInformacion}>
                {item.atencion_id != null
                  ? `#${item.atencion_id}`
                  : 'No disponible'}
              </Text>
            </View>

            <View style={styles.iconoInformacion}>
              <Text style={styles.textoIconoInformacion}>◷</Text>
            </View>

            <View style={styles.bloqueInformacion}>
              <Text style={styles.etiquetaInformacion}>
                Fecha prevista
              </Text>

              <Text style={styles.valorInformacion}>
                {formatearFecha(item.fecha_prevista)}
              </Text>
            </View>
          </View>

          {item.observaciones ? (
            <View style={styles.bloqueObservaciones}>
              <Text style={styles.etiquetaInformacion}>
                Observaciones
              </Text>

              <Text
                style={styles.observaciones}
                numberOfLines={3}
              >
                {item.observaciones}
              </Text>
            </View>
          ) : null}

          {item.estado === 'No realizada' &&
          item.motivo_no_realizada ? (
            <View style={styles.bloqueMotivo}>
              <Text style={styles.etiquetaMotivo}>
                Motivo de no realización
              </Text>

              <Text style={styles.textoMotivo}>
                {item.motivo_no_realizada}
              </Text>
            </View>
          ) : null}

          <View style={styles.filaVerDetalle}>
            <Text style={styles.textoVerDetalle}>
              Ver detalle de la actividad
            </Text>

            <Text style={styles.flechaDetalle}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.encabezado}>
        <TouchableOpacity
          style={styles.botonVolver}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={styles.flechaVolver}>‹</Text>
        </TouchableOpacity>

        <View style={styles.encabezadoTexto}>
          <Text style={styles.sobretitulo}>
            SEGUIMIENTO VETERINARIO
          </Text>

          <Text style={styles.titulo}>
            Actividades
          </Text>

          <Text style={styles.subtitulo}>
            Consulta las actividades registradas en las atenciones.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.contenido}
        contentContainerStyle={styles.contenidoInterior}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tarjetaResumen}>
          <View style={styles.resumenSuperior}>
            <View>
              <Text style={styles.resumenTitulo}>
                Estado de las actividades
              </Text>

              <Text style={styles.resumenSubtitulo}>
                Selecciona una categoría para consultar sus registros.
              </Text>
            </View>

            <View style={styles.iconoResumen}>
              <Text style={styles.textoIconoResumen}>✓</Text>
            </View>
          </View>

          <View style={styles.filtros}>
            {ESTADOS.map((estado) => {
              const seleccionado =
                estadoSeleccionado === estado.valor;

              return (
                <TouchableOpacity
                  key={estado.valor}
                  style={[
                    styles.botonFiltro,
                    seleccionado && {
                      backgroundColor: estado.fondo,
                      borderColor: estado.color,
                    },
                  ]}
                  onPress={() => seleccionarEstado(estado.valor)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: seleccionado }}
                >
                  <Text
                    style={[
                      styles.iconoFiltro,
                      {
                        color: seleccionado
                          ? estado.color
                          : '#667085',
                      },
                    ]}
                  >
                    {estado.icono}
                  </Text>

                  <Text
                    style={[
                      styles.textoFiltro,
                      seleccionado && {
                        color: estado.color,
                      },
                    ]}
                  >
                    {estado.etiqueta}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.encabezadoLista}>
          <View style={styles.titulosLista}>
            <Text style={styles.tituloSeccion}>
              {tituloEstado}
            </Text>

            <Text style={styles.descripcionLista}>
              Registros disponibles
            </Text>
          </View>

          {!cargando && !error ? (
            <View
              style={[
                styles.contador,
                { backgroundColor: configuracionSeleccionada.fondo },
              ]}
            >
              <Text
                style={[
                  styles.textoContador,
                  { color: configuracionSeleccionada.color },
                ]}
              >
                {actividades.length}
              </Text>
            </View>
          ) : null}
        </View>

        {cargando ? (
          <View style={styles.estadoContenedor}>
            <ActivityIndicator
              size="large"
              color="#0D9488"
            />

            <Text style={styles.textoEstado}>
              Cargando actividades...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.tarjetaEstado}>
            <Text style={styles.iconoError}>!</Text>

            <Text style={styles.tituloEstado}>
              No se pudieron cargar las actividades
            </Text>

            <Text style={styles.textoError}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.botonReintentar}
              onPress={cargarActividades}
              accessibilityRole="button"
            >
              <Text style={styles.textoBotonReintentar}>
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        ) : actividades.length === 0 ? (
          <View style={styles.tarjetaEstado}>
            <View style={styles.iconoVacio}>
              <Text style={styles.textoIconoVacio}>▤</Text>
            </View>

            <Text style={styles.tituloEstado}>
              No hay actividades
            </Text>

            <Text style={styles.textoVacio}>
              No se encontraron actividades con el estado
              {' '}{tituloEstado.toLowerCase()}.
            </Text>

            <TouchableOpacity
              style={styles.botonSecundario}
              onPress={cargarActividades}
              accessibilityRole="button"
            >
              <Text style={styles.textoBotonSecundario}>
                Actualizar lista
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={actividades}
            keyExtractor={(item, indice) =>
              String(item.actividad_id ?? indice)
            }
            renderItem={renderActividad}
            scrollEnabled={false}
            contentContainerStyle={styles.lista}
          />
        )}

        <Text style={styles.piePagina}>
          PetCare · Seguimiento de atención veterinaria
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#E7ECF2',
  },

  botonVolver: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E8F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
    marginTop: 5,
  },

  flechaVolver: {
    color: '#087F8C',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '500',
    marginTop: -3,
  },

  encabezadoTexto: {
    flex: 1,
  },

  sobretitulo: {
    color: '#0D9488',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  titulo: {
    color: '#172B4D',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  subtitulo: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },

  contenido: {
    flex: 1,
  },

  contenidoInterior: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
  },

  tarjetaResumen: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: '#E6ECF2',
    marginBottom: 25,
  },

  resumenSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resumenTitulo: {
    color: '#172B4D',
    fontSize: 16,
    fontWeight: '800',
  },

  resumenSubtitulo: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    maxWidth: 250,
  },

  iconoResumen: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#E0F7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  textoIconoResumen: {
    color: '#087F8C',
    fontSize: 22,
    fontWeight: '800',
  },

  filtros: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },

  botonFiltro: {
    flex: 1,
    minHeight: 73,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconoFiltro: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 5,
  },

  textoFiltro: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  encabezadoLista: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  titulosLista: {
    flex: 1,
  },

  tituloSeccion: {
    color: '#172B4D',
    fontSize: 20,
    fontWeight: '800',
  },

  descripcionLista: {
    color: '#667085',
    fontSize: 12,
    marginTop: 4,
  },

  contador: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  textoContador: {
    fontSize: 16,
    fontWeight: '800',
  },

  lista: {
    paddingBottom: 5,
  },

  tarjetaActividad: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E5EAF0',
    overflow: 'hidden',
  },

  acentoTarjeta: {
    width: 4,
    backgroundColor: '#0D9488',
  },

  contenidoTarjeta: {
    flex: 1,
    padding: 15,
  },

  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconoActividad: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#E8F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  textoIconoActividad: {
    color: '#087F8C',
    fontSize: 20,
    fontWeight: '800',
  },

  datosTitulo: {
    flex: 1,
    paddingTop: 2,
  },

  nombreActividad: {
    color: '#172B4D',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },

  identificador: {
    color: '#98A2B3',
    fontSize: 11,
    marginTop: 4,
  },

  etiquetaEstado: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 7,
    maxWidth: 110,
  },

  textoEtiquetaEstado: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  separador: {
    height: 1,
    backgroundColor: '#EEF1F5',
    marginVertical: 14,
  },

  filaInformacion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconoInformacion: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoIconoInformacion: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '800',
  },

  bloqueInformacion: {
    flex: 1,
    marginLeft: 7,
    marginRight: 7,
  },

  etiquetaInformacion: {
    color: '#98A2B3',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 5,
  },

  valorInformacion: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },

  bloqueObservaciones: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 11,
    marginTop: 13,
  },

  observaciones: {
    color: '#475467',
    fontSize: 12,
    lineHeight: 19,
  },

  bloqueMotivo: {
    backgroundColor: '#FFF4F3',
    borderRadius: 10,
    padding: 11,
    marginTop: 12,
  },

  etiquetaMotivo: {
    color: '#B42318',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
  },

  textoMotivo: {
    color: '#7A271A',
    fontSize: 12,
    lineHeight: 18,
  },

  filaVerDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
  },

  textoVerDetalle: {
    color: '#087F8C',
    fontSize: 12,
    fontWeight: '800',
  },

  flechaDetalle: {
    color: '#087F8C',
    fontSize: 24,
    lineHeight: 25,
    fontWeight: '500',
  },

  estadoContenedor: {
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  textoEstado: {
    color: '#667085',
    fontSize: 13,
    marginTop: 12,
  },

  tarjetaEstado: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E5EAF0',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },

  iconoError: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#B42318',
    backgroundColor: '#FEE4E2',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 13,
  },

  tituloEstado: {
    color: '#172B4D',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  textoError: {
    color: '#B42318',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 9,
    marginBottom: 18,
  },

  botonReintentar: {
    backgroundColor: '#087F8C',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },

  textoBotonReintentar: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  iconoVacio: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#E8F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  textoIconoVacio: {
    color: '#087F8C',
    fontSize: 26,
    fontWeight: '700',
  },

  textoVacio: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },

  botonSecundario: {
    borderWidth: 1,
    borderColor: '#0D9488',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },

  textoBotonSecundario: {
    color: '#087F8C',
    fontSize: 12,
    fontWeight: '800',
  },

  piePagina: {
    color: '#98A2B3',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
});
