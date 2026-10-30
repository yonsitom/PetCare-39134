
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';

import EncabezadoPetCare from '../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../components/layout/MenuLateralDerecho';

import {
  listarHistorialSeguimiento,
  consultarActividadesPorEstado,
  consultarDetalleActividad,

  // RF43
  iniciarSeguimientoTiempoRealControlador,
  suscribirseEstadoTiempoRealControlador,
  detenerSeguimientoTiempoRealControlador,
} from '../controllers/seguimiento/seguimientoControlador';
import { logger } from '../utils/logger';

// ============================================================
// CONSTANTES
// ============================================================

const FILTROS_FECHA = [
  'Todas',
  'Hoy',
  'Esta semana',
  'Personalizar',
];

const FILTROS_ACTIVIDAD = [
  'Todas',
  'Pendiente',
  'Completada',
  'No realizada',
];

const MENSAJES_SIN_RESULTADOS = {
  Todas:
    'No hay actividades registradas para esta atención.',
  Pendiente:
    'No hay actividades pendientes',
  Completada:
    'No hay actividades completadas',
  'No realizada':
    'No hay actividades no realizadas',
};

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function fechaValida(valor) {
  if (!valor) return null;

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime())
    ? null
    : fecha;
}

function formatearFecha(valor) {
  const fecha = fechaValida(valor);

  if (!fecha) return 'Fecha no disponible';

  return fecha.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function obtenerNombrePropietario(propietario) {
  return [
    propietario?.nombre,
    propietario?.apellido,
  ]
    .filter(Boolean)
    .join(' ') || 'Propietario no disponible';
}

function obtenerFechaActividad(actividad) {
  return (
    actividad?.fechaMostrar ||
    actividad?.fecha_prevista ||
    actividad?.fecha_registro ||
    actividad?.created_at ||
    null
  );
}

function obtenerDescripcionActividad(actividad) {
  const detalle =
    actividad?.detalle &&
    typeof actividad.detalle === 'object'
      ? actividad.detalle
      : {};

  return (
    actividad?.observaciones ||
    detalle.descripcion ||
    detalle.motivo ||
    detalle.medicamento ||
    detalle.procedimiento ||
    'Sin descripción adicional'
  );
}

function coincideConBusqueda(item, busqueda, tipo) {
  const texto = normalizarTexto(busqueda);

  if (!texto) return true;

  const mascota = item.mascota || {};
  const propietario = item.propietario || {};

  const valores = [
    mascota.nombre,
    mascota.numero_historia,
    item.numero_historia,
    propietario.nombre,
    propietario.apellido,
    propietario.documento_identidad,
    obtenerNombrePropietario(propietario),
    mascota.especie,
    mascota.raza,
    item.tipo,
    item.estado,
    tipo === 'historial'
      ? item.atencion_id
      : item.actividad_id,
  ];

  return valores.some((valor) =>
    normalizarTexto(valor).includes(texto)
  );
}

function coincideConFecha(
  valorFecha,
  filtro,
  fechaDesde,
  fechaHasta
) {
  const fecha = fechaValida(valorFecha);

  if (filtro === 'Todas') return true;

  if (filtro === 'Personalizar') {
    const desde = fechaDesde
      ? fechaValida(`${fechaDesde}T00:00:00`)
      : null;

    const hasta = fechaHasta
      ? fechaValida(`${fechaHasta}T23:59:59.999`)
      : null;

    if (fechaDesde && !desde) return false;
    if (fechaHasta && !hasta) return false;
    if (desde && hasta && desde > hasta) return false;
    if (!fecha) return false;
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;

    return true;
  }

  if (!fecha) return false;

  const hoy = new Date();

  const inicioHoy = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate()
  );

  const finHoy = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate() + 1
  );

  if (filtro === 'Hoy') {
    return fecha >= inicioHoy && fecha < finHoy;
  }

  if (filtro === 'Esta semana') {
    const inicioSemana = new Date(inicioHoy);

    const dia = (inicioSemana.getDay() + 6) % 7;

    inicioSemana.setDate(
      inicioSemana.getDate() - dia
    );

    const inicioSemanaSiguiente =
      new Date(inicioSemana);

    inicioSemanaSiguiente.setDate(
      inicioSemanaSiguiente.getDate() + 7
    );

    return (
      fecha >= inicioSemana &&
      fecha < inicioSemanaSiguiente
    );
  }

  return true;
}

