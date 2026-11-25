
/**
 * ============================================================
 * PETCARE - MÓDULO DE SEGUIMIENTO
 * ============================================================
 *
 * RF20: Historial de atención por mascota.
 * RF40: Consulta de actividades y estados.
 * RF41: Seguimiento cronológico.
 * RF43: Seguimiento de actividades.
 * RF51: Consulta de citas y programación de actividades.
 *
 * ARQUITECTURA:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 *
 * EXPORTACIÓN:
 * - Genera un PDF con todas las atenciones del historial.
 * - Incluye todas las actividades y sus datos disponibles.
 * - No modifica ni crea registros en la base de datos.
 * ============================================================
 */

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { router } from 'expo-router';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import {
  buscarMascotasSeguimientoControlador,
  listarMascotasSeguimientoControlador,
  consultarHistorialMascotaControlador,
  consultarCitasMascotaControlador,
  consultarActividadesPendientesControlador,
  programarCitaSeguimientoControlador,
} from '../../controllers/seguimiento/seguimientoControlador';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

const C = {
  primario: '#187C72',
  oscuro: '#12645C',
  fondo: '#F4F7F8',
  blanco: '#FFFFFF',
  texto: '#24323F',
  secundario: '#74818D',
  borde: '#E1E8EB',
  pendiente: '#B7791F',
  completada: '#21865B',
  noRealizada: '#C24141',
  confirmada: '#2563A6',
  cancelada: '#B42318',
};

function texto(valor) {
  return String(valor ?? '').trim();
}

function primeraRelacion(valor) {
  return Array.isArray(valor)
    ? valor[0] ?? null
    : valor ?? null;
}

function obtenerAtencionId(actividad) {
  return (
    actividad?.atencion_id ??
    primeraRelacion(actividad?.atencion)?.atencion_id ??
    null
  );
}

function nombrePropietario(mascota) {
  const propietario = primeraRelacion(
    mascota?.propietarios
  );

  if (!propietario) {
    return 'Propietario no disponible';
  }

  return [
    propietario.nombre,
    propietario.apellido,
    propietario.nombre_completo,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Propietario no disponible';
}

function fecha(valor, hora = false) {
  if (!valor) return 'No registrada';

  const cadena = String(valor);
  const coincidencia = cadena.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (!coincidencia) return cadena;

  const [, anio, mes, dia] = coincidencia;
  let resultado = `${dia}/${mes}/${anio}`;

  if (hora) {
    const horaEncontrada = cadena.match(
      /T(\d{2}):(\d{2})/
    );

    if (horaEncontrada) {
      resultado += ` · ${horaEncontrada[1]}:${horaEncontrada[2]}`;
    }
  }

  return resultado;
}

function obtenerFechaManana() {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);

  const anio = manana.getFullYear();
  const mes = String(manana.getMonth() + 1).padStart(2, '0');
  const dia = String(manana.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

function colorEstado(estado) {
  const valor = texto(estado).toLowerCase();

  if (
    [
      'completada',
      'completado',
      'finalizada',
      'finalizado',
    ].includes(valor)
  ) {
    return C.completada;
  }

  if (
    ['no realizada', 'no realizado'].includes(valor)
  ) {
    return C.noRealizada;
  }

  if (
    ['cancelada', 'cancelado'].includes(valor)
  ) {
    return C.cancelada;
  }

  if (
    ['confirmada', 'confirmado'].includes(valor)
  ) {
    return C.confirmada;
  }

  return C.pendiente;
}

function Estado({ valor }) {
  const color = colorEstado(valor);

  return (
    <View
      style={[
        s.estado,
        { backgroundColor: `${color}18` },
      ]}
    >
      <View
        style={[
          s.punto,
          { backgroundColor: color },
        ]}
      />

      <Text style={[s.estadoTexto, { color }]}>
        {valor || 'Pendiente'}
      </Text>
    </View>
  );
}

function obtenerMotivoConsulta(atencion) {
  if (!atencion) return '';

  if (atencion.motivo_consulta) {
    return texto(atencion.motivo_consulta);
  }

  const actividades = Array.isArray(atencion.actividades)
    ? atencion.actividades
    : [];

  const consulta = actividades.find((actividad) => {
    const tipo = texto(
      actividad.tipo ||
      actividad.nombre_tipo ||
      actividad.codigo_tipo
    ).toLowerCase();

    return (
      tipo.includes('consulta') ||
      tipo.includes('consult')
    );
  });

  return texto(
    consulta?.motivo_consulta ||
    consulta?.consulta?.motivo_consulta ||
    consulta?.datos_consulta?.motivo_consulta ||
    consulta?.detalle?.motivo_consulta
  );
}

/**
 * Escapa contenido para evitar que los datos registrados
 * sean interpretados como etiquetas HTML en el PDF.
 */
function escaparHTML(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function valorPDF(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return 'No registrado';
  }

  if (typeof valor === 'boolean') {
    return valor ? 'Sí' : 'No';
  }

  if (Array.isArray(valor)) {
    return valor.length
      ? valor.map((item) => valorPDF(item)).join(', ')
      : 'Sin registros';
  }

  if (typeof valor === 'object') {
    return Object.entries(valor)
      .map(([clave, contenido]) => {
        return `${clave}: ${valorPDF(contenido)}`;
      })
      .join(' | ');
  }

  return String(valor);
}

/**
 * Convierte los campos de un registro en filas HTML.
 * Los objetos anidados también se incluyen para no perder
 * información específica que venga desde Supabase.
 */
function generarFilasPDF(registro, excluir = []) {
  if (!registro || typeof registro !== 'object') {
    return '';
  }

  const camposExcluidos = new Set(excluir);

  return Object.entries(registro)
    .filter(([clave, valor]) => {
      return (
        !camposExcluidos.has(clave) &&
        valor !== null &&
        valor !== undefined &&
        valor !== ''
      );
    })
    .map(([clave, valor]) => {
      const etiqueta = clave
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letra) => letra.toUpperCase());

      return `
        <tr>
          <td class="etiqueta">${escaparHTML(etiqueta)}</td>
          <td>${escaparHTML(valorPDF(valor))}</td>
        </tr>
      `;
    })
    .join('');
}

