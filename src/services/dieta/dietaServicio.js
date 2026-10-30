
/**
 * ============================================================
 * PETCARE - SERVICIO DE DIETAS
 * RF54: Registrar la dieta indicada a una mascota
 * ============================================================
 *
 * Archivo: src/services/dieta/dietaServicio.js
 *
 * Responsabilidades:
 * - Consultar una dieta por receta.
 * - Consultar recetas disponibles para registrar una dieta.
 * - Validar los datos antes de guardar.
 * - Validar que se haya seleccionado un tipo de dieta.
 * - Verificar que la dieta tenga alimentos asociados.
 * - Controlar errores de carga y registro.
 *
 * Arquitectura:
 * La persistencia se delega al DAO.
 * ============================================================
 */

import {
  consultarDietaPorRecetaDAO,
  consultarRecetasDisponiblesParaDietaDAO,
  registrarDietaDAO,
} from '../../dao/dieta/dietaDAO';
import { logger } from '../../utils/logger';

// ============================================================
// MENSAJES DEL RF54
// ============================================================

const MENSAJE_DIETA_NO_SELECCIONADA =
  'Seleccione un tipo de dieta.';

const MENSAJE_DIETA_SIN_ALIMENTOS =
  'La dieta seleccionada no tiene alimentos registrados.';

const MENSAJE_ERROR_CARGAR =
  'No fue posible cargar las dietas. Intente nuevamente.';

const MENSAJE_ERROR_REGISTRAR =
  'No fue posible registrar la actividad. Intente nuevamente.';

// ============================================================
// VALIDAR IDENTIFICADORES
// ============================================================

function validarIdentificador(valor, mensaje) {
  if (
    valor === undefined ||
    valor === null ||
    String(valor).trim() === '' ||
    !/^\d+$/.test(String(valor))
  ) {
    throw new Error(mensaje);
  }

  const numero = Number(valor);

  if (!Number.isSafeInteger(numero) || numero <= 0) {
    throw new Error(mensaje);
  }

  return numero;
}

// ============================================================
// RF54 - CONSULTAR DIETA POR RECETA
// ============================================================

export async function obtenerDietaServicio(recetaId) {
  const id = validarIdentificador(
    recetaId,
    'El identificador de la receta no es válido.'
  );

  return consultarDietaPorRecetaDAO(id);
}

// ============================================================
// RF54 - CONSULTAR RECETAS DISPONIBLES PARA DIETA
// CP04 - ERROR AL CARGAR CATÁLOGO
// ============================================================

export async function obtenerRecetasDisponiblesParaDietaServicio(
  atencionId
) {
  const id = validarIdentificador(
    atencionId,
    'El identificador de la atención no es válido.'
  );

  try {
    const resultado =
      await consultarRecetasDisponiblesParaDietaDAO(id);

    return Array.isArray(resultado) ? resultado : [];
  } catch (error) {
    logger.error(
      'RF54: no fue posible cargar las dietas:',
      error
    );

    throw new Error(MENSAJE_ERROR_CARGAR);
  }
}

// ============================================================
// VALIDAR QUE LA DIETA TENGA ALIMENTOS
// ============================================================

function validarAlimentos(datos) {
  /*
   * El DAO actual guarda las opciones de proteína y vegetales.
   * No se consideran carbohidratos u "otro" como persistidos
   * porque el DAO compartido todavía no los guarda.
   */

  const proteina = String(
    datos.opciones_proteina ?? ''
  ).trim();

  const vegetales = String(
    datos.opciones_vegetales ?? ''
  ).trim();

  const tieneAlimentos = Boolean(
    proteina || vegetales
  );

  if (!tieneAlimentos) {
    throw new Error(MENSAJE_DIETA_SIN_ALIMENTOS);
  }
}

// ============================================================
// RF54 - REGISTRAR DIETA
// CP01 - REGISTRO EXITOSO
// CP02 - DIETA NO SELECCIONADA
// CP03 - DIETA SIN ALIMENTOS
// CP05 - ERROR AL REGISTRAR
// ============================================================

export async function registrarDietaServicio(datos) {
  // Validar que se hayan recibido datos.

  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error(
      'Debes proporcionar los datos de la dieta.'
    );
  }

  // Validar que exista una receta válida.

  const recetaId = validarIdentificador(
    datos.receta_id,
    'Debes seleccionar una receta válida.'
  );

  // Validar que se haya seleccionado un tipo de dieta.

  const tipoDieta = String(
    datos.tipo_dieta ?? ''
  ).trim();

  if (!tipoDieta) {
    throw new Error(MENSAJE_DIETA_NO_SELECCIONADA);
  }

  // Validar que existan alimentos asociados.

  validarAlimentos(datos);

  // Preparar los datos que reconoce el DAO actual.

  const datosNormalizados = {
    receta_id: recetaId,
    tipo_dieta: tipoDieta,
    opciones_proteina: String(
      datos.opciones_proteina ?? ''
    ).trim(),
    opciones_vegetales: String(
      datos.opciones_vegetales ?? ''
    ).trim(),
    restriccion_nutricional: String(
      datos.restriccion_nutricional ?? ''
    ).trim(),
  };

  // Guardar la dieta y controlar los errores técnicos.

  try {
    return await registrarDietaDAO(datosNormalizados);
  } catch (error) {
    logger.error(
      'RF54: no fue posible registrar la dieta:',
      error
    );

    throw new Error(MENSAJE_ERROR_REGISTRAR);
  }
}
