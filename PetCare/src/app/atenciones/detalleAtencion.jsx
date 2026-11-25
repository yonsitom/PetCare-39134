
/**
 * ============================================================
 * PETCARE - DETALLE DE ATENCIÓN
 * ============================================================
 *
 * RF24: Consultar actividades y datos de atención.
 * RF25: Consultar estado y finalización de atención.
 * RF32: Editar actividades.
 * RF39: Mostrar porcentaje de avance.
 *
 * RECETAS:
 * - Se consultan directamente desde la tabla recetas.
 * - La relación se realiza mediante atencion_id.
 * - No dependen de actividades ni de consultas.
 * - No participan en el porcentaje de avance.
 * - Su visualización es independiente de las consultas.
 *
 * Arquitectura:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 *
 * Reglas de finalización:
 * - La atención debe estar Activa.
 * - Debe existir al menos una actividad vigente.
 * - Todas deben estar Completadas o No realizada.
 * - Las actividades eliminadas no participan.
 * - Se requiere confirmación del usuario.
 * - Cancelar conserva la atención Activa.
 * - No existe finalización automática.
 * ============================================================
 */

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

import { router, useLocalSearchParams } from 'expo-router';

import { supabase } from '../../services/supabase';

import {
  obtenerActividadesYPorcentajeAvance,
  verificarAtencionListaParaFinalizarServicio,
  finalizarAtencionServicio,
} from '../../services/atencion/actividadesServicio';

import {
  eliminarActividad,
} from '../../controllers/actividades/actividadesControlador';

// RF de recetas: consulta independiente por atencion_id.
import {
  obtenerRecetasPorAtencionServicio,
} from '../../services/recetas/recetasServicio';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

// ============================================================
// PALETA DE COLORES
// ============================================================

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
  azul: '#2563EB',
  azulClaro: '#EAF1FF',
};

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function fechaLegible(fecha) {
  if (!fecha) return 'No registrada';

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return 'No disponible';
  }

  return valor.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nombreTipo(actividad) {
  return (
    actividad?.tipos_actividad?.nombre ||
    actividad?.tipo ||
    'Actividad'
  );
}

function estadoVisible(actividad) {
  return actividad?.estado || 'Pendiente';
}

function estadoNormalizado(actividad) {
  return String(estadoVisible(actividad)).trim().toLowerCase();
}

/**
 * Verifica que exista al menos una actividad vigente
 * y que todas estén en un estado terminal permitido.
 */
function todasLasActividadesProcesadas(lista) {
  if (!Array.isArray(lista)) return false;

  const vigentes = lista.filter(
    (actividad) => actividad && actividad.eliminado !== true
  );

  if (vigentes.length === 0) return false;

  return vigentes.every((actividad) => {
    const estado = estadoNormalizado(actividad);

    return estado === 'completada' || estado === 'no realizada';
  });
}

function colorEstado(estado) {
  const normalizado = String(estado || '').trim().toLowerCase();

  if (
    normalizado === 'completada' ||
    normalizado === 'finalizada'
  ) {
    return {
      fondo: C.verdeClaro,
      texto: C.verdeOscuro,
    };
  }

  if (
    normalizado === 'no realizada' ||
    normalizado === 'cancelada'
  ) {
    return {
      fondo: C.rojo,
      texto: C.rojoTexto,
    };
  }

  return {
    fondo: C.naranja,
    texto: C.naranjaTexto,
  };
}

/**
 * Normaliza la respuesta del servicio.
 * Permite trabajar tanto si devuelve un array directamente
 * como si devuelve { recetas: [...] } o { data: [...] }.
 */
