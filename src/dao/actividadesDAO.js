
import { supabase } from '../services/supabase';

/*
 * DAO de actividades de PetCare.
 *
 * Tabla principal: actividades.
 * Datos específicos: columna detalle (JSONB).
 * Catálogo de tipos: tipos_actividad.
 *
 * Estados permitidos:
 * - Pendiente
 * - Completada
 * - No realizada
 */

// Tipos de actividad y sus valores en la tabla actividades.
const TIPOS_LEGACY = {
  CONSULTA: 'Consulta',
  MEDICACION: 'Medicacion',
  VACUNACION: 'Vacunacion',
  ECOGRAFIA: 'Ecografia',
  ESTERILIZACION: 'Esterilizacion',
  OTRO: 'Otro actividad',
};

// Estos estados coinciden con la restricción CHECK de Supabase.
const ESTADOS_PERMITIDOS = [
  'Pendiente',
  'Completada',
  'No realizada',
];

// Comprueba los errores devueltos por Supabase.
function comprobarError(error) {
  if (error) {
    throw new Error(
      error.message || 'Ocurrió un error al acceder a Supabase.'
    );
  }
}

// Comprueba que el código del tipo de actividad sea válido.
function validarTipo(codigo) {
  if (!Object.prototype.hasOwnProperty.call(TIPOS_LEGACY, codigo)) {
    throw new Error(`El tipo de actividad "${codigo}" no es válido.`);
  }
}

// Comprueba que el estado sea uno de los tres permitidos.
function validarEstado(estado) {
  if (!ESTADOS_PERMITIDOS.includes(estado)) {
    throw new Error('El estado indicado no es válido.');
  }
}

// Consulta una actividad disponible y devuelve sus datos actuales.
async function obtenerActividadDisponible(actividadId) {
  if (!actividadId) {
    throw new Error('Debe indicar la actividad que desea actualizar.');
  }

  const { data, error } = await supabase
    .from('actividades')
    .select('*')
    .eq('actividad_id', actividadId)
    .eq('eliminado', false)
    .maybeSingle();

  comprobarError(error);

  if (!data) {
    throw new Error(
      'La actividad seleccionada no se encuentra disponible.'
    );
  }

  return data;
}

/**
 * RF: Consultar los tipos de actividad disponibles.
 *
 * Solo devuelve tipos activos del catálogo.
 */
export async function consultarTiposActividad() {
  const { data, error } = await supabase
    .from('tipos_actividad')
    .select('tipo_id, codigo, nombre, activo')
    .eq('activo', true)
    .order('nombre');

  comprobarError(error);

  return data ?? [];
}

/**
 * RF: Registrar una actividad.
 *
 * La actividad:
 * - Debe pertenecer a una atención existente y activa.
 * - Se registra inicialmente como Pendiente.
 * - No se registra con En proceso.
 * - Guarda sus detalles en la columna JSONB detalle.
 */
