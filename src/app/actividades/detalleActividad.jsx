
/**
 * ============================================================
 * PETCARE - DETALLE DE ACTIVIDAD
 * ============================================================
 *
 * RF24: Consultar datos clínicos y específicos.
 * RF25: Cambiar y reactivar estado.
 * RF32: Editar información y eliminación lógica.
 *
 * Arquitectura:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 * ============================================================
 */

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';

import { supabase } from '../../services/supabase';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

import {
  obtenerDatosConsulta,
} from '../../controllers/atenciones/atencionesControlador';

import {
  obtenerDetalleActividad,
  cambiarEstadoActividad,
  reactivarActividad,
  eliminarActividad,
  verificarAtencionListaParaFinalizar,
  finalizarAtencion,
} from '../../controllers/actividades/actividadesControlador';

// ============================================================
// COLORES
// ============================================================

const C = {
  fondo: '#F2F7F6',
  verde: '#126B61',
  verdeOscuro: '#0D514A',
  verdeClaro: '#E1F3ED',
  verdeBorde: '#BFE3D6',
  texto: '#243746',
  secundario: '#718096',
  blanco: '#FFFFFF',
  borde: '#DFEAE7',
  naranja: '#FFF4DE',
  naranjaTexto: '#99630B',
  rojo: '#FDECEC',
  rojoTexto: '#B42318',
};

// ============================================================
// ETIQUETAS
// ============================================================

const ETIQUETAS = {
  descripcion: 'Descripción',
  observaciones: 'Observaciones',
  duracion: 'Duración del tratamiento',
  duracion_tratamiento: 'Duración del tratamiento',
  dosis: 'Dosis',
  cantidad: 'Cantidad',
  frecuencia: 'Frecuencia',
  via_administracion: 'Vía de administración',
  medicamento: 'Medicamento',
  nombre_medicamento: 'Medicamento',
  concentracion: 'Concentración',
  categoria: 'Categoría',
  nombre_vacuna: 'Vacuna',
  vacuna: 'Vacuna',
  fabricante: 'Fabricante',
  lote: 'Número de lote',
  numero_lote: 'Número de lote',
  fecha_vencimiento: 'Fecha de vencimiento',
  fecha_aplicacion: 'Fecha de aplicación',
  fecha_proxima_dosis: 'Próxima dosis',
  proxima_dosis: 'Próxima dosis',
  peso: 'Peso',
  temperatura: 'Temperatura',
  motivo_consulta: 'Motivo de consulta',
  sintomas: 'Síntomas',
  diagnostico: 'Diagnóstico',
  recomendaciones: 'Recomendaciones',
  tratamiento: 'Tratamiento',
  organo: 'Órgano evaluado',
  organos: 'Órganos evaluados',
  hallazgos: 'Hallazgos',
  resultados: 'Resultados',
  conclusion: 'Conclusión',
  tipo_estudio: 'Tipo de estudio',
  fecha_estudio: 'Fecha del estudio',
  tipo_esterilizacion: 'Tipo de esterilización',
  tecnica: 'Técnica',
  fecha_cirugia: 'Fecha de cirugía',
  cirujano: 'Responsable de cirugía',
  cuidados: 'Cuidados posteriores',
  cuidados_posteriores: 'Cuidados posteriores',
  indicaciones: 'Indicaciones',
  alimentacion: 'Alimentación',
  dieta: 'Dieta',
  nombre_dieta: 'Nombre de la dieta',
  cantidad_diaria: 'Cantidad diaria',
  horario: 'Horario',
  fecha_inicio: 'Fecha de inicio',
  fecha_fin: 'Fecha de finalización',
  fecha_prevista: 'Fecha prevista',
  proxima_cita: 'Próxima cita',
  motivo: 'Motivo',
  responsable: 'Responsable',
};

// ============================================================
// CAMPOS TÉCNICOS
// ============================================================

const CAMPOS_IGNORADOS = [
  'actividad_id',
  'atencion_id',
  'detalle_id',
  'tipo_id',
  'created_at',
  'updated_at',
  'createdAt',
  'updatedAt',
  'fecha_registro',
  'fecha_completada',
  'fecha_fin',
  'creado_por',
  'creador',
  'eliminado',
  'datos_consulta',
  'receta',
  'medicamentos_asociados',
  'vacunas_asociadas',
  'tipos_actividad',
  'atenciones',
  'mascotas',
  'propietarios',
  'nombre_mascota',
  'numero_historia',
  'estado_atencion',
  'nombre_creador',
  'rol_creador',
];

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function tieneInformacion(valor) {
  if (valor === null || valor === undefined) return false;

  if (typeof valor === 'string') {
    return valor.trim() !== '';
  }

  if (Array.isArray(valor)) {
    return valor.length > 0;
  }

  return true;
}

function obtenerParametro(valor) {
  return Array.isArray(valor) ? valor[0] : valor;
}

function obtenerObjeto(valor) {
  if (!valor) return {};

  if (typeof valor === 'string') {
    try {
      const resultado = JSON.parse(valor);

      return resultado &&
        typeof resultado === 'object' &&
        !Array.isArray(resultado)
        ? resultado
        : {};
    } catch {
      return {};
    }
  }

  return typeof valor === 'object' && !Array.isArray(valor)
    ? valor
    : {};
}

function fechaLegible(fecha) {
  if (!tieneInformacion(fecha)) return null;

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return String(fecha);
  }

  return valor.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fechaSimple(fecha) {
  if (!tieneInformacion(fecha)) return null;

  const texto = String(fecha);

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [anio, mes, dia] = texto.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return texto;
  }

  return valor.toLocaleDateString('es-PE');
}

/**
 * Comprueba si la fecha prevista corresponde a un día
 * posterior al día actual.
 *
 * Las fechas de hoy o anteriores no se muestran.
 */
function fechaEsPosteriorAHoy(fecha) {
  if (!tieneInformacion(fecha)) return false;

  const texto = String(fecha).trim();
  const coincidencia = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!coincidencia) return false;

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);

  const fechaEvaluada = new Date(anio, mes - 1, dia);
  const hoy = new Date();

  hoy.setHours(0, 0, 0, 0);
  fechaEvaluada.setHours(0, 0, 0, 0);

  return (
    !Number.isNaN(fechaEvaluada.getTime()) &&
    fechaEvaluada.getTime() > hoy.getTime()
  );
}

function etiquetaCampo(clave) {
  if (ETIQUETAS[clave]) {
    return ETIQUETAS[clave];
  }

  return String(clave)
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (letra) => letra.toUpperCase());
}