function generarHTMLHistorial(mascota, historial) {
  const totalActividades = historial.reduce(
    (total, atencion) =>
      total + (
        Array.isArray(atencion.actividades)
          ? atencion.actividades.filter(
              (actividad) => actividad.eliminado !== true
            ).length
          : 0
      ),
    0
  );

  const seccionesAtenciones = historial.map(
    (atencion, indice) => {
      const actividades = (
        Array.isArray(atencion.actividades)
          ? atencion.actividades
          : []
      ).filter(
        (actividad) => actividad.eliminado !== true
      );

      const motivo = obtenerMotivoConsulta(atencion);

      const filasAtencion = generarFilasPDF(
        atencion,
        [
          'actividades',
          'mascotas',
          'propietarios',
        ]
      );

      const seccionesActividades = actividades.length
        ? actividades.map((actividad, numero) => {
            return `
              <div class="actividad">
                <h4>
                  Actividad ${numero + 1}:
                  ${escaparHTML(
                    actividad.tipo ||
                    actividad.nombre_tipo ||
                    'Actividad veterinaria'
                  )}
                </h4>

                <table>
                  ${generarFilasPDF(actividad, [
                    'atencion',
                    'mascotas',
                    'propietarios',
                    'creador',
                    'perfiles',
                  ])}
                </table>
              </div>
            `;
          }).join('')
        : '<p class="vacio">No hay actividades registradas.</p>';

      return `
        <section class="atencion">
          <h2>Atención ${indice + 1} - N.º ${
            escaparHTML(atencion.atencion_id)
          }</h2>

          <div class="resumen">
            <strong>Fecha de inicio:</strong>
            ${escaparHTML(fecha(atencion.fecha_inicio, true))}
            &nbsp; | &nbsp;
            <strong>Estado:</strong>
            ${escaparHTML(atencion.estado || 'No registrado')}
          </div>

          ${
            motivo
              ? `
                <p class="motivo">
                  <strong>Motivo de consulta:</strong>
                  ${escaparHTML(motivo)}
                </p>
              `
              : ''
          }

          <h3>Información de la atención</h3>

          <table>
            ${filasAtencion || `
              <tr>
                <td>No hay información adicional.</td>
              </tr>
            `}
          </table>

          <h3>Actividades registradas (${actividades.length})</h3>

          ${seccionesActividades}
        </section>
      `;
    }
  ).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            color: #24323F;
            font-size: 11px;
            line-height: 1.5;
          }

          .cabecera {
            border-bottom: 3px solid #187C72;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }

          h1 {
            color: #12645C;
            font-size: 23px;
            margin: 0 0 5px;
          }

          h2 {
            color: #12645C;
            font-size: 16px;
            border-bottom: 1px solid #DCE8E6;
            padding-bottom: 7px;
          }

          h3 {
            color: #24323F;
            font-size: 12px;
            margin-top: 18px;
          }

          h4 {
            color: #187C72;
            font-size: 11px;
            margin-bottom: 7px;
          }

          .datos-mascota {
            background: #F1F7F6;
            border: 1px solid #DCE8E6;
            border-radius: 7px;
            padding: 12px;
            margin-bottom: 16px;
          }

          .indicadores {
            display: flex;
            gap: 10px;
            margin: 15px 0;
          }

          .indicador {
            flex: 1;
            background: #F4F7F8;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
          }

          .indicador strong {
            display: block;
            color: #187C72;
            font-size: 18px;
          }

          .atencion {
            margin-top: 25px;
            page-break-inside: auto;
          }

          .resumen {
            background: #F4F7F8;
            padding: 8px;
            border-radius: 5px;
          }

          .motivo {
            padding: 9px;
            background: #EAF5F2;
            border-left: 3px solid #187C72;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 7px;
          }

          td {
            border: 1px solid #E1E8EB;
            padding: 7px;
            vertical-align: top;
            overflow-wrap: anywhere;
          }

          .etiqueta {
            width: 32%;
            font-weight: bold;
            background: #F4F7F8;
          }

          .actividad {
            border: 1px solid #E1E8EB;
            border-radius: 6px;
            padding: 10px;
            margin: 10px 0;
            page-break-inside: avoid;
          }

          .vacio {
            color: #74818D;
            font-style: italic;
          }

          .pie {
            margin-top: 25px;
            padding-top: 10px;
            border-top: 1px solid #E1E8EB;
            color: #74818D;
            font-size: 9px;
          }
        </style>
      </head>

      <body>
        <div class="cabecera">
          <h1>PETCARE</h1>
          <strong>Historial clínico y seguimiento veterinario</strong>
          <p>
            Documento generado:
            ${escaparHTML(new Date().toLocaleString('es-PE'))}
          </p>
        </div>

        <div class="datos-mascota">
          <h2>Información de la mascota</h2>

          <p>
            <strong>Nombre:</strong>
            ${escaparHTML(mascota.nombre || 'No registrado')}
          </p>

          <p>
            <strong>Número de historia:</strong>
            ${escaparHTML(mascota.numero_historia)}
          </p>

          <p>
            <strong>Especie:</strong>
            ${escaparHTML(mascota.especie || 'No registrada')}
          </p>

          <p>
            <strong>Raza:</strong>
            ${escaparHTML(mascota.raza || 'No registrada')}
          </p>

          <p>
            <strong>Propietario:</strong>
            ${escaparHTML(nombrePropietario(mascota))}
          </p>
        </div>

        <div class="indicadores">
          <div class="indicador">
            <strong>${historial.length}</strong>
            Atenciones
          </div>

          <div class="indicador">
            <strong>${totalActividades}</strong>
            Actividades
          </div>
        </div>

        <h2>Historial completo de atenciones</h2>

        ${
          historial.length
            ? seccionesAtenciones
            : '<p class="vacio">No existen atenciones registradas.</p>'
        }

        <div class="pie">
          PetCare - Documento informativo generado a partir
          de los registros disponibles en el sistema.
        </div>
      </body>
    </html>
  `;
}

function Actividad({ item }) {
  return (
    <View style={s.actividad}>
      <View style={s.fila}>
        <View style={{ flex: 1 }}>
          <Text style={s.actividadNombre}>
            {item.tipo || 'Actividad veterinaria'}
          </Text>

          <Text style={s.secundario}>
            {item.fecha_prevista
              ? `Fecha prevista: ${fecha(item.fecha_prevista)}`
              : `Actividad N.º ${item.actividad_id}`}
          </Text>
        </View>

        <Estado valor={item.estado} />
      </View>

      {!!item.observaciones && (
        <Text style={s.detalle}>
          Observaciones: {item.observaciones}
        </Text>
      )}

      {!!item.motivo_no_realizada && (
        <Text style={s.detalle}>
          Motivo: {item.motivo_no_realizada}
        </Text>
      )}
    </View>
  );
}

export default function PantallaSeguimiento() {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  const [mascota, setMascota] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [citas, setCitas] = useState([]);
  const [actividadesPendientes, setActividadesPendientes] =
    useState([]);

  const [actividadesSeleccionadas, setActividadesSeleccionadas] =
    useState([]);

  const [fechaProgramada, setFechaProgramada] =
    useState(obtenerFechaManana());

  const [horaCita, setHoraCita] = useState('09:00');
  const [motivoCita, setMotivoCita] = useState('');
  const [descripcionCita, setDescripcionCita] =
    useState('');

  const [pestana, setPestana] = useState('historial');
  const [cargando, setCargando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [programando, setProgramando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const [error, setError] = useState('');
  const [errorProgramacion, setErrorProgramacion] =
    useState('');

  const [menuAbierto, setMenuAbierto] = useState(false);

  // ==========================================================
  // RF20 — BÚSQUEDA DE MASCOTAS
  // ==========================================================

  useEffect(() => {
    const busqueda = termino.trim();

    if (busqueda.length < 2) {
      setResultados([]);
      setErrorBusqueda('');
      setBuscando(false);
      return undefined;
    }

    let activo = true;

    const temporizador = setTimeout(async () => {
      setBuscando(true);
      setErrorBusqueda('');

      try {
        const datos =
          await buscarMascotasSeguimientoControlador(
            busqueda
          );

        if (activo) {
          setResultados(
            Array.isArray(datos) ? datos : []
          );
        }
      } catch (e) {
        if (activo) {
          setResultados([]);
          setErrorBusqueda(
            e?.message ||
              'No se pudo realizar la búsqueda.'
          );
        }
      } finally {
        if (activo) setBuscando(false);
      }
    }, 350);

    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [termino]);

  // ==========================================================
  // CARGAR HISTORIAL, CITAS Y PENDIENTES
  // ==========================================================

  const cargarDatos = useCallback(
    async (numeroHistoria) => {
      if (!numeroHistoria) return;

      const [
        datosHistorial,
        datosCitas,
        datosPendientes,
      ] = await Promise.all([
        consultarHistorialMascotaControlador(
          numeroHistoria
        ),
        consultarCitasMascotaControlador(
          numeroHistoria
        ),
        consultarActividadesPendientesControlador(
          numeroHistoria
        ),
      ]);

      setHistorial(
        Array.isArray(datosHistorial)
          ? datosHistorial
          : []
      );

      setCitas(
        Array.isArray(datosCitas)
          ? datosCitas
          : []
      );

      setActividadesPendientes(
        Array.isArray(datosPendientes)
          ? datosPendientes
          : []
      );
    },
    []
  );

  // ==========================================================
  // SELECCIONAR MASCOTA
  // ==========================================================

  async function seleccionarMascota(item) {
    setMascota(item);
    setTermino('');
    setResultados([]);
    setPestana('historial');

    setHistorial([]);
    setCitas([]);
    setActividadesPendientes([]);
    setActividadesSeleccionadas([]);

    setCargando(true);
    setError('');
    setErrorProgramacion('');

    try {
      await cargarDatos(item.numero_historia);
    } catch (e) {
      setError(
        e?.message ||
          'No se pudo cargar el seguimiento.'
      );
    } finally {
      setCargando(false);
    }
  }

  // ==========================================================
  // ACTUALIZAR INFORMACIÓN
  // ==========================================================

  async function actualizar() {
    if (!mascota?.numero_historia) return;

    setActualizando(true);
    setError('');

    try {
      await cargarDatos(mascota.numero_historia);
    } catch (e) {
      setError(
        e?.message ||
          'No se pudo actualizar la información.'
      );
    } finally {
      setActualizando(false);
    }
  }

  function cambiarBusqueda(valor) {
    setTermino(valor);

    if (mascota) {
      setMascota(null);
      setHistorial([]);
      setCitas([]);
      setActividadesPendientes([]);
      setActividadesSeleccionadas([]);
      setError('');
      setErrorProgramacion('');
    }
  }

  // ==========================================================
  // RF51 — SELECCIONAR ACTIVIDADES PARA UNA CITA
  // ==========================================================

  function alternarActividad(actividad) {
    const actividadId = String(
      actividad.actividad_id
    );

    const atencionId = obtenerAtencionId(actividad);

    if (!atencionId) {
      Alert.alert(
        'Atención no identificada',
        'No se pudo determinar a qué atención pertenece esta actividad.'
      );
      return;
    }

    const yaSeleccionada =
      actividadesSeleccionadas.some(
        (id) => String(id) === actividadId
      );

    if (yaSeleccionada) {
      setActividadesSeleccionadas((actuales) =>
        actuales.filter(
          (id) => String(id) !== actividadId
        )
      );
      return;
    }

    if (actividadesSeleccionadas.length > 0) {
      const primeraSeleccionada =
        actividadesPendientes.find(
          (item) =>
            String(item.actividad_id) ===
            String(actividadesSeleccionadas[0])
        );

      const atencionSeleccionada =
        obtenerAtencionId(primeraSeleccionada);

      if (
        String(atencionSeleccionada) !==
        String(atencionId)
      ) {
        Alert.alert(
          'Atenciones diferentes',
          'Solo puedes agrupar en una cita actividades que pertenezcan a la misma atención.'
        );
        return;
      }
    }

    setActividadesSeleccionadas((actuales) => [
      ...actuales,
      actividad.actividad_id,
    ]);

    setErrorProgramacion('');
  }

  function limpiarFormularioProgramacion() {
    setActividadesSeleccionadas([]);
    setFechaProgramada(obtenerFechaManana());
    setHoraCita('09:00');
    setMotivoCita('');
    setDescripcionCita('');
    setErrorProgramacion('');
  }

  // ==========================================================
  // RF51 — PROGRAMAR CITA CON ACTIVIDADES EXISTENTES
  // ==========================================================

  async function programarCita() {
    if (actividadesSeleccionadas.length === 0) {
      setErrorProgramacion(
        'Seleccione al menos una actividad.'
      );
      return;
    }

    const actividadesElegidas =
      actividadesPendientes.filter((actividad) =>
        actividadesSeleccionadas.some(
          (id) =>
            String(id) ===
            String(actividad.actividad_id)
        )
      );

    if (
      actividadesElegidas.length !==
      actividadesSeleccionadas.length
    ) {
      setErrorProgramacion(
        'Una o más actividades seleccionadas ya no están disponibles. Actualice la información.'
      );
      return;
    }

    const atencionId = obtenerAtencionId(
      actividadesElegidas[0]
    );

    const pertenecenAMismaAtencion =
      actividadesElegidas.every(
        (actividad) =>
          String(obtenerAtencionId(actividad)) ===
          String(atencionId)
      );

    if (!pertenecenAMismaAtencion) {
      setErrorProgramacion(
        'Las actividades deben pertenecer a una misma atención.'
      );
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProgramada)) {
      setErrorProgramacion(
        'Ingrese la fecha con el formato AAAA-MM-DD.'
      );
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(horaCita)) {
      setErrorProgramacion(
        'Ingrese la hora con el formato HH:MM.'
      );
      return;
    }

    setProgramando(true);
    setErrorProgramacion('');

    try {
      await programarCitaSeguimientoControlador({
        numero_historia: mascota.numero_historia,
        atencion_id: atencionId,
        actividad_ids: actividadesElegidas.map(
          (actividad) => actividad.actividad_id
        ),
        fecha_programada: fechaProgramada,
        hora_cita: horaCita,
        motivo_cita: texto(motivoCita) ||
          'Seguimiento de actividades veterinarias',
        descripcion_cita: texto(descripcionCita) || null,
      });

      limpiarFormularioProgramacion();

      await cargarDatos(mascota.numero_historia);

      Alert.alert(
        'Cita programada',
        'La cita se registró correctamente con las actividades seleccionadas.'
      );
    } catch (e) {
      setErrorProgramacion(
        e?.message || 'No se pudo programar la cita.'
      );
    } finally {
      setProgramando(false);
    }
  }

  // ==========================================================
  // RF20 — EXPORTAR HISTORIAL COMPLETO A PDF
  // ==========================================================

  async function exportarHistorial() {
    if (!mascota?.numero_historia) {
      Alert.alert(
        'Selecciona una mascota',
        'Debes seleccionar una mascota antes de exportar su historial.'
      );
      return;
    }

    if (historial.length === 0) {
      Alert.alert(
        'Historial vacío',
        'La mascota seleccionada no tiene atenciones para exportar.'
      );
      return;
    }

    try {
      setExportando(true);

      /*
       * Se utiliza el historial completo cargado por el
       * controlador. No se exporta únicamente la tarjeta
       * que el usuario haya seleccionado.
       */
      const historialCompleto = [...historial];

      const html = generarHTMLHistorial(
        mascota,
        historialCompleto
      );

      const archivo = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const compartirDisponible =
        await Sharing.isAvailableAsync();

      if (!compartirDisponible) {
        Alert.alert(
          'PDF generado',
          `El documento fue generado en: ${archivo.uri}`
        );
        return;
      }

      await Sharing.shareAsync(archivo.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Exportar historial clínico',
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      Alert.alert(
        'Error al exportar',
        e?.message ||
          'No se pudo generar el PDF del historial.'
      );
    } finally {
      setExportando(false);
    }
  }

  // ==========================================================
  // INDICADORES
  // ==========================================================

  const totalActividades = historial.reduce(
    (total, atencion) =>
      total + (
        Array.isArray(atencion.actividades)
          ? atencion.actividades.filter(
              (actividad) => actividad.eliminado !== true
            ).length
          : 0
      ),
    0
  );

  const totalActividadesSeleccionadas =
    actividadesSeleccionadas.length;

  // ==========================================================
  // RENDERIZADO
  // ==========================================================

  return (
    <SafeAreaView style={s.pantalla}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.blanco}
      />

      <EncabezadoPetCare
        titulo="Seguimiento"
        mostrarNotificaciones
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() => {}}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.contenido}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizar}
            colors={[C.primario]}
          />
        }
      >
        {/* RUTA DE NAVEGACIÓN */}

        <View style={s.rutaNavegacion}>
          <TouchableOpacity
            onPress={() => router.push('/')}
            activeOpacity={0.7}
          >
            <Text style={s.rutaTexto}>Inicio</Text>
          </TouchableOpacity>

          <Text style={s.rutaSeparador}>›</Text>

          <Text style={s.rutaActual}>Seguimiento</Text>
        </View>

        {/* CABECERA */}

        <View style={s.cabecera}>
          <View style={s.iconoCabecera}>
            <Text style={s.iconoCabeceraTexto}>↗</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.titulo}>
              Seguimiento de mascotas
            </Text>

            <Text style={s.subtitulo}>
              Consulta atenciones, actividades pendientes y citas programadas.
            </Text>
          </View>
        </View>

        {/* BÚSQUEDA */}

        <View style={s.tarjeta}>
          <Text style={s.tituloSeccion}>
            Buscar mascota
          </Text>

          <View style={s.inputContenedor}>
            <Text style={s.lupa}>⌕</Text>

            <TextInput
              style={s.input}
              value={termino}
              onChangeText={cambiarBusqueda}
              placeholder="Nombre o número de historia..."
              placeholderTextColor="#9AA6AE"
              autoCapitalize="none"
              returnKeyType="search"
            />

            {buscando && (
              <ActivityIndicator color={C.primario} />
            )}
          </View>

          {!!errorBusqueda && (
            <Text style={s.error}>{errorBusqueda}</Text>
          )}

          {resultados.map((item) => (
            <TouchableOpacity
              key={String(item.numero_historia)}
              style={s.resultado}
              onPress={() => seleccionarMascota(item)}
              activeOpacity={0.75}
            >
              <View style={s.avatar}>
                <Text style={s.avatarTexto}>
                  {texto(item.nombre)
                    .charAt(0)
                    .toUpperCase() || 'M'}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={s.nombre}>
                  {item.nombre || 'Mascota sin nombre'}
                </Text>

                <Text style={s.secundario}>
                  Historia: {item.numero_historia}
                </Text>

                <Text style={s.secundario}>
                  {nombrePropietario(item)}
                </Text>
              </View>

              <Text style={s.flecha}>›</Text>
            </TouchableOpacity>
          ))}

          {!buscando &&
            termino.trim().length >= 2 &&
            resultados.length === 0 &&
            !errorBusqueda && (
              <Text style={s.mensajeVacio}>
                No se encontraron mascotas.
              </Text>
            )}
        </View>

        {/* ESTADO INICIAL */}

        {!mascota && !cargando && (
          <View style={s.inicial}>
            <Text style={s.inicialIcono}>🐾</Text>

            <Text style={s.inicialTitulo}>
              Selecciona una mascota
            </Text>

            <Text style={s.secundarioCentrado}>
              Busca por nombre o número de historia para consultar su seguimiento.
            </Text>
          </View>
        )}

        {/* INFORMACIÓN DE MASCOTA */}

        {mascota && (
          <>
            <View style={s.tarjetaMascota}>
              <View style={s.fila}>
                <View style={s.avatarGrande}>
                  <Text style={s.avatarGrandeTexto}>
                    {texto(mascota.nombre)
                      .charAt(0)
                      .toUpperCase() || 'M'}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.nombreMascota}>
                    {mascota.nombre}
                  </Text>

                  <Text style={s.secundario}>
                    {[mascota.especie, mascota.raza]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>

                  <Text style={s.secundario}>
                    Historia clínica: {mascota.numero_historia}
                  </Text>

                  <Text style={s.propietario}>
                    {nombrePropietario(mascota)}
                  </Text>
                </View>
              </View>

              <View style={s.resumen}>
                <View style={s.indicador}>
                  <Text style={s.indicadorNumero}>
                    {historial.length}
                  </Text>

                  <Text style={s.indicadorTexto}>
                    Atenciones
                  </Text>
                </View>

                <View style={s.separador} />

                <View style={s.indicador}>
                  <Text style={s.indicadorNumero}>
                    {totalActividades}
                  </Text>

                  <Text style={s.indicadorTexto}>
                    Actividades
                  </Text>
                </View>

                <View style={s.separador} />

                <View style={s.indicador}>
                  <Text style={s.indicadorNumero}>
                    {citas.length}
                  </Text>

                  <Text style={s.indicadorTexto}>
                    Citas
                  </Text>
                </View>
              </View>
            </View>

            {/* PESTAÑAS */}

            <View style={s.pestanas}>
              <TouchableOpacity
                style={[
                  s.pestana,
                  pestana === 'historial' &&
                    s.pestanaActiva,
                ]}
                onPress={() => setPestana('historial')}
              >
                <Text
                  style={[
                    s.pestanaTexto,
                    pestana === 'historial' &&
                      s.pestanaTextoActivo,
                  ]}
                >
                  Historial
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.pestana,
                  pestana === 'citas' &&
                    s.pestanaActiva,
                ]}
                onPress={() => setPestana('citas')}
              >
                <Text
                  style={[
                    s.pestanaTexto,
                    pestana === 'citas' &&
                      s.pestanaTextoActivo,
                  ]}
                >
                  Citas ({citas.length})
                  {actividadesPendientes.length > 0
                    ? ` · ${actividadesPendientes.length} pendientes`
                    : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* CARGANDO */}

        {cargando && (
          <View style={s.cargando}>
            <ActivityIndicator
              size="large"
              color={C.primario}
            />

            <Text style={s.secundario}>
              Consultando historial, citas y actividades pendientes...
            </Text>
          </View>
        )}

        {/* ERROR GENERAL */}

        {!!error && !cargando && (
          <View style={s.tarjetaError}>
            <Text style={s.errorTitulo}>
              No se pudo cargar la información
            </Text>

            <Text style={s.error}>{error}</Text>

            <TouchableOpacity
              style={s.boton}
              onPress={actualizar}
            >
              <Text style={s.botonTexto}>
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ==================================================
            PESTAÑA HISTORIAL
        ================================================== */}

        {mascota &&
          !cargando &&
          !error &&
          pestana === 'historial' && (
            <>
              <View style={s.encabezadoLista}>
                <Text style={s.tituloLista}>
                  Historial de atenciones
                </Text>

                <Text style={s.secundario}>
                  {historial.length} registro(s)
                </Text>
              </View>

              {historial.length === 0 ? (
                <View style={s.tarjeta}>
                  <Text style={s.mensajeVacio}>
                    Esta mascota todavía no tiene atenciones registradas.
                  </Text>
                </View>
              ) : (
                historial.map((atencion) => {
                  const motivo = obtenerMotivoConsulta(atencion);

                  return (
                    <TouchableOpacity
                      key={String(atencion.atencion_id)}
                      style={s.tarjetaAtencion}
                      activeOpacity={0.78}
                      onPress={() =>
                        router.push({
                          pathname: '/seguimiento/detalle',
                          params: {
                            numeroHistoria: String(
                              mascota.numero_historia
                            ),
                            atencionId: String(
                              atencion.atencion_id
                            ),
                          },
                        })
                      }
                    >
                      <View style={s.fila}>
                        <View style={s.iconoAtencion}>
                          <Text style={s.iconoAtencionTexto}>
                            +
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={s.nombre}>
                            Atención N.º {atencion.atencion_id}
                          </Text>

                          <Text style={s.secundario}>
                            Inicio: {fecha(atencion.fecha_inicio, true)}
                          </Text>
                        </View>

                        <Estado valor={atencion.estado} />
                      </View>

                      {!!motivo && (
                        <View style={s.motivoConsulta}>
                          <Text style={s.motivoEtiqueta}>
                            Motivo de consulta
                          </Text>

                          <Text style={s.motivoTexto}>
                            {motivo}
                          </Text>
                        </View>
                      )}

                      <Text style={s.resumenAtencion}>
                        {atencion.actividades?.filter(
                          (actividad) => actividad.eliminado !== true
                        ).length || 0}{' '}
                        actividad(es) registrada(s)
                      </Text>

                      <Text style={s.abrirDetalle}>
                        Ver detalle de atención ›
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}

              {/* EXPORTAR AL FINAL DEL HISTORIAL */}

              {historial.length > 0 && (
                <View style={s.contenedorExportar}>
                  <Text style={s.textoExportar}>
                    El documento incluirá todas las atenciones y actividades registradas de esta mascota.
                  </Text>

                  <TouchableOpacity
                    style={[
                      s.botonExportar,
                      exportando && s.botonDeshabilitado,
                    ]}
                    onPress={exportarHistorial}
                    disabled={exportando}
                    activeOpacity={0.8}
                  >
                    {exportando ? (
                      <>
                        <ActivityIndicator
                          color={C.blanco}
                          size="small"
                        />

                        <Text style={s.botonExportarTexto}>
                          Generando PDF...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.iconoExportar}>↓</Text>

                        <Text style={s.botonExportarTexto}>
                          Exportar historial completo
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

        {/* ==================================================
            PESTAÑA CITAS
        ================================================== */}

        {mascota &&
          !cargando &&
          !error &&
          pestana === 'citas' && (
            <>
              {/* ACTIVIDADES PENDIENTES */}

              <View style={s.encabezadoLista}>
                <Text style={s.tituloLista}>
                  Pendientes de programación
                </Text>

                <View style={s.contadorPendiente}>
                  <Text style={s.contadorPendienteTexto}>
                    {actividadesPendientes.length}
                  </Text>
                </View>
              </View>

              <Text style={s.descripcionSeccion}>
                Selecciona las actividades que deseas agrupar en una cita. Solo puedes seleccionar actividades de una misma atención.
              </Text>

              {actividadesPendientes.length === 0 ? (
                <View style={s.tarjeta}>
                  <Text style={s.mensajeVacio}>
                    No hay actividades pendientes sin cita para esta mascota.
                  </Text>
                </View>
              ) : (
                actividadesPendientes.map((actividad) => {
                  const actividadId = String(
                    actividad.actividad_id
                  );

                  const seleccionada =
                    actividadesSeleccionadas.some(
                      (id) => String(id) === actividadId
                    );

                  return (
                    <TouchableOpacity
                      key={`pendiente-${actividadId}`}
                      style={[
                        s.tarjetaPendiente,
                        seleccionada &&
                          s.tarjetaPendienteSeleccionada,
                      ]}
                      activeOpacity={0.8}
                      onPress={() =>
                        alternarActividad(actividad)
                      }
                    >
                      <View style={s.fila}>
                        <View
                          style={[
                            s.checkbox,
                            seleccionada &&
                              s.checkboxActivo,
                          ]}
                        >
                          {seleccionada && (
                            <Text style={s.checkboxMarca}>
                              ✓
                            </Text>
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={s.nombre}>
                            {actividad.tipo ||
                              'Actividad veterinaria'}
                          </Text>

                          <Text style={s.secundario}>
                            Atención N.º{' '}
                            {obtenerAtencionId(actividad)}
                          </Text>

                          <Text style={s.secundario}>
                            {actividad.fecha_prevista
                              ? `Fecha prevista: ${fecha(actividad.fecha_prevista)}`
                              : 'Sin fecha prevista'}
                          </Text>
                        </View>

                        <Estado valor="Pendiente" />
                      </View>

                      {!!actividad.observaciones && (
                        <Text style={s.detalle}>
                          {actividad.observaciones}
                        </Text>
                      )}

                      <Text style={s.avisoProgramacion}>
                        {seleccionada
                          ? 'Actividad seleccionada para la cita.'
                          : 'Toca para seleccionar esta actividad.'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}

              {/* FORMULARIO DE PROGRAMACIÓN */}

              {actividadesSeleccionadas.length > 0 && (
                <View style={s.formularioCita}>
                  <Text style={s.tituloFormulario}>
                    Programar cita
                  </Text>

                  <Text style={s.secundario}>
                    {totalActividadesSeleccionadas}{' '}
                    actividad(es) seleccionada(s)
                  </Text>

                  <Text style={s.etiqueta}>
                    Fecha de la cita
                  </Text>

                  <TextInput
                    style={s.campoFormulario}
                    value={fechaProgramada}
                    onChangeText={setFechaProgramada}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#9AA6AE"
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />

                  <Text style={s.ayudaCampo}>
                    Formato: año-mes-día. Ejemplo: 2026-12-05.
                  </Text>

                  <Text style={s.etiqueta}>
                    Hora de la cita
                  </Text>

                  <TextInput
                    style={s.campoFormulario}
                    value={horaCita}
                    onChangeText={setHoraCita}
                    placeholder="HH:MM"
                    placeholderTextColor="#9AA6AE"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />

                  <Text style={s.etiqueta}>
                    Motivo de la cita
                  </Text>

                  <TextInput
                    style={s.campoFormulario}
                    value={motivoCita}
                    onChangeText={setMotivoCita}
                    placeholder="Motivo de la cita..."
                    placeholderTextColor="#9AA6AE"
                  />

                  <Text style={s.etiqueta}>
                    Descripción
                  </Text>

                  <TextInput
                    style={[
                      s.campoFormulario,
                      s.campoMultilinea,
                    ]}
                    value={descripcionCita}
                    onChangeText={setDescripcionCita}
                    placeholder="Información adicional (opcional)..."
                    placeholderTextColor="#9AA6AE"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  {!!errorProgramacion && (
                    <Text style={s.error}>
                      {errorProgramacion}
                    </Text>
                  )}

                  <View style={s.botonesFormulario}>
                    <TouchableOpacity
                      style={s.botonCancelar}
                      onPress={limpiarFormularioProgramacion}
                      disabled={programando}
                    >
                      <Text style={s.botonCancelarTexto}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        s.boton,
                        s.botonProgramar,
                        programando &&
                          s.botonDeshabilitado,
                      ]}
                      onPress={programarCita}
                      disabled={programando}
                    >
                      {programando ? (
                        <ActivityIndicator
                          color={C.blanco}
                        />
                      ) : (
                        <Text style={s.botonTexto}>
                          Programar cita
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* CITAS EXISTENTES */}

              <View style={s.encabezadoLista}>
                <Text style={s.tituloLista}>
                  Citas de la mascota
                </Text>

                <Text style={s.secundario}>
                  {citas.length} registro(s)
                </Text>
              </View>

              {citas.length === 0 ? (
                <View style={s.tarjeta}>
                  <Text style={s.mensajeVacio}>
                    No hay citas registradas para esta mascota.
                  </Text>
                </View>
              ) : (
                citas.map((cita) => (
                  <View
                    key={String(cita.cita_id)}
                    style={s.tarjeta}
                  >
                    <View style={s.fila}>
                      <View style={s.iconoCita}>
                        <Text style={s.iconoCitaTexto}>
                          ◷
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={s.nombre}>
                          Cita N.º {cita.cita_id}
                        </Text>

                        <Text style={s.secundario}>
                          {fecha(cita.fecha_programada)} ·{' '}
                          {texto(cita.hora_cita).substring(0, 5)}
                        </Text>
                      </View>

                      <Estado valor={cita.estado} />
                    </View>

                    {!!cita.motivo_cita && (
                      <Text style={s.detalle}>
                        Motivo: {cita.motivo_cita}
                      </Text>
                    )}

                    {!!cita.descripcion_cita && (
                      <Text style={s.detalle}>
                        Descripción: {cita.descripcion_cita}
                      </Text>
                    )}

                    <View style={s.divisor} />

                    <Text style={s.tituloSeccion}>
                      Actividades asociadas (
                      {cita.actividades?.length || 0})
                    </Text>

                    {(cita.actividades || []).length === 0 ? (
                      <Text style={s.secundario}>
                        No hay actividades asociadas disponibles.
                      </Text>
                    ) : (
                      cita.actividades.map(
                        (actividad, indice) => (
                          <View
                            key={String(
                              actividad.detalle_cita_id ||
                                actividad.actividad_id ||
                                indice
                            )}
                          >
                            <Actividad item={actividad} />

                            {!!actividad.estado_relacion && (
                              <Text style={s.secundario}>
                                Relación:{' '}
                                {actividad.estado_relacion}
                              </Text>
                            )}
                          </View>
                        )
                      )
                    )}
                  </View>
                ))
              )}
            </>
          )}

        <View style={{ height: 30 }} />
      </ScrollView>

      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
      />
    </SafeAreaView>
  );
}

// ============================================================
// ESTILOS
// ============================================================

const s = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  scroll: {
    flex: 1,
  },
  contenido: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 30,
  },
  rutaNavegacion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  rutaTexto: {
    color: C.secundario,
    fontSize: 11,
    fontWeight: '700',
  },
  rutaSeparador: {
    color: C.secundario,
    fontSize: 15,
    marginHorizontal: 8,
  },
  rutaActual: {
    color: C.primario,
    fontSize: 11,
    fontWeight: '900',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconoCabecera: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#DDF2ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconoCabeceraTexto: {
    color: C.primario,
    fontSize: 27,
    fontWeight: '900',
  },
  titulo: {
    color: C.texto,
    fontSize: 21,
    fontWeight: '900',
  },
  subtitulo: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 15,
    marginBottom: 13,
  },
  tituloSeccion: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
  },
  inputContenedor: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    paddingHorizontal: 12,
    backgroundColor: '#FAFCFC',
  },
  lupa: {
    color: C.primario,
    fontSize: 25,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: C.texto,
    fontSize: 13,
    paddingVertical: 10,
  },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F3',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#DDF2ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarTexto: {
    color: C.primario,
    fontSize: 17,
    fontWeight: '900',
  },
  flecha: {
    color: C.primario,
    fontSize: 26,
    marginLeft: 8,
  },
  nombre: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '900',
  },
  secundario: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 4,
  },
  mensajeVacio: {
    color: C.secundario,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
  },
  inicial: {
    backgroundColor: C.blanco,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 27,
    alignItems: 'center',
  },
  inicialIcono: {
    fontSize: 38,
    marginBottom: 10,
  },
  inicialTitulo: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '900',
  },
  secundarioCentrado: {
    color: C.secundario,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  tarjetaMascota: {
    backgroundColor: C.blanco,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 15,
    marginBottom: 15,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGrande: {
    width: 53,
    height: 53,
    borderRadius: 16,
    backgroundColor: '#DDF2ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarGrandeTexto: {
    color: C.primario,
    fontSize: 23,
    fontWeight: '900',
  },
  nombreMascota: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '900',
  },
  propietario: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: C.borde,
  },
  indicador: {
    flex: 1,
    alignItems: 'center',
  },
  indicadorNumero: {
    color: C.primario,
    fontSize: 21,
    fontWeight: '900',
  },
  indicadorTexto: {
    color: C.secundario,
    fontSize: 10,
    marginTop: 3,
  },
  separador: {
    width: 1,
    height: 32,
    backgroundColor: C.borde,
  },
  pestanas: {
    flexDirection: 'row',
    backgroundColor: '#E9EFF0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  pestana: {
    flex: 1,
    minHeight: 42,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pestanaActiva: {
    backgroundColor: C.blanco,
    elevation: 2,
  },
  pestanaTexto: {
    color: C.secundario,
    fontSize: 12,
    fontWeight: '800',
  },
  pestanaTextoActivo: {
    color: C.primario,
    fontWeight: '900',
  },
  encabezadoLista: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    marginBottom: 10,
  },
  tituloLista: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
  },
  contadorPendiente: {
    minWidth: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#FFF2D9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  contadorPendienteTexto: {
    color: C.pendiente,
    fontSize: 12,
    fontWeight: '900',
  },
  descripcionSeccion: {
    color: C.secundario,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 12,
  },
  tarjetaAtencion: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 14,
    marginBottom: 12,
  },
  iconoAtencion: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#DDF2ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconoAtencionTexto: {
    color: C.primario,
    fontSize: 22,
    fontWeight: '900',
  },
  motivoConsulta: {
    backgroundColor: '#F0F8F6',
    borderLeftWidth: 3,
    borderLeftColor: C.primario,
    borderRadius: 7,
    padding: 10,
    marginTop: 12,
  },
  motivoEtiqueta: {
    color: C.primario,
    fontSize: 10,
    fontWeight: '900',
  },
  motivoTexto: {
    color: C.texto,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  resumenAtencion: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 13,
  },
  abrirDetalle: {
    color: C.primario,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 10,
  },
  contenedorExportar: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 15,
    padding: 15,
    marginTop: 5,
    marginBottom: 15,
  },
  textoExportar: {
    color: C.secundario,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 12,
  },
  botonExportar: {
    minHeight: 47,
    backgroundColor: C.primario,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 9,
  },
  botonExportarTexto: {
    color: C.blanco,
    fontSize: 12,
    fontWeight: '900',
  },
  iconoExportar: {
    color: C.blanco,
    fontSize: 22,
    fontWeight: '900',
  },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: 125,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  estadoTexto: {
    fontSize: 10,
    fontWeight: '900',
    flexShrink: 1,
  },
  actividad: {
    backgroundColor: '#F8FAFA',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E9EFF0',
    padding: 11,
    marginTop: 9,
  },
  actividadNombre: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '900',
  },
  detalle: {
    color: C.texto,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },
  avisoProgramacion: {
    color: C.pendiente,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 10,
    fontWeight: '700',
  },
  tarjetaPendiente: {
    backgroundColor: C.blanco,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 13,
    marginBottom: 10,
  },
  tarjetaPendienteSeleccionada: {
    borderColor: C.primario,
    backgroundColor: '#F0FAF7',
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#AAB7BD',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActivo: {
    backgroundColor: C.primario,
    borderColor: C.primario,
  },
  checkboxMarca: {
    color: C.blanco,
    fontSize: 15,
    fontWeight: '900',
  },
  formularioCita: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 15,
    marginBottom: 18,
  },
  tituloFormulario: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 3,
  },
  etiqueta: {
    color: C.texto,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 13,
    marginBottom: 6,
  },
  campoFormulario: {
    minHeight: 43,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
    color: C.texto,
    fontSize: 12,
    backgroundColor: '#FAFCFC',
  },
  campoMultilinea: {
    minHeight: 75,
  },
  ayudaCampo: {
    color: C.secundario,
    fontSize: 10,
    marginTop: 5,
  },
  botonesFormulario: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
    gap: 9,
  },
  botonCancelar: {
    borderWidth: 1,
    borderColor: C.borde,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 9,
  },
  botonCancelarTexto: {
    color: C.secundario,
    fontSize: 11,
    fontWeight: '800',
  },
  boton: {
    backgroundColor: C.primario,
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 9,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  botonProgramar: {
    marginTop: 0,
    minWidth: 130,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: C.blanco,
    fontSize: 12,
    fontWeight: '900',
  },
  iconoCita: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#EAF0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconoCitaTexto: {
    color: C.confirmada,
    fontSize: 22,
    fontWeight: '900',
  },
  divisor: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 13,
  },
  cargando: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  tarjetaError: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F0CACA',
    padding: 16,
    marginTop: 10,
  },
  errorTitulo: {
    color: C.noRealizada,
    fontSize: 14,
    fontWeight: '900',
  },
  error: {
    color: C.noRealizada,
    fontSize: 12,
    marginTop: 8,
  },
});
