
import { supabase } from '../services/supabase';
import { generarFechaInicio } from '../utils/fechaAtencion';

/*
 * DAO de atenciones de PetCare.
 *
 * Tabla principal: atenciones.
 * Relación:
 * atenciones.numero_historia -> mascotas.numero_historia.
 *
 * Estados:
 * - Activa
 * - Finalizada
 */

/**
 * Consulta las mascotas activas para el formulario de atención.
 */
export async function consultarMascotasParaAtencion() {
  const { data, error } = await supabase
    .from('mascotas')
    .select(`
      numero_historia,
      nombre,
      especie,
      raza,
      estado
    `)
    .order('nombre', { ascending: true });

  if (error) {
    throw new Error(
      'No se pudieron consultar las mascotas.'
    );
  }

  return (data || []).filter((mascota) => {
    const estado = String(mascota.estado || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    return estado === 'activo' || estado === 'activa';
  });
}

/**
 * Consulta las atenciones junto con los datos de su mascota.
 */
export async function consultarAtenciones() {
  const { data, error } = await supabase
    .from('atenciones')
    .select(`
      atencion_id,
      numero_historia,
      fecha_inicio,
      fecha_fin,
      estado,
      observaciones,
      mascotas (
        nombre,
        especie,
        raza
      )
    `)
    .order('fecha_inicio', { ascending: false });

  if (error) {
    throw new Error(
      'No se pudieron consultar las atenciones.'
    );
  }

  return data || [];
}

/**
 * RF22: registra una atención veterinaria.
 * RF23: genera y guarda automáticamente la fecha y hora de inicio.
 */
export async function registrarAtencion(datos) {
  const numeroHistoria = String(
    datos?.numero_historia ?? ''
  ).trim();

  // RF22 CP02: no se seleccionó una mascota.
  if (!numeroHistoria) {
    throw new Error(
      'Seleccione una mascota para registrar la atención.'
    );
  }

  // RF22 CP03: consultar la existencia de la mascota.
  const {
    data: mascota,
    error: errorMascota,
  } = await supabase
    .from('mascotas')
    .select('numero_historia, estado')
    .eq('numero_historia', numeroHistoria)
    .maybeSingle();

  // RF22 CP03: la mascota no existe.
  if (!errorMascota && !mascota) {
    throw new Error(
      'No se pudo encontrar la mascota. Verifique la información e inténtelo nuevamente.'
    );
  }

  // Error técnico al consultar la mascota.
  if (errorMascota) {
    throw new Error(
      'No se pudo verificar la mascota. Intente nuevamente.'
    );
  }

  // Validar que la mascota esté activa.
  const estadoMascota = String(mascota.estado || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (
    estadoMascota !== 'activo' &&
    estadoMascota !== 'activa'
  ) {
    throw new Error(
      'No se puede registrar una atención para una mascota inactiva.'
    );
  }

  // RF23 CP01 / CP02: generar fecha y hora automáticamente.
  // generarFechaInicio lanza su propio error si falla.
  const fechaInicio = generarFechaInicio();

  // Preparar los datos que se guardarán.
  const nuevaAtencion = {
    numero_historia: mascota.numero_historia,
    fecha_inicio: fechaInicio,
    estado: 'Activa',
    observaciones:
      String(datos?.observaciones ?? '').trim() || null,
  };

  // RF22 CP01 / RF23 CP03: guardar la atención y su inicio.
  const { data, error } = await supabase
    .from('atenciones')
    .insert(nuevaAtencion)
    .select('*')
    .single();

  if (error || !data) {
    console.error(
      'Error al registrar la atención:',
      error?.message
    );

    // RF22 CP04: error al registrar la atención.
    throw new Error(
      'No se pudo registrar la atención veterinaria. Intente nuevamente.'
    );
  }

  return data;
}

/**
 * Consulta el detalle de una atención específica.
 */
export async function consultarAtencionPorId(atencionId) {
  if (!atencionId) {
    throw new Error(
      'Debe indicar la atención que desea consultar.'
    );
  }

  const { data, error } = await supabase
    .from('atenciones')
    .select(`
      *,
      mascotas (
        nombre,
        especie,
        raza,
        numero_historia
      )
    `)
    .eq('atencion_id', atencionId)
    .maybeSingle();

  if (error) {
    throw new Error(
      'No se pudo consultar el detalle de la atención.'
    );
  }

  if (!data) {
    throw new Error(
      'La atención seleccionada no se encuentra disponible.'
    );
  }

  return data;
}
