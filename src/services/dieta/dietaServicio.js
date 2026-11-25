
/**
 * ============================================================
 * PETCARE - SERVICIO DE DIETAS
 * RF54: Registrar la dieta indicada a una mascota.
 *
 * Responsabilidad:
 * Validar y normalizar la información antes de enviarla al DAO.
 * ============================================================
 */

import {
  consultarDietaPorRecetaDAO,
  consultarRecetasDisponiblesParaDietaDAO,
  consultarTiposDietaDAO,
  registrarDietaDAO,
} from '../../dao/dietaCita/dietaDAO';

const MENSAJE_DIETA_NO_SELECCIONADA =
  'Seleccione un tipo de dieta.';

const MENSAJE_DIETA_SIN_DATOS =
  'Completa al menos uno de los campos de la dieta seleccionada.';

const MENSAJE_ERROR_CARGAR =
  'No fue posible cargar las dietas. Intente nuevamente.';

const MENSAJE_ERROR_REGISTRAR =
  'No fue posible registrar la dieta. Intente nuevamente.';

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

function normalizarDetalle(detalle) {
  return Object.fromEntries(
    Object.entries(detalle).map(([campo, valor]) => [
      campo,
      valor === null || valor === undefined
        ? ''
        : String(valor).trim(),
    ])
  );
}

function validarDetalleDieta(detalle) {
  if (
    !detalle ||
    typeof detalle !== 'object' ||
    Array.isArray(detalle)
  ) {
    throw new Error(MENSAJE_DIETA_SIN_DATOS);
  }

  const tieneDatos = Object.values(detalle).some((valor) => {
    if (valor === null || valor === undefined) {
      return false;
    }

    return String(valor).trim().length > 0;
  });

  if (!tieneDatos) {
    throw new Error(MENSAJE_DIETA_SIN_DATOS);
  }
}

export async function obtenerDietaServicio(recetaId) {
  const id = validarIdentificador(
    recetaId,
    'El identificador de la receta no es válido.'
  );

  try {
    return await consultarDietaPorRecetaDAO(id);
  } catch (error) {
    console.error('Error consultando dieta:', error);
    throw new Error(MENSAJE_ERROR_CARGAR);
  }
}

export async function obtenerTiposDietaServicio() {
  try {
    const tipos = await consultarTiposDietaDAO();
    return Array.isArray(tipos) ? tipos : [];
  } catch (error) {
    console.error('Error cargando tipos de dieta:', error);
    throw new Error(MENSAJE_ERROR_CARGAR);
  }
}

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
    console.error('Error cargando recetas disponibles:', error);
    throw new Error(MENSAJE_ERROR_CARGAR);
  }
}

export async function registrarDietaServicio(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error('Debes proporcionar los datos de la dieta.');
  }

  const recetaId = validarIdentificador(
    datos.receta_id,
    'Debes seleccionar una receta válida.'
  );

  const tipoDieta = String(datos.tipo_dieta ?? '').trim();

  if (!tipoDieta) {
    throw new Error(MENSAJE_DIETA_NO_SELECCIONADA);
  }

  const detalle = datos.detalle_dieta || {};

  validarDetalleDieta(detalle);

  const datosNormalizados = {
    receta_id: recetaId,
    tipo_dieta: tipoDieta,
    detalle_dieta: normalizarDetalle(detalle),
  };

  try {
    return await registrarDietaDAO(datosNormalizados);
  } catch (error) {
    console.error('RF54: error registrando dieta:', error);
    throw new Error(
      error?.message?.includes('ya tiene una dieta')
        ? error.message
        : MENSAJE_ERROR_REGISTRAR
    );
  }
}