export async function registrarActividad(datos) {
  if (!datos?.atencion_id) {
    throw new Error('Debe indicar la atención asociada.');
  }

  validarTipo(datos.tipo);

  // Verifica que la atención exista y no esté finalizada.
  const { data: atencion, error: errorAtencion } = await supabase
    .from('atenciones')
    .select('atencion_id, estado')
    .eq('atencion_id', datos.atencion_id)
    .maybeSingle();

  comprobarError(errorAtencion);

  if (!atencion) {
    throw new Error('La atención seleccionada no se encuentra disponible.');
  }

  if (atencion.estado !== 'Activa') {
    throw new Error(
      'No se puede registrar una actividad en una atención finalizada.'
    );
  }

  // Las nuevas actividades siempre comienzan como Pendiente.
  if (datos.estado && datos.estado !== 'Pendiente') {
    throw new Error(
      'Las actividades nuevas deben registrarse como Pendiente.'
    );
  }

  // Obtiene el tipo desde el catálogo de Supabase.
  const { data: tipoCatalogo, error: errorTipo } = await supabase
    .from('tipos_actividad')
    .select('tipo_id, codigo')
    .eq('codigo', datos.tipo)
    .eq('activo', true)
    .maybeSingle();

  comprobarError(errorTipo);

  if (!tipoCatalogo) {
    throw new Error('El tipo de actividad seleccionado no está disponible.');
  }

  // Los detalles deben ser un objeto JSON.
  const detalle =
    datos.detalle &&
    typeof datos.detalle === 'object' &&
    !Array.isArray(datos.detalle)
      ? datos.detalle
      : {};

  const nuevaActividad = {
    atencion_id: datos.atencion_id,
    tipo: TIPOS_LEGACY[datos.tipo],
    tipo_id: tipoCatalogo.tipo_id,
    estado: 'Pendiente',
    fecha_registro: new Date().toISOString(),
    eliminado: false,
    detalle,
  };

  if (datos.fecha_prevista) {
    nuevaActividad.fecha_prevista = datos.fecha_prevista;
  }

  if (datos.observaciones !== undefined) {
    nuevaActividad.observaciones = datos.observaciones;
  }

  const { data, error } = await supabase
    .from('actividades')
    .insert(nuevaActividad)
    .select('*')
    .single();

  comprobarError(error);

  return data;
}

/**
 * RF: Consultar las actividades de una atención.
 *
 * Las actividades eliminadas lógicamente no se muestran.
 */
export async function consultarActividadesPorAtencion(atencionId) {
  if (!atencionId) {
    throw new Error('Debe indicar la atención que desea consultar.');
  }

  const { data, error } = await supabase
    .from('actividades')
    .select(`
      *,
      tipos_actividad (
        codigo,
        nombre
      )
    `)
    .eq('atencion_id', atencionId)
    .eq('eliminado', false)
    .order('fecha_registro', { ascending: false });

  comprobarError(error);

  return data ?? [];
}

/**
 * RF: Actualizar los detalles específicos de una actividad.
 */
export async function actualizarDetalleActividad(actividadId, detalle) {
  if (
    !detalle ||
    typeof detalle !== 'object' ||
    Array.isArray(detalle)
  ) {
    throw new Error('Los detalles deben enviarse como un objeto.');
  }

  // Comprueba que la actividad exista y no esté eliminada.
  await obtenerActividadDisponible(actividadId);

  const { data, error } = await supabase
    .from('actividades')
    .update({ detalle })
    .eq('actividad_id', actividadId)
    .eq('eliminado', false)
    .select('*')
    .single();

  comprobarError(error);

  return data;
}

/**
 * RF: Actualizar el estado de una actividad.
 *
 * Transiciones permitidas:
 * - Pendiente -> Completada.
 * - Pendiente -> No realizada, con motivo obligatorio.
 * - No realizada -> Pendiente, para reactivarla.
 *
 * No se permite cambiar una actividad Completada a otro estado
 * mediante esta función.
 */
