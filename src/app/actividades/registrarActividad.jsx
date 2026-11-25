import React, { useEffect, useState } from 'react';
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

import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';

import {
  registrarActividadServicio,
  obtenerCatalogoMedicamentosServicio,
} from '../../services/atencion/actividadesServicio';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

const C = {
  fondo: '#F4F8F7',
  verde: '#12665E',
  oscuro: '#104F49',
  claro: '#E6F4EF',
  texto: '#243746',
  secundario: '#718096',
  blanco: '#FFFFFF',
  borde: '#E0EAE7',
  rojo: '#B42318',
  sombra: '#173F38',
};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril',
  'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const ORGANOS_ECOGRAFIA = [
  'Hígado',
  'Riñones',
  'Vejiga urinaria',
  'Bazo',
  'Estómago',
];

const VIAS_ADMINISTRACION = [
  'Oral',
  'Subcutánea',
  'Intramuscular',
  'Intravenosa',
  'Tópica',
  'Intranasal',
  'Oftálmica',
  'Ótica',
];

const CAMPOS_POR_TIPO = {
  medicacion: [
    {
      key: 'duracion',
      label: 'Duración del tratamiento',
      placeholder: 'Ej. 7 días',
    },
  ],

  vacunacion: [],

  ecografia: [
    {
      key: 'motivo',
      label: 'Motivo de la ecografía',
      placeholder: 'Ej. Evaluar dolor abdominal o descartar alteraciones.',
    },
    {
      key: 'indicaciones',
      label: 'Indicaciones',
      placeholder: 'Ej. Ayuno de 8 horas o preparación previa del paciente.',
      multiline: true,
    },
  ],

  esterilizacion: [
    {
      key: 'procedimiento',
      label: 'Procedimiento',
      placeholder: 'Ej. Ovariohisterectomía',
    },
    {
      key: 'evaluacion_preoperatoria',
      label: 'Evaluación preoperatoria',
      placeholder: 'Resultado de la evaluación',
      multiline: true,
    },
  ],

  otros: [
    {
      key: 'nombre_actividad',
      label: 'Nombre de la actividad',
      placeholder: 'Especifica la actividad',
    },
    {
      key: 'motivo_realizacion',
      label: 'Motivo de realización',
      placeholder: 'Indica por qué se realiza esta actividad',
      multiline: true,
    },
  ],
};

const ORDEN_TIPOS = [
  'MEDICACION',
  'VACUNACION',
  'ECOGRAFIA',
  'ESTERILIZACION',
  'OTRO',
];

const PRESENTACION_TIPOS = {
  MEDICACION: {
    icono: '💊',
    descripcion: 'Tratamientos y administración de medicamentos.',
  },
  VACUNACION: {
    icono: '💉',
    descripcion: 'Aplicación y registro de vacunas.',
  },
  ECOGRAFIA: {
    icono: '🩺',
    descripcion: 'Evaluaciones mediante imágenes ecográficas.',
  },
  ESTERILIZACION: {
    icono: '🏥',
    descripcion: 'Procedimientos quirúrgicos de esterilización.',
  },
  OTRO: {
    icono: '📋',
    descripcion: 'Otras actividades de atención veterinaria.',
  },
};

/* ============================================================
   FUNCIONES AUXILIARES
   ============================================================ */

function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function claveTipo(tipo) {
  const codigo = normalizar(tipo?.codigo);
  const nombre = normalizar(tipo?.nombre);
  const texto = `${codigo} ${nombre}`;

  if (texto.includes('medicacion')) return 'medicacion';
  if (texto.includes('vacunacion')) return 'vacunacion';
  if (texto.includes('ecografia')) return 'ecografia';
  if (texto.includes('esterilizacion')) return 'esterilizacion';

  if (codigo === 'otro' || nombre === 'otro' || nombre === 'otros') {
    return 'otros';
  }

  return null;
}

function fechaActualISO() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const valores = Object.fromEntries(
    partes
      .filter((parte) => parte.type !== 'literal')
      .map((parte) => [parte.type, parte.value])
  );

  return `${valores.year}-${valores.month}-${valores.day}`;
}

function obtenerDiaSiguienteISO(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia + 1));

  return [
    fecha.getUTCFullYear(),
    String(fecha.getUTCMonth() + 1).padStart(2, '0'),
    String(fecha.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor ?? '').trim())) {
    return false;
  }

  const [anio, mes, dia] = valor.trim().split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

function formatearFechaVisible(valor) {
  if (!fechaValida(valor)) return '';

  const [anio, mes, dia] = valor.split('-');
  return `${dia}/${mes}/${anio}`;
}

function obtenerDiasCalendario(fecha) {
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth();
  const primerDia = new Date(anio, mes, 1);
  const cantidadDias = new Date(anio, mes + 1, 0).getDate();
  const desplazamiento = (primerDia.getDay() + 6) % 7;

  return [
    ...Array(desplazamiento).fill(null),
    ...Array.from({ length: cantidadDias }, (_, indice) => indice + 1),
  ];
}

