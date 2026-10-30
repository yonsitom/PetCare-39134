
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

/**
 * Relación entre mascotas y propietarios.
 * CORRECCIÓN: la columna real es nombre, no nombres.
 */
const relacionPropietario = `
  *,
  propietarios (
    propietario_id,
    nombre,
    documento_identidad,
    telefono,
    correo
  )
`;

/**
 * Normaliza el estado de esterilización.
 * Supabase admite únicamente:
 * - Esterilizado
 * - No esterilizado
 * - No aplica
 */
function normalizarEstadoEsterilizacion(valor) {
  const estado = String(valor ?? '').trim().toLowerCase();

  const equivalencias = {
    esterilizado: 'Esterilizado',
    'no esterilizado': 'No esterilizado',
    'no aplica': 'No aplica',
  };

  if (!estado) {
    return 'No aplica';
  }

  if (equivalencias[estado]) {
    return equivalencias[estado];
  }

  throw new Error(
    'Seleccione un estado de esterilización válido.'
  );
}

/**
 * Valida el texto utilizado en la búsqueda.
 */
function validarTerminoBusqueda(termino) {
  const texto = String(termino ?? '').trim();

  if (!texto) {
    return '';
  }

  if (!/^[\p{L}\p{N}\s.'-]+$/u.test(texto)) {
    throw new Error(
      'El término de búsqueda contiene caracteres no permitidos.'
    );
  }

  return texto;
}

/**
 * CONSULTAR MASCOTAS ACTIVAS.
 */
export async function consultarMascotas() {
  const { data, error } = await supabase
    .from('mascotas')
    .select(relacionPropietario)
    .eq('estado', 'Activo')
    .order('nombre', { ascending: true });

  if (error) {
    logger.error('Error al consultar mascotas:', error);
    throw error;
  }

  return data ?? [];
}

/**
 * BUSCAR MASCOTAS ACTIVAS.
 * Busca por nombre, número de historia o especie.
 */
export async function buscarMascotas(termino) {
  const texto = validarTerminoBusqueda(termino);

  if (!texto) {
    return consultarMascotas();
  }

  const patron = `%${texto}%`;

  const { data, error } = await supabase
    .from('mascotas')
    .select(relacionPropietario)
    .eq('estado', 'Activo')
    .or(
      `nombre.ilike.${patron},numero_historia.ilike.${patron},especie.ilike.${patron}`
    )
    .order('nombre', { ascending: true });

  if (error) {
    logger.error('Error al buscar mascotas:', error);
    throw error;
  }

  return data ?? [];
}

/**
 * CONSULTAR UNA MASCOTA POR NÚMERO DE HISTORIA.
 */
export async function consultarMascotaPorId(numeroHistoria) {
  if (!numeroHistoria) {
    throw new Error(
      'Debe indicar el número de historia de la mascota.'
    );
  }

  const { data, error } = await supabase
    .from('mascotas')
    .select(relacionPropietario)
    .eq('numero_historia', numeroHistoria)
    .maybeSingle();

  if (error) {
    logger.error('Error al consultar la mascota:', error);
    throw error;
  }

  return data;
}

/**
 * CONSULTAR PROPIETARIOS ACTIVOS PARA EL FORMULARIO.
 */
export async function consultarPropietariosParaMascota() {
  const { data, error } = await supabase
    .from('propietarios')
    .select('*')
    .eq('estado', 'Activo')
    .order('nombre', { ascending: true });

  if (error) {
    logger.error(
      'Error al consultar propietarios para mascota:',
      error
    );
    throw error;
  }

  return data ?? [];
}

/**
 * CONSULTAR PROPIETARIOS ACTIVOS.
 */
export async function consultarPropietarios() {
  const { data, error } = await supabase
    .from('propietarios')
    .select('*')
    .eq('estado', 'Activo')
    .order('nombre', { ascending: true });

  if (error) {
    logger.error('Error al consultar propietarios:', error);
    throw error;
  }

  return data ?? [];
}

/**
 * REGISTRAR MASCOTA.
 */
export async function registrarMascota(datos) {
  if (!datos) {
    throw new Error(
      'No se recibieron los datos de la mascota.'
    );
  }

  if (!datos.nombre?.trim()) {
    throw new Error(
      'El nombre de la mascota es obligatorio.'
    );
  }

  if (!datos.especie?.trim()) {
    throw new Error(
      'La especie de la mascota es obligatoria.'
    );
  }

  if (!datos.propietario_id) {
    throw new Error(
      'Debe seleccionar un propietario.'
    );
  }

  const registro = {
    nombre: datos.nombre.trim(),
    especie: datos.especie.trim(),
    raza: datos.raza?.trim() || null,
    propietario_id: datos.propietario_id,
    sexo: datos.sexo || null,
    fecha_nacimiento: datos.fecha_nacimiento || null,
    color: datos.color?.trim() || null,

    // Usa únicamente los valores permitidos por Supabase.
    estado_esterilizacion: normalizarEstadoEsterilizacion(
      datos.estado_esterilizacion
    ),

    observaciones: datos.observaciones?.trim() || null,
    estado: 'Activo',
  };

  const { data, error } = await supabase
    .from('mascotas')
    .insert(registro)
    .select(relacionPropietario)
    .single();

  if (error) {
    logger.error('Error al registrar la mascota:', error);
    throw error;
  }

  return data;
}

/**
 * ACTUALIZAR MASCOTA.
 */
export async function actualizarMascota(numeroHistoria, datos) {
  if (!numeroHistoria) {
    throw new Error(
      'Debe indicar el número de historia de la mascota.'
    );
  }

  if (!datos) {
    throw new Error(
      'No se recibieron los datos para actualizar.'
    );
  }

  if (!datos.nombre?.trim()) {
    throw new Error(
      'El nombre de la mascota es obligatorio.'
    );
  }

  if (!datos.especie?.trim()) {
    throw new Error(
      'La especie de la mascota es obligatoria.'
    );
  }

  if (!datos.propietario_id) {
    throw new Error(
      'Debe seleccionar un propietario.'
    );
  }

  const cambios = {
    nombre: datos.nombre.trim(),
    especie: datos.especie.trim(),
    raza: datos.raza?.trim() || null,
    propietario_id: datos.propietario_id,
    sexo: datos.sexo || null,
    fecha_nacimiento: datos.fecha_nacimiento || null,
    color: datos.color?.trim() || null,

    // Aplica la misma validación al actualizar.
    estado_esterilizacion: normalizarEstadoEsterilizacion(
      datos.estado_esterilizacion
    ),

    observaciones: datos.observaciones?.trim() || null,
  };

  const { data, error } = await supabase
    .from('mascotas')
    .update(cambios)
    .eq('numero_historia', numeroHistoria)
    .select(relacionPropietario)
    .single();

  if (error) {
    logger.error('Error al actualizar la mascota:', error);
    throw error;
  }

  return data;
}

/**
 * DESACTIVAR MASCOTA.
 * No elimina el registro de la base de datos.
 */
export async function desactivarMascota(numeroHistoria) {
  if (!numeroHistoria) {
    throw new Error(
      'Debe indicar el número de historia de la mascota.'
    );
  }

  const { data, error } = await supabase
    .from('mascotas')
    .update({ estado: 'Inactivo' })
    .eq('numero_historia', numeroHistoria)
    .select()
    .single();

  if (error) {
    logger.error('Error al desactivar la mascota:', error);
    throw error;
  }

  return data;
}

/**
 * CONSULTAR MASCOTAS ACTIVAS DE UN PROPIETARIO.
 */
export async function consultarMascotasPorPropietario(
  propietarioId
) {
  if (!propietarioId) {
    throw new Error(
      'Debe indicar el propietario.'
    );
  }

  const { data, error } = await supabase
    .from('mascotas')
    .select(relacionPropietario)
    .eq('propietario_id', propietarioId)
    .eq('estado', 'Activo')
    .order('nombre', { ascending: true });

  if (error) {
    logger.error(
      'Error al consultar mascotas por propietario:',
      error
    );
    throw error;
  }

  return data ?? [];
}

/**
 * RF46 / CUS46 — DAO de administración.
 *
 * Estas consultas incluyen mascotas activas e inactivas para que
 * el administrador pueda buscar y volver a activar registros.
 * Se mantienen separadas de las consultas existentes para no
 * alterar el comportamiento de otros módulos.
 */
export async function consultarMascotasAdministracionDAO() {
  const { data, error } = await supabase
    .from('mascotas')
    .select(relacionPropietario)
    .order('nombre', { ascending: true });

  if (error) {
    logger.error(
      'Error al consultar mascotas para administración:',
      error
    );
    throw error;
  }

  return data ?? [];
}

/**
 * Busca por nombre, historia clínica o especie sin excluir
 * registros inactivos.
 */
export async function buscarMascotasAdministracionDAO(termino) {
  const texto = validarTerminoBusqueda(termino);

  if (!texto) {
    throw new Error(
      'Ingresa un dato para realizar la búsqueda de la mascota.'
    );
  }

  const patron = `%${texto}%`;

  const { data, error } = await supabase
    .from('mascotas')
    .select(relacionPropietario)
    .or(
      `nombre.ilike.${patron},numero_historia.ilike.${patron},especie.ilike.${patron}`
    )
    .order('nombre', { ascending: true });

  if (error) {
    logger.error(
      'Error al buscar mascotas para administración:',
      error
    );
    throw error;
  }

  return data ?? [];
}

/**
 * Actualiza el estado y el motivo de desactivación.
 * Devuelve el registro actualizado o null si no existe.
 */
export async function cambiarEstadoMascotaDAO({
  numeroHistoria,
  nuevoEstado,
  motivo = '',
}) {
  if (!numeroHistoria) {
    throw new Error(
      'Debe indicar el número de historia de la mascota.'
    );
  }

  if (!['Activo', 'Inactivo'].includes(nuevoEstado)) {
    throw new Error('El estado indicado no es válido.');
  }

  const cambios = {
    estado: nuevoEstado,
    motivo_desactivacion:
      nuevoEstado === 'Inactivo' ? String(motivo).trim() : null,
  };

  const { data, error } = await supabase
    .from('mascotas')
    .update(cambios)
    .eq('numero_historia', numeroHistoria)
    .select(relacionPropietario)
    .maybeSingle();

  if (error) {
    logger.error(
      'Error al cambiar el estado de la mascota:',
      error
    );
    throw error;
  }

  return data ?? null;
}

