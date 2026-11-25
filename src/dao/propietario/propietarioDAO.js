
import { supabase } from '../../services/supabase';
import { validarDatosPropietario } from '../../utils/validacionesPropietario';

// ============================================================
// DAO DE PROPIETARIOS
// Arquitectura: Servicio -> DAO -> Supabase.
// ============================================================

const TABLA_PROPIETARIOS = 'propietarios';

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function limpiarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarTelefono(telefono) {
  let numero = limpiarTexto(telefono).replace(/[\s()-]/g, '');

  if (numero.startsWith('+51')) {
    numero = numero.substring(3);
  } else if (numero.startsWith('51') && numero.length === 11) {
    numero = numero.substring(2);
  }

  return `+51${numero}`;
}

function normalizarCorreo(correo) {
  return limpiarTexto(correo).toLowerCase();
}

function crearError(codigo, mensaje) {
  const error = new Error(mensaje);
  error.code = codigo;
  return error;
}

// ============================================================
// COMPROBAR DNI DUPLICADO
// ============================================================

async function comprobarDniDuplicado(dni, propietarioId = null) {
  let consulta = supabase
    .from(TABLA_PROPIETARIOS)
    .select('propietario_id')
    .eq('documento_identidad', limpiarTexto(dni));

  if (propietarioId) {
    consulta = consulta.neq('propietario_id', propietarioId);
  }

  const { data, error } = await consulta.maybeSingle();

  if (error) throw error;

  if (data) {
    throw crearError(
      'DUPLICADO_DNI',
      'El DNI ya se encuentra registrado.'
    );
  }
}

// ============================================================
// COMPROBAR CORREO DUPLICADO
// ============================================================

async function comprobarCorreoDuplicado(correo, propietarioId = null) {
  const correoNormalizado = normalizarCorreo(correo);

  let consulta = supabase
    .from(TABLA_PROPIETARIOS)
    .select('propietario_id, correo')
    .ilike('correo', correoNormalizado);

  if (propietarioId) {
    consulta = consulta.neq('propietario_id', propietarioId);
  }

  const { data, error } = await consulta.maybeSingle();

  if (error) throw error;

  if (data) {
    throw crearError(
      'DUPLICADO_CORREO',
      'El correo electrónico ya se encuentra registrado.'
    );
  }
}

// ============================================================
// PREPARAR DATOS PARA INSERTAR O ACTUALIZAR
// ============================================================

function prepararDatosPropietario(datos) {
  return {
    nombre: limpiarTexto(datos.nombre),
    apellido: limpiarTexto(datos.apellido),
    documento_identidad: limpiarTexto(datos.documento_identidad),
    telefono: normalizarTelefono(datos.telefono),
    correo: normalizarCorreo(datos.correo),
    direccion: limpiarTexto(datos.direccion) || null,
    observaciones: limpiarTexto(datos.observaciones) || null,
  };
}

// ============================================================
// CONSULTAR TODOS LOS PROPIETARIOS
// ============================================================

export async function consultarPropietarios() {
  const { data, error } = await supabase
    .from(TABLA_PROPIETARIOS)
    .select('*')
    .order('apellido', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al consultar propietarios:', error);
    throw error;
  }

  return data ?? [];
}

// ============================================================
// CONSULTAR PROPIETARIO POR ID
// ============================================================

export async function consultarPropietarioPorId(propietarioId) {
  if (!propietarioId) {
    throw crearError(
      'ID_REQUERIDO',
      'Se necesita el identificador del propietario.'
    );
  }

  const { data, error } = await supabase
    .from(TABLA_PROPIETARIOS)
    .select('*')
    .eq('propietario_id', propietarioId)
    .maybeSingle();

  if (error) {
    console.error('Error al consultar propietario:', error);
    throw error;
  }

  if (!data) {
    throw crearError(
      'PROPIETARIO_NO_ENCONTRADO',
      'No se encontró la información del propietario solicitado.'
    );
  }

  return data;
}

// ============================================================
// CONSULTAR MASCOTAS POR PROPIETARIO
// ============================================================

export async function consultarMascotasPorPropietario(propietarioId) {
  if (!propietarioId) {
    throw crearError(
      'ID_REQUERIDO',
      'Se necesita el identificador del propietario.'
    );
  }

  const { data, error } = await supabase
    .from('mascotas')
    .select('*')
    .eq('propietario_id', propietarioId)
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al consultar mascotas del propietario:', error);
    throw error;
  }

  return data ?? [];
}

// ============================================================
// RF48 - BUSCAR PROPIETARIO POR NOMBRE, APELLIDO O DNI
// ============================================================

export async function buscarPorCriterio(criterio) {
  const criterioLimpio = limpiarTexto(criterio);

  if (!criterioLimpio) {
    throw crearError(
      'BUSQUEDA_VACIA',
      'Ingrese un dato para realizar la búsqueda.'
    );
  }

  const patron = `%${criterioLimpio}%`;

  const { data, error } = await supabase
    .from(TABLA_PROPIETARIOS)
    .select('*')
    .or(
      `nombre.ilike.${patron},apellido.ilike.${patron},documento_identidad.ilike.${patron}`
    )
    .order('apellido', { ascending: true })
    .order('nombre', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error al buscar propietario:', error);
    throw error;
  }

  return data ?? null;
}

// ============================================================
// VALIDAR DISPONIBILIDAD DE DNI Y CORREO
// propietarioId es opcional para permitir edición.
// ============================================================