function normalizarListaRecetas(resultado) {
  if (Array.isArray(resultado)) {
    return resultado;
  }

  if (Array.isArray(resultado?.recetas)) {
    return resultado.recetas;
  }

  if (Array.isArray(resultado?.data)) {
    return resultado.data;
  }

  if (Array.isArray(resultado?.resultado)) {
    return resultado.resultado;
  }

  return [];
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function DetalleAtencionScreen() {
  const parametros = useLocalSearchParams();

  const parametroId =
    parametros.atencion_id ??
    parametros.atencionId ??
    parametros.id;

  const atencionId = Array.isArray(parametroId)
    ? parametroId[0]
    : parametroId;

  const parametroRefrescar = Array.isArray(parametros.refrescar)
    ? parametros.refrescar[0]
    : parametros.refrescar;

  // ----------------------------------------------------------
  // ESTADOS GENERALES
  // ----------------------------------------------------------

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [atencion, setAtencion] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [porcentaje, setPorcentaje] = useState(0);
  const [listaParaFinalizar, setListaParaFinalizar] = useState(false);

  const [modalFinalizacionVisible, setModalFinalizacionVisible] =
    useState(false);

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');

  // ----------------------------------------------------------
  // ESTADOS INDEPENDIENTES DE RECETAS
  // ----------------------------------------------------------

  const [recetas, setRecetas] = useState([]);
  const [cargandoRecetas, setCargandoRecetas] = useState(false);
  const [errorRecetas, setErrorRecetas] = useState('');

  // ============================================================
  // CONSULTAR RECETAS DE LA ATENCIÓN
  // ============================================================
  //
  // IMPORTANTE:
  // Esta consulta es independiente de las actividades y consultas.
  // El servicio debe consultar directamente:
  // recetas.atencion_id = atencionId
  //
  // No se consulta actividad_consulta.
  // No se utiliza actividad_id.
  // ============================================================

  const cargarRecetas = useCallback(async (idAtencion) => {
    if (!idAtencion) {
      setRecetas([]);
      setErrorRecetas('No se identificó la atención para consultar sus recetas.');
      return;
    }

    setCargandoRecetas(true);
    setErrorRecetas('');

    try {
      const resultado =
        await obtenerRecetasPorAtencionServicio(idAtencion);

      const lista = normalizarListaRecetas(resultado);

      // Ordenar de la más reciente a la más antigua.
      const listaOrdenada = [...lista].sort((a, b) => {
        const fechaA = new Date(
          a?.fecha_registro || 0
        ).getTime();

        const fechaB = new Date(
          b?.fecha_registro || 0
        ).getTime();

        return fechaB - fechaA;
      });

      setRecetas(listaOrdenada);
    } catch (error) {
      console.error(
        'Error al cargar recetas de la atención:',
        error
      );

      setRecetas([]);

      setErrorRecetas(
        error?.message ||
        'No se pudieron cargar las recetas de esta atención.'
      );
    } finally {
      setCargandoRecetas(false);
    }
  }, []);

  // ============================================================
  // CONSULTAR DETALLE DE ATENCIÓN
  // ============================================================

  const cargarDetalle = useCallback(
    async (esActualizacion = false) => {
      if (!atencionId) {
        setErrorCarga('No se recibió el ID de la atención.');
        setCargando(false);
        setActualizando(false);
        setListaParaFinalizar(false);
        return;
      }

      if (esActualizacion) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      setListaParaFinalizar(false);
      setErrorCarga('');

      try {
        // ------------------------------------------------------
        // CONSULTAR ATENCIÓN
        // ------------------------------------------------------

        const { data, error } = await supabase
          .from('atenciones')
          .select(
            'atencion_id, numero_historia, fecha_inicio, fecha_fin, estado'
          )
          .eq('atencion_id', String(atencionId))
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setAtencion(null);
          setActividades([]);
          setPorcentaje(0);
          setListaParaFinalizar(false);
          setRecetas([]);
          setErrorCarga('No se encontró la atención solicitada.');
          return;
        }

        setAtencion(data);

        // ------------------------------------------------------
        // CONSULTAR ACTIVIDADES
        // ------------------------------------------------------

        const resultado =
          await obtenerActividadesYPorcentajeAvance(data.atencion_id);

        const lista = Array.isArray(resultado?.actividades)
          ? resultado.actividades.filter(
              (actividad) =>
                actividad && actividad.eliminado !== true
            )
          : [];

        setActividades(lista);

        // ------------------------------------------------------
        // CALCULAR AVANCE
        // ------------------------------------------------------

        const completadas = lista.filter(
          (actividad) =>
            estadoNormalizado(actividad) === 'completada'
        ).length;

        const noRealizadas = lista.filter(
          (actividad) =>
            estadoNormalizado(actividad) === 'no realizada'
        ).length;

        const procesadas = completadas + noRealizadas;

        const porcentajeCalculado =
          lista.length === 0
            ? 0
            : Math.round((procesadas / lista.length) * 100);

        setPorcentaje(
          Math.min(100, Math.max(0, porcentajeCalculado))
        );

        // ------------------------------------------------------
        // VALIDAR CONDICIONES PARA FINALIZAR
        // ------------------------------------------------------

        const atencionEstaActiva =
          String(data.estado || '').trim().toLowerCase() === 'activa';

        setListaParaFinalizar(
          atencionEstaActiva &&
          todasLasActividadesProcesadas(lista)
        );

        // ------------------------------------------------------
        // CONSULTAR RECETAS INDEPENDIENTEMENTE
        // ------------------------------------------------------
        //
        // Un error en recetas no debe interrumpir la carga
        // de actividades ni modificar el avance.
        // ------------------------------------------------------

        await cargarRecetas(data.atencion_id);

      } catch (error) {
        console.error(
          'Error al cargar el detalle de la atención:',
          error
        );

        setListaParaFinalizar(false);

        setErrorCarga(
          error?.message ||
          'No se pudo cargar la información de la atención.'
        );
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [atencionId, cargarRecetas]
  );

  // ============================================================
  // CARGA INICIAL Y ACTUALIZACIÓN
  // ============================================================

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle, parametroRefrescar]);

  // ============================================================
  // NAVEGACIÓN
  // ============================================================

  function volverAAtenciones() {
    setMenuAbierto(false);
    router.replace('/atenciones/atenciones');
  }

  function abrirDetalleActividad(actividad) {
    if (!actividad?.actividad_id) {
      Alert.alert(
        'No se puede abrir el detalle',
        'No se recibió el identificador de la actividad.'
      );
      return;
    }

    router.push({
      pathname: '/actividades/detalleActividad',
      params: {
        actividad_id: String(actividad.actividad_id),
        actividad: JSON.stringify(actividad),
        atencion_id: String(atencion?.atencion_id || ''),
        numero_historia: String(atencion?.numero_historia || ''),
        atencion_estado: String(atencion?.estado || ''),
      },
    });
  }

  // ============================================================
  // RF32: EDITAR ACTIVIDAD
  // ============================================================

  function abrirEdicionActividad(actividad) {
    if (!actividad?.actividad_id || !atencion?.atencion_id) {
      Alert.alert(
        'No se puede editar',
        'No se encontró la información necesaria de la actividad.'
      );
      return;
    }

    router.push({
      pathname: '/actividades/editarActividad',
      params: {
        actividad_id: String(actividad.actividad_id),
        atencion_id: String(atencion.atencion_id),
        estado: String(actividad.estado ?? ''),
        atencion_estado: String(atencion.estado ?? ''),
        descripcion: String(actividad.observaciones ?? ''),
        fecha_prevista: String(actividad.fecha_prevista ?? ''),
      },
    });
  }

  // ============================================================
  // ELIMINACIÓN LÓGICA
  // ============================================================

  async function ejecutarEliminacionActividad(actividad) {
    const actividadId = actividad?.actividad_id;

    if (!actividadId || eliminandoId !== null) return;

    setEliminandoId(actividadId);

    try {
      await eliminarActividad(actividadId);
      await cargarDetalle(true);

      Alert.alert(
        'Actividad eliminada',
        'La actividad se eliminó correctamente. Sus registros clínicos relacionados se conservaron.'
      );
    } catch (error) {
      console.error('Error eliminando actividad:', error);

      Alert.alert(
        'No se pudo eliminar',
        error?.message ||
        'Ocurrió un error al eliminar la actividad. Inténtalo nuevamente.'
      );
    } finally {
      setEliminandoId(null);
    }
  }

  function confirmarEliminacionActividad(actividad) {
    const nombre = nombreTipo(actividad);

    Alert.alert(
      'Eliminar actividad',
      `¿Estás seguro de que deseas eliminar la actividad "${nombre}" N.° ${actividad.actividad_id}?\n\nLa eliminación será lógica y se conservarán sus registros clínicos relacionados.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => ejecutarEliminacionActividad(actividad),
        },
      ]
    );
  }

  // ============================================================
  // REGISTRAR ACTIVIDADES
  // ============================================================

  function abrirRegistroActividad() {
    if (!atencion?.atencion_id) return;

    router.push({
      pathname: '/actividades/registrarActividad',
      params: {
        atencion_id: String(atencion.atencion_id),
        numero_historia: String(atencion.numero_historia || ''),
      },
    });
  }

  // ============================================================
  // REGISTRAR RECETA MÉDICA
  // ============================================================

  function abrirRegistroReceta() {
    const idAtencion = atencion?.atencion_id;

    if (!idAtencion) {
      Alert.alert(
        'No se puede registrar la receta',
        'No se encontró el identificador de la atención.'
      );
      return;
    }

    setMenuAbierto(false);

    router.push({
      pathname: '/recetas/registrar',
      params: {
        atencion_id: String(idAtencion),
        numero_historia: String(atencion?.numero_historia || ''),
      },
    });
  }

  // ============================================================
  // VER DETALLE DE RECETA
  // ============================================================

  function abrirDetalleReceta(receta) {
    const recetaId = receta?.receta_id;

    if (!recetaId) {
      Alert.alert(
        'No se puede abrir la receta',
        'No se encontró el identificador de la receta.'
      );
      return;
    }

    router.push({
      pathname: '/recetas/detalle',
      params: {
        receta_id: String(recetaId),
        atencion_id: String(atencion?.atencion_id || ''),
        numero_historia: String(atencion?.numero_historia || ''),
      },
    });
  }

  // ============================================================
  // RF25: ABRIR MODAL DE CONFIRMACIÓN
  // ============================================================

  function confirmarFinalizacion() {
    if (!listaParaFinalizar || !atencion || finalizando) {
      Alert.alert(
        'Atención no disponible',
        'La atención debe estar activa y todas sus actividades vigentes deben estar procesadas.'
      );
      return;
    }

    setModalFinalizacionVisible(true);
  }

  // ============================================================
  // RF25: EJECUTAR FINALIZACIÓN
  // ============================================================

  async function ejecutarFinalizacion() {
    if (!atencion?.atencion_id || finalizando) return;

    const atencionSigueActiva =
      String(atencion.estado || '').trim().toLowerCase() === 'activa';

    if (!atencionSigueActiva) {
      setModalFinalizacionVisible(false);

      Alert.alert(
        'Atención no disponible',
        'La atención ya no se encuentra activa.'
      );

      await cargarDetalle(true);
      return;
    }

    if (!todasLasActividadesProcesadas(actividades)) {
      setModalFinalizacionVisible(false);

      Alert.alert(
        'No se puede finalizar',
        'Debe existir al menos una actividad vigente y todas deben estar Completadas o No realizadas.'
      );

      await cargarDetalle(true);
      return;
    }

    setFinalizando(true);

    try {
      // --------------------------------------------------------
      // 1. VALIDAR NUEVAMENTE EN SUPABASE
      // --------------------------------------------------------

      const verificacion =
        await verificarAtencionListaParaFinalizarServicio(
          atencion.atencion_id
        );

      if (verificacion?.listaParaFinalizar !== true) {
        setListaParaFinalizar(false);

        throw new Error(
          'La atención ya no cumple las condiciones para finalizar. Actualiza la información y verifica sus actividades.'
        );
      }

      // --------------------------------------------------------
      // 2. SOLICITAR LA FINALIZACIÓN EN SUPABASE
      // --------------------------------------------------------

      const resultado =
        await finalizarAtencionServicio(atencion.atencion_id);

      if (resultado?.finalizada !== true) {
        throw new Error(
          'Supabase no confirmó la finalización de la atención.'
        );
      }

      // --------------------------------------------------------
      // 3. ACTUALIZAR EL ESTADO LOCAL
      // --------------------------------------------------------

      setAtencion((actual) => ({
        ...actual,
        estado: 'Finalizada',
        fecha_fin:
          resultado.fecha_fin || new Date().toISOString(),
      }));

      setListaParaFinalizar(false);

      // --------------------------------------------------------
      // 4. CERRAR EL MODAL
      // --------------------------------------------------------

      setModalFinalizacionVisible(false);

      // --------------------------------------------------------
      // 5. RECARGAR LOS DATOS
      // --------------------------------------------------------

      await cargarDetalle(true);

      Alert.alert(
        'Atención finalizada',
        'La atención se finalizó correctamente.'
      );

    } catch (error) {
      console.error(
        'ERROR AL FINALIZAR ATENCIÓN:',
        error
      );

      Alert.alert(
        'No se pudo finalizar',
        error?.message ||
          'Ocurrió un error al actualizar la atención en Supabase.'
      );

      // El modal permanece abierto para permitir otro intento.

    } finally {
      setFinalizando(false);
    }
  }

  // ============================================================
  // INDICADORES
  // ============================================================

  const pendientes = actividades.filter(
    (actividad) =>
      estadoNormalizado(actividad) === 'pendiente'
  ).length;

  const completadas = actividades.filter(
    (actividad) =>
      estadoNormalizado(actividad) === 'completada'
  ).length;

  const noRealizadas = actividades.filter(
    (actividad) =>
      estadoNormalizado(actividad) === 'no realizada'
  ).length;

  const totalProcesadas = completadas + noRealizadas;

  const atencionActiva =
    String(atencion?.estado || '').trim().toLowerCase() === 'activa';

  const mostrarBotonFinalizar =
    atencionActiva &&
    listaParaFinalizar === true &&
    actividades.length > 0 &&
    todasLasActividadesProcesadas(actividades);

  // ============================================================
  // PANTALLA DE CARGA
  // ============================================================

  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedor}>
        <EncabezadoPetCare
          titulo="PetCare"
          onAbrirMenu={() => setMenuAbierto(true)}
          onAbrirNotificaciones={() =>
            Alert.alert(
              'Notificaciones',
              'No tienes notificaciones nuevas.'
            )
          }
        />

        <View style={estilos.centro}>
          <ActivityIndicator size="large" color={C.verde} />

          <Text style={estilos.textoCarga}>
            Cargando detalle de la atención...
          </Text>
        </View>

        <MenuLateralDerecho
          visible={menuAbierto}
          onCerrar={() => setMenuAbierto(false)}
          nombreUsuario=""
          rolUsuario=""
          onCerrarSesion={() => router.replace('/')}
        />
      </SafeAreaView>
    );
  }

  // ============================================================
  // VISTA PRINCIPAL
  // ============================================================

  return (
    <SafeAreaView style={estilos.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() =>
          Alert.alert(
            'Notificaciones',
            'No tienes notificaciones nuevas.'
          )
        }
      />

      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => cargarDetalle(true)}
            tintColor={C.verde}
          />
        }
      >
        {/* RUTA SUPERIOR */}

        <View style={estilos.migas}>
          <Pressable onPress={volverAAtenciones}>
            <Text style={estilos.textoMiga}>Atenciones</Text>
          </Pressable>

          <Text style={estilos.textoMiga}> / </Text>

          <Text style={estilos.migaActual}>Detalle</Text>
        </View>

        {/* ENCABEZADO */}

        <View style={estilos.encabezadoPagina}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver a Atenciones"
            style={estilos.botonVolver}
            onPress={volverAAtenciones}
          >
            <Text style={estilos.flechaVolver}>←</Text>
          </Pressable>

          <View style={estilos.tituloContenedor}>
            <Text style={estilos.titulo}>
              Detalle de atención
            </Text>

            <Text style={estilos.descripcion}>
              Consulta las actividades y el avance de la atención.
            </Text>
          </View>
        </View>

        {/* MENSAJE INFORMATIVO */}

        {mostrarBotonFinalizar && (
          <View style={estilos.mensajeListaFinalizar}>
            <Text style={estilos.tituloListaFinalizar}>
              Atención lista para finalizar
            </Text>

            <Text style={estilos.textoListaFinalizar}>
              Todas las actividades vigentes están procesadas.
              Puedes finalizar la atención cuando lo confirmes.
            </Text>
          </View>
        )}

        {/* ERROR DE ATENCIÓN Y ACTIVIDADES */}

        {!!errorCarga && (
          <View style={estilos.tarjetaError}>
            <Text style={estilos.tituloError}>
              No se pudo cargar la información
            </Text>

            <Text style={estilos.textoError}>
              {errorCarga}
            </Text>

            <Pressable
              style={estilos.botonPrincipal}
              onPress={() => cargarDetalle()}
            >
              <Text style={estilos.textoBotonBlanco}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        )}

        {atencion && (
          <>
            {/* FICHA DE ATENCIÓN */}

            <View style={estilos.tarjetaPrincipal}>
              <Text style={estilos.etiquetaDato}>
                ID de atención
              </Text>

              <Text style={estilos.idAtencion}>
                {atencion.atencion_id}
              </Text>

              <View style={estilos.separador} />

              <View style={estilos.filaDato}>
                <Text style={estilos.etiquetaDato}>
                  Número de historia
                </Text>

                <Text style={estilos.valorDato}>
                  {atencion.numero_historia || 'No registrado'}
                </Text>
              </View>

              <View style={estilos.filaDato}>
                <Text style={estilos.etiquetaDato}>
                  Fecha de inicio
                </Text>

                <Text style={estilos.valorDato}>
                  {fechaLegible(atencion.fecha_inicio)}
                </Text>
              </View>

              <View
                style={[
                  estilos.filaDato,
                  { marginBottom: 0 },
                ]}
              >
                <Text style={estilos.etiquetaDato}>
                  Fecha de finalización
                </Text>

                <Text style={estilos.valorDato}>
                  {fechaLegible(atencion.fecha_fin)}
                </Text>
              </View>

              <View style={estilos.filaEstadoAtencion}>
                <Text style={estilos.etiquetaDato}>
                  Estado de atención
                </Text>

                <View
                  style={[
                    estilos.etiquetaEstado,
                    {
                      backgroundColor: colorEstado(atencion.estado).fondo,
                    },
                  ]}
                >
                  <Text
                    style={[
                      estilos.textoEstado,
                      {
                        color: colorEstado(atencion.estado).texto,
                      },
                    ]}
                  >
                    {atencion.estado}
                  </Text>
                </View>
              </View>
            </View>

            {/* ACTIVIDADES DE LA ATENCIÓN */}

            <View style={estilos.encabezadoSeccion}>
              <Text style={estilos.tituloSeccion}>
                Actividades de la atención
              </Text>
            </View>

            {/* RESUMEN DE ACTIVIDADES */}

            <View style={estilos.resumenActividades}>
              <View style={estilos.indicador}>
                <Text style={estilos.numeroPendiente}>
                  {pendientes}
                </Text>

                <Text style={estilos.textoIndicador}>
                  Pendientes
                </Text>
              </View>

              <View style={estilos.indicador}>
                <Text style={estilos.numeroCompletado}>
                  {completadas}
                </Text>

                <Text style={estilos.textoIndicador}>
                  Completadas
                </Text>
              </View>

              <View style={estilos.indicador}>
                <Text style={estilos.numeroNoRealizadas}>
                  {noRealizadas}
                </Text>

                <Text style={estilos.textoIndicador}>
                  No realizadas
                </Text>
              </View>
            </View>

            {/* PORCENTAJE DE AVANCE */}

            <View style={estilos.tarjetaAvance}>
              <View style={estilos.filaAvance}>
                <View style={estilos.datosAvance}>
                  <Text style={estilos.tituloAvance}>
                    Porcentaje de avance
                  </Text>

                  <Text style={estilos.descripcionAvance}>
                    Actividades procesadas de esta atención
                  </Text>
                </View>

                <Text style={estilos.porcentajeAvance}>
                  {porcentaje}%
                </Text>
              </View>

              <View
                style={estilos.barraFondo}
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: porcentaje,
                }}
              >
                <View
                  style={[
                    estilos.barraValor,
                    { width: `${porcentaje}%` },
                  ]}
                />
              </View>

              <Text style={estilos.textoAvance}>
                {actividades.length === 0
                  ? 'Todavía no hay actividades registradas.'
                  : `${totalProcesadas} de ${actividades.length} actividades procesadas (${completadas} completadas y ${noRealizadas} no realizadas).`}
              </Text>
            </View>

            {/* LISTA DE ACTIVIDADES */}

            {actividades.length === 0 ? (
              <View style={estilos.estadoVacio}>
                <Text style={estilos.tituloVacio}>
                  No hay actividades registradas
                </Text>

                <Text style={estilos.textoVacio}>
                  Agrega actividades para esta atención.
                </Text>
              </View>
            ) : (
              actividades.map((actividad) => {
                const estado = estadoVisible(actividad);
                const colores = colorEstado(estado);

                return (
                  <View
                    key={String(actividad.actividad_id)}
                    style={estilos.tarjetaActividad}
                  >
                    <View style={estilos.filaActividad}>
                      <View style={estilos.iconoActividad}>
                        <Text style={estilos.iconoActividadTexto}>
                          ✓
                        </Text>
                      </View>

                      <View style={estilos.datosActividad}>
                        <Text style={estilos.nombreActividad}>
                          {nombreTipo(actividad)}
                        </Text>

                        <Text style={estilos.subtexto}>
                          Actividad N.° {actividad.actividad_id}
                        </Text>

                        <Text style={estilos.subtexto}>
                          Atención N.° {atencion.atencion_id}
                        </Text>

                        <Text style={estilos.subtexto}>
                          Fecha prevista: {fechaLegible(actividad.fecha_prevista)}
                        </Text>
                      </View>

                      <View
                        style={[
                          estilos.etiquetaEstado,
                          { backgroundColor: colores.fondo },
                        ]}
                      >
                        <Text
                          style={[
                            estilos.textoEstado,
                            { color: colores.texto },
                          ]}
                        >
                          {estado}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      style={estilos.botonVerDetalle}
                      onPress={() => abrirDetalleActividad(actividad)}
                    >
                      <Text style={estilos.textoVerDetalle}>
                        Ver detalle
                      </Text>

                      <Text style={estilos.flechaDetalle}>
                        ›
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            )}

            {/* ACCIONES DE ATENCIÓN ACTIVA */}

            {atencionActiva && (
              <>
                <Pressable
                  accessibilityRole="button"
                  style={estilos.botonAgregar}
                  onPress={abrirRegistroActividad}
                >
                  <Text style={estilos.textoBotonAgregar}>
                    + Agregar actividades
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  style={estilos.botonReceta}
                  onPress={abrirRegistroReceta}
                >
                  <Text style={estilos.textoBotonReceta}>
                    + Agregar receta médica
                  </Text>
                </Pressable>
              </>
            )}

            {/* ==================================================
                RECETAS MÉDICAS
                Sección independiente de las consultas.
                Aparece debajo de "Agregar receta médica".
            ================================================== */}

            <View style={estilos.seccionRecetas}>
              <View style={estilos.encabezadoRecetas}>
                <View style={estilos.encabezadoRecetasTexto}>
                  <Text style={estilos.tituloSeccion}>
                    Recetas médicas
                  </Text>

                  <Text style={estilos.descripcionRecetas}>
                    Recetas registradas para esta atención.
                  </Text>
                </View>

                <View style={estilos.contadorRecetas}>
                  <Text style={estilos.textoContadorRecetas}>
                    {recetas.length}
                  </Text>
                </View>
              </View>

              {cargandoRecetas ? (
                <View style={estilos.estadoRecetas}>
                  <ActivityIndicator
                    size="small"
                    color={C.verde}
                  />

                  <Text style={estilos.textoEstadoRecetas}>
                    Cargando recetas...
                  </Text>
                </View>
              ) : errorRecetas ? (
                <View style={estilos.errorRecetas}>
                  <Text style={estilos.tituloErrorRecetas}>
                    No se pudieron cargar las recetas
                  </Text>

                  <Text style={estilos.textoErrorRecetas}>
                    {errorRecetas}
                  </Text>

                  <Pressable
                    style={estilos.botonReintentarRecetas}
                    onPress={() => cargarRecetas(atencion.atencion_id)}
                  >
                    <Text style={estilos.textoReintentarRecetas}>
                      Reintentar
                    </Text>
                  </Pressable>
                </View>
              ) : recetas.length === 0 ? (
                <View style={estilos.estadoVacioRecetas}>
                  <Text style={estilos.iconoVacioRecetas}>
                    Rx
                  </Text>

                  <Text style={estilos.tituloVacio}>
                    No hay recetas registradas
                  </Text>

                  <Text style={estilos.textoVacio}>
                    Las recetas que registres para esta atención aparecerán aquí.
                  </Text>
                </View>
              ) : (
                recetas.map((receta) => (
                  <View
                    key={String(receta.receta_id)}
                    style={estilos.tarjetaReceta}
                  >
                    <View style={estilos.filaReceta}>
                      <View style={estilos.iconoReceta}>
                        <Text style={estilos.iconoRecetaTexto}>
                          Rx
                        </Text>
                      </View>

                      <View style={estilos.datosReceta}>
                        <Text style={estilos.nombreReceta}>
                          Receta médica N.° {receta.receta_id}
                        </Text>

                        <Text style={estilos.subtextoReceta}>
                          Fecha: {fechaLegible(receta.fecha_registro)}
                        </Text>

                        {!!receta.diagnostico && (
                          <Text
                            style={estilos.detalleRecetaTexto}
                            numberOfLines={2}
                          >
                            Diagnóstico: {receta.diagnostico}
                          </Text>
                        )}

                        {!!receta.recomendaciones && (
                          <Text
                            style={estilos.detalleRecetaTexto}
                            numberOfLines={2}
                          >
                            Recomendaciones: {receta.recomendaciones}
                          </Text>
                        )}
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      style={estilos.botonVerReceta}
                      onPress={() => abrirDetalleReceta(receta)}
                    >
                      <Text style={estilos.textoVerReceta}>
                        Ver detalle de receta
                      </Text>

                      <Text style={estilos.flechaDetalle}>
                        ›
                      </Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            {/* RF25: BOTÓN FINALIZAR */}

            {mostrarBotonFinalizar && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Finalizar atención"
                style={[
                  estilos.botonFinalizar,
                  finalizando && estilos.botonDeshabilitado,
                ]}
                disabled={finalizando}
                onPress={confirmarFinalizacion}
              >
                {finalizando ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={estilos.textoBotonBlanco}>
                    Finalizar atención
                  </Text>
                )}
              </Pressable>
            )}
          </>
        )}

        {/* PIE DE PÁGINA */}

        <Text style={estilos.pie}>
          PetCare · Seguimiento de atención veterinaria
        </Text>
      </ScrollView>

      {/* ========================================================
          MODAL DE CONFIRMACIÓN DE FINALIZACIÓN
      ======================================================== */}

      {modalFinalizacionVisible && (
        <View style={estilos.fondoModal}>
          <View style={estilos.modalFinalizacion}>
            <View style={estilos.iconoModalFinalizacion}>
              <Text style={estilos.iconoModalTexto}>
                ✓
              </Text>
            </View>

            <Text style={estilos.tituloModalFinalizacion}>
              ¿Finalizar atención?
            </Text>

            <Text style={estilos.descripcionModalFinalizacion}>
              Todas las actividades vigentes están procesadas.
              ¿Estás seguro de que deseas finalizar esta atención veterinaria?
            </Text>

            <View style={estilos.resumenModal}>
              <Text style={estilos.resumenModalTexto}>
                Actividades procesadas
              </Text>

              <Text style={estilos.resumenModalNumero}>
                {actividades.length} de {actividades.length}
              </Text>
            </View>

            <View style={estilos.botonesModal}>
              <Pressable
                style={estilos.botonCancelarModal}
                disabled={finalizando}
                onPress={() => setModalFinalizacionVisible(false)}
              >
                <Text style={estilos.textoCancelarModal}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                style={[
                  estilos.botonConfirmarModal,
                  finalizando && estilos.botonDeshabilitado,
                ]}
                disabled={finalizando}
                onPress={ejecutarFinalizacion}
              >
                {finalizando ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={estilos.textoConfirmarModal}>
                    Sí, finalizar
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        nombreUsuario=""
        rolUsuario=""
        onCerrarSesion={() => router.replace('/')}
      />
    </SafeAreaView>
  );
}

// ============================================================
// ESTILOS
// ============================================================

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

  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  textoCarga: {
    color: C.secundario,
    fontSize: 14,
    marginTop: 13,
  },

  migas: {
    flexDirection: 'row',
    marginBottom: 20,
  },

  textoMiga: {
    color: C.secundario,
    fontSize: 13,
  },

  migaActual: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '700',
  },

  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  flechaVolver: {
    color: C.verde,
    fontSize: 26,
    fontWeight: '700',
  },

  tituloContenedor: {
    flex: 1,
  },

  titulo: {
    color: C.texto,
    fontSize: 24,
    fontWeight: '800',
  },

  descripcion: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  tarjetaPrincipal: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 17,
    marginBottom: 22,
  },

  idAtencion: {
    color: C.texto,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 5,
  },

  separador: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 14,
  },

  filaDato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },

  filaEstadoAtencion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },

  etiquetaDato: {
    color: C.secundario,
    fontSize: 12,
    flex: 1,
  },

  valorDato: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1.4,
  },

  encabezadoSeccion: {
    marginBottom: 14,
  },

  tituloSeccion: {
    color: C.texto,
    fontSize: 18,
    fontWeight: '800',
  },

  resumenActividades: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 18,
  },

  indicador: {
    flex: 1,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },

  numeroPendiente: {
    color: C.naranjaTexto,
    fontSize: 22,
    fontWeight: '800',
  },

  numeroCompletado: {
    color: C.verde,
    fontSize: 22,
    fontWeight: '800',
  },

  numeroNoRealizadas: {
    color: C.rojoTexto,
    fontSize: 22,
    fontWeight: '800',
  },

  textoIndicador: {
    color: C.secundario,
    fontSize: 10,
    marginTop: 4,
  },

  tarjetaAvance: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 16,
    marginBottom: 18,
  },

  filaAvance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  datosAvance: {
    flex: 1,
    paddingRight: 10,
  },

  tituloAvance: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
  },

  descripcionAvance: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 5,
  },

  porcentajeAvance: {
    color: C.verde,
    fontSize: 25,
    fontWeight: '800',
  },

  barraFondo: {
    height: 10,
    backgroundColor: C.verdeClaro,
    borderRadius: 10,
    overflow: 'hidden',
  },

  barraValor: {
    height: '100%',
    backgroundColor: C.verde,
    borderRadius: 10,
  },

  textoAvance: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 9,
  },

  tarjetaActividad: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 14,
    marginBottom: 12,
  },

  filaActividad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconoActividad: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  iconoActividadTexto: {
    color: C.verde,
    fontSize: 20,
    fontWeight: '900',
  },

  datosActividad: {
    flex: 1,
  },

  nombreActividad: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '800',
  },

  subtexto: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 5,
  },

  etiquetaEstado: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 6,
  },

  textoEstado: {
    fontSize: 10,
    fontWeight: '800',
  },

  botonVerDetalle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: C.borde,
  },

  textoVerDetalle: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
  },

  flechaDetalle: {
    color: C.verde,
    fontSize: 25,
    fontWeight: '700',
  },

  estadoVacio: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    padding: 24,
    marginBottom: 18,
  },

  tituloVacio: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
  },

  textoVacio: {
    color: C.secundario,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },

  tarjetaError: {
    backgroundColor: C.blanco,
    borderColor: C.rojo,
    borderWidth: 1,
    borderRadius: 15,
    padding: 17,
    marginBottom: 20,
  },

  tituloError: {
    color: C.rojoTexto,
    fontSize: 16,
    fontWeight: '800',
  },

  textoError: {
    color: C.texto,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  botonPrincipal: {
    backgroundColor: C.verde,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 15,
  },

  botonAgregar: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.verde,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },

  textoBotonAgregar: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
  },

  botonReceta: {
    backgroundColor: C.verde,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },

  textoBotonReceta: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },

  // ----------------------------------------------------------
  // SECCIÓN INDEPENDIENTE DE RECETAS
  // ----------------------------------------------------------

  seccionRecetas: {
    marginTop: 24,
    marginBottom: 10,
  },

  encabezadoRecetas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  encabezadoRecetasTexto: {
    flex: 1,
  },

  descripcionRecetas: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 5,
  },

  contadorRecetas: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  textoContadorRecetas: {
    color: C.verdeOscuro,
    fontSize: 14,
    fontWeight: '800',
  },

  estadoRecetas: {
    backgroundColor: C.blanco,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 22,
    alignItems: 'center',
  },

  textoEstadoRecetas: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 10,
  },

  errorRecetas: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.rojo,
    borderRadius: 14,
    padding: 16,
  },

  tituloErrorRecetas: {
    color: C.rojoTexto,
    fontSize: 14,
    fontWeight: '800',
  },

  textoErrorRecetas: {
    color: C.texto,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },

  botonReintentarRecetas: {
    alignSelf: 'flex-start',
    backgroundColor: C.verdeClaro,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 12,
  },

  textoReintentarRecetas: {
    color: C.verdeOscuro,
    fontSize: 12,
    fontWeight: '800',
  },

  estadoVacioRecetas: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    alignItems: 'center',
    padding: 22,
  },

  iconoVacioRecetas: {
    color: C.verde,
    backgroundColor: C.verdeClaro,
    overflow: 'hidden',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 8,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  tarjetaReceta: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 14,
    marginBottom: 12,
  },

  filaReceta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconoReceta: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  iconoRecetaTexto: {
    color: C.verdeOscuro,
    fontSize: 15,
    fontWeight: '900',
  },

  datosReceta: {
    flex: 1,
  },

  nombreReceta: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '800',
  },

  subtextoReceta: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 6,
  },

  detalleRecetaTexto: {
    color: C.texto,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },

  botonVerReceta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: C.borde,
  },

  textoVerReceta: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
  },

  // ----------------------------------------------------------
  // FINALIZACIÓN
  // ----------------------------------------------------------

  mensajeListaFinalizar: {
    backgroundColor: C.verdeClaro,
    borderWidth: 1,
    borderColor: C.verde,
    borderRadius: 12,
    padding: 15,
    marginTop: 16,
  },

  tituloListaFinalizar: {
    color: C.verdeOscuro,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },

  textoListaFinalizar: {
    color: C.texto,
    fontSize: 12,
    lineHeight: 19,
  },

  botonFinalizar: {
    backgroundColor: C.azul,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 15,
    marginTop: 10,
  },

  botonDeshabilitado: {
    opacity: 0.65,
  },

  textoBotonBlanco: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },

  pie: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 25,
  },

  // ----------------------------------------------------------
  // MODAL DE FINALIZACIÓN
  // ----------------------------------------------------------

  fondoModal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 35, 40, 0.60)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
    elevation: 20,
  },

  modalFinalizacion: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: C.blanco,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },

  iconoModalFinalizacion: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.verdeClaro,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  iconoModalTexto: {
    color: C.verde,
    fontSize: 30,
    fontWeight: '900',
  },

  tituloModalFinalizacion: {
    color: C.texto,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  descripcionModalFinalizacion: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
  },

  resumenModal: {
    width: '100%',
    backgroundColor: C.verdeClaro,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  resumenModalTexto: {
    color: C.verdeOscuro,
    fontSize: 12,
    fontWeight: '600',
  },

  resumenModalNumero: {
    color: C.verdeOscuro,
    fontSize: 16,
    fontWeight: '800',
  },

  botonesModal: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },

  botonCancelarModal: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },

  textoCancelarModal: {
    color: C.secundario,
    fontSize: 13,
    fontWeight: '800',
  },

  botonConfirmarModal: {
    flex: 1,
    backgroundColor: C.verde,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoConfirmarModal: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
});
