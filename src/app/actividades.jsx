
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

import { listarActividadesPorEstado } from '../controllers/actividades/actividadesControlador';
import { logger } from '../utils/logger';

/**
 * RF10: visualizar actividades pendientes, completadas y no realizadas.
 *
 * MVC:
 * - Vista: actividades.jsx.
 * - Servicio: actividadesServicio.js.
 * - DAO: actividadesDAO.js.
 *
 * Las actividades eliminadas lógicamente no deben aparecer.
 */

const ESTADOS = [
  { etiqueta: 'Pendientes', valor: 'Pendiente' },
  { etiqueta: 'Completadas', valor: 'Completada' },
  { etiqueta: 'No realizadas', valor: 'No realizada' },
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

  const partes = String(fecha).split('T')[0].split('-');

  if (partes.length !== 3) return String(fecha);

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export default function ActividadesScreen() {
  const parametros = useLocalSearchParams();

  const [estadoSeleccionado, setEstadoSeleccionado] = useState(
    () => obtenerEstadoValido(parametros.estado)
  );

  const [actividades, setActividades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  /**
   * RF10: consultar las actividades del estado seleccionado.
   */
  const cargarActividades = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      const resultado = await obtenerActividadesPorEstado(
        estadoSeleccionado
      );

      setActividades(resultado);
    } catch (errorConsulta) {
      logger.error('RF10: error al cargar la lista:', errorConsulta);

      setActividades([]);
      setError(errorConsulta?.message || MENSAJE_ERROR);
    } finally {
      setCargando(false);
    }
  }, [estadoSeleccionado]);

  /**
   * RF10: cargar o actualizar la lista al entrar a la pantalla
   * y al cambiar el estado.
   */
  useFocusEffect(
    useCallback(() => {
      cargarActividades();
    }, [cargarActividades])
  );

  /**
   * RF10: cambiar el filtro de estado.
   */
  const seleccionarEstado = (estado) => {
    setEstadoSeleccionado(estado);
  };

  const obtenerNombreTipo = (actividad) =>
    actividad?.tipos_actividad?.nombre ||
    actividad?.tipo ||
    'Actividad';

  const renderActividad = ({ item }) => (
    <View style={styles.tarjetaActividad}>
      <View style={styles.filaTitulo}>
        <Text style={styles.nombreActividad}>
          {obtenerNombreTipo(item)}
        </Text>

        <View style={styles.etiquetaEstado}>
          <Text style={styles.textoEtiquetaEstado}>
            {item.estado}
          </Text>
        </View>
      </View>

      <Text style={styles.textoSecundario}>
        Fecha prevista: {formatearFecha(item.fecha_prevista)}
      </Text>

      {item.observaciones ? (
        <Text style={styles.observaciones}>
          {item.observaciones}
        </Text>
      ) : null}

      {item.motivo_no_realizada ? (
        <Text style={styles.motivo}>
          Motivo: {item.motivo_no_realizada}
        </Text>
      ) : null}
    </View>
  );

  const tituloEstado =
    ESTADOS.find((item) => item.valor === estadoSeleccionado)
      ?.etiqueta || 'Actividades';

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.encabezado}>
        <TouchableOpacity
          style={styles.botonVolver}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver a la pantalla anterior"
        >
          <Text style={styles.textoVolver}>‹ Volver</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Actividades</Text>

        <Text style={styles.subtitulo}>
          Consulta y seguimiento de las actividades de atención.
        </Text>
      </View>

      <View style={styles.contenido}>
        <Text style={styles.tituloSeccion}>
          Filtrar por estado
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtros}
        >
          {ESTADOS.map((estado) => {
            const seleccionado =
              estadoSeleccionado === estado.valor;

            return (
              <TouchableOpacity
                key={estado.valor}
                style={[
                  styles.botonFiltro,
                  seleccionado && styles.botonFiltroActivo,
                ]}
                onPress={() => seleccionarEstado(estado.valor)}
                accessibilityRole="button"
                accessibilityState={{ selected: seleccionado }}
              >
                <Text
                  style={[
                    styles.textoFiltro,
                    seleccionado && styles.textoFiltroActivo,
                  ]}
                >
                  {estado.etiqueta}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.encabezadoLista}>
          <Text style={styles.tituloSeccion}>
            {tituloEstado}
          </Text>

          {!cargando && !error ? (
            <Text style={styles.contador}>
              {actividades.length}
            </Text>
          ) : null}
        </View>

        {cargando ? (
          <View style={styles.estadoContenedor}>
            <ActivityIndicator size="large" color="#0D9488" />
            <Text style={styles.textoEstado}>
              Cargando actividades...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.estadoContenedor}>
            <Text style={styles.textoError}>{error}</Text>

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
          <View style={styles.estadoContenedor}>
            <Text style={styles.iconoVacio}>○</Text>

            <Text style={styles.textoVacio}>
              No hay actividades en este estado.
            </Text>
          </View>
        ) : (
          <FlatList
            data={actividades}
            keyExtractor={(item, indice) =>
              String(item.actividad_id ?? indice)
            }
            renderItem={renderActividad}
            contentContainerStyle={styles.lista}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#F0FDFA',
  },
  encabezado: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#D9EDE8',
  },
  botonVolver: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 8,
  },
  textoVolver: {
    color: '#0D9488',
    fontSize: 15,
    fontWeight: '700',
  },
  titulo: {
    color: '#243746',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitulo: {
    color: '#718096',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 21,
  },
  contenido: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  tituloSeccion: {
    color: '#243746',
    fontSize: 17,
    fontWeight: '800',
  },
  filtros: {
    gap: 9,
    paddingVertical: 14,
  },
  botonFiltro: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9EDE8',
  },
  botonFiltroActivo: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  textoFiltro: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '700',
  },
  textoFiltroActivo: {
    color: '#FFFFFF',
  },
  encabezadoLista: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 12,
  },
  contador: {
    color: '#115E59',
    fontSize: 13,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  lista: {
    paddingBottom: 24,
  },
  tarjetaActividad: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D9EDE8',
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  nombreActividad: {
    flex: 1,
    color: '#243746',
    fontSize: 16,
    fontWeight: '800',
  },
  etiquetaEstado: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  textoEtiquetaEstado: {
    color: '#115E59',
    fontSize: 11,
    fontWeight: '700',
  },
  textoSecundario: {
    color: '#718096',
    fontSize: 13,
    marginTop: 12,
  },
  observaciones: {
    color: '#475467',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 19,
  },
  motivo: {
    color: '#B42318',
    fontSize: 13,
    marginTop: 8,
  },
  estadoContenedor: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  textoEstado: {
    color: '#718096',
    fontSize: 14,
    marginTop: 12,
  },
  textoError: {
    color: '#B42318',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
  },
  botonReintentar: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },
  textoBotonReintentar: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  iconoVacio: {
    color: '#98A2B3',
    fontSize: 38,
    marginBottom: 10,
  },
  textoVacio: {
    color: '#667085',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});
