
import { supabase } from '../services/supabase';
import { validarDatosPropietario } from '../utils/validacionesPropietario';
import { logger } from '../utils/logger';

// ============================================================
// DAO DE PROPIETARIOS
// Centraliza las consultas y operaciones de la tabla propietarios.
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
// Al editar, excluye al propietario actual.
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

  if (error) {
    throw error;
  }

  if (data) {
    throw crearError(
      'DUPLICADO_DNI',
      'El DNI ya se encuentra registrado.'
    );
  }
}

// ============================================================
// COMPROBAR CORREO DUPLICADO
// Al editar, excluye al propietario actual.
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

  if (error) {
    throw error;
  }

  if (data) {
    throw crearError(
      'DUPLICADO_CORREO',
      'El correo electrónico ya se encuentra registrado.'
    );
  }
}
// 
// RF12: evita abrir el resumen si existen datos duplicados.
// ============================================================

export async function validarDisponibilidadPropietario(datos) {
  await comprobarDniDuplicado(datos.documento_identidad);
  await comprobarCorreoDuplicado(datos.correo);
  return true;
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
// Ordena alfabéticamente por apellido y nombre.
// ============================================================

export async function consultarPropietarios() {
  const { data, error } = await supabase
    .from(TABLA_PROPIETARIOS)
    .select('*')
    .order('apellido', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) {
    logger.error('Error al consultar propietarios:', error);
    throw error;
  }

  return data ?? [];
}

// ============================================================
// CONSULTAR UN PROPIETARIO POR ID
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
    logger.error('Error al consultar propietario:', error);
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
// CONSULTAR MASCOTAS DE UN PROPIETARIO
// Utiliza mascotas.propietario_id.
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
    logger.error('Error al consultar mascotas del propietario:', error);
    throw error;
  }

  return data ?? [];
}

// ============================================================
// REGISTRAR PROPIETARIO
// Valida los datos y comprueba DNI y correo duplicados.
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
      const mensaje = (error.message ?? '').toLowerCase();
      const detalle = (error.details ?? '').toLowerCase();
      const texto = `${mensaje} ${detalle}`;

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

    logger.error('Error al registrar propietario:', error);
    throw error;
  }

  return data;
}

// ============================================================
// ACTUALIZAR PROPIETARIO
// Comprueba duplicados excluyendo al registro actual.
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

    logger.error('Error al actualizar propietario:', error);
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