export async function actualizarEstadoActividad(
  actividadId,
  nuevoEstado,
  motivoNoRealizada = null
) {
  validarEstado(nuevoEstado);

  // Consulta el estado anterior para validar la transición.
  const actividad = await obtenerActividadDisponible(actividadId);
  const estadoAnterior = actividad.estado;

  // Si no hay un cambio de estado, no es necesario actualizar.
  if (estadoAnterior === nuevoEstado) {
    throw new Error('La actividad ya tiene el estado seleccionado.');
  }

  // Solo se puede completar una actividad pendiente.
  if (
    nuevoEstado === 'Completada' &&
    estadoAnterior !== 'Pendiente'
  ) {
    throw new Error(
      'Solo se puede completar una actividad pendiente.'
    );
  }

  // Solo se puede marcar como No realizada una actividad pendiente.
  if (
    nuevoEstado === 'No realizada' &&
    estadoAnterior !== 'Pendiente'
  ) {
    throw new Error(
      'Solo se puede marcar como no realizada una actividad pendiente.'
    );
  }

  // Solo se puede reactivar una actividad No realizada.
  if (
    nuevoEstado === 'Pendiente' &&
    estadoAnterior !== 'No realizada'
  ) {
    throw new Error(
      'Solo se puede reactivar una actividad no realizada.'
    );
  }

  // El motivo es obligatorio cuando la actividad no se realiza.
  if (nuevoEstado === 'No realizada') {
    if (
      typeof motivoNoRealizada !== 'string' ||
      !motivoNoRealizada.trim()
    ) {
      throw new Error(
        'Ingrese el motivo para marcar la actividad como no realizada.'
      );
    }
  }

  const cambios = {
    estado: nuevoEstado,
  };

  if (nuevoEstado === 'Completada') {
    // Registra cuándo se completó la actividad.
    cambios.fecha_fin = new Date().toISOString();
    cambios.motivo_no_realizada = null;
  } else if (nuevoEstado === 'No realizada') {
    // Guarda el motivo y la fecha del cambio.
    cambios.fecha_fin = new Date().toISOString();
    cambios.motivo_no_realizada = motivoNoRealizada.trim();
  } else {
    // Al reactivar, la actividad vuelve a estar pendiente.
    cambios.fecha_fin = null;
    cambios.motivo_no_realizada = null;
  }

  const { data, error } = await supabase
    .from('actividades')
    .update(cambios)
    .eq('actividad_id', actividadId)
    .eq('eliminado', false)
    .select('*')
    .single();

  comprobarError(error);

  // Si se reactiva una actividad de una atención finalizada,
  // la atención vuelve a estar activa.
  if (
    nuevoEstado === 'Pendiente' &&
    actividad.atencion_id
  ) {
    const { error: errorAtencion } = await supabase
      .from('atenciones')
      .update({
        estado: 'Activa',
        fecha_fin: null,
      })
      .eq('atencion_id', actividad.atencion_id)
      .eq('estado', 'Finalizada');

    comprobarError(errorAtencion);
  }

  return data;
}

/**
 * RF: Eliminar una actividad de manera lógica.
 *
 * No elimina físicamente el registro de Supabase.
 */
export async function eliminarActividad(actividadId) {
  await obtenerActividadDisponible(actividadId);

  const { data, error } = await supabase
    .from('actividades')
    .update({ eliminado: true })
    .eq('actividad_id', actividadId)
    .eq('eliminado', false)
    .select('actividad_id, eliminado')
    .single();

  comprobarError(error);

  return data;
}

/**
 * RF10: Consultar actividades filtradas por estado.
 *
 * Responsabilidad DAO:
 * - Consultar la tabla actividades de Supabase.
 * - Excluir las actividades eliminadas lógicamente.
 * - Aplicar el filtro de estado cuando se indique.
 * - Ordenar los resultados por fecha de registro descendente.
 *
 * SOLID - SRP:
 * Esta función se encarga únicamente del acceso a los datos.
 * No contiene lógica de presentación ni componentes de React Native.
 *
 * @param {string|null} estado Estado por consultar o null para consultar todos.
 * @returns {Promise<Array>} Lista de actividades encontradas.
 */
export async function consultarActividadesPorEstado(estado = null) {
  // RF10: validar el estado cuando se solicita un filtro específico.
  if (estado !== null && !ESTADOS_PERMITIDOS.includes(estado)) {
    throw new Error('El estado indicado no es válido.');
  }

  // RF10: consulta inicial de actividades no eliminadas.
  let consulta = supabase
    .from('actividades')
    .select(`
      *,
      tipos_actividad (
        codigo,
        nombre
      )
    `)
    .eq('eliminado', false);

  // RF10: filtrar solo si el usuario seleccionó un estado.
  if (estado !== null) {
    consulta = consulta.eq('estado', estado);
  }

  // RF10: mostrar primero las actividades registradas más recientemente.
  const { data, error } = await consulta.order(
    'fecha_registro',
    { ascending: false }
  );

  // Reutiliza el control de errores del DAO.
  comprobarError(error);

  // Una consulta correcta sin resultados devuelve una lista vacía.
  return data ?? [];
}