export async function validarDisponibilidadPropietario(
  datos,
  propietarioId = null
) {
  if (!datos || typeof datos !== 'object') {
    throw crearError(
      'DATOS_REQUERIDOS',
      'Debe proporcionar los datos del propietario.'
    );
  }

  const dni = limpiarTexto(datos.documento_identidad);
  const correo = normalizarCorreo(datos.correo);

  if (dni) {
    await comprobarDniDuplicado(dni, propietarioId);
  }

  if (correo) {
    await comprobarCorreoDuplicado(correo, propietarioId);
  }

  return true;
}

// ============================================================
// REGISTRAR PROPIETARIO
// ============================================================

export async function registrarPropietario(datos) {
  const validacion = validarDatosPropietario(datos);

  if (!validacion.valido) {
    const error = crearError(
      'DATOS_INVALIDOS',
      'Verifique los datos ingresados.'
    );

    error.errores = validacion.errores;
    throw error;
  }

  const datosPreparados = prepararDatosPropietario(datos);

  await comprobarDniDuplicado(datosPreparados.documento_identidad);
  await comprobarCorreoDuplicado(datosPreparados.correo);

  const { data, error } = await supabase
    .from(TABLA_PROPIETARIOS)
    .insert([datosPreparados])
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const texto =
        `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();

      if (texto.includes('documento_identidad')) {
        throw crearError(
          'DUPLICADO_DNI',
          'El DNI ya se encuentra registrado.'
        );
      }

      if (texto.includes('correo')) {
        throw crearError(
          'DUPLICADO_CORREO',
          'El correo electrónico ya se encuentra registrado.'
        );
      }
    }

    console.error('Error al registrar propietario:', error);
    throw error;
  }

  return data;
}

// ============================================================
// ACTUALIZAR PROPIETARIO
// ============================================================

export async function actualizarPropietario(propietarioId, datos) {
  if (!propietarioId) {
    throw crearError(
      'ID_REQUERIDO',
      'Se necesita el identificador del propietario.'
    );
  }

  const validacion = validarDatosPropietario(datos);

  if (!validacion.valido) {
    const error = crearError(
      'DATOS_INVALIDOS',
      'Verifique los datos ingresados.'
    );

    error.errores = validacion.errores;
    throw error;
  }

  const datosPreparados = prepararDatosPropietario(datos);

  await comprobarDniDuplicado(
    datosPreparados.documento_identidad,
    propietarioId
  );

  await comprobarCorreoDuplicado(
    datosPreparados.correo,
    propietarioId
  );

  const { data, error } = await supabase
    .from(TABLA_PROPIETARIOS)
    .update(datosPreparados)
    .eq('propietario_id', propietarioId)
    .select('*')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      const texto =
        `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();

      if (texto.includes('documento_identidad')) {
        throw crearError(
          'DUPLICADO_DNI',
          'El DNI ya se encuentra registrado.'
        );
      }

      if (texto.includes('correo')) {
        throw crearError(
          'DUPLICADO_CORREO',
          'El correo electrónico ya se encuentra registrado.'
        );
      }
    }

    console.error('Error al actualizar propietario:', error);
    throw error;
  }

  if (!data) {
    throw crearError(
      'PROPIETARIO_NO_ENCONTRADO',
      'No se encontró la información del propietario solicitado.'
    );
  }

  return data;
}

// ============================================================
// RF48 - ACTUALIZAR ESTADO DEL PROPIETARIO
// Utiliza la función SQL transaccional.
// ============================================================

export async function actualizarEstado(
  propietarioId,
  nuevoEstado,
  motivoDesactivacion = ''
) {
  if (
    propietarioId === null ||
    propietarioId === undefined ||
    String(propietarioId).trim() === ''
  ) {
    throw crearError(
      'ID_REQUERIDO',
      'El identificador del propietario es obligatorio.'
    );
  }

  if (!['Activo', 'Inactivo'].includes(nuevoEstado)) {
    throw crearError(
      'ESTADO_INVALIDO',
      'El estado solicitado no es válido.'
    );
  }

  const motivo = limpiarTexto(motivoDesactivacion);

  if (nuevoEstado === 'Inactivo' && !motivo) {
    throw crearError(
      'MOTIVO_REQUERIDO',
      'Debe indicar el motivo de la desactivación.'
    );
  }

  const accion = nuevoEstado === 'Inactivo'
    ? 'desactivar'
    : 'activar';

  const { data: resultado, error: errorRPC } = await supabase.rpc(
    'cambiar_estado_propietario',
    {
      p_propietario_id: propietarioId,
      p_accion: accion,
      p_motivo: accion === 'desactivar' ? motivo : null,
    }
  );

  if (errorRPC) {
    console.error(
      'Error al ejecutar cambiar_estado_propietario:',
      errorRPC
    );

    throw errorRPC;
  }

  if (!resultado || resultado.correcto !== true) {
    throw crearError(
      'ERROR_ACTUALIZAR',
      'No se pudo actualizar el estado del propietario.'
    );
  }

  const { data: propietarioActualizado, error: errorConsulta } =
    await supabase
      .from(TABLA_PROPIETARIOS)
      .select('*')
      .eq('propietario_id', propietarioId)
      .maybeSingle();

  if (errorConsulta) {
    console.error(
      'Error al consultar propietario actualizado:',
      errorConsulta
    );

    throw errorConsulta;
  }

  if (!propietarioActualizado) {
    throw crearError(
      'PROPIETARIO_NO_ENCONTRADO',
      'No se encontró el propietario que desea actualizar.'
    );
  }

  return propietarioActualizado;
}
