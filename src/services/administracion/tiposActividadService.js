
/**
 * ============================================================
 * PETCARE - SERVICIO DE TIPOS DE ACTIVIDAD
 * RF56: Gestionar el catálogo de tipos de actividad
 * ============================================================
 *
 * Actor: Administrador.
 *
 * Operaciones contempladas en CUS56:
 * - Consultar tipos de actividad.
 * - Registrar un nuevo tipo.
 * - Editar un tipo existente.
 * - Activar o desactivar un tipo.
 *
 * Reglas:
 * - Nombre obligatorio.
 * - No permitir nombres duplicados.
 * - Requiere medicamento es un indicador booleano.
 * - Los tipos inactivos no se ofrecen para nuevas actividades.
 * - Desactivar no elimina actividades históricas.
 * - No guardar si se cancela la confirmación.
 *
 * Arquitectura: Servicio + DAO.
 * ============================================================
 */

import {
  listarTiposActividadDAO,
  obtenerTipoActividadPorIdDAO,
  crearTipoActividadDAO,
  actualizarTipoActividadDAO,
  cambiarEstadoTipoActividadDAO,
} from '../../dao/administracion/tiposActividadDAO';
import { logger } from '../../utils/logger';

// ============================================================
// MENSAJES DEL CUS56
// ============================================================

const MENSAJE_CAMPOS =
  'Complete los campos obligatorios.';

const MENSAJE_DUPLICADO =
  'Ya existe un tipo de actividad con ese nombre.';

const MENSAJE_ERROR =
  'No fue posible completar la operación. Intente nuevamente.';

const MENSAJE_EXITO =
  'El tipo de actividad se guardó correctamente.';

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function validarId(tipoId) {
  const id = Number(tipoId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(
      'El identificador del tipo de actividad no es válido.'
    );
  }

  return id;
}

function validarDatosTipoActividad(datos) {
  const nombre = String(datos?.nombre ?? '').trim();

  if (!nombre) {
    throw new Error(MENSAJE_CAMPOS);
  }

  return {
    nombre,
    descripcion: String(datos?.descripcion ?? '').trim(),
    requiere_medicamento:
      typeof datos?.requiere_medicamento === 'boolean'
        ? datos.requiere_medicamento
        : false,
  };
}

function generarCodigo(nombre, existentes = []) {
  const base =
    String(nombre)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 55) || 'TIPO_ACTIVIDAD';

  const codigos = new Set(
    existentes.map((tipo) =>
      String(tipo.codigo ?? '').toUpperCase()
    )
  );

  let codigo = base;
  let contador = 2;

  while (codigos.has(codigo)) {
    const sufijo = `_${contador}`;
    codigo = `${base.slice(0, 60 - sufijo.length)}${sufijo}`;
    contador += 1;
  }

  return codigo;
}

function validarNombreNoDuplicado(
  nombre,
  existentes,
  excluirId = null
) {
  const nombreBuscado = normalizarTexto(nombre);

  const duplicado = existentes.some((tipo) => {
    if (
      excluirId !== null &&
      Number(tipo.tipo_id) === Number(excluirId)
    ) {
      return false;
    }

    return normalizarTexto(tipo.nombre) === nombreBuscado;
  });

  if (duplicado) {
    throw new Error(MENSAJE_DUPLICADO);
  }
}

// ============================================================
// CONSULTAR CATÁLOGO
// ============================================================

export async function consultarTiposActividadServicio({
  soloActivos = false,
} = {}) {
  try {
    return await listarTiposActividadDAO({
      soloActivos,
    });
  } catch (error) {
    logger.error('RF56: error consultando el catálogo:', error);
    throw new Error(MENSAJE_ERROR);
  }
}

// ============================================================
// CONSULTAR TIPOS DISPONIBLES PARA NUEVAS ACTIVIDADES
// ============================================================

export async function consultarTiposActividadDisponiblesServicio() {
  return consultarTiposActividadServicio({
    soloActivos: true,
  });
}

// ============================================================
// CONSULTAR UN TIPO POR ID
// ============================================================

export async function obtenerTipoActividadServicio(tipoId) {
  const id = validarId(tipoId);

  try {
    return await obtenerTipoActividadPorIdDAO(id);
  } catch (error) {
    logger.error('RF56: error consultando tipo:', error);
    throw new Error(MENSAJE_ERROR);
  }
}

// ============================================================
// CP01 - REGISTRAR UN TIPO DE ACTIVIDAD
// ============================================================

export async function crearTipoActividadServicio(
  datos,
  confirmado = true
) {
  const datosValidados = validarDatosTipoActividad(datos);

  if (confirmado !== true) {
    return {
      cancelado: true,
      tipoActividad: null,
    };
  }

  try {
    const existentes = await listarTiposActividadDAO({
      soloActivos: false,
    });

    validarNombreNoDuplicado(
      datosValidados.nombre,
      existentes,
    );

    const registro = {
      ...datosValidados,
      codigo: generarCodigo(
        datosValidados.nombre,
        existentes
      ),
    };

    const resultado = await crearTipoActividadDAO(registro);

    return {
      ok: true,
      mensaje: MENSAJE_EXITO,
      data: resultado,
    };
  } catch (error) {
    if (error?.message === MENSAJE_DUPLICADO) {
      throw error;
    }

    logger.error('RF56: error registrando tipo:', error);
    throw new Error(MENSAJE_ERROR);
  }
}

// ============================================================
// CP01 - EDITAR UN TIPO DE ACTIVIDAD
// ============================================================

export async function editarTipoActividadServicio(
  tipoId,
  datos,
  confirmado = true
) {
  const id = validarId(tipoId);
  const datosValidados = validarDatosTipoActividad(datos);

  if (confirmado !== true) {
    return {
      cancelado: true,
      tipoActividad: null,
    };
  }

  try {
    const existentes = await listarTiposActividadDAO({
      soloActivos: false,
    });

    validarNombreNoDuplicado(
      datosValidados.nombre,
      existentes,
      id
    );

    const resultado = await actualizarTipoActividadDAO(
      id,
      datosValidados
    );

    return {
      ok: true,
      mensaje: MENSAJE_EXITO,
      data: resultado,
    };
  } catch (error) {
    if (error?.message === MENSAJE_DUPLICADO) {
      throw error;
    }

    logger.error('RF56: error editando tipo:', error);
    throw new Error(MENSAJE_ERROR);
  }
}

// ============================================================
// CP01 - ACTIVAR O DESACTIVAR TIPO DE ACTIVIDAD
// ============================================================

export async function cambiarDisponibilidadTipoActividadServicio(
  tipoId,
  activo,
  confirmado = true
) {
  const id = validarId(tipoId);

  if (typeof activo !== 'boolean') {
    throw new Error(
      'La disponibilidad del tipo de actividad no es válida.'
    );
  }

  if (confirmado !== true) {
    return {
      cancelado: true,
      tipoActividad: null,
    };
  }

  try {
    const resultado = await cambiarEstadoTipoActividadDAO(
      id,
      activo
    );

    return {
      ok: true,
      mensaje: activo
        ? 'El tipo de actividad se activó correctamente.'
        : 'El tipo de actividad se desactivó correctamente.',
      data: resultado,
    };
  } catch (error) {
    logger.error(
      'RF56: error cambiando disponibilidad:',
      error
    );

    throw new Error(MENSAJE_ERROR);
  }
}
