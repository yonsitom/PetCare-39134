
/**
 * ============================================================
 * PETCARE - RF52: GESTIONAR CATÁLOGO DE MEDICAMENTOS
 * ============================================================
 *
 * Archivo: medicamentosService.js
 * Arquitectura: Servicio + DAO
 *
 * Responsabilidades:
 * - Validar los datos del medicamento.
 * - Evitar medicamentos duplicados.
 * - Consultar y filtrar el catálogo.
 * - Registrar y editar medicamentos.
 * - Controlar los errores de guardado.
 *
 * Actor: Administrador.
 * ============================================================
 */

import {
  consultarMedicamentosDAO,
  consultarMedicamentoPorIdDAO,
  crearMedicamentoDAO,
  actualizarMedicamentoDAO,
  cambiarEstadoMedicamentoDAO,
} from '../../dao/administracion/medicamentosDAO';

// ============================================================
// MENSAJES DEL RF52
// ============================================================

const MENSAJE_CAMPOS_OBLIGATORIOS =
  'Complete los campos obligatorios.';

const MENSAJE_DUPLICADO =
  'Ya existe un medicamento con ese nombre y concentración.';

const MENSAJE_ERROR_GUARDAR =
  'No fue posible guardar el medicamento. Intente nuevamente.';

// ============================================================
// VALIDAR DATOS DEL MEDICAMENTO
// ============================================================

function validarMedicamento(datos) {
  const nombre = String(
    datos?.nombre_medicamento ?? ''
  ).trim();

  const concentracion = String(
    datos?.concentracion ?? ''
  ).trim();

  const categoria = String(
    datos?.categoria ?? 'Medicamento'
  ).trim();

  if (!nombre) {
    throw new Error(MENSAJE_CAMPOS_OBLIGATORIOS);
  }

  if (nombre.length > 120) {
    throw new Error(
      'El nombre no puede superar los 120 caracteres.'
    );
  }

  if (concentracion.length > 80) {
    throw new Error(
      'La concentración no puede superar los 80 caracteres.'
    );
  }

  if (!categoria) {
    throw new Error('Seleccione una categoría.');
  }

  return {
    nombre_medicamento: nombre,
    concentracion,
    categoria,
  };
}

// ============================================================
// VALIDAR IDENTIFICADOR
// ============================================================

function validarId(id) {
  const numero = Number(id);

  if (!Number.isSafeInteger(numero) || numero <= 0) {
    throw new Error(
      'El identificador del medicamento no es válido.'
    );
  }

  return numero;
}

// ============================================================
// NORMALIZAR TEXTOS PARA COMPARACIONES
// ============================================================

function normalizarTexto(valor) {
  return String(valor ?? '')
    .trim()
    .toLowerCase();
}

// ============================================================
// VALIDAR QUE NO EXISTA UN MEDICAMENTO DUPLICADO
// ============================================================

async function validarMedicamentoNoDuplicado(
  medicamento,
  excluirId = null
) {
  // Se consultan también los medicamentos inactivos
  // para evitar registrar nuevamente un medicamento
  // que ya existe en el catálogo.

  const medicamentosExistentes =
    await consultarMedicamentosDAO({
      incluirInactivos: true,
    });

  const nombreBuscado = normalizarTexto(
    medicamento.nombre_medicamento
  );

  const concentracionBuscada = normalizarTexto(
    medicamento.concentracion
  );

  const duplicado = (medicamentosExistentes ?? []).some(
    (existente) => {
      const mismoId =
        excluirId !== null &&
        Number(existente.medicamento_id) === Number(excluirId);

      if (mismoId) {
        return false;
      }

      const mismoNombre =
        normalizarTexto(existente.nombre_medicamento) ===
        nombreBuscado;

      const mismaConcentracion =
        normalizarTexto(existente.concentracion) ===
        concentracionBuscada;

      return mismoNombre && mismaConcentracion;
    }
  );

  if (duplicado) {
    throw new Error(MENSAJE_DUPLICADO);
  }
}

// ============================================================
// RF52 - CONSULTAR CATÁLOGO DE MEDICAMENTOS
// CP04 - BÚSQUEDA SIN RESULTADOS
// ============================================================

export async function consultarMedicamentos({
  incluirInactivos = false,
  busqueda = '',
} = {}) {
  const medicamentos = await consultarMedicamentosDAO({
    incluirInactivos,
  });

  const termino = normalizarTexto(busqueda);

  // Sin término de búsqueda, devuelve todo el catálogo
  // según el filtro de activos solicitado.

  if (!termino) {
    return medicamentos ?? [];
  }

  // Busca por nombre, concentración o categoría.

  return (medicamentos ?? []).filter((medicamento) => {
    const nombre = normalizarTexto(
      medicamento.nombre_medicamento
    );

    const concentracion = normalizarTexto(
      medicamento.concentracion
    );

    const categoria = normalizarTexto(
      medicamento.categoria
    );

    return (
      nombre.includes(termino) ||
      concentracion.includes(termino) ||
      categoria.includes(termino)
    );
  });
}

// ============================================================
// RF52 - CONSULTAR MEDICAMENTO POR ID
// ============================================================

export async function consultarMedicamentoPorId(id) {
  return consultarMedicamentoPorIdDAO(validarId(id));
}

// ============================================================
// RF52 - REGISTRAR MEDICAMENTO
// CP01 - REGISTRO EXITOSO
// CP02 - CAMPOS INCOMPLETOS
// CP03 - MEDICAMENTO DUPLICADO
// CP05 - ERROR AL GUARDAR
// ============================================================

export async function registrarMedicamento(datos) {
  // Primero se validan los campos obligatorios.

  const medicamento = validarMedicamento(datos);

  // Después se comprueba que no exista un duplicado.

  await validarMedicamentoNoDuplicado(medicamento);

  // Finalmente se guarda en la base de datos.

  try {
    return await crearMedicamentoDAO(medicamento);
  } catch (error) {
    throw new Error(MENSAJE_ERROR_GUARDAR);
  }
}

// ============================================================
// RF52 - EDITAR MEDICAMENTO
// ============================================================

export async function editarMedicamento(id, datos) {
  const medicamentoId = validarId(id);

  const medicamento = validarMedicamento(datos);

  await validarMedicamentoNoDuplicado(
    medicamento,
    medicamentoId
  );

  try {
    return await actualizarMedicamentoDAO(
      medicamentoId,
      medicamento
    );
  } catch (error) {
    throw new Error(MENSAJE_ERROR_GUARDAR);
  }
}

// ============================================================
// RF52 - DESACTIVAR MEDICAMENTO
// ============================================================

export async function desactivarMedicamento(id, confirmado) {
  if (confirmado !== true) {
    return {
      cancelado: true,
      medicamento: null,
    };
  }

  const medicamentoId = validarId(id);

  const medicamento = await cambiarEstadoMedicamentoDAO(
    medicamentoId,
    false
  );

  return {
    cancelado: false,
    medicamento,
  };
}

// ============================================================
// RF52 - REACTIVAR MEDICAMENTO
// ============================================================

export async function reactivarMedicamento(id, confirmado) {
  if (confirmado !== true) {
    return {
      cancelado: true,
      medicamento: null,
    };
  }

  const medicamentoId = validarId(id);

  const medicamento = await cambiarEstadoMedicamentoDAO(
    medicamentoId,
    true
  );

  return {
    cancelado: false,
    medicamento,
  };
}