function filtrarActividadesPorEstado(
  actividades,
  estado
) {
  const vigentes = actividades.filter(
    (actividad) =>
      actividad &&
      typeof actividad === 'object' &&
      actividad.eliminado !== true &&
      [
        'Pendiente',
        'Completada',
        'No realizada',
      ].includes(actividad.estado)
  );

  if (estado === 'Todas') {
    return vigentes;
  }

  return vigentes.filter(
    (actividad) => actividad.estado === estado
  );
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function EtiquetaEstado({ estado }) {
  const estadoNormalizado = normalizarTexto(estado);

  let estiloEstado = styles.estadoPendiente;

  if (estadoNormalizado === 'completada') {
    estiloEstado = styles.estadoCompletada;
  } else if (estadoNormalizado === 'no realizada') {
    estiloEstado = styles.estadoNoRealizada;
  } else if (estadoNormalizado === 'activa') {
    estiloEstado = styles.estadoActiva;
  }

  return (
    <Text style={[styles.estado, estiloEstado]}>
      {estado || 'Sin estado'}
    </Text>
  );
}

function BotonFiltro({
  nombre,
  seleccionado,
  onPress,
}) {
  return (
    <Pressable
      style={[
        styles.filtro,
        seleccionado && styles.filtroActivo,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{
        selected: seleccionado,
      }}
    >
      <Text
        style={[
          styles.textoFiltro,
          seleccionado && styles.textoFiltroActivo,
        ]}
      >
        {nombre === 'Pendiente'
          ? 'Pendientes'
          : nombre === 'Completada'
            ? 'Completadas'
            : nombre === 'No realizada'
              ? 'No realizadas'
              : nombre}
      </Text>
    </Pressable>
  );
}

// ============================================================
// PANTALLA PRINCIPAL
// ============================================================

export default function Seguimiento() {
  const router = useRouter();

  // ==========================================================
  // PESTAÑAS
  // ==========================================================

  const [pestana, setPestana] = useState('Actividades');

  // ==========================================================
  // BÚSQUEDA Y FILTROS
  // ==========================================================

  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('Todas');

  const [
    filtroEstadoHistorial,
    setFiltroEstadoHistorial,
  ] = useState('');

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // ==========================================================
  // HISTORIAL
  // ==========================================================

  const [historial, setHistorial] = useState([]);

  // ==========================================================
  // RF40: ATENCIÓN Y ACTIVIDADES
  // ==========================================================

  const [
    atencionSeleccionada,
    setAtencionSeleccionada,
  ] = useState(null);

  const [actividades, setActividades] = useState([]);

  const [filtroActividad, setFiltroActividad] =
    useState('Todas');

  // ==========================================================
  // RF40: DETALLE DE ACTIVIDAD
  // ==========================================================

  const [detalleActividad, setDetalleActividad] =
    useState(null);

  const [modalDetalleVisible, setModalDetalleVisible] =
    useState(false);

  // ==========================================================
  // CARGAS
  // ==========================================================

  const [cargando, setCargando] = useState(true);

  const [cargandoActividades, setCargandoActividades] =
    useState(false);

  const [cargandoDetalle, setCargandoDetalle] =
    useState(false);

  const [actualizando, setActualizando] = useState(false);

  // ==========================================================
  // ERRORES Y MENSAJES
  // ==========================================================

  const [errorCarga, setErrorCarga] = useState(false);

  const [errorActividades, setErrorActividades] =
    useState('');

  const [mensajeActividades, setMensajeActividades] =
    useState('');

  const [errorDetalle, setErrorDetalle] = useState('');

  // ==========================================================
  // RF43: REFERENCIAS PARA CONTROLAR LA SUSCRIPCIÓN
  // ==========================================================

  const filtroActividadRef = useRef('Todas');

  const atencionIdRef = useRef(null);

  const componenteActivoRef = useRef(true);

  useEffect(() => {
    filtroActividadRef.current = filtroActividad;
  }, [filtroActividad]);

  useEffect(() => {
    atencionIdRef.current =
      atencionSeleccionada?.atencion_id ?? null;
  }, [atencionSeleccionada]);

  useEffect(() => {
    componenteActivoRef.current = true;

    return () => {
      componenteActivoRef.current = false;
    };
  }, []);

  // ==========================================================
  // CARGA DEL HISTORIAL
  // ==========================================================

  const cargarDatos = useCallback(
    async (recarga = false) => {
      if (recarga) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      setErrorCarga(false);

      try {
        const listaHistorial =
          await listarHistorialSeguimiento();

        if (!componenteActivoRef.current) return;

        setHistorial(
          Array.isArray(listaHistorial)
            ? listaHistorial
            : []
        );
      } catch (error) {
        logger.error(
          'Error cargando historial de seguimiento:',
          error
        );

        if (componenteActivoRef.current) {
          setErrorCarga(true);
        }
      } finally {
        if (componenteActivoRef.current) {
          setCargando(false);
          setActualizando(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ==========================================================
  // RF40: CONSULTAR ACTIVIDADES POR ESTADO
  // ==========================================================

  const cargarActividadesAtencion = useCallback(
    async (atencion, estado = 'Todas') => {
      if (!atencion?.atencion_id) {
        setErrorActividades(
          'Seleccione una atención para consultar sus actividades.'
        );

        return;
      }

      setCargandoActividades(true);
      setErrorActividades('');
      setMensajeActividades('');

      setFiltroActividad(estado);
      filtroActividadRef.current = estado;

      try {
        const resultado =
          await consultarActividadesPorEstado(
            atencion.atencion_id,
            estado
          );

        if (!componenteActivoRef.current) return;

        if (
          String(atencionIdRef.current) !==
          String(atencion.atencion_id)
        ) {
          return;
        }

        const lista = Array.isArray(
          resultado?.actividades
        )
          ? resultado.actividades
          : [];

        setActividades(lista);

        setMensajeActividades(
          resultado?.mensaje || ''
        );
      } catch (error) {
        logger.error(
          'RF40: error cargando actividades:',
          error
        );

        if (componenteActivoRef.current) {
          setErrorActividades(
            error?.message ||
              'No se pudieron consultar las actividades de la atención.'
          );
        }
      } finally {
        if (componenteActivoRef.current) {
          setCargandoActividades(false);
        }
      }
    },
    []
  );

  // ==========================================================
  // RF43: ACTUALIZACIÓN EN TIEMPO REAL
  // ==========================================================

  useEffect(() => {
    const atencionId =
      atencionSeleccionada?.atencion_id;

    if (!atencionId) {
      return undefined;
    }

    let efectoActivo = true;
    let cancelarEscucha = null;

    async function iniciarActualizacionTiempoReal() {
      setCargandoActividades(true);
      setErrorActividades('');
      setMensajeActividades('');

      try {
        // Primero escuchar el estado del servicio.
        cancelarEscucha =
          suscribirseEstadoTiempoRealControlador(
            (estado) => {
              if (!efectoActivo) return;

              if (
                String(atencionIdRef.current) !==
                String(atencionId)
              ) {
                return;
              }

              if (
                estado.atencionId !== null &&
                String(estado.atencionId) !==
                  String(atencionId)
              ) {
                return;
              }

              if (estado.atencionDisponible === false) {
                setActividades([]);

                setErrorActividades(
                  'La atención ya no se encuentra disponible.'
                );

                setMensajeActividades(
                  estado.mensaje ||
                    'La atención ya no se encuentra disponible.'
                );

                cargarDatos(true);

                return;
              }

              if (estado.mensaje) {
                setMensajeActividades(estado.mensaje);
              }

              if (Array.isArray(estado.actividades)) {
                const listaFiltrada =
                  filtrarActividadesPorEstado(
                    estado.actividades,
                    filtroActividadRef.current
                  );

                setActividades(listaFiltrada);

                setErrorActividades('');

                setMensajeActividades(
                  listaFiltrada.length === 0
                    ? MENSAJES_SIN_RESULTADOS[
                        filtroActividadRef.current
                      ]
                    : ''
                );
              }
            }
          );

        // Iniciar consulta y suscripción.
        const resultado =
          await iniciarSeguimientoTiempoRealControlador(
            atencionId
          );

        if (!efectoActivo) return;

        if (!resultado?.exito) {
          setMensajeActividades(
            resultado?.mensaje ||
              'No recibe correctamente la actualización realizada'
          );
        }
      } catch (error) {
        logger.error(
          'RF43: error iniciando actualización:',
          error
        );

        if (efectoActivo) {
          setMensajeActividades(
            'No recibe correctamente la actualización realizada'
          );
        }
      } finally {
        if (efectoActivo) {
          setCargandoActividades(false);
        }
      }
    }

    iniciarActualizacionTiempoReal();

    return () => {
      efectoActivo = false;

      if (typeof cancelarEscucha === 'function') {
        cancelarEscucha();
      }

      // Cancelar suscripción de la atención anterior.
      detenerSeguimientoTiempoRealControlador();
    };
  }, [
    atencionSeleccionada?.atencion_id,
    cargarDatos,
  ]);

  // ==========================================================
  // RF40: SELECCIONAR ATENCIÓN
  // ==========================================================

  const seleccionarAtencion = (atencion) => {
    if (!atencion?.atencion_id) return;

    setActividades([]);
    setErrorActividades('');
    setMensajeActividades('');

    setFiltroActividad('Todas');
    filtroActividadRef.current = 'Todas';

    atencionIdRef.current = atencion.atencion_id;

    setAtencionSeleccionada(atencion);
  };

  // ==========================================================
  // VOLVER A LA LISTA DE ATENCIONES
  // ==========================================================

  const volverAAtenciones = () => {
    atencionIdRef.current = null;

    setAtencionSeleccionada(null);
    setActividades([]);

    setFiltroActividad('Todas');
    filtroActividadRef.current = 'Todas';

    setErrorActividades('');
    setMensajeActividades('');

    setDetalleActividad(null);
    setModalDetalleVisible(false);
  };

  // ==========================================================
  // RF40: CONSULTAR DETALLE DE ACTIVIDAD
  // ==========================================================

  const abrirDetalleActividad = async (actividad) => {
    if (
      !atencionSeleccionada?.atencion_id ||
      !actividad?.actividad_id
    ) {
      return;
    }

    setCargandoDetalle(true);
    setErrorDetalle('');
    setDetalleActividad(null);
    setModalDetalleVisible(true);

    try {
      const resultado =
        await consultarDetalleActividad(
          atencionSeleccionada.atencion_id,
          actividad.actividad_id
        );

      if (!componenteActivoRef.current) return;

      setDetalleActividad(resultado);
    } catch (error) {
      logger.error(
        'RF40: error consultando detalle:',
        error
      );

      setErrorDetalle(
        error?.message ||
          'No se pudo consultar el detalle de la actividad.'
      );
    } finally {
      if (componenteActivoRef.current) {
        setCargandoDetalle(false);
      }
    }
  };

  const cerrarDetalleActividad = () => {
    setModalDetalleVisible(false);
    setDetalleActividad(null);
    setErrorDetalle('');
  };

  // ==========================================================
  // FILTRADO DEL HISTORIAL
  // ==========================================================

  const estadosHistorial = useMemo(() => {
    return [
      ...new Set(
        historial
          .map((item) => item.estado)
          .filter(Boolean)
          .filter(
            (estado) =>
              normalizarTexto(estado) !== 'activa'
          )
      ),
    ].sort((a, b) => a.localeCompare(b, 'es'));
  }, [historial]);

  const historialFiltrado = useMemo(() => {
    return historial.filter((item) => {
      const coincideBusqueda =
        coincideConBusqueda(
          item,
          busqueda,
          'historial'
        );

      const coincideFecha = coincideConFecha(
        item.fecha_inicio,
        filtroFecha,
        fechaDesde,
        fechaHasta
      );

      const coincideEstado =
        !filtroEstadoHistorial ||
        normalizarTexto(item.estado) ===
          normalizarTexto(filtroEstadoHistorial);

      return (
        coincideBusqueda &&
        coincideFecha &&
        coincideEstado
      );
    });
  }, [
    historial,
    busqueda,
    filtroFecha,
    fechaDesde,
    fechaHasta,
    filtroEstadoHistorial,
  ]);

  // ==========================================================
  // RF40: ATENCIONES DISPONIBLES
  // ==========================================================

  const atencionesDisponibles = useMemo(() => {
    return historial.filter((item) => {
      const coincideBusqueda =
        coincideConBusqueda(
          item,
          busqueda,
          'historial'
        );

      const coincideFecha = coincideConFecha(
        item.fecha_inicio,
        filtroFecha,
        fechaDesde,
        fechaHasta
      );

      return coincideBusqueda && coincideFecha;
    });
  }, [
    historial,
    busqueda,
    filtroFecha,
    fechaDesde,
    fechaHasta,
  ]);

  // ==========================================================
  // RF40: ACTIVIDADES FILTRADAS
  // ==========================================================

  const actividadesFiltradas = useMemo(() => {
    return actividades.filter((item) => {
      const coincideBusqueda =
        coincideConBusqueda(
          {
            ...item,
            mascota: atencionSeleccionada?.mascota,
            propietario:
              atencionSeleccionada?.propietario,
            numero_historia:
              atencionSeleccionada?.numero_historia,
          },
          busqueda,
          'actividad'
        );

      const coincideFecha = coincideConFecha(
        obtenerFechaActividad(item),
        filtroFecha,
        fechaDesde,
        fechaHasta
      );

      return coincideBusqueda && coincideFecha;
    });
  }, [
    actividades,
    atencionSeleccionada,
    busqueda,
    filtroFecha,
    fechaDesde,
    fechaHasta,
  ]);

  // ==========================================================
  // NAVEGACIÓN
  // ==========================================================

  const abrirDetalleAtencion = (atencionId) => {
    if (!atencionId) return;

    router.push({
      pathname: '/detalleAtencion',
      params: {
        atencion_id: String(atencionId),
      },
    });
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroFecha('Todas');
    setFiltroEstadoHistorial('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const cambiarPestana = (nombre) => {
    setPestana(nombre);
    setBusqueda('');
    setFiltroFecha('Todas');
    setFiltroEstadoHistorial('');
    setFechaDesde('');
    setFechaHasta('');

    if (nombre === 'Historial') {
      volverAAtenciones();
    }
  };

  // ==========================================================
  // VALIDACIÓN DE FECHAS
  // ==========================================================

  const fechaDesdeValida = fechaDesde
    ? fechaValida(`${fechaDesde}T00:00:00`)
    : null;

  const fechaHastaValida = fechaHasta
    ? fechaValida(`${fechaHasta}T00:00:00`)
    : null;

  const filtroPersonalizadoIncompleto =
    filtroFecha === 'Personalizar' &&
    (
      (fechaDesde && !fechaDesdeValida) ||
      (fechaHasta && !fechaHastaValida) ||
      (
        fechaDesdeValida &&
        fechaHastaValida &&
        fechaDesdeValida > fechaHastaValida
      )
    );

  // ==========================================================
  // TARJETA DE ATENCIÓN
  // ==========================================================

  const renderAtencion = ({ item }) => (
    <View style={styles.tarjeta}>
      <View style={styles.fila}>
        <Text style={styles.fecha}>
          {formatearFecha(item.fecha_inicio)}
        </Text>

        <Text style={styles.etiqueta}>
          Atención
        </Text>
      </View>

      <View style={styles.fila}>
        <View style={styles.flex}>
          <Text style={styles.nombreMascota}>
            {item.mascota?.nombre ||
              'Mascota sin nombre'}
          </Text>

          <Text style={styles.propietario}>
            {obtenerNombrePropietario(
              item.propietario
            )}
          </Text>
        </View>

        <EtiquetaEstado estado={item.estado} />
      </View>

      <Text style={styles.descripcion}>
        {item.mascota?.especie ||
          'Especie no indicada'}

        {item.mascota?.raza
          ? ` · ${item.mascota.raza}`
          : ''}
      </Text>

      <Text style={styles.textoSecundario}>
        Historia clínica:{' '}
        {item.numero_historia || 'No disponible'}
      </Text>

      <View style={styles.botonesAtencion}>
        <Pressable
          style={styles.botonSecundario}
          onPress={() =>
            abrirDetalleAtencion(item.atencion_id)
          }
          accessibilityRole="button"
        >
          <Text style={styles.textoBotonSecundario}>
            Ver atención
          </Text>
        </Pressable>

        <Pressable
          style={styles.boton}
          onPress={() => seleccionarAtencion(item)}
          accessibilityRole="button"
        >
          <Text style={styles.textoBoton}>
            Ver actividades
          </Text>
        </Pressable>
      </View>
    </View>
  );

  // ==========================================================
  // TARJETA DE ACTIVIDAD
  // ==========================================================

  const renderActividad = ({ item }) => (
    <Pressable
      style={styles.tarjeta}
      onPress={() => abrirDetalleActividad(item)}
      accessibilityRole="button"
    >
      <View style={styles.fila}>
        <Text style={styles.fecha}>
          {formatearFecha(
            obtenerFechaActividad(item)
          )}
        </Text>

        <EtiquetaEstado estado={item.estado} />
      </View>

      <Text style={styles.nombreMascota}>
        {item.tipo || 'Actividad'}
      </Text>

      <Text style={styles.descripcion}>
        {obtenerDescripcionActividad(item)}
      </Text>

      <Text style={styles.textoSecundario}>
        Actividad N.º {item.actividad_id}
      </Text>

      <Text style={styles.enlace}>
        Consultar detalle →
      </Text>
    </Pressable>
  );

  // ==========================================================
  // TARJETA DE HISTORIAL
  // ==========================================================

  const renderHistorial = ({ item }) => (
    <Pressable
      style={styles.tarjeta}
      onPress={() =>
        abrirDetalleAtencion(item.atencion_id)
      }
      accessibilityRole="button"
    >
      <View style={styles.fila}>
        <Text style={styles.fecha}>
          {formatearFecha(item.fecha_inicio)}
        </Text>

        <Text style={styles.etiqueta}>
          Atención
        </Text>
      </View>

      <View style={styles.fila}>
        <View style={styles.flex}>
          <Text style={styles.nombreMascota}>
            {item.mascota?.nombre ||
              'Mascota sin nombre'}
          </Text>

          <Text style={styles.propietario}>
            {obtenerNombrePropietario(
              item.propietario
            )}
          </Text>
        </View>

        <EtiquetaEstado estado={item.estado} />
      </View>

      <Text style={styles.descripcion}>
        {item.mascota?.especie ||
          'Especie no indicada'}

        {item.mascota?.raza
          ? ` · ${item.mascota.raza}`
          : ''}
      </Text>

      <View style={styles.filaInferior}>
        <Text style={styles.textoSecundario}>
          Historia clínica:{' '}
          {item.numero_historia || 'No disponible'}
        </Text>

        <Text style={styles.enlace}>
          Ver atención →
        </Text>
      </View>

      {item.fecha_fin ? (
        <Text style={styles.textoSecundario}>
          Finalizada: {formatearFecha(item.fecha_fin)}
        </Text>
      ) : null}
    </Pressable>
  );

  // ==========================================================
  // MODAL: DETALLE DE ACTIVIDAD
  // ==========================================================

  const renderModalDetalle = () => {
    const actividad = detalleActividad;

    const detalle =
      actividad?.detalle &&
      typeof actividad.detalle === 'object'
        ? actividad.detalle
        : {};

    return (
      <Modal
        visible={modalDetalleVisible}
        transparent
        animationType="fade"
        onRequestClose={cerrarDetalleActividad}
      >
        <View style={styles.fondoModal}>
          <View style={styles.contenidoModal}>
            <View style={styles.encabezadoModal}>
              <Text style={styles.tituloModal}>
                Detalle de actividad
              </Text>

              <Pressable
                onPress={cerrarDetalleActividad}
                accessibilityRole="button"
                accessibilityLabel="Cerrar detalle"
              >
                <Text style={styles.cerrarModal}>
                  ✕
                </Text>
              </Pressable>
            </View>

            {cargandoDetalle ? (
              <View style={styles.centroModal}>
                <ActivityIndicator
                  size="large"
                  color="#2563EB"
                />

                <Text style={styles.textoSecundario}>
                  Consultando información...
                </Text>
              </View>
            ) : errorDetalle ? (
              <View style={styles.centroModal}>
                <Text style={styles.error}>
                  {errorDetalle}
                </Text>
              </View>
            ) : actividad ? (
              <ScrollView
                style={styles.contenidoDetalle}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.etiquetaDetalle}>
                  Tipo de actividad
                </Text>

                <Text style={styles.valorDetalle}>
                  {actividad.tipo || 'No especificado'}
                </Text>

                <Text style={styles.etiquetaDetalle}>
                  Estado actual
                </Text>

                <View style={styles.estadoDetalle}>
                  <EtiquetaEstado
                    estado={actividad.estado}
                  />
                </View>

                <Text style={styles.etiquetaDetalle}>
                  Fecha prevista
                </Text>

                <Text style={styles.valorDetalle}>
                  {formatearFecha(
                    actividad.fecha_prevista
                  )}
                </Text>

                {actividad.fecha_realizacion ? (
                  <>
                    <Text style={styles.etiquetaDetalle}>
                      Fecha de realización
                    </Text>

                    <Text style={styles.valorDetalle}>
                      {formatearFecha(
                        actividad.fecha_realizacion
                      )}
                    </Text>
                  </>
                ) : null}

                <Text style={styles.etiquetaDetalle}>
                  Observaciones
                </Text>

                <Text style={styles.valorDetalle}>
                  {actividad.observaciones ||
                    detalle.descripcion ||
                    detalle.motivo ||
                    'Sin observaciones'}
                </Text>

                {actividad.motivo_no_realizada ? (
                  <>
                    <Text style={styles.etiquetaDetalle}>
                      Motivo de no realización
                    </Text>

                    <Text style={styles.valorDetalle}>
                      {actividad.motivo_no_realizada}
                    </Text>
                  </>
                ) : null}

                {Object.entries(detalle).map(
                  ([clave, valor]) => {
                    if (
                      valor === null ||
                      valor === undefined ||
                      valor === '' ||
                      typeof valor === 'object'
                    ) {
                      return null;
                    }

                    return (
                      <View key={clave}>
                        <Text style={styles.etiquetaDetalle}>
                          {clave
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (letra) =>
                              letra.toUpperCase()
                            )}
                        </Text>

                        <Text style={styles.valorDetalle}>
                          {String(valor)}
                        </Text>
                      </View>
                    );
                  }
                )}

                <Text style={styles.avisoSoloLectura}>
                  Esta consulta es de solo lectura. No se
                  modificó ninguna actividad ni otro registro.
                </Text>
              </ScrollView>
            ) : null}

            <Pressable
              style={styles.boton}
              onPress={cerrarDetalleActividad}
              accessibilityRole="button"
            >
              <Text style={styles.textoBoton}>
                Cerrar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  // ==========================================================
  // CONTENIDO PRINCIPAL
  // ==========================================================

  const mostrarSelectorAtenciones =
    pestana === 'Actividades' &&
    !atencionSeleccionada;

  const listaActual =
    pestana === 'Historial'
      ? historialFiltrado
      : mostrarSelectorAtenciones
        ? atencionesDisponibles
        : actividadesFiltradas;

  const cantidadResultados =
    pestana === 'Historial'
      ? historialFiltrado.length
      : mostrarSelectorAtenciones
        ? atencionesDisponibles.length
        : actividadesFiltradas.length;

  // ==========================================================
  // RENDERIZADO
  // ==========================================================

  return (
    <SafeAreaView style={styles.pantalla}>
      <EncabezadoPetCare />

      <View style={styles.contenedor}>
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>
            Seguimiento
          </Text>

          <Text style={styles.subtitulo}>
            Consulta el historial de atenciones y las
            actividades de cada atención.
          </Text>
        </View>

        {/* PESTAÑAS PRINCIPALES */}

        <View style={styles.pestanas}>
          {['Actividades', 'Historial'].map(
            (nombre) => (
              <Pressable
                key={nombre}
                style={[
                  styles.pestana,
                  pestana === nombre &&
                    styles.pestanaActiva,
                ]}
                onPress={() => cambiarPestana(nombre)}
                accessibilityRole="tab"
                accessibilityState={{
                  selected: pestana === nombre,
                }}
              >
                <Text
                  style={[
                    styles.textoPestana,
                    pestana === nombre &&
                      styles.textoPestanaActivo,
                  ]}
                >
                  {nombre}
                </Text>
              </Pressable>
            )
          )}
        </View>

        {/* ATENCIÓN SELECCIONADA */}

        {pestana === 'Actividades' &&
        atencionSeleccionada ? (
          <View style={styles.atencionSeleccionada}>
            <View style={styles.flex}>
              <Text style={styles.tituloSeleccion}>
                Actividades de la atención
              </Text>

              <Text style={styles.textoSeleccion}>
                {atencionSeleccionada.mascota?.nombre ||
                  'Mascota sin nombre'}
                {' · Atención N.º '}
                {atencionSeleccionada.atencion_id}
              </Text>
            </View>

            <Pressable
              onPress={volverAAtenciones}
              accessibilityRole="button"
            >
              <Text style={styles.enlace}>
                Cambiar atención
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* BÚSQUEDA */}

        <TextInput
          style={styles.busqueda}
          placeholder="Buscar mascota, propietario, DNI o historia clínica..."
          placeholderTextColor="#7A8494"
          value={busqueda}
          onChangeText={setBusqueda}
          autoCapitalize="none"
          accessibilityLabel="Buscar en seguimiento e historial"
          returnKeyType="search"
        />

        {/* FILTROS POR FECHA */}

        <Text style={styles.tituloFiltro}>
          Filtrar por fecha
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtros}
          contentContainerStyle={styles.filtrosContenido}
        >
          {FILTROS_FECHA.map((nombre) => (
            <BotonFiltro
              key={nombre}
              nombre={nombre}
              seleccionado={filtroFecha === nombre}
              onPress={() => setFiltroFecha(nombre)}
            />
          ))}
        </ScrollView>

        {/* FECHAS PERSONALIZADAS */}

        {filtroFecha === 'Personalizar' ? (
          <View style={styles.panelFechas}>
            <Text style={styles.ayudaFecha}>
              Introduce las fechas en formato AAAA-MM-DD.
            </Text>

            <View style={styles.filaFechas}>
              <TextInput
                style={styles.fechaInput}
                placeholder="Desde: AAAA-MM-DD"
                placeholderTextColor="#7A8494"
                value={fechaDesde}
                onChangeText={setFechaDesde}
                autoCapitalize="none"
                accessibilityLabel="Fecha inicial"
              />

              <TextInput
                style={styles.fechaInput}
                placeholder="Hasta: AAAA-MM-DD"
                placeholderTextColor="#7A8494"
                value={fechaHasta}
                onChangeText={setFechaHasta}
                autoCapitalize="none"
                accessibilityLabel="Fecha final"
              />
            </View>

            {filtroPersonalizadoIncompleto ? (
              <Text style={styles.errorFecha}>
                Revisa las fechas. La fecha inicial no puede
                ser posterior a la fecha final.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* RF40: FILTROS DE ESTADO */}

        {pestana === 'Actividades' &&
        atencionSeleccionada ? (
          <>
            <Text style={styles.tituloFiltro}>
              Clasificar actividades por estado
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtros}
              contentContainerStyle={styles.filtrosContenido}
            >
              {FILTROS_ACTIVIDAD.map((nombre) => (
                <BotonFiltro
                  key={nombre}
                  nombre={nombre}
                  seleccionado={
                    filtroActividad === nombre
                  }
                  onPress={() =>
                    cargarActividadesAtencion(
                      atencionSeleccionada,
                      nombre
                    )
                  }
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* FILTRO DE ESTADO DEL HISTORIAL */}

        {pestana === 'Historial' &&
        estadosHistorial.length > 0 ? (
          <>
            <Text style={styles.tituloFiltro}>
              Filtrar por estado de atención
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtros}
              contentContainerStyle={styles.filtrosContenido}
            >
              <BotonFiltro
                nombre="Todos"
                seleccionado={!filtroEstadoHistorial}
                onPress={() =>
                  setFiltroEstadoHistorial('')
                }
              />

              {estadosHistorial.map((estado) => (
                <BotonFiltro
                  key={estado}
                  nombre={estado}
                  seleccionado={
                    filtroEstadoHistorial === estado
                  }
                  onPress={() =>
                    setFiltroEstadoHistorial(estado)
                  }
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* RESUMEN */}

        <View style={styles.resumenResultados}>
          <Text style={styles.textoResultados}>
            {pestana === 'Historial'
              ? `Atenciones encontradas: ${cantidadResultados}`
              : mostrarSelectorAtenciones
                ? `Atenciones disponibles: ${cantidadResultados}`
                : `Actividades encontradas: ${cantidadResultados}`}
          </Text>

          <Pressable
            onPress={limpiarFiltros}
            accessibilityRole="button"
          >
            <Text style={styles.enlace}>
              Limpiar filtros
            </Text>
          </Pressable>
        </View>

        {/* MENSAJE DE ACTUALIZACIÓN RF43 */}

        {pestana === 'Actividades' &&
        atencionSeleccionada &&
        mensajeActividades ? (
          <Text
            style={
              errorActividades
                ? styles.error
                : styles.mensajeActualizacion
            }
          >
            {mensajeActividades}
          </Text>
        ) : null}

        {/* CARGA GENERAL */}

        {cargando ? (
          <View style={styles.centro}>
            <ActivityIndicator
              size="large"
              color="#2563EB"
            />

            <Text style={styles.textoSecundario}>
              Cargando información...
            </Text>
          </View>
        ) : errorCarga ? (
          <View style={styles.centro}>
            <Text style={styles.error}>
              No se pudo cargar la información de seguimiento.
              Comprueba la conexión y los permisos de Supabase.
            </Text>

            <Pressable
              style={styles.boton}
              onPress={() => cargarDatos()}
              accessibilityRole="button"
            >
              <Text style={styles.textoBoton}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : filtroPersonalizadoIncompleto ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>
              Corrige el rango de fechas para ver resultados.
            </Text>
          </View>
        ) : errorActividades &&
        pestana === 'Actividades' &&
        atencionSeleccionada ? (
          <View style={styles.centro}>
            <Text style={styles.error}>
              {errorActividades}
            </Text>

            <Pressable
              style={styles.boton}
              onPress={() =>
                cargarActividadesAtencion(
                  atencionSeleccionada,
                  filtroActividad
                )
              }
              accessibilityRole="button"
            >
              <Text style={styles.textoBoton}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : cargandoActividades &&
        pestana === 'Actividades' &&
        atencionSeleccionada ? (
          <View style={styles.centro}>
            <ActivityIndicator
              size="large"
              color="#2563EB"
            />

            <Text style={styles.textoSecundario}>
              Consultando actividades de la atención...
            </Text>
          </View>
        ) : (
          <FlatList
            data={listaActual}
            keyExtractor={(item, index) =>
              String(
                pestana === 'Historial' ||
                mostrarSelectorAtenciones
                  ? item.atencion_id
                  : item.actividad_id ?? index
              )
            }
            renderItem={
              pestana === 'Historial'
                ? renderHistorial
                : mostrarSelectorAtenciones
                  ? renderAtencion
                  : renderActividad
            }
            contentContainerStyle={styles.lista}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={actualizando}
                onRefresh={async () => {
                  if (
                    pestana === 'Actividades' &&
                    atencionSeleccionada
                  ) {
                    await cargarActividadesAtencion(
                      atencionSeleccionada,
                      filtroActividad
                    );
                  } else {
                    await cargarDatos(true);
                  }
                }}
              />
            }
            ListEmptyComponent={
              <View style={styles.vacio}>
                <Text style={styles.vacioTitulo}>
                  {pestana === 'Actividades' &&
                  atencionSeleccionada
                    ? mensajeActividades ||
                      MENSAJES_SIN_RESULTADOS[
                        filtroActividad
                      ]
                    : pestana === 'Actividades'
                      ? 'No se encontraron atenciones.'
                      : 'No se encontraron atenciones en el historial.'}
                </Text>

                <Text style={styles.textoSecundario}>
                  {pestana === 'Actividades' &&
                  atencionSeleccionada
                    ? 'Selecciona otro estado o cambia los filtros para consultar los registros.'
                    : 'Cambia la búsqueda o los filtros e inténtalo nuevamente.'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <MenuLateralDerecho />

      {renderModalDetalle()}
    </SafeAreaView>
  );
}

// ============================================================
// ESTILOS
// ============================================================

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F4F7FB',
  },

  contenedor: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 14,
  },

  encabezado: {
    marginBottom: 14,
  },

  titulo: {
    fontSize: 27,
    fontWeight: '800',
    color: '#152238',
  },

  subtitulo: {
    marginTop: 5,
    color: '#68758A',
    fontSize: 13,
    lineHeight: 19,
  },

  pestanas: {
    flexDirection: 'row',
    backgroundColor: '#E8EDF5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 13,
  },

  pestana: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderRadius: 9,
  },

  pestanaActiva: {
    backgroundColor: '#FFFFFF',
  },

  textoPestana: {
    color: '#667085',
    fontWeight: '600',
    fontSize: 12,
  },

  textoPestanaActivo: {
    color: '#1D4ED8',
    fontWeight: '800',
  },

  atencionSeleccionada: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#E8F0FF',
    borderRadius: 11,
    padding: 12,
    marginBottom: 12,
  },

  tituloSeleccion: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D4ED8',
  },

  textoSeleccion: {
    fontSize: 11,
    color: '#475467',
    marginTop: 4,
  },

  busqueda: {
    minHeight: 46,
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE4EE',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    marginBottom: 13,
    color: '#152238',
    fontSize: 13,
  },

  tituloFiltro: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475467',
    marginBottom: 8,
  },

  filtros: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 12,
    maxHeight: 44,
  },

  filtrosContenido: {
    paddingRight: 8,
    alignItems: 'center',
  },

  filtro: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4EE',
    marginRight: 8,
  },

  filtroActivo: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  textoFiltro: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '600',
  },

  textoFiltroActivo: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  panelFechas: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDE4EE',
  },

  ayudaFecha: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 9,
  },

  filaFechas: {
    flexDirection: 'row',
    gap: 8,
  },

  fechaInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#DDE4EE',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 10,
    color: '#152238',
    fontSize: 11,
  },

  errorFecha: {
    color: '#B42318',
    fontSize: 12,
    marginTop: 8,
  },

  resumenResultados: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 5,
  },

  textoResultados: {
    flex: 1,
    color: '#475467',
    fontSize: 12,
    fontWeight: '700',
  },

  lista: {
    paddingBottom: 30,
    flexGrow: 1,
  },

  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E7F0',
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
  },

  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 9,
    marginBottom: 10,
  },

  filaInferior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },

  flex: {
    flex: 1,
    minWidth: 0,
  },

  fecha: {
    flex: 1,
    color: '#526178',
    fontSize: 11,
    fontWeight: '600',
  },

  etiqueta: {
    color: '#1D4ED8',
    backgroundColor: '#E8F0FF',
    borderRadius: 7,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
  },

  nombreMascota: {
    color: '#152238',
    fontWeight: '800',
    fontSize: 17,
    marginBottom: 4,
  },

  propietario: {
    color: '#657187',
    fontSize: 12,
    lineHeight: 18,
  },

  descripcion: {
    color: '#344054',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 20,
  },

  estado: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 10,
    fontWeight: '700',
  },

  estadoPendiente: {
    color: '#8A5800',
    backgroundColor: '#FFF3D6',
  },

  estadoActiva: {
    color: '#175CD3',
    backgroundColor: '#D1E9FF',
  },

  estadoCompletada: {
    color: '#067647',
    backgroundColor: '#D1FADF',
  },

  estadoNoRealizada: {
    color: '#B42318',
    backgroundColor: '#FEE4E2',
  },

  enlace: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 11,
  },

  textoSecundario: {
    color: '#7A8494',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 5,
  },

  botonesAtencion: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 14,
  },

  boton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBoton: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  botonSecundario: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2563EB',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBotonSecundario: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 12,
  },

  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  error: {
    color: '#B42318',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 14,
  },

  mensajeActualizacion: {
    color: '#475467',
    fontSize: 11,
    lineHeight: 18,
    marginBottom: 8,
  },

  vacio: {
    flex: 1,
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },

  vacioTitulo: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },

  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  contenidoModal: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },

  encabezadoModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  tituloModal: {
    color: '#152238',
    fontSize: 19,
    fontWeight: '800',
  },

  cerrarModal: {
    color: '#667085',
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 5,
  },

  centroModal: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },

  contenidoDetalle: {
    flexGrow: 0,
    marginBottom: 15,
  },

  etiquetaDetalle: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 13,
    marginBottom: 5,
  },

  valorDetalle: {
    color: '#152238',
    fontSize: 14,
    lineHeight: 21,
  },

  estadoDetalle: {
    alignItems: 'flex-start',
  },

  avisoSoloLectura: {
    color: '#475467',
    backgroundColor: '#F1F5F9',
    borderRadius: 9,
    padding: 11,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 18,
    marginBottom: 15,
  },
});