function normalizarClave(clave) {
  return String(clave || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function textoSeguro(valor) {
  if (!tieneInformacion(valor)) return '';

  if (typeof valor === 'boolean') {
    return valor ? 'Sí' : 'No';
  }

  if (Array.isArray(valor)) {
    return valor
      .map(textoSeguro)
      .filter(Boolean)
      .join(', ');
  }

  if (typeof valor === 'object') {
    return Object.entries(valor)
      .filter(([clave]) => !CAMPOS_IGNORADOS.includes(clave))
      .map(([clave, contenido]) => {
        return `${etiquetaCampo(clave)}: ${textoSeguro(contenido)}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  return String(valor);
}

function aplanarDetalle(objeto, prefijo = '') {
  if (!objeto || typeof objeto !== 'object') {
    return [];
  }

  let resultado = [];

  Object.entries(objeto).forEach(([clave, valor]) => {
    if (CAMPOS_IGNORADOS.includes(clave)) return;
    if (!tieneInformacion(valor)) return;

    const claveCompleta = prefijo
      ? `${prefijo}_${clave}`
      : clave;

    if (Array.isArray(valor)) {
      if (
        valor.every((item) =>
          item === null ||
          ['string', 'number', 'boolean'].includes(typeof item)
        )
      ) {
        resultado.push({
          clave: claveCompleta,
          etiqueta: etiquetaCampo(claveCompleta),
          valor: textoSeguro(valor),
        });
      } else {
        valor.forEach((item, indice) => {
          if (item && typeof item === 'object') {
            resultado = resultado.concat(
              aplanarDetalle(item, `${claveCompleta}_${indice + 1}`)
            );
          }
        });
      }

      return;
    }

    if (typeof valor === 'object') {
      resultado = resultado.concat(
        aplanarDetalle(valor, claveCompleta)
      );
      return;
    }

    resultado.push({
      clave: claveCompleta,
      etiqueta: etiquetaCampo(claveCompleta),
      valor: textoSeguro(valor),
    });
  });

  return resultado;
}

function obtenerListaAsociada(actividad, nombre) {
  const especificos = obtenerObjeto(actividad?.datos_especificos);
  const detalle = obtenerObjeto(actividad?.detalle);

  const candidatos = [
    actividad?.[nombre],
    especificos?.[nombre],
    detalle?.[nombre],
  ];

  for (const candidato of candidatos) {
    if (Array.isArray(candidato)) {
      return candidato;
    }
  }

  return [];
}

function obtenerNombreTipo(actividad) {
  return (
    actividad?.tipo_codigo ||
    actividad?.tipos_actividad?.codigo ||
    actividad?.tipo ||
    actividad?.tipos_actividad?.nombre ||
    'Actividad'
  );
}

function esTipo(actividad, codigo, palabra) {
  const tipo = String(obtenerNombreTipo(actividad)).toLowerCase();

  return (
    tipo.includes(codigo.toLowerCase()) ||
    tipo.includes(palabra.toLowerCase())
  );
}

function obtenerCreador(actividad) {
  const relacion = actividad?.creador;

  if (Array.isArray(relacion)) {
    return relacion[0] || null;
  }

  return relacion || null;
}

// ============================================================
// COMPONENTES
// ============================================================

function Seccion({ titulo, subtitulo, children }) {
  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.encabezadoSeccion}>
        <View style={estilos.indicadorSeccion} />

        <View style={{ flex: 1 }}>
          <Text style={estilos.tituloSeccion}>{titulo}</Text>

          {!!subtitulo && (
            <Text style={estilos.subtituloSeccion}>
              {subtitulo}
            </Text>
          )}
        </View>
      </View>

      {children}
    </View>
  );
}

function Campo({ etiqueta, valor }) {
  if (!tieneInformacion(valor)) return null;

  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiquetaCampo}>{etiqueta}</Text>
      <Text style={estilos.valorCampo}>{textoSeguro(valor)}</Text>
    </View>
  );
}

function TarjetaAsociada({ titulo, numero, children }) {
  return (
    <View style={estilos.tarjetaAsociada}>
      <View style={estilos.encabezadoAsociado}>
        <Text style={estilos.tituloAsociado}>{titulo}</Text>
        <Text style={estilos.numeroAsociado}>{numero}</Text>
      </View>

      {children}
    </View>
  );
}

// ============================================================
// PANTALLA PRINCIPAL
// ============================================================

export default function DetalleActividadScreen() {
  const parametros = useLocalSearchParams();

  const atencionIdParametro =
    obtenerParametro(parametros.atencion_id) || '';

  const estadoAtencionParametro =
    obtenerParametro(parametros.atencion_estado) || '';

  const nombreMascotaParametro =
    obtenerParametro(parametros.nombre_mascota) || '';

  const nombreCreadorParametro =
    obtenerParametro(parametros.nombre_creador) || '';

  const rolCreadorParametro =
    obtenerParametro(parametros.rol_creador) || '';

  const actividadInicial = useMemo(() => {
    const idDirecto = obtenerParametro(parametros.actividad_id);
    const valor = obtenerParametro(parametros.actividad);

    let objeto = {};

    if (valor) {
      try {
        objeto = JSON.parse(valor);
      } catch (error) {
        console.error('Error interpretando actividad:', error);
      }
    }

    if (idDirecto && !objeto.actividad_id) {
      objeto.actividad_id = idDirecto;
    }

    if (!objeto.nombre_mascota && nombreMascotaParametro) {
      objeto.nombre_mascota = nombreMascotaParametro;
    }

    if (!objeto.nombre_creador && nombreCreadorParametro) {
      objeto.nombre_creador = nombreCreadorParametro;
    }

    if (!objeto.rol_creador && rolCreadorParametro) {
      objeto.rol_creador = rolCreadorParametro;
    }

    if (!objeto.estado_atencion && estadoAtencionParametro) {
      objeto.estado_atencion = estadoAtencionParametro;
    }

    return objeto.actividad_id ? objeto : null;
  }, [
    parametros.actividad,
    parametros.actividad_id,
    nombreMascotaParametro,
    nombreCreadorParametro,
    rolCreadorParametro,
    estadoAtencionParametro,
  ]);

  const [actividadCompleta, setActividadCompleta] = useState(null);
  const [cargandoActividad, setCargandoActividad] = useState(true);
  const [errorActividad, setErrorActividad] = useState('');

  const actividad = useMemo(() => ({
    ...(actividadInicial || {}),
    ...(actividadCompleta || {}),
    nombre_mascota:
      actividadCompleta?.nombre_mascota ||
      actividadInicial?.nombre_mascota ||
      nombreMascotaParametro ||
      '',
    nombre_creador:
      actividadCompleta?.nombre_creador ||
      actividadInicial?.nombre_creador ||
      nombreCreadorParametro ||
      '',
    rol_creador:
      actividadCompleta?.rol_creador ||
      actividadInicial?.rol_creador ||
      rolCreadorParametro ||
      '',
  }), [
    actividadInicial,
    actividadCompleta,
    nombreMascotaParametro,
    nombreCreadorParametro,
    rolCreadorParametro,
  ]);

  const actividadId = actividad?.actividad_id;

  const atencionId =
    actividad?.atencion_id ||
    atencionIdParametro ||
    '';

  const nombreMascota =
    actividad?.nombre_mascota ||
    actividad?.mascota_nombre ||
    actividad?.mascota?.nombre ||
    actividad?.mascotas?.nombre ||
    actividad?.mascotas?.nombre_mascota ||
    'No disponible';

  const estadoAtencion =
    actividad?.estado_atencion ||
    actividad?.atenciones?.estado ||
    estadoAtencionParametro ||
    '';

  const [datosConsulta, setDatosConsulta] = useState(null);
  const [cargandoConsulta, setCargandoConsulta] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState('');

  const [estadoActual, setEstadoActual] = useState('Pendiente');
  const [motivoNoRealizada, setMotivoNoRealizada] = useState('');

  const [modalEstado, setModalEstado] = useState(false);
  const [accionEstado, setAccionEstado] = useState('');
  const [motivoFormulario, setMotivoFormulario] = useState('');
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState('');

  // Confirmación independiente para finalizar la atención.
  const [modalFinalizarAtencion, setModalFinalizarAtencion] = useState(false);
  const [finalizandoAtencion, setFinalizandoAtencion] = useState(false);
  const [errorFinalizarAtencion, setErrorFinalizarAtencion] = useState('');

  const [menuVisible, setMenuVisible] = useState(false);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  const [modalEliminar, setModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // ----------------------------------------------------------
  // PERFIL PARA MENÚ LATERAL
  // ----------------------------------------------------------

  const cargarPerfilUsuario = useCallback(async () => {
    try {
      const { data: sesion, error: errorSesion } =
        await supabase.auth.getUser();

      if (errorSesion) throw errorSesion;

      const usuario = sesion?.user;

      if (!usuario?.id) {
        setNombreUsuario('');
        setRolUsuario('');
        return;
      }

      const { data: perfil, error } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol, estado_cuenta')
        .eq('perfil_id', usuario.id)
        .maybeSingle();

      if (error) throw error;

      setNombreUsuario(perfil?.nombre_completo || '');
      setRolUsuario(perfil?.rol || '');
    } catch (error) {
      console.error('Error cargando perfil:', error);
    }
  }, []);

  useEffect(() => {
    cargarPerfilUsuario();
  }, [cargarPerfilUsuario]);

  function abrirMenuLateral() {
    setSidebarVisible(true);
  }

  function cerrarMenuLateral() {
    setSidebarVisible(false);
  }

  async function cerrarSesion() {
    try {
      cerrarMenuLateral();

      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      router.replace('/');
    } catch (error) {
      Alert.alert(
        'No se pudo cerrar sesión',
        error?.message || 'Inténtalo nuevamente.'
      );
    }
  }

  // ----------------------------------------------------------
  // CARGAR Y ACTUALIZAR DETALLE COMPLETO
  // ----------------------------------------------------------

  const cargarDetalleActividad = useCallback(async () => {
    const id = actividadInicial?.actividad_id;

    if (!id) {
      setErrorActividad(
        'No se recibió el identificador de la actividad.'
      );
      setCargandoActividad(false);
      return;
    }

    try {
      setCargandoActividad(true);
      setErrorActividad('');

      const resultado = await obtenerDetalleActividad(id);

      if (!resultado) {
        setActividadCompleta(null);
        setErrorActividad(
          'No se encontró la información de esta actividad.'
        );
        return;
      }

      setActividadCompleta(resultado);
      setEstadoActual(resultado.estado || 'Pendiente');

      setMotivoNoRealizada(
        resultado.motivo_no_realizada ||
        resultado.motivoNoRealizada ||
        ''
      );

      if (esTipo(resultado, 'CONSULTA', 'consulta')) {
        setCargandoConsulta(true);
        setErrorConsulta('');

        try {
          const datos = await obtenerDatosConsulta(
            resultado.actividad_id || id
          );

          setDatosConsulta(datos || null);
        } catch (error) {
          console.error(
            'Error actualizando datos clínicos:',
            error
          );

          setErrorConsulta(
            error?.message ||
            'No se pudieron actualizar los datos clínicos.'
          );
        } finally {
          setCargandoConsulta(false);
        }
      } else {
        setDatosConsulta(null);
        setErrorConsulta('');
        setCargandoConsulta(false);
      }
    } catch (error) {
      console.error(
        'Error cargando detalle de actividad:',
        error
      );

      setErrorActividad(
        error?.message ||
        'No se pudo recuperar la información actualizada.'
      );
    } finally {
      setCargandoActividad(false);
    }
  }, [actividadInicial?.actividad_id]);

  // ----------------------------------------------------------
  // ACTUALIZAR AUTOMÁTICAMENTE AL REGRESAR A ESTA PANTALLA
  // ----------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function actualizarAlRegresar() {
        const id = actividadInicial?.actividad_id;

        if (!id) {
          setErrorActividad(
            'No se recibió el identificador de la actividad.'
          );
          setCargandoActividad(false);
          return;
        }

        try {
          setCargandoActividad(true);
          setErrorActividad('');

          const resultado = await obtenerDetalleActividad(id);

          if (!activo) return;

          if (!resultado) {
            setActividadCompleta(null);
            setErrorActividad(
              'No se encontró la información de esta actividad.'
            );
            return;
          }

          setActividadCompleta(resultado);
          setEstadoActual(resultado.estado || 'Pendiente');

          setMotivoNoRealizada(
            resultado.motivo_no_realizada ||
            resultado.motivoNoRealizada ||
            ''
          );

          if (esTipo(resultado, 'CONSULTA', 'consulta')) {
            setCargandoConsulta(true);
            setErrorConsulta('');

            try {
              const datos = await obtenerDatosConsulta(
                resultado.actividad_id || id
              );

              if (activo) {
                setDatosConsulta(datos || null);
              }
            } catch (error) {
              console.error(
                'Error actualizando datos clínicos:',
                error
              );

              if (activo) {
                setErrorConsulta(
                  error?.message ||
                  'No se pudieron actualizar los datos clínicos.'
                );
              }
            } finally {
              if (activo) {
                setCargandoConsulta(false);
              }
            }
          } else {
            setDatosConsulta(null);
            setErrorConsulta('');
            setCargandoConsulta(false);
          }
        } catch (error) {
          console.error(
            'Error actualizando detalle de actividad:',
            error
          );

          if (activo) {
            setErrorActividad(
              error?.message ||
              'No se pudo recuperar la información actualizada.'
            );
          }
        } finally {
          if (activo) {
            setCargandoActividad(false);
          }
        }
      }

      actualizarAlRegresar();

      return () => {
        activo = false;
      };
    }, [actividadInicial?.actividad_id])
  );

  // ----------------------------------------------------------
  // TIPO Y ESTADO: SE CONSERVAN PARA LA LÓGICA INTERNA
  // ----------------------------------------------------------

  const esConsulta = esTipo(actividad, 'CONSULTA', 'consulta');
  const esMedicacion = esTipo(actividad, 'MEDICACION', 'medicacion');
  const esVacunacion = esTipo(actividad, 'VACUNACION', 'vacunacion');

  const atencionActiva =
    String(estadoAtencion).trim().toLowerCase() === 'activa';

  const estadoNormalizado =
    String(estadoActual).trim().toLowerCase();

  const pendiente = estadoNormalizado === 'pendiente';
  const noRealizada = estadoNormalizado === 'no realizada';
  const completada = estadoNormalizado === 'completada';

  const puedeAdministrar =
    atencionActiva && (pendiente || noRealizada);

  // ----------------------------------------------------------
  // DETALLE ESPECÍFICO
  // ----------------------------------------------------------

  const detalleCompleto = useMemo(() => {
    const detalle = obtenerObjeto(actividad?.detalle);
    const especificos = obtenerObjeto(actividad?.datos_especificos);

    return {
      ...detalle,
      ...especificos,
    };
  }, [actividad?.detalle, actividad?.datos_especificos]);

  const medicamentos = useMemo(
    () => obtenerListaAsociada(actividad, 'medicamentos_asociados'),
    [actividad]
  );

  const vacunas = useMemo(
    () => obtenerListaAsociada(actividad, 'vacunas_asociadas'),
    [actividad]
  );

  const camposGenerales = useMemo(() => {
    const campos = aplanarDetalle(detalleCompleto);

    const clavesDuplicadas = new Set([
      'medicamentosasociados',
      'vacunasasociadas',
      'datosconsulta',
      'receta',
      'motivo_consulta',
      'sintomas',
      'peso',
      'temperatura',
    ]);

    if (esConsulta) {
      [
        'diagnostico',
        'recomendaciones',
        'proxima_cita',
      ].forEach((clave) => clavesDuplicadas.add(clave));
    }

    if (esMedicacion) {
      [
        'duracion',
        'duraciontratamiento',
      ].forEach((clave) => clavesDuplicadas.add(clave));
    }

    if (esVacunacion) {
      [
        'nombrevacuna',
        'vacuna',
        'nombremedicamento',
      ].forEach((clave) => clavesDuplicadas.add(clave));
    }

    return campos.filter((campo) => {
      return !clavesDuplicadas.has(normalizarClave(campo.clave));
    });
  }, [detalleCompleto, esConsulta, esMedicacion, esVacunacion]);

  // ----------------------------------------------------------
  // RESPONSABLE
  // ----------------------------------------------------------

  const creador = obtenerCreador(actividad);

  const nombreCreador =
    creador?.nombre_completo ||
    actividad?.nombre_creador ||
    actividad?.creador_nombre ||
    nombreCreadorParametro ||
    'No disponible';

  const rolCreador =
    creador?.rol ||
    actividad?.rol_creador ||
    rolCreadorParametro ||
    'No disponible';

  // ----------------------------------------------------------
  // FECHAS
  // ----------------------------------------------------------

  const fechaRegistro =
    actividad?.fecha_registro ||
    actividad?.created_at ||
    actividad?.fecha_creacion ||
    null;

  const fechaFinalizacion =
    actividad?.fecha_completada ||
    actividad?.fecha_fin ||
    null;

  const fechaPrevista =
    actividad?.fecha_prevista ||
    null;

  const mostrarFechaPrevista =
    fechaEsPosteriorAHoy(fechaPrevista);

  // ----------------------------------------------------------
  // DATOS CLÍNICOS DE CONSULTA
  // ----------------------------------------------------------

  const consultaDetalle = obtenerObjeto(
    datosConsulta?.datos_consulta ||
    datosConsulta?.detalle ||
    actividad?.datos_consulta ||
    actividad?.detalle
  );

  const consultaFuente = {
    ...consultaDetalle,
    ...obtenerObjeto(datosConsulta),
  };

  const camposConsulta = [
    {
      etiqueta: 'Motivo de consulta',
      valor:
        consultaFuente.motivo_consulta ||
        consultaFuente.motivo,
    },
    {
      etiqueta: 'Síntomas',
      valor: consultaFuente.sintomas,
    },
    {
      etiqueta: 'Peso',
      valor: tieneInformacion(consultaFuente.peso)
        ? `${consultaFuente.peso} kg`
        : null,
    },
    {
      etiqueta: 'Temperatura',
      valor: tieneInformacion(consultaFuente.temperatura)
        ? `${consultaFuente.temperatura} °C`
        : null,
    },
  ].filter((campo) => tieneInformacion(campo.valor));

  const recetaConsulta =
    datosConsulta?.receta ||
    consultaFuente.receta ||
    null;

  const camposReceta = [
    {
      etiqueta: 'Diagnóstico',
      valor: recetaConsulta?.diagnostico,
    },
    {
      etiqueta: 'Recomendaciones',
      valor: recetaConsulta?.recomendaciones,
    },
    {
      etiqueta: 'Próxima cita',
      valor: fechaSimple(recetaConsulta?.proxima_cita),
    },
  ].filter((campo) => tieneInformacion(campo.valor));

  // ----------------------------------------------------------
  // NAVEGACIÓN
  // ----------------------------------------------------------

  function volverAAtencion() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace({
      pathname: '/atenciones/detalleAtencion',
      params: {
        atencion_id: String(atencionId),
      },
    });
  }

  // ----------------------------------------------------------
  // EDICIÓN
  // ----------------------------------------------------------

  function abrirEdicion() {
    if (!actividadId || !puedeAdministrar) return;

    setMenuVisible(false);

    router.push({
      pathname: '/actividades/editarActividad',
      params: {
        actividad_id: String(actividadId),
        atencion_id: String(atencionId),
        estado: String(estadoActual),
        atencion_estado: String(estadoAtencion),
        descripcion: String(
          actividad?.descripcion ??
          actividad?.observaciones ??
          ''
        ),
        fecha_prevista: String(fechaPrevista || '').slice(0, 10),
      },
    });
  }

  // ----------------------------------------------------------
  // ELIMINAR
  // ----------------------------------------------------------

  async function ejecutarEliminacion() {
    if (!actividadId || eliminando || !puedeAdministrar) return;

    try {
      setEliminando(true);

      await eliminarActividad(actividadId);

      setModalEliminar(false);

      Alert.alert(
        'Actividad eliminada',
        'La actividad se eliminó correctamente. Los registros clínicos relacionados se conservaron.',
        [{
          text: 'Aceptar',
          onPress: () => {
            router.replace({
              pathname: '/atenciones/detalleAtencion',
              params: {
                atencion_id: String(atencionId),
                refrescar: String(Date.now()),
              },
            });
          },
        }]
      );
    } catch (error) {
      console.error('Error eliminando actividad:', error);

      Alert.alert(
        'No se pudo eliminar',
        error?.message ||
        'Ocurrió un error al eliminar la actividad.'
      );
    } finally {
      setEliminando(false);
    }
  }

  // ----------------------------------------------------------
  // CAMBIAR ESTADO DE ACTIVIDAD
  // ----------------------------------------------------------

  function abrirCambioEstado(accion) {
    if (!puedeAdministrar) return;

    setAccionEstado(accion);
    setMotivoFormulario('');
    setErrorEstado('');
    setModalEstado(true);
  }

  /**
   * Primero guarda el nuevo estado de la actividad.
   *
   * Después de guardar, verifica si todas las actividades
   * vigentes de la atención están en estado terminal.
   *
   * IMPORTANTE:
   * Esta función NO finaliza la atención.
   * Solamente abre el modal de confirmación cuando corresponde.
   */
  async function confirmarCambioEstado() {
    if (!actividadId || guardandoEstado) return;

    if (!atencionActiva) {
      setErrorEstado(
        'No puedes modificar una actividad de una atención finalizada.'
      );
      return;
    }

    if (
      accionEstado === 'No realizada' &&
      !motivoFormulario.trim()
    ) {
      setErrorEstado(
        'Debes indicar el motivo de no realización.'
      );
      return;
    }

    try {
      setGuardandoEstado(true);
      setErrorEstado('');

      // 1. Guardar el estado de la actividad.
      if (accionEstado === 'Reactivar') {
        await reactivarActividad(actividadId);
      } else {
        await cambiarEstadoActividad(
          actividadId,
          accionEstado,
          accionEstado === 'No realizada'
            ? motivoFormulario.trim()
            : null
        );
      }

      // Cerrar el modal de cambio de estado.
      setModalEstado(false);

      // Actualizar los datos de la actividad.
      if (accionEstado === 'Reactivar') {
        setEstadoActual('Pendiente');
        setMotivoNoRealizada('');
      }

      if (accionEstado === 'No realizada') {
        setMotivoNoRealizada(motivoFormulario.trim());
      }

      await cargarDetalleActividad();

      // 2. Reactivar una actividad nunca debe iniciar
      //    el proceso de finalización de la atención.
      if (accionEstado === 'Reactivar') {
        return;
      }

      // 3. Verificar si todas las actividades vigentes
      //    de esta atención ya están atendidas.
      try {
        const verificacion =
          await verificarAtencionListaParaFinalizar(atencionId);

        if (verificacion?.listaParaFinalizar === true) {
          setErrorFinalizarAtencion('');
          setModalFinalizarAtencion(true);
        }
      } catch (errorVerificacion) {
        console.error(
          'Error verificando actividades de la atención:',
          errorVerificacion
        );

        Alert.alert(
          'Actividad actualizada',
          'El estado de la actividad se guardó correctamente, pero no se pudo comprobar si la atención está lista para finalizar. Puedes volver a intentarlo desde la atención.'
        );
      }
    } catch (error) {
      console.error('Error cambiando estado:', error);

      setErrorEstado(
        error?.message ||
        'No se pudo actualizar el estado de la actividad.'
      );
    } finally {
      setGuardandoEstado(false);
    }
  }

  // ----------------------------------------------------------
  // CONFIRMAR FINALIZACIÓN DE ATENCIÓN
  // ----------------------------------------------------------

  /**
   * Se ejecuta únicamente cuando el usuario confirma
   * expresamente la finalización de la atención.
   *
   * El DAO vuelve a comprobar que todas las actividades
   * vigentes estén en estado terminal antes de actualizar
   * atenciones.estado y atenciones.fecha_fin.
   */
  async function confirmarFinalizacionAtencion() {
    if (!atencionId || finalizandoAtencion) return;

    try {
      setFinalizandoAtencion(true);
      setErrorFinalizarAtencion('');

      const resultado = await finalizarAtencion(atencionId);

      if (!resultado?.finalizada) {
        throw new Error(
          'La atención no pudo finalizarse. Verifica que todas sus actividades estén completadas o no realizadas.'
        );
      }

      setModalFinalizarAtencion(false);

      // Recuperar el detalle para mostrar el estado actualizado.
      await cargarDetalleActividad();

      Alert.alert(
        'Atención finalizada',
        'La atención se finalizó correctamente.',
        [{
          text: 'Aceptar',
          onPress: () => {
            router.replace({
              pathname: '/atenciones/detalleAtencion',
              params: {
                atencion_id: String(atencionId),
                refrescar: String(Date.now()),
              },
            });
          },
        }]
      );
    } catch (error) {
      console.error(
        'Error finalizando atención:',
        error
      );

      setErrorFinalizarAtencion(
        error?.message ||
        'No se pudo finalizar la atención. Inténtalo nuevamente.'
      );
    } finally {
      setFinalizandoAtencion(false);
    }
  }

  /**
   * Cancelar esta confirmación no modifica la atención.
   * La atención permanece Activa.
   */
  function cancelarFinalizacionAtencion() {
    if (finalizandoAtencion) return;

    setModalFinalizarAtencion(false);
    setErrorFinalizarAtencion('');
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <SafeAreaView style={estilos.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={abrirMenuLateral}
        onAbrirNotificaciones={() => {}}
      />

      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.migas}>
          <Pressable onPress={volverAAtencion}>
            <Text style={estilos.textoMiga}>Atenciones</Text>
          </Pressable>

          <Text style={estilos.textoMiga}> › </Text>

          <Pressable onPress={volverAAtencion}>
            <Text style={estilos.textoMiga}>
              Detalle de atención
            </Text>
          </Pressable>

          <Text style={estilos.textoMiga}> › </Text>

          <Text style={estilos.migaActual}>Actividad</Text>
        </View>

        <View style={estilos.encabezadoPagina}>
          <Pressable
            style={estilos.botonVolver}
            onPress={volverAAtencion}
          >
            <Text style={estilos.flechaVolver}>‹</Text>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={estilos.tituloPagina}>
              Detalle de actividad
            </Text>

            <Text style={estilos.subtituloPagina}>
              Información registrada durante la atención veterinaria.
            </Text>
          </View>
        </View>

        {cargandoActividad && (
          <View style={estilos.aviso}>
            <ActivityIndicator color={C.verde} />
            <Text style={estilos.textoSecundario}>
              Consultando todos los datos registrados...
            </Text>
          </View>
        )}

        {!!errorActividad && (
          <View style={estilos.error}>
            <Text style={estilos.textoError}>
              {errorActividad}
            </Text>
          </View>
        )}

        {!actividad ? (
          <View style={estilos.tarjeta}>
            <Text style={estilos.tituloSeccion}>
              Actividad no disponible
            </Text>

            <Text style={estilos.textoSecundario}>
              No se recibió un identificador válido de actividad.
            </Text>

            <Pressable
              style={estilos.botonPrincipal}
              onPress={volverAAtencion}
            >
              <Text style={estilos.textoBotonBlanco}>
                Volver a la atención
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* IDENTIFICACIÓN */}

            <View style={estilos.tarjetaPrincipal}>
              <View style={estilos.filaEncabezado}>
                <View style={estilos.iconoActividad}>
                  <Text style={estilos.iconoActividadTexto}>✓</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={estilos.etiquetaSuperior}>
                    ACTIVIDAD REGISTRADA
                  </Text>

                  <Text style={estilos.tituloActividad}>
                    Actividad N.° {actividadId}
                  </Text>

                  <Text style={estilos.textoMascota}>
                    Mascota: {nombreMascota}
                  </Text>
                </View>

                {puedeAdministrar && (
                  <Pressable
                    style={estilos.botonMenu}
                    onPress={() => setMenuVisible(true)}
                  >
                    <Text style={estilos.textoMenu}>⋮</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* INFORMACIÓN GENERAL */}

            <Seccion
              titulo="Información general"
              subtitulo="Datos de la mascota, registro y responsable de la actividad."
            >
              <Campo
                etiqueta="Nombre de la mascota"
                valor={nombreMascota}
              />

              <Campo
                etiqueta="Fecha y hora de registro"
                valor={fechaLegible(fechaRegistro)}
              />

              {mostrarFechaPrevista && (
                <Campo
                  etiqueta="Fecha prevista"
                  valor={fechaLegible(fechaPrevista)}
                />
              )}

              <Campo
                etiqueta="Registrado por"
                valor={nombreCreador}
              />

              <Campo
                etiqueta="Rol del responsable"
                valor={rolCreador}
              />

              {completada && (
                <Campo
                  etiqueta="Fecha y hora de finalización"
                  valor={fechaLegible(fechaFinalizacion)}
                />
              )}

              <Campo
                etiqueta="Observaciones"
                valor={actividad.observaciones}
              />

              <Campo
                etiqueta="Motivo de no realización"
                valor={motivoNoRealizada}
              />
            </Seccion>

            {/* MEDICAMENTOS */}

            {esMedicacion && (
              <Seccion
                titulo="Medicamentos administrados"
                subtitulo="Medicamentos y posología registrados para esta actividad."
              >
                {medicamentos.length === 0 ? (
                  <Text style={estilos.textoSecundario}>
                    No se encontraron medicamentos asociados a esta actividad.
                  </Text>
                ) : (
                  medicamentos.map((medicamento, indice) => (
                    <TarjetaAsociada
                      key={`${medicamento.medicamento_id || indice}`}
                      titulo={
                        medicamento.nombre_medicamento ||
                        medicamento.medicamento ||
                        medicamento.nombre ||
                        `Medicamento ${indice + 1}`
                      }
                      numero={`N.° ${indice + 1}`}
                    >
                      <Campo etiqueta="Concentración" valor={medicamento.concentracion} />
                      <Campo etiqueta="Categoría" valor={medicamento.categoria} />
                      <Campo etiqueta="Dosis" valor={medicamento.dosis} />
                      <Campo etiqueta="Frecuencia" valor={medicamento.frecuencia} />
                      <Campo etiqueta="Vía de administración" valor={medicamento.via_administracion} />
                      <Campo
                        etiqueta="Duración"
                        valor={
                          medicamento.duracion ||
                          medicamento.duracion_tratamiento
                        }
                      />
                    </TarjetaAsociada>
                  ))
                )}
              </Seccion>
            )}

            {/* VACUNAS */}

            {esVacunacion && (
              <Seccion
                titulo="Vacunas registradas"
                subtitulo="Información de las vacunas asociadas a esta actividad."
              >
                {vacunas.length === 0 ? (
                  <Text style={estilos.textoSecundario}>
                    No se encontraron vacunas asociadas a esta actividad.
                  </Text>
                ) : (
                  vacunas.map((vacuna, indice) => (
                    <TarjetaAsociada
                      key={`${vacuna.medicamento_id || indice}`}
                      titulo={
                        vacuna.nombre_medicamento ||
                        vacuna.nombre_vacuna ||
                        vacuna.vacuna ||
                        vacuna.nombre ||
                        `Vacuna ${indice + 1}`
                      }
                      numero={`N.° ${indice + 1}`}
                    >
                      <Campo etiqueta="Concentración" valor={vacuna.concentracion} />
                      <Campo etiqueta="Categoría" valor={vacuna.categoria} />
                      <Campo etiqueta="Dosis" valor={vacuna.dosis} />
                      <Campo etiqueta="Vía de administración" valor={vacuna.via_administracion} />
                      <Campo etiqueta="Fabricante" valor={vacuna.fabricante} />
                      <Campo
                        etiqueta="Número de lote"
                        valor={vacuna.numero_lote || vacuna.lote}
                      />
                      <Campo
                        etiqueta="Fecha de vencimiento"
                        valor={fechaSimple(vacuna.fecha_vencimiento)}
                      />
                    </TarjetaAsociada>
                  ))
                )}
              </Seccion>
            )}

            {/* OTROS DATOS ESPECÍFICOS */}

            {camposGenerales.length > 0 && (
              <Seccion
                titulo="Información específica"
                subtitulo="Datos adicionales registrados para este tipo de actividad."
              >
                {camposGenerales.map((campo, indice) => (
                  <Campo
                    key={`${campo.clave}-${indice}`}
                    etiqueta={campo.etiqueta}
                    valor={campo.valor}
                  />
                ))}
              </Seccion>
            )}

            {/* DATOS CLÍNICOS */}

            {esConsulta && (
              <Seccion
                titulo="Datos clínicos"
                subtitulo="Información clínica de la consulta."
              >
                {cargandoConsulta && (
                  <View style={estilos.aviso}>
                    <ActivityIndicator color={C.verde} />
                    <Text style={estilos.textoSecundario}>
                      Cargando datos clínicos...
                    </Text>
                  </View>
                )}

                {!!errorConsulta && (
                  <Text style={estilos.textoError}>
                    {errorConsulta}
                  </Text>
                )}

                {!cargandoConsulta &&
                  camposConsulta.length === 0 &&
                  !errorConsulta && (
                    <Text style={estilos.textoSecundario}>
                      Aún no se registraron datos clínicos.
                    </Text>
                  )}

                {camposConsulta.map((campo) => (
                  <Campo
                    key={campo.etiqueta}
                    etiqueta={campo.etiqueta}
                    valor={campo.valor}
                  />
                ))}
              </Seccion>
            )}

            {/* RECETA */}

            {esConsulta && (
              <Seccion
                titulo="Receta médica"
                subtitulo="Diagnóstico y recomendaciones."
              >
                {!recetaConsulta ? (
                  <Text style={estilos.textoSecundario}>
                    Esta consulta todavía no tiene una receta registrada.
                  </Text>
                ) : camposReceta.length === 0 ? (
                  <Text style={estilos.textoSecundario}>
                    La receta no contiene información adicional.
                  </Text>
                ) : (
                  camposReceta.map((campo) => (
                    <Campo
                      key={campo.etiqueta}
                      etiqueta={campo.etiqueta}
                      valor={campo.valor}
                    />
                  ))
                )}
              </Seccion>
            )}

            {/* ACTUALIZAR ESTADO */}

            {atencionActiva && pendiente && (
              <Seccion
                titulo="Actualizar estado"
                subtitulo="Indica el resultado de esta actividad."
              >
                <Pressable
                  style={estilos.botonPrincipal}
                  disabled={guardandoEstado}
                  onPress={() => abrirCambioEstado('Completada')}
                >
                  <Text style={estilos.textoBotonBlanco}>
                    ✓ Marcar como completada
                  </Text>
                </Pressable>

                <Pressable
                  style={estilos.botonNoRealizada}
                  disabled={guardandoEstado}
                  onPress={() => abrirCambioEstado('No realizada')}
                >
                  <Text style={estilos.textoBotonRojo}>
                    Marcar como no realizada
                  </Text>
                </Pressable>
              </Seccion>
            )}

            {atencionActiva && noRealizada && (
              <Seccion
                titulo="Reactivar actividad"
                subtitulo="La actividad volverá al estado pendiente."
              >
                <Pressable
                  style={estilos.botonPrincipal}
                  onPress={() => abrirCambioEstado('Reactivar')}
                >
                  <Text style={estilos.textoBotonBlanco}>
                    ↻ Reactivar actividad
                  </Text>
                </Pressable>
              </Seccion>
            )}

            {!atencionActiva && (
              <View style={estilos.avisoFinalizada}>
                <Text style={estilos.textoAvisoFinalizada}>
                  Esta atención está finalizada. No es posible modificar sus actividades.
                </Text>
              </View>
            )}
          </>
        )}

        <Text style={estilos.pie}>
          PetCare · Seguimiento de atención veterinaria
        </Text>
      </ScrollView>

      {/* MENÚ LATERAL */}

      <MenuLateralDerecho
        visible={sidebarVisible}
        onCerrar={cerrarMenuLateral}
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
        onCerrarSesion={cerrarSesion}
      />

      {/* MENÚ DE OPCIONES */}

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={estilos.fondoModal}
          onPress={() => setMenuVisible(false)}
        >
          <View style={estilos.modal}>
            <Text style={estilos.tituloModal}>
              Opciones de actividad
            </Text>

            <Pressable
              style={estilos.opcionModal}
              onPress={abrirEdicion}
            >
              <Text style={estilos.textoOpcion}>
                Editar información
              </Text>
            </Pressable>

            <Pressable
              style={estilos.opcionModal}
              onPress={() => {
                setMenuVisible(false);
                setModalEliminar(true);
              }}
            >
              <Text style={estilos.textoOpcionRojo}>
                Eliminar actividad
              </Text>
            </Pressable>

            <Pressable
              style={estilos.botonCancelar}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={estilos.textoCancelar}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* CONFIRMAR ELIMINACIÓN */}

      <Modal
        visible={modalEliminar}
        transparent
        animationType="fade"
        onRequestClose={() =>
          !eliminando && setModalEliminar(false)
        }
      >
        <View style={estilos.fondoModal}>
          <View style={estilos.modal}>
            <Text style={estilos.tituloModal}>
              Eliminar actividad
            </Text>

            <Text style={estilos.textoSecundario}>
              ¿Deseas eliminar esta actividad? La eliminación será lógica y se conservarán los registros clínicos relacionados.
            </Text>

            <View style={estilos.filaBotones}>
              <Pressable
                style={estilos.botonCancelar}
                disabled={eliminando}
                onPress={() => setModalEliminar(false)}
              >
                <Text style={estilos.textoCancelar}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                style={estilos.botonEliminar}
                disabled={eliminando}
                onPress={ejecutarEliminacion}
              >
                {eliminando ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={estilos.textoBotonBlanco}>
                    Eliminar
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* CAMBIO DE ESTADO DE ACTIVIDAD */}

      <Modal
        visible={modalEstado}
        transparent
        animationType="fade"
        onRequestClose={() =>
          !guardandoEstado && setModalEstado(false)
        }
      >
        <View style={estilos.fondoModal}>
          <View style={estilos.modal}>
            <Text style={estilos.tituloModal}>
              {accionEstado === 'Reactivar'
                ? 'Reactivar actividad'
                : accionEstado === 'Completada'
                  ? 'Completar actividad'
                  : 'Actividad no realizada'}
            </Text>

            {accionEstado === 'No realizada' ? (
              <>
                <Text style={estilos.textoSecundario}>
                  Escribe el motivo por el que no se realizó la actividad.
                </Text>

                <TextInput
                  style={estilos.campoTexto}
                  placeholder="Motivo de no realización"
                  placeholderTextColor={C.secundario}
                  value={motivoFormulario}
                  onChangeText={(valor) => {
                    setMotivoFormulario(valor);
                    setErrorEstado('');
                  }}
                  multiline
                  maxLength={500}
                  editable={!guardandoEstado}
                />
              </>
            ) : (
              <Text style={estilos.textoSecundario}>
                {accionEstado === 'Reactivar'
                  ? 'La actividad volverá al estado Pendiente.'
                  : '¿Confirmas que deseas marcar esta actividad como completada?'}
              </Text>
            )}

            {!!errorEstado && (
              <Text style={estilos.textoError}>
                {errorEstado}
              </Text>
            )}

            <View style={estilos.filaBotones}>
              <Pressable
                style={estilos.botonCancelar}
                disabled={guardandoEstado}
                onPress={() => setModalEstado(false)}
              >
                <Text style={estilos.textoCancelar}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                style={estilos.botonPrincipal}
                disabled={
                  guardandoEstado ||
                  (
                    accionEstado === 'No realizada' &&
                    !motivoFormulario.trim()
                  )
                }
                onPress={confirmarCambioEstado}
              >
                {guardandoEstado ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={estilos.textoBotonBlanco}>
                    Confirmar
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* CONFIRMACIÓN DE FINALIZACIÓN DE ATENCIÓN */}

      <Modal
        visible={modalFinalizarAtencion}
        transparent
        animationType="fade"
        onRequestClose={cancelarFinalizacionAtencion}
      >
        <View style={estilos.fondoModal}>
          <View style={estilos.modal}>
            <View style={estilos.iconoConfirmacionFinal}>
              <Text style={estilos.iconoConfirmacionTexto}>✓</Text>
            </View>

            <Text style={estilos.tituloModal}>
              Atención lista para finalizar
            </Text>

            <Text style={estilos.textoSecundario}>
              Todas las actividades de esta atención han sido atendidas.
            </Text>

            <Text style={estilos.textoPreguntaFinal}>
              ¿Deseas finalizar la atención de {nombreMascota}?
            </Text>

            {!!errorFinalizarAtencion && (
              <View style={estilos.errorFinalizar}>
                <Text style={estilos.textoError}>
                  {errorFinalizarAtencion}
                </Text>
              </View>
            )}

            <View style={estilos.filaBotones}>
              <Pressable
                style={estilos.botonCancelar}
                disabled={finalizandoAtencion}
                onPress={cancelarFinalizacionAtencion}
              >
                <Text style={estilos.textoCancelar}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                style={estilos.botonPrincipal}
                disabled={finalizandoAtencion}
                onPress={confirmarFinalizacionAtencion}
              >
                {finalizandoAtencion ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={estilos.textoBotonBlanco}>
                    Sí, finalizar
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 40,
  },
  migas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 20,
  },
  textoMiga: {
    color: C.secundario,
    fontSize: 12,
  },
  migaActual: {
    color: C.verde,
    fontSize: 12,
    fontWeight: '800',
  },
  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  botonVolver: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  flechaVolver: {
    fontSize: 30,
    color: C.verde,
  },
  tituloPagina: {
    color: C.texto,
    fontSize: 24,
    fontWeight: '800',
  },
  subtituloPagina: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 16,
    padding: 19,
    marginBottom: 15,
  },
  tarjetaPrincipal: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 18,
    padding: 19,
    marginBottom: 16,
  },
  filaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconoActividad: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: C.verdeClaro,
    borderWidth: 1,
    borderColor: C.verdeBorde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoActividadTexto: {
    color: C.verde,
    fontSize: 23,
    fontWeight: '900',
  },
  etiquetaSuperior: {
    color: C.verde,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tituloActividad: {
    color: C.texto,
    fontSize: 18,
    fontWeight: '800',
  },
  textoSecundario: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
  },
  textoMascota: {
    color: C.verdeOscuro,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
  botonMenu: {
    width: 35,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoMenu: {
    color: C.texto,
    fontSize: 26,
    fontWeight: '800',
  },
  encabezadoSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  indicadorSeccion: {
    width: 4,
    height: 34,
    borderRadius: 4,
    backgroundColor: C.verde,
    marginRight: 11,
  },
  tituloSeccion: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '800',
  },
  subtituloSeccion: {
    color: C.secundario,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  campo: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F0',
  },
  etiquetaCampo: {
    color: C.secundario,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 5,
  },
  valorCampo: {
    color: C.texto,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  tarjetaAsociada: {
    backgroundColor: '#F7FBF9',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    padding: 13,
    marginBottom: 12,
  },
  encabezadoAsociado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.borde,
  },
  tituloAsociado: {
    color: C.verdeOscuro,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  numeroAsociado: {
    color: C.verde,
    fontSize: 10,
    fontWeight: '800',
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    marginBottom: 10,
  },
  error: {
    backgroundColor: C.rojo,
    borderRadius: 10,
    padding: 13,
    marginBottom: 12,
  },
  textoError: {
    color: C.rojoTexto,
    fontSize: 12,
    lineHeight: 19,
  },
  botonPrincipal: {
    backgroundColor: C.verde,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },
  textoBotonBlanco: {
    color: C.blanco,
    fontSize: 12,
    fontWeight: '800',
  },
  botonNoRealizada: {
    backgroundColor: C.rojo,
    borderWidth: 1,
    borderColor: '#F3C3BF',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 9,
  },
  textoBotonRojo: {
    color: C.rojoTexto,
    fontSize: 12,
    fontWeight: '800',
  },
  avisoFinalizada: {
    backgroundColor: C.naranja,
    borderRadius: 12,
    padding: 14,
    marginBottom: 15,
  },
  textoAvisoFinalizada: {
    color: C.naranjaTexto,
    fontSize: 12,
    lineHeight: 19,
  },
  pie: {
    textAlign: 'center',
    color: C.secundario,
    fontSize: 11,
    marginTop: 15,
  },
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(17,39,36,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: C.blanco,
    borderRadius: 17,
    padding: 21,
    borderWidth: 1,
    borderColor: C.borde,
  },
  tituloModal: {
    color: C.texto,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  opcionModal: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.borde,
  },
  textoOpcion: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  textoOpcionRojo: {
    color: C.rojoTexto,
    fontSize: 13,
    fontWeight: '700',
  },
  botonCancelar: {
    flex: 1,
    backgroundColor: '#F3F7F5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  textoCancelar: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '800',
  },
  botonEliminar: {
    flex: 1,
    backgroundColor: C.rojoTexto,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  campoTexto: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    padding: 12,
    marginTop: 13,
    color: C.texto,
    textAlignVertical: 'top',
  },

  // Modal de confirmación de finalización.
  iconoConfirmacionFinal: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: C.verdeClaro,
    borderWidth: 1,
    borderColor: C.verdeBorde,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconoConfirmacionTexto: {
    color: C.verde,
    fontSize: 24,
    fontWeight: '900',
  },
  textoPreguntaFinal: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 21,
    marginTop: 13,
  },
  errorFinalizar: {
    backgroundColor: C.rojo,
    borderRadius: 10,
    padding: 11,
    marginTop: 12,
  },
});