function claveNombre(valor) {
  return normalizar(valor);
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */

export default function RegistrarActividadScreen() {
  const params = useLocalSearchParams();

  const valorId = Array.isArray(params.atencion_id)
    ? params.atencion_id[0]
    : params.atencion_id;

  const atencionId = valorId ? String(valorId) : '';

  const [tipos, setTipos] = useState([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);

  const [modoProgramacion, setModoProgramacion] = useState('HOY');
  const [fechaPrevista, setFechaPrevista] = useState(fechaActualISO());
  const [mesCalendario, setMesCalendario] = useState(new Date());
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);

  const [observaciones, setObservaciones] = useState('');
  const [detalle, setDetalle] = useState({});

  const [organosSeleccionados, setOrganosSeleccionados] = useState([]);
  const [otrosOrganos, setOtrosOrganos] = useState([]);
  const [organosDesplegableAbierto, setOrganosDesplegableAbierto] =
    useState(false);

  const [catalogoMedicamentos, setCatalogoMedicamentos] = useState([]);
  const [catalogoVacunas, setCatalogoVacunas] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState('');

  const [medicamentosSeleccionados, setMedicamentosSeleccionados] = useState([]);
  const [vacunasSeleccionadas, setVacunasSeleccionadas] = useState([]);

  const [desplegableAbierto, setDesplegableAbierto] = useState(false);
  const [tiposDesplegableAbierto, setTiposDesplegableAbierto] = useState(false);
  const [viaAbierta, setViaAbierta] = useState({});

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  const [confirmacionVisible, setConfirmacionVisible] = useState(false);

  const claveSeleccionada = tipoSeleccionado
    ? claveTipo(tipoSeleccionado)
    : null;

  const esMedicacion = claveSeleccionada === 'medicacion';
  const esVacunacion = claveSeleccionada === 'vacunacion';
  const esEcografia = claveSeleccionada === 'ecografia';
  const esOtro = claveSeleccionada === 'otros';

  const campos = tipoSeleccionado
    ? CAMPOS_POR_TIPO[claveSeleccionada] || []
    : [];

  const codigoTipoSeleccionado = String(
    tipoSeleccionado?.codigo || ''
  ).toUpperCase();

  const presentacionSeleccionada =
    PRESENTACION_TIPOS[codigoTipoSeleccionado] || {
      icono: '📋',
      descripcion: 'Actividad de atención veterinaria.',
    };

  const diasCalendario = obtenerDiasCalendario(mesCalendario);
  const anioCalendario = mesCalendario.getFullYear();
  const numeroMesCalendario = mesCalendario.getMonth();
  const fechaHoy = fechaActualISO();

  /* ==========================================================
     CARGAR USUARIO Y TIPOS DE ACTIVIDAD
     ========================================================== */

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      try {
        const { data: sesion, error: errorSesion } =
          await supabase.auth.getUser();

        if (errorSesion) throw errorSesion;

        const usuario = sesion?.user;

        if (activo && usuario) {
          setNombreUsuario(
            usuario.user_metadata?.nombre ||
            usuario.user_metadata?.full_name ||
            usuario.email ||
            ''
          );

          setRolUsuario(usuario.user_metadata?.rol || '');
        }

        const { data, error } = await supabase
          .from('tipos_actividad')
          .select('tipo_id, codigo, nombre, activo')
          .eq('activo', true);

        if (error) throw error;

        const disponibles = (data || [])
          .filter((tipo) =>
            ORDEN_TIPOS.includes(
              String(tipo.codigo || '').trim().toUpperCase()
            )
          )
          .sort((a, b) =>
            ORDEN_TIPOS.indexOf(String(a.codigo).toUpperCase()) -
            ORDEN_TIPOS.indexOf(String(b.codigo).toUpperCase())
          );

        if (activo) setTipos(disponibles);
      } catch (error) {
        console.error('Error cargando tipos de actividad:', error);

        if (activo) {
          Alert.alert(
            'Error',
            'No se pudieron cargar los tipos de actividad.'
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarDatos();

    return () => {
      activo = false;
    };
  }, []);

  /* ==========================================================
     CARGAR CATÁLOGO DE MEDICAMENTOS O VACUNAS
     ========================================================== */

  useEffect(() => {
    let activo = true;

    async function cargarCatalogo() {
      if (!esMedicacion && !esVacunacion) {
        setCatalogoMedicamentos([]);
        setCatalogoVacunas([]);
        setErrorCatalogo('');
        setCargandoCatalogo(false);
        setDesplegableAbierto(false);
        return;
      }

      setCargandoCatalogo(true);
      setErrorCatalogo('');
      setDesplegableAbierto(false);

      try {
        const categoria = esMedicacion ? 'Medicamento' : 'Vacuna';
        const catalogo = await obtenerCatalogoMedicamentosServicio(
          categoria
        );

        if (!activo) return;

        if (esMedicacion) {
          setCatalogoMedicamentos(catalogo);
          setCatalogoVacunas([]);
        } else {
          setCatalogoVacunas(catalogo);
          setCatalogoMedicamentos([]);
        }
      } catch (error) {
        console.error('Error cargando catálogo:', error);

        if (activo) {
          setErrorCatalogo(
            error?.message || 'No se pudo cargar el catálogo.'
          );
        }
      } finally {
        if (activo) setCargandoCatalogo(false);
      }
    }

    cargarCatalogo();

    return () => {
      activo = false;
    };
  }, [claveSeleccionada]);

  /* ==========================================================
     NAVEGACIÓN Y SELECCIÓN DE TIPO
     ========================================================== */

  function volverDetalle() {
    if (guardando || confirmacionVisible) return;

    if (atencionId) {
      router.replace({
        pathname: '/atenciones/detalleAtencion',
        params: { atencion_id: atencionId },
      });
    } else {
      router.back();
    }
  }

  function seleccionarTipo(tipo) {
    if (guardando) return;

    setTipoSeleccionado(tipo);
    setDetalle({});
    setObservaciones('');
    setOrganosSeleccionados([]);
    setOtrosOrganos([]);
    setOrganosDesplegableAbierto(false);
    setMedicamentosSeleccionados([]);
    setVacunasSeleccionadas([]);
    setDesplegableAbierto(false);
    setTiposDesplegableAbierto(false);
    setErrorCatalogo('');
    setViaAbierta({});
  }

  function actualizarDetalle(campo, valor) {
    setDetalle((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  /* ==========================================================
     ÓRGANOS DE ECOGRAFÍA
     ========================================================== */

  function alternarOrgano(nombre) {
    if (guardando) return;

    setOrganosSeleccionados((actuales) => {
      const existe = actuales.some(
        (organo) =>
          claveNombre(organo.nombre_organo) === claveNombre(nombre)
      );

      if (existe) {
        return actuales.filter(
          (organo) =>
            claveNombre(organo.nombre_organo) !== claveNombre(nombre)
        );
      }

      return [
        ...actuales,
        {
          organo_id: null,
          tipo_organo: 'CATALOGO',
          nombre_organo: nombre,
        },
      ];
    });
  }

  function agregarOtroOrgano() {
    if (guardando) return;

    setOtrosOrganos((actuales) => [
      ...actuales,
      {
        clave: `${Date.now()}-${actuales.length}-${Math.random()}`,
        nombre: '',
      },
    ]);

    setOrganosDesplegableAbierto(false);
  }

  function actualizarOtroOrgano(clave, nombre) {
    setOtrosOrganos((actuales) =>
      actuales.map((organo) =>
        organo.clave === clave
          ? { ...organo, nombre }
          : organo
      )
    );
  }

  function quitarOtroOrgano(clave) {
    setOtrosOrganos((actuales) =>
      actuales.filter((organo) => organo.clave !== clave)
    );
  }

  function seleccionarOpcionOrgano(nombre) {
    if (guardando) return;

    alternarOrgano(nombre);
    setOrganosDesplegableAbierto(false);
  }

  function obtenerOrganosParaGuardar() {
    const organosCatalogo = organosSeleccionados.map((organo) => ({
      organo_id: null,
      tipo_organo: 'CATALOGO',
      nombre_organo: String(organo.nombre_organo ?? '').trim(),
    }));

    const organosPersonalizados = otrosOrganos.map((organo) => ({
      organo_id: null,
      tipo_organo: 'OTRO',
      nombre_organo: String(organo.nombre ?? '').trim(),
    }));

    return [...organosCatalogo, ...organosPersonalizados];
  }

  function validarOrganosEcografiaPantalla() {
    if (organosSeleccionados.length === 0 && otrosOrganos.length === 0) {
      Alert.alert(
        'Campo requerido',
        'Selecciona al menos un órgano evaluado.'
      );
      return false;
    }

    const nombresPersonalizados = otrosOrganos.map(
      (organo) => String(organo.nombre ?? '').trim()
    );

    if (nombresPersonalizados.some((nombre) => !nombre)) {
      Alert.alert(
        'Campo requerido',
        'Escribe el nombre de cada órgano agregado mediante la opción Otro.'
      );
      return false;
    }

    const todosLosNombres = obtenerOrganosParaGuardar().map(
      (organo) => claveNombre(organo.nombre_organo)
    );

    if (todosLosNombres.some((nombre) => !nombre)) {
      Alert.alert(
        'Campo requerido',
        'Todos los órganos deben tener un nombre válido.'
      );
      return false;
    }

    if (new Set(todosLosNombres).size !== todosLosNombres.length) {
      Alert.alert(
        'Órgano duplicado',
        'No puedes agregar dos veces el mismo órgano. Verifica también los nombres personalizados.'
      );
      return false;
    }

    return true;
  }

  /* ==========================================================
     CALENDARIO
     ========================================================== */

  function seleccionarModoProgramacion(modo) {
    if (guardando) return;

    if (modo === 'HOY') {
      setModoProgramacion('HOY');
      setFechaPrevista(fechaActualISO());
      setCalendarioAbierto(false);
      return;
    }

    if (modoProgramacion === 'FUTURA') {
      abrirCalendario();
      return;
    }

    setModoProgramacion('FUTURA');

    const fechaMinima = obtenerDiaSiguienteISO(fechaActualISO());
    setFechaPrevista(fechaMinima);

    const [anio, mes] = fechaMinima.split('-').map(Number);
    setMesCalendario(new Date(anio, mes - 1, 1));
    setCalendarioAbierto(true);
  }

  function abrirCalendario() {
    if (modoProgramacion !== 'FUTURA' || guardando) return;

    let fechaBase = new Date();

    if (fechaValida(fechaPrevista) && fechaPrevista > fechaHoy) {
      const [anio, mes, dia] = fechaPrevista.split('-').map(Number);
      fechaBase = new Date(anio, mes - 1, dia);
    } else {
      const fechaMinima = obtenerDiaSiguienteISO(fechaHoy);
      const [anio, mes, dia] = fechaMinima.split('-').map(Number);
      fechaBase = new Date(anio, mes - 1, dia);
      setFechaPrevista(fechaMinima);
    }

    setMesCalendario(
      new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1)
    );

    setCalendarioAbierto(true);
  }

  function cambiarMes(diferencia) {
    setMesCalendario((actual) => {
      const siguiente = new Date(
        actual.getFullYear(),
        actual.getMonth() + diferencia,
        1
      );

      const primerMesPermitido = new Date(
        Number(fechaHoy.slice(0, 4)),
        Number(fechaHoy.slice(5, 7)) - 1,
        1
      );

      if (siguiente < primerMesPermitido) return actual;
      return siguiente;
    });
  }

  function seleccionarFecha(dia) {
    if (!dia || modoProgramacion !== 'FUTURA') return;

    const fechaSeleccionada = [
      anioCalendario,
      String(numeroMesCalendario + 1).padStart(2, '0'),
      String(dia).padStart(2, '0'),
    ].join('-');

    if (fechaSeleccionada <= fechaHoy) return;

    setFechaPrevista(fechaSeleccionada);
    setCalendarioAbierto(false);
  }

  /* ==========================================================
     VÍAS DE ADMINISTRACIÓN
     ========================================================== */

  function seleccionarViaMedicamento(indice, via) {
    actualizarMedicamento(indice, 'via_administracion', via);

    setViaAbierta((actual) => ({
      ...actual,
      [`medicamento-${indice}`]: false,
    }));
  }

  function seleccionarViaVacuna(indice, via) {
    actualizarVacuna(indice, 'via_administracion', via);

    setViaAbierta((actual) => ({
      ...actual,
      [`vacuna-${indice}`]: false,
    }));
  }

  /* ==========================================================
     MEDICAMENTOS
     ========================================================== */

  function agregarMedicamento(medicamento) {
    const yaAgregado = medicamentosSeleccionados.some(
      (item) =>
        String(item.medicamento_id) ===
        String(medicamento.medicamento_id)
    );

    if (yaAgregado) {
      Alert.alert(
        'Medicamento agregado',
        'Este medicamento ya está incluido en la actividad.'
      );
      return;
    }

    setMedicamentosSeleccionados((actuales) => [
      ...actuales,
      {
        medicamento_id: medicamento.medicamento_id,
        nombre_medicamento: medicamento.nombre_medicamento,
        concentracion: medicamento.concentracion,
        dosis: '',
        frecuencia: '',
        via_administracion: '',
      },
    ]);

    setDesplegableAbierto(false);
  }

  function actualizarMedicamento(indice, campo, valor) {
    setMedicamentosSeleccionados((actuales) =>
      actuales.map((item, posicion) =>
        posicion === indice ? { ...item, [campo]: valor } : item
      )
    );
  }

  function quitarMedicamento(indice) {
    setMedicamentosSeleccionados((actuales) =>
      actuales.filter((_, posicion) => posicion !== indice)
    );
  }

  /* ==========================================================
     VACUNAS
     ========================================================== */

  function agregarVacuna(vacuna) {
    const yaAgregada = vacunasSeleccionadas.some(
      (item) =>
        String(item.medicamento_id) ===
        String(vacuna.medicamento_id)
    );

    if (yaAgregada) {
      Alert.alert(
        'Vacuna agregada',
        'Esta vacuna ya está incluida en la actividad.'
      );
      return;
    }

    setVacunasSeleccionadas((actuales) => [
      ...actuales,
      {
        medicamento_id: vacuna.medicamento_id,
        nombre_medicamento: vacuna.nombre_medicamento,
        concentracion: vacuna.concentracion,
        via_administracion: '',
      },
    ]);

    setDesplegableAbierto(false);
  }

  function actualizarVacuna(indice, campo, valor) {
    setVacunasSeleccionadas((actuales) =>
      actuales.map((item, posicion) =>
        posicion === indice ? { ...item, [campo]: valor } : item
      )
    );
  }

  function quitarVacuna(indice) {
    setVacunasSeleccionadas((actuales) =>
      actuales.filter((_, posicion) => posicion !== indice)
    );
  }

  /* ==========================================================
     REGISTRAR ACTIVIDAD
     ========================================================== */

  async function guardarActividad() {
    if (guardando) return;

    if (!atencionId || !/^\d+$/.test(atencionId)) {
      Alert.alert(
        'Atención requerida',
        'No se recibió un identificador válido de la atención.'
      );
      return;
    }

    if (!tipoSeleccionado) {
      Alert.alert('Campo requerido', 'Selecciona un tipo de actividad.');
      return;
    }

    if (!fechaValida(fechaPrevista)) {
      Alert.alert(
        'Fecha no válida',
        'Selecciona una fecha válida en el calendario.'
      );
      return;
    }

    if (modoProgramacion === 'HOY' && fechaPrevista !== fechaHoy) {
      Alert.alert(
        'Fecha no válida',
        'La opción Realizar hoy debe conservar la fecha actual.'
      );
      return;
    }

    if (modoProgramacion === 'FUTURA' && fechaPrevista <= fechaHoy) {
      Alert.alert(
        'Fecha no válida',
        'Solo puedes programar actividades para fechas posteriores a hoy.'
      );
      return;
    }

    if (!esMedicacion && !esVacunacion && campos.length === 0) {
      Alert.alert(
        'Error',
        'Este tipo de actividad no tiene campos configurados.'
      );
      return;
    }

    const faltante = campos.find(
      (campo) => !String(detalle[campo.key] ?? '').trim()
    );

    if (faltante) {
      Alert.alert(
        'Campo requerido',
        `Completa: ${faltante.label}.`
      );
      return;
    }

    if (esEcografia && !validarOrganosEcografiaPantalla()) {
      return;
    }

    if (esMedicacion && medicamentosSeleccionados.length === 0) {
      Alert.alert(
        'Campo requerido',
        'Agrega al menos un medicamento del catálogo.'
      );
      return;
    }

    if (esVacunacion && vacunasSeleccionadas.length === 0) {
      Alert.alert(
        'Campo requerido',
        'Agrega al menos una vacuna del catálogo.'
      );
      return;
    }

    if (esMedicacion) {
      for (const medicamento of medicamentosSeleccionados) {
        if (!String(medicamento.dosis ?? '').trim()) {
          Alert.alert(
            'Campo requerido',
            `Ingresa la dosis del medicamento ${medicamento.nombre_medicamento}.`
          );
          return;
        }

        if (!String(medicamento.frecuencia ?? '').trim()) {
          Alert.alert(
            'Campo requerido',
            `Ingresa la frecuencia del medicamento ${medicamento.nombre_medicamento}.`
          );
          return;
        }

        if (!String(medicamento.via_administracion ?? '').trim()) {
          Alert.alert(
            'Campo requerido',
            `Selecciona la vía de administración del medicamento ${medicamento.nombre_medicamento}.`
          );
          return;
        }
      }

      if (!String(detalle.duracion || '').trim()) {
        Alert.alert(
          'Campo requerido',
          'Ingresa la duración del tratamiento.'
        );
        return;
      }
    }

    if (esVacunacion) {
      for (const vacuna of vacunasSeleccionadas) {
        if (!String(vacuna.via_administracion ?? '').trim()) {
          Alert.alert(
            'Campo requerido',
            `Selecciona la vía de administración de la vacuna ${vacuna.nombre_medicamento}.`
          );
          return;
        }
      }
    }

    const tipoId = Number(tipoSeleccionado.tipo_id);

    if (!Number.isSafeInteger(tipoId) || tipoId <= 0) {
      Alert.alert(
        'Error',
        'El identificador del tipo de actividad no es válido.'
      );
      return;
    }

    const detalleLimpio = {};

    campos.forEach((campo) => {
      detalleLimpio[campo.key] = String(
        detalle[campo.key] ?? ''
      ).trim();
    });

    if (esEcografia) {
      detalleLimpio.organos = obtenerOrganosParaGuardar();
      detalleLimpio.mediciones_especificas = [];
    }

    const datosRegistro = {
      atencion_id: atencionId,
      tipo_id: tipoId,
      tipo: tipoSeleccionado.nombre,
      tipo_codigo: tipoSeleccionado.codigo,
      fecha_prevista: fechaPrevista.trim(),
      modo_programacion: modoProgramacion,
      observaciones: observaciones.trim(),
      detalle: detalleLimpio,
    };

    if (esMedicacion) {
      datosRegistro.medicamentos = medicamentosSeleccionados.map(
        (medicamento) => ({
          medicamento_id: medicamento.medicamento_id,
          dosis: medicamento.dosis.trim(),
          frecuencia: medicamento.frecuencia.trim(),
          via_administracion: medicamento.via_administracion.trim(),
        })
      );
    }

    if (esVacunacion) {
      datosRegistro.vacunas = vacunasSeleccionadas.map((vacuna) => ({
        medicamento_id: vacuna.medicamento_id,
        via_administracion: vacuna.via_administracion.trim(),
      }));
    }

    setGuardando(true);

    try {
      const resultado = await registrarActividadServicio(datosRegistro);

      if (!resultado) {
        throw new Error(
          'El servicio no devolvió la confirmación del registro. Verifica el servicio y el DAO de actividades.'
        );
      }

      setConfirmacionVisible(true);
    } catch (error) {
      console.error('Error registrando actividad:', error);

      Alert.alert(
        'No se pudo registrar',
        error?.message || 'Ocurrió un error al registrar la actividad.'
      );
    } finally {
      setGuardando(false);
    }
  }

  /* ==========================================================
     CERRAR SESIÓN
     ========================================================== */

  async function cerrarSesion() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setMenuAbierto(false);
      router.replace('/');
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar la sesión.');
    }
  }

  /* ==========================================================
     VISTA
     ========================================================== */

  return (
    <SafeAreaView style={s.contenedor}>
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
        contentContainerStyle={s.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.migas}>
          <Pressable onPress={volverDetalle} disabled={guardando}>
            <Text style={s.migaEnlace}>Atenciones</Text>
          </Pressable>
          <Text style={s.migaSeparador}> / </Text>
          <Text style={s.migaActual}>Registrar actividad</Text>
        </View>

        <View style={s.encabezadoPagina}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver al detalle de atención"
            style={s.botonVolver}
            onPress={volverDetalle}
            disabled={guardando}
          >
            <Text style={s.flechaVolver}>‹</Text>
          </Pressable>

          <View style={s.encabezadoTexto}>
            <Text style={s.titulo}>Actividades de la atención</Text>
            <Text style={s.subtitulo}>
              Registra los procedimientos y tratamientos posteriores a la consulta.
            </Text>
          </View>
        </View>

        <View style={s.tarjeta}>
          <View style={s.filaEtiqueta}>
            <Text style={s.tituloTipo}>Tipo de actividad</Text>
            <Text style={s.obligatorio}>OBLIGATORIO</Text>
          </View>

          <Text style={s.ayudaTipos}>
            Selecciona el procedimiento que deseas agregar a esta atención.
          </Text>

          {cargando ? (
            <ActivityIndicator color={C.verde} style={s.cargando} />
          ) : tipos.length === 0 ? (
            <Text style={s.error}>
              No se encontraron tipos de actividad activos.
            </Text>
          ) : (
            <>
              <Pressable
                style={[
                  s.desplegableTipo,
                  tiposDesplegableAbierto && s.desplegableTipoActivo,
                ]}
                onPress={() =>
                  setTiposDesplegableAbierto(!tiposDesplegableAbierto)
                }
                disabled={guardando}
                accessibilityRole="button"
                accessibilityState={{ expanded: tiposDesplegableAbierto }}
              >
                {tipoSeleccionado ? (
                  <>
                    <View style={s.tipoIconoSeleccionado}>
                      <Text style={s.tipoIconoTexto}>
                        {presentacionSeleccionada.icono}
                      </Text>
                    </View>

                    <View style={s.tipoSeleccionadoContenido}>
                      <Text style={s.tipoSeleccionadoNombre}>
                        {codigoTipoSeleccionado === 'OTRO'
                          ? 'Otros'
                          : tipoSeleccionado.nombre}
                      </Text>
                      <Text style={s.tipoSeleccionadoDescripcion}>
                        {presentacionSeleccionada.descripcion}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={s.tipoSeleccionadoContenido}>
                    <Text style={s.placeholderTipo}>
                      Seleccionar tipo de actividad
                    </Text>
                    <Text style={s.tipoSeleccionadoDescripcion}>
                      Elige una opción de la lista.
                    </Text>
                  </View>
                )}

                <Text style={s.desplegableFlecha}>
                  {tiposDesplegableAbierto ? '▲' : '▼'}
                </Text>
              </Pressable>

              {tiposDesplegableAbierto && (
                <View style={s.listaDesplegable}>
                  {tipos.map((tipo) => {
                    const codigo = String(tipo.codigo || '').toUpperCase();
                    const presentacion =
                      PRESENTACION_TIPOS[codigo] || {
                        icono: '📋',
                        descripcion: 'Actividad de atención veterinaria.',
                      };

                    const seleccionado =
                      String(tipoSeleccionado?.tipo_id) ===
                      String(tipo.tipo_id);

                    return (
                      <Pressable
                        key={String(tipo.tipo_id)}
                        style={[
                          s.opcionCatalogo,
                          seleccionado && s.opcionTipoActivo,
                        ]}
                        onPress={() => seleccionarTipo(tipo)}
                        disabled={guardando}
                      >
                        <View style={s.tipoIconoSeleccionado}>
                          <Text style={s.tipoIconoTexto}>
                            {presentacion.icono}
                          </Text>
                        </View>

                        <View style={s.opcionContenido}>
                          <Text style={s.opcionNombre}>
                            {codigo === 'OTRO' ? 'Otros' : tipo.nombre}
                          </Text>
                          <Text style={s.opcionDescripcion}>
                            {presentacion.descripcion}
                          </Text>
                        </View>

                        {seleccionado && (
                          <Text style={s.opcionAccion}>✓</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {tipoSeleccionado && (
            <>
              <View style={s.seccion}>
                <View style={s.seccionIcono}>
                  <Text style={s.seccionIconoTexto}>✎</Text>
                </View>

                <View style={s.seccionContenido}>
                  <Text style={s.seccionTitulo}>
                    Datos de {esOtro ? 'Otros' : tipoSeleccionado.nombre}
                  </Text>
                  <Text style={s.ayuda}>
                    {esOtro
                      ? 'Describe la actividad y el motivo por el que se realizará.'
                      : 'Completa los campos específicos de este procedimiento.'}
                  </Text>
                </View>
              </View>

              {/* MEDICACIÓN */}
              {esMedicacion && (
                <>
                  <Text style={s.etiqueta}>Medicamentos del catálogo *</Text>
                  <Text style={s.ayudaCatalogo}>
                    Selecciona uno o varios medicamentos registrados en Supabase.
                  </Text>

                  {cargandoCatalogo ? (
                    <ActivityIndicator color={C.verde} style={s.cargando} />
                  ) : errorCatalogo ? (
                    <Text style={s.error}>{errorCatalogo}</Text>
                  ) : catalogoMedicamentos.length === 0 ? (
                    <Text style={s.avisoCatalogo}>
                      No hay medicamentos activos en el catálogo.
                    </Text>
                  ) : (
                    <>
                      <Pressable
                        style={s.desplegable}
                        onPress={() =>
                          setDesplegableAbierto(!desplegableAbierto)
                        }
                        disabled={guardando}
                      >
                        <Text style={s.desplegableTexto}>
                          Seleccionar medicamento
                        </Text>
                        <Text style={s.desplegableFlecha}>
                          {desplegableAbierto ? '▲' : '▼'}
                        </Text>
                      </Pressable>

                      {desplegableAbierto && (
                        <View style={s.listaDesplegable}>
                          {catalogoMedicamentos.map((medicamento) => {
                            const agregado = medicamentosSeleccionados.some(
                              (item) =>
                                String(item.medicamento_id) ===
                                String(medicamento.medicamento_id)
                            );

                            return (
                              <Pressable
                                key={String(medicamento.medicamento_id)}
                                style={[
                                  s.opcionCatalogo,
                                  agregado && s.opcionDeshabilitada,
                                ]}
                                disabled={guardando || agregado}
                                onPress={() => agregarMedicamento(medicamento)}
                              >
                                <View style={s.opcionContenido}>
                                  <Text style={s.opcionNombre}>
                                    {medicamento.nombre_medicamento}
                                  </Text>
                                  <Text style={s.opcionDescripcion}>
                                    {medicamento.concentracion ||
                                      'Concentración no especificada'}
                                  </Text>
                                </View>
                                <Text style={s.opcionAccion}>
                                  {agregado ? 'Agregado' : '+'}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}

                  {medicamentosSeleccionados.map((medicamento, indice) => (
                    <View
                      key={String(medicamento.medicamento_id)}
                      style={s.productoSeleccionado}
                    >
                      <View style={s.productoEncabezado}>
                        <View style={s.productoIcono}>
                          <Text style={s.productoIconoTexto}>💊</Text>
                        </View>

                        <View style={s.productoTituloContenido}>
                          <Text style={s.productoNombre}>
                            {medicamento.nombre_medicamento}
                          </Text>
                          <Text style={s.productoConcentracion}>
                            {medicamento.concentracion ||
                              'Concentración no especificada'}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => quitarMedicamento(indice)}
                          disabled={guardando}
                          style={s.quitar}
                        >
                          <Text style={s.quitarTexto}>Quitar</Text>
                        </Pressable>
                      </View>

                      <Text style={s.etiqueta}>Dosis *</Text>
                      <TextInput
                        value={medicamento.dosis}
                        onChangeText={(valor) =>
                          actualizarMedicamento(indice, 'dosis', valor)
                        }
                        placeholder="Ej. 5 mg o 2 ml"
                        placeholderTextColor={C.secundario}
                        style={s.input}
                        editable={!guardando}
                        maxLength={100}
                      />

                      <Text style={s.etiqueta}>Frecuencia *</Text>
                      <TextInput
                        value={medicamento.frecuencia}
                        onChangeText={(valor) =>
                          actualizarMedicamento(indice, 'frecuencia', valor)
                        }
                        placeholder="Ej. Cada 8 horas o una vez al día"
                        placeholderTextColor={C.secundario}
                        style={s.input}
                        editable={!guardando}
                        maxLength={100}
                      />

                      <Text style={s.etiqueta}>
                        Vía de administración *
                      </Text>

                      <Pressable
                        style={s.desplegable}
                        onPress={() =>
                          setViaAbierta((actual) => ({
                            ...actual,
                            [`medicamento-${indice}`]:
                              !actual[`medicamento-${indice}`],
                          }))
                        }
                        disabled={guardando}
                      >
                        <Text style={s.desplegableTexto}>
                          {medicamento.via_administracion ||
                            'Seleccionar vía de administración'}
                        </Text>
                        <Text style={s.desplegableFlecha}>
                          {viaAbierta[`medicamento-${indice}`] ? '▲' : '▼'}
                        </Text>
                      </Pressable>

                      {viaAbierta[`medicamento-${indice}`] && (
                        <View style={s.listaDesplegable}>
                          {VIAS_ADMINISTRACION.map((via) => (
                            <Pressable
                              key={via}
                              style={s.opcionCatalogo}
                              onPress={() =>
                                seleccionarViaMedicamento(indice, via)
                              }
                            >
                              <Text style={s.opcionNombre}>{via}</Text>
                              {medicamento.via_administracion === via && (
                                <Text style={s.opcionAccion}>✓</Text>
                              )}
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}

                  <Text style={s.etiqueta}>
                    Duración del tratamiento *
                  </Text>
                  <TextInput
                    value={detalle.duracion || ''}
                    onChangeText={(valor) =>
                      actualizarDetalle('duracion', valor)
                    }
                    placeholder="Ej. 7 días"
                    placeholderTextColor={C.secundario}
                    style={s.input}
                    editable={!guardando}
                    maxLength={100}
                  />
                </>
              )}

              {/* VACUNACIÓN */}
              {esVacunacion && (
                <>
                  <Text style={s.etiqueta}>Nombre de la vacuna *</Text>
                  <Text style={s.ayudaCatalogo}>
                    Selecciona la vacuna del catálogo de PetCare.
                  </Text>

                  {cargandoCatalogo ? (
                    <ActivityIndicator color={C.verde} style={s.cargando} />
                  ) : errorCatalogo ? (
                    <Text style={s.error}>{errorCatalogo}</Text>
                  ) : catalogoVacunas.length === 0 ? (
                    <Text style={s.avisoCatalogo}>
                      No hay vacunas activas en el catálogo.
                    </Text>
                  ) : (
                    <>
                      <Pressable
                        style={s.desplegable}
                        onPress={() =>
                          setDesplegableAbierto(!desplegableAbierto)
                        }
                        disabled={guardando}
                      >
                        <Text style={s.desplegableTexto}>
                          Seleccionar vacuna
                        </Text>
                        <Text style={s.desplegableFlecha}>
                          {desplegableAbierto ? '▲' : '▼'}
                        </Text>
                      </Pressable>

                      {desplegableAbierto && (
                        <View style={s.listaDesplegable}>
                          {catalogoVacunas.map((vacuna) => {
                            const agregada = vacunasSeleccionadas.some(
                              (item) =>
                                String(item.medicamento_id) ===
                                String(vacuna.medicamento_id)
                            );

                            return (
                              <Pressable
                                key={String(vacuna.medicamento_id)}
                                style={[
                                  s.opcionCatalogo,
                                  agregada && s.opcionDeshabilitada,
                                ]}
                                disabled={guardando || agregada}
                                onPress={() => agregarVacuna(vacuna)}
                              >
                                <View style={s.opcionContenido}>
                                  <Text style={s.opcionNombre}>
                                    {vacuna.nombre_medicamento}
                                  </Text>
                                  <Text style={s.opcionDescripcion}>
                                    {vacuna.concentracion ||
                                      'Concentración no especificada'}
                                  </Text>
                                </View>
                                <Text style={s.opcionAccion}>
                                  {agregada ? 'Agregada' : '+'}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}

                  {vacunasSeleccionadas.map((vacuna, indice) => (
                    <View
                      key={String(vacuna.medicamento_id)}
                      style={s.productoSeleccionado}
                    >
                      <View style={s.productoEncabezado}>
                        <View style={s.productoIcono}>
                          <Text style={s.productoIconoTexto}>💉</Text>
                        </View>

                        <View style={s.productoTituloContenido}>
                          <Text style={s.productoNombre}>
                            {vacuna.nombre_medicamento}
                          </Text>
                          <Text style={s.productoConcentracion}>
                            {vacuna.concentracion ||
                              'Concentración no especificada'}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => quitarVacuna(indice)}
                          disabled={guardando}
                          style={s.quitar}
                        >
                          <Text style={s.quitarTexto}>Quitar</Text>
                        </Pressable>
                      </View>

                      <Text style={s.etiqueta}>
                        Vía de administración *
                      </Text>

                      <Pressable
                        style={s.desplegable}
                        onPress={() =>
                          setViaAbierta((actual) => ({
                            ...actual,
                            [`vacuna-${indice}`]:
                              !actual[`vacuna-${indice}`],
                          }))
                        }
                        disabled={guardando}
                      >
                        <Text style={s.desplegableTexto}>
                          {vacuna.via_administracion ||
                            'Seleccionar vía de administración'}
                        </Text>
                        <Text style={s.desplegableFlecha}>
                          {viaAbierta[`vacuna-${indice}`] ? '▲' : '▼'}
                        </Text>
                      </Pressable>

                      {viaAbierta[`vacuna-${indice}`] && (
                        <View style={s.listaDesplegable}>
                          {VIAS_ADMINISTRACION.map((via) => (
                            <Pressable
                              key={via}
                              style={s.opcionCatalogo}
                              onPress={() =>
                                seleccionarViaVacuna(indice, via)
                              }
                            >
                              <Text style={s.opcionNombre}>{via}</Text>
                              {vacuna.via_administracion === via && (
                                <Text style={s.opcionAccion}>✓</Text>
                              )}
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}

              {/* ÓRGANOS PARA ECOGRAFÍA */}
              {esEcografia && (
                <View style={s.seccionOrganos}>
                  <Text style={s.etiqueta}>Órganos evaluados *</Text>
                  <Text style={s.ayudaCatalogo}>
                    Selecciona uno o varios órganos. Puedes agregar órganos personalizados con la opción Otro.
                  </Text>

                  <Pressable
                    style={[
                      s.desplegable,
                      organosDesplegableAbierto && s.desplegableActivo,
                    ]}
                    onPress={() =>
                      setOrganosDesplegableAbierto(
                        (abierto) => !abierto
                      )
                    }
                    disabled={guardando}
                    accessibilityRole="button"
                    accessibilityState={{
                      expanded: organosDesplegableAbierto,
                    }}
                  >
                    <Text style={s.desplegableTexto}>
                      Seleccionar órgano
                    </Text>
                    <Text style={s.desplegableFlecha}>
                      {organosDesplegableAbierto ? '▲' : '▼'}
                    </Text>
                  </Pressable>

                  {organosDesplegableAbierto && (
                    <View style={s.listaDesplegable}>
                      {ORGANOS_ECOGRAFIA.map((organo) => {
                        const seleccionado = organosSeleccionados.some(
                          (item) =>
                            claveNombre(item.nombre_organo) ===
                            claveNombre(organo)
                        );

                        return (
                          <Pressable
                            key={organo}
                            style={[
                              s.opcionCatalogo,
                              seleccionado && s.opcionTipoActivo,
                            ]}
                            onPress={() =>
                              seleccionarOpcionOrgano(organo)
                            }
                            disabled={guardando}
                            accessibilityRole="checkbox"
                            accessibilityState={{
                              checked: seleccionado,
                            }}
                          >
                            <View style={s.opcionContenido}>
                              <Text style={s.opcionNombre}>
                                {organo}
                              </Text>
                            </View>

                            <Text style={s.opcionAccion}>
                              {seleccionado ? '✓' : '+'}
                            </Text>
                          </Pressable>
                        );
                      })}

                      <Pressable
                        style={s.opcionCatalogo}
                        onPress={agregarOtroOrgano}
                        disabled={guardando}
                      >
                        <View style={s.opcionContenido}>
                          <Text style={s.opcionNombre}>Otro</Text>
                          <Text style={s.opcionDescripcion}>
                            Escribir un órgano que no aparece en el catálogo.
                          </Text>
                        </View>
                        <Text style={s.opcionAccion}>+</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* ÓRGANOS DEL CATÁLOGO SELECCIONADOS */}
                  {organosSeleccionados.map((organo) => (
                    <View
                      key={claveNombre(organo.nombre_organo)}
                      style={s.organoSeleccionado}
                    >
                      <View style={s.organoSeleccionadoContenido}>
                        <Text style={s.organoSeleccionadoNombre}>
                          {organo.nombre_organo}
                        </Text>
                        <Text style={s.organoSeleccionadoTipo}>
                          Órgano del catálogo
                        </Text>
                      </View>

                      <Pressable
                        onPress={() =>
                          alternarOrgano(organo.nombre_organo)
                        }
                        disabled={guardando}
                        style={s.quitar}
                      >
                        <Text style={s.quitarTexto}>Quitar</Text>
                      </Pressable>
                    </View>
                  ))}

                  {/* CAMPOS PERSONALIZADOS: UNO POR CADA "OTRO" */}
                  {otrosOrganos.map((organo, indice) => (
                    <View
                      key={organo.clave}
                      style={s.otroOrganoContenedor}
                    >
                      <View style={s.otroOrganoEncabezado}>
                        <View style={s.otroOrganoTituloContenido}>
                          <Text style={s.otroOrganoTitulo}>
                            Órgano personalizado {indice + 1} *
                          </Text>
                          <Text style={s.opcionDescripcion}>
                            Escribe el nombre del órgano.
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => quitarOtroOrgano(organo.clave)}
                          disabled={guardando}
                          style={s.quitar}
                        >
                          <Text style={s.quitarTexto}>Quitar</Text>
                        </Pressable>
                      </View>

                      <TextInput
                        value={organo.nombre}
                        onChangeText={(valor) =>
                          actualizarOtroOrgano(organo.clave, valor)
                        }
                        placeholder="Ej. Páncreas"
                        placeholderTextColor={C.secundario}
                        style={s.input}
                        editable={!guardando}
                        maxLength={100}
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* CAMPOS ESPECÍFICOS */}
              {!esMedicacion && !esVacunacion &&
                campos.map((campo) => (
                  <View key={campo.key}>
                    <Text style={s.etiqueta}>{campo.label} *</Text>
                    <TextInput
                      value={detalle[campo.key] || ''}
                      onChangeText={(valor) =>
                        actualizarDetalle(campo.key, valor)
                      }
                      placeholder={campo.placeholder}
                      placeholderTextColor={C.secundario}
                      style={[
                        s.input,
                        campo.multiline && s.multilinea,
                      ]}
                      multiline={Boolean(campo.multiline)}
                      textAlignVertical={campo.multiline ? 'top' : 'center'}
                      editable={!guardando}
                      maxLength={campo.key === 'nombre_actividad' ? 150 : 1000}
                    />
                  </View>
                ))}

              {/* OBSERVACIONES OPCIONALES */}
              <View>
                <Text style={s.etiqueta}>Observaciones (opcional)</Text>
                <TextInput
                  value={observaciones}
                  onChangeText={setObservaciones}
                  placeholder="Ej. Incidencias o detalles adicionales de la atención."
                  placeholderTextColor={C.secundario}
                  style={[s.input, s.multilinea]}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                  editable={!guardando}
                />
                <Text style={s.contador}>
                  {observaciones.length}/1000 caracteres
                </Text>
              </View>
            </>
          )}

          {/* PROGRAMAR FECHA */}
          <View style={s.separador} />

          <View style={s.seccionGeneral}>
            <Text style={s.seccionGeneralTitulo}>Programar fecha</Text>
            <Text style={s.ayuda}>
              Define cuándo se realizará la actividad.
            </Text>
          </View>

          <Text style={s.etiqueta}>
            ¿Cuándo se realizará la actividad? *
          </Text>

          <View style={s.opcionesProgramacion}>
            <Pressable
              style={[
                s.opcionProgramacion,
                modoProgramacion === 'HOY' && s.opcionProgramacionActiva,
              ]}
              onPress={() => seleccionarModoProgramacion('HOY')}
              disabled={guardando}
              accessibilityRole="button"
              accessibilityState={{ selected: modoProgramacion === 'HOY' }}
            >
              <Text style={s.opcionProgramacionIcono}>✓</Text>
              <View style={s.opcionProgramacionContenido}>
                <Text
                  style={[
                    s.opcionProgramacionTitulo,
                    modoProgramacion === 'HOY' &&
                      s.opcionProgramacionTituloActiva,
                  ]}
                >
                  Realizar hoy
                </Text>
                <Text style={s.opcionProgramacionAyuda}>
                  Fecha actual fija
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                s.opcionProgramacion,
                modoProgramacion === 'FUTURA' && s.opcionProgramacionActiva,
              ]}
              onPress={() => seleccionarModoProgramacion('FUTURA')}
              disabled={guardando}
              accessibilityRole="button"
              accessibilityState={{ selected: modoProgramacion === 'FUTURA' }}
            >
              <Text style={s.opcionProgramacionIcono}>📅</Text>
              <View style={s.opcionProgramacionContenido}>
                <Text
                  style={[
                    s.opcionProgramacionTitulo,
                    modoProgramacion === 'FUTURA' &&
                      s.opcionProgramacionTituloActiva,
                  ]}
                >
                  Programar para otra fecha
                </Text>
                <Text style={s.opcionProgramacionAyuda}>
                  Elegir un día posterior
                </Text>
              </View>
            </Pressable>
          </View>

          {/* BOTONES */}
          <Pressable
            style={[
              s.guardar,
              (guardando || cargando || !atencionId) && s.deshabilitado,
            ]}
            onPress={guardarActividad}
            disabled={guardando || cargando || !atencionId}
          >
            {guardando ? (
              <ActivityIndicator color={C.blanco} />
            ) : (
              <>
                <Text style={s.guardarIcono}>✓</Text>
                <Text style={s.guardarTexto}>Registrar actividad</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={s.cancelar}
            onPress={volverDetalle}
            disabled={guardando}
          >
            <Text style={s.cancelarTexto}>Cancelar y volver</Text>
          </Pressable>
        </View>

        <Text style={s.pie}>
          PetCare · Seguimiento de atención veterinaria
        </Text>
      </ScrollView>

      {/* MODAL DEL CALENDARIO */}
      <Modal
        visible={calendarioAbierto}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setCalendarioAbierto(false)}
      >
        <View style={s.modalFondo}>
          <View style={s.modalCalendario}>
            <View style={s.modalEncabezado}>
              <View>
                <Text style={s.modalTitulo}>Seleccionar fecha</Text>
                <Text style={s.modalSubtitulo}>
                  Elige el día previsto para la actividad.
                </Text>
              </View>

              <Pressable
                style={s.cerrarCalendario}
                onPress={() => setCalendarioAbierto(false)}
              >
                <Text style={s.cerrarCalendarioTexto}>×</Text>
              </Pressable>
            </View>

            <View style={s.navegacionMes}>
              <Pressable
                style={s.botonMes}
                onPress={() => cambiarMes(-1)}
                accessibilityLabel="Mes anterior"
              >
                <Text style={s.flechaMes}>‹</Text>
              </Pressable>

              <Text style={s.nombreMes}>
                {MESES[numeroMesCalendario]} {anioCalendario}
              </Text>

              <Pressable
                style={s.botonMes}
                onPress={() => cambiarMes(1)}
                accessibilityLabel="Mes siguiente"
              >
                <Text style={s.flechaMes}>›</Text>
              </Pressable>
            </View>

            <View style={s.grillaCalendario}>
              {DIAS_SEMANA.map((dia, indice) => (
                <View key={`semana-${indice}`} style={s.celdaSemana}>
                  <Text style={s.textoSemana}>{dia}</Text>
                </View>
              ))}
            </View>

            <View style={s.grillaCalendario}>
              {diasCalendario.map((dia, indice) => {
                if (dia === null) {
                  return (
                    <View key={`vacio-${indice}`} style={s.celdaDia} />
                  );
                }

                const fechaDia = [
                  anioCalendario,
                  String(numeroMesCalendario + 1).padStart(2, '0'),
                  String(dia).padStart(2, '0'),
                ].join('-');

                const seleccionado = fechaDia === fechaPrevista;
                const esHoy = fechaDia === fechaHoy;
                const fechaNoPermitida = fechaDia <= fechaHoy;

                return (
                  <View key={fechaDia} style={s.celdaDia}>
                    <Pressable
                      style={[
                        s.botonDia,
                        esHoy && s.botonDiaHoy,
                        seleccionado && s.botonDiaSeleccionado,
                        fechaNoPermitida && s.botonDiaDeshabilitado,
                      ]}
                      onPress={() => seleccionarFecha(dia)}
                      disabled={fechaNoPermitida}
                      accessibilityRole="button"
                      accessibilityLabel={`Seleccionar ${dia} de ${MESES[numeroMesCalendario]} de ${anioCalendario}`}
                      accessibilityState={{
                        selected: seleccionado,
                        disabled: fechaNoPermitida,
                      }}
                    >
                      <Text
                        style={[
                          s.textoDia,
                          esHoy && s.textoDiaHoy,
                          seleccionado && s.textoDiaSeleccionado,
                          fechaNoPermitida && s.textoDiaDeshabilitado,
                        ]}
                      >
                        {dia}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={s.resumenFecha}>
              <Text style={s.resumenFechaEtiqueta}>
                Fecha seleccionada
              </Text>
              <Text style={s.resumenFechaValor}>
                {fechaPrevista
                  ? formatearFechaVisible(fechaPrevista)
                  : 'Ninguna'}
              </Text>
            </View>

            <Pressable
              style={s.botonAceptarFecha}
              onPress={() => setCalendarioAbierto(false)}
            >
              <Text style={s.botonAceptarFechaTexto}>Confirmar fecha</Text>
            </Pressable>

            <Pressable
              style={s.botonCancelarFecha}
              onPress={() => setCalendarioAbierto(false)}
            >
              <Text style={s.botonCancelarFechaTexto}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN */}
      <Modal
        visible={confirmacionVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={s.modalFondo}>
          <View style={s.modalCalendario}>
            <View style={s.confirmacionIcono}>
              <Text style={s.confirmacionIconoTexto}>✓</Text>
            </View>

            <Text style={s.confirmacionTitulo}>
              ¡Actividad registrada!
            </Text>

            <Text style={s.confirmacionMensaje}>
              La actividad se registró correctamente en la atención.
            </Text>

            <Pressable
              style={s.botonAceptarFecha}
              onPress={() => {
                setConfirmacionVisible(false);

                router.replace({
                  pathname: '/atenciones/detalleAtencion',
                  params: { atencion_id: atencionId },
                });
              }}
            >
              <Text style={s.botonAceptarFechaTexto}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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

/* ============================================================
   ESTILOS
   ============================================================ */

const s = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenido: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  migas: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  migaEnlace: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '600',
  },
  migaSeparador: {
    color: C.secundario,
    fontSize: 13,
  },
  migaActual: {
    color: C.secundario,
    fontSize: 13,
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
    color: C.verde,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '500',
    marginTop: -4,
  },
  encabezadoTexto: {
    flex: 1,
  },
  titulo: {
    color: C.texto,
    fontSize: 23,
    fontWeight: '800',
  },
  subtitulo: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 18,
    shadowColor: C.sombra,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 9,
    elevation: 2,
  },
  filaEtiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tituloTipo: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '800',
  },
  obligatorio: {
    color: C.verde,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  ayudaTipos: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    marginBottom: 13,
  },
  cargando: {
    margin: 20,
  },
  error: {
    color: C.rojo,
    fontSize: 13,
    lineHeight: 20,
  },
  desplegableTipo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 67,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FCFEFD',
  },
  desplegableTipoActivo: {
    borderColor: C.verde,
    backgroundColor: '#F8FCFA',
  },
  tipoIconoSeleccionado: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: C.claro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  tipoIconoTexto: {
    fontSize: 21,
  },
  tipoSeleccionadoContenido: {
    flex: 1,
  },
  tipoSeleccionadoNombre: {
    color: C.oscuro,
    fontSize: 14,
    fontWeight: '800',
  },
  tipoSeleccionadoDescripcion: {
    color: C.secundario,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  placeholderTipo: {
    color: C.secundario,
    fontSize: 13,
    fontWeight: '600',
  },
  seccion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 23,
    marginBottom: 7,
    padding: 13,
    borderRadius: 12,
    backgroundColor: C.claro,
  },
  seccionIcono: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  seccionIconoTexto: {
    color: C.verde,
    fontSize: 20,
    fontWeight: '800',
  },
  seccionContenido: {
    flex: 1,
  },
  seccionTitulo: {
    color: C.oscuro,
    fontSize: 14,
    fontWeight: '800',
  },
  ayuda: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  etiqueta: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: C.texto,
    backgroundColor: '#FCFEFD',
    fontSize: 14,
  },
  multilinea: {
    minHeight: 90,
    paddingTop: 12,
  },
  separador: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 20,
  },
  seccionGeneral: {
    marginBottom: 2,
  },
  seccionGeneralTitulo: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  contador: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
  },
  opcionesProgramacion: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 4,
  },
  opcionProgramacion: {
    flex: 1,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#FCFEFD',
  },
  opcionProgramacionActiva: {
    borderColor: C.verde,
    backgroundColor: '#F0F8F5',
  },
  opcionProgramacionIcono: {
    color: C.verde,
    fontSize: 18,
    marginRight: 8,
  },
  opcionProgramacionContenido: {
    flex: 1,
  },
  opcionProgramacionTitulo: {
    color: C.texto,
    fontSize: 11,
    fontWeight: '800',
  },
  opcionProgramacionTituloActiva: {
    color: C.oscuro,
  },
  opcionProgramacionAyuda: {
    color: C.secundario,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
  },
  guardar: {
    flexDirection: 'row',
    backgroundColor: C.verde,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    gap: 8,
  },
  deshabilitado: {
    opacity: 0.65,
  },
  guardarIcono: {
    color: C.blanco,
    fontSize: 17,
    fontWeight: '900',
  },
  guardarTexto: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '800',
  },
  cancelar: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: C.blanco,
  },
  cancelarTexto: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  pie: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 25,
  },
  ayudaCatalogo: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  avisoCatalogo: {
    color: C.secundario,
    fontSize: 12,
    backgroundColor: C.fondo,
    borderRadius: 10,
    padding: 13,
  },
  desplegable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 14,
    backgroundColor: '#FCFEFD',
  },
  desplegableActivo: {
    borderColor: C.verde,
    backgroundColor: '#F0F8F5',
  },
  desplegableTexto: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  desplegableFlecha: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 10,
  },
  listaDesplegable: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    marginTop: 7,
    overflow: 'hidden',
    backgroundColor: C.blanco,
  },
  opcionCatalogo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borde,
  },
  opcionDeshabilitada: {
    backgroundColor: '#F3F7F5',
    opacity: 0.65,
  },
  opcionTipoActivo: {
    backgroundColor: '#F0F8F5',
  },
  opcionContenido: {
    flex: 1,
  },
  opcionNombre: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  opcionDescripcion: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  opcionAccion: {
    color: C.verde,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 10,
  },
  productoSeleccionado: {
    borderWidth: 1,
    borderColor: '#D1E9DF',
    borderRadius: 13,
    padding: 13,
    marginTop: 13,
    backgroundColor: '#F8FCFA',
  },
  productoEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productoIcono: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: C.claro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  productoIconoTexto: {
    fontSize: 20,
  },
  productoTituloContenido: {
    flex: 1,
  },
  productoNombre: {
    color: C.oscuro,
    fontSize: 13,
    fontWeight: '800',
  },
  productoConcentracion: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 3,
  },
  quitar: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FCE8E6',
  },
  quitarTexto: {
    color: C.rojo,
    fontSize: 10,
    fontWeight: '800',
  },
  seccionOrganos: {
    marginTop: 8,
  },
  organoSeleccionado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1E9DF',
    borderRadius: 11,
    padding: 12,
    marginTop: 9,
    backgroundColor: '#F8FCFA',
  },
  organoSeleccionadoContenido: {
    flex: 1,
    marginRight: 10,
  },
  organoSeleccionadoNombre: {
    color: C.oscuro,
    fontSize: 13,
    fontWeight: '800',
  },
  organoSeleccionadoTipo: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 4,
  },
  otroOrganoContenedor: {
    borderWidth: 1,
    borderColor: '#D1E9DF',
    borderRadius: 11,
    padding: 12,
    marginTop: 10,
    backgroundColor: '#F8FCFA',
  },
  otroOrganoEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  otroOrganoTituloContenido: {
    flex: 1,
    marginRight: 8,
  },
  otroOrganoTitulo: {
    color: C.oscuro,
    fontSize: 12,
    fontWeight: '800',
  },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(15, 35, 32, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCalendario: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: C.blanco,
    borderRadius: 20,
    padding: 19,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 8,
  },
  modalEncabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalTitulo: {
    color: C.texto,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitulo: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 17,
  },
  cerrarCalendario: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: C.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  cerrarCalendarioTexto: {
    color: C.secundario,
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '500',
  },
  navegacionMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 13,
  },
  botonMes: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: C.claro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechaMes: {
    color: C.verde,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    marginTop: -3,
  },
  nombreMes: {
    color: C.oscuro,
    fontSize: 15,
    fontWeight: '800',
  },
  grillaCalendario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  celdaSemana: {
    width: '14.2857%',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSemana: {
    color: C.secundario,
    fontSize: 12,
    fontWeight: '800',
  },
  celdaDia: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  botonDia: {
    width: '100%',
    height: '100%',
    maxWidth: 39,
    maxHeight: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDiaHoy: {
    borderWidth: 1,
    borderColor: C.verde,
  },
  botonDiaSeleccionado: {
    backgroundColor: C.verde,
    borderColor: C.verde,
  },
  botonDiaDeshabilitado: {
    opacity: 0.28,
  },
  textoDiaDeshabilitado: {
    color: '#AAB5B1',
  },
  textoDia: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '500',
  },
  textoDiaHoy: {
    color: C.verde,
    fontWeight: '800',
  },
  textoDiaSeleccionado: {
    color: C.blanco,
    fontWeight: '800',
  },
  resumenFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.claro,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 17,
  },
  resumenFechaEtiqueta: {
    color: C.oscuro,
    fontSize: 12,
    fontWeight: '600',
  },
  resumenFechaValor: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
  },
  botonAceptarFecha: {
    backgroundColor: C.verde,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 15,
  },
  botonAceptarFechaTexto: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
  botonCancelarFecha: {
    alignItems: 'center',
    paddingVertical: 11,
    marginTop: 3,
  },
  botonCancelarFechaTexto: {
    color: C.secundario,
    fontSize: 12,
    fontWeight: '700',
  },
  confirmacionIcono: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.claro,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  confirmacionIconoTexto: {
    color: C.verde,
    fontSize: 38,
    fontWeight: '900',
  },
  confirmacionTitulo: {
    color: C.oscuro,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  confirmacionMensaje: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
});