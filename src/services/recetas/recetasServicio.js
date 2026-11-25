
/**
 * ============================================================
 * PETCARE - SERVICIO DE RECETAS
 * RF53: Registrar y consultar recetas médicas.
 *
 * Responsabilidad:
 * Validar los datos y coordinar las operaciones del DAO.
 *
 * IMPORTANTE:
 * La receta pertenece directamente a una atención.
 * No depende de actividades ni consultas.
 * ============================================================
 */

import {
  consultarMedicamentosDAO,
  consultarRecetaPorIdDAO,
  consultarRecetasPorAtencionDAO,
  registrarRecetaDAO,
  registrarDetalleRecetaDAO,
} from '../../dao/recetas/recetasDAO';

/**
 * Validar identificadores numéricos positivos.
 */
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

/**
 * RF53:
 * Consultar medicamentos disponibles.
 */
export async function obtenerMedicamentosServicio() {
  try {
    return await consultarMedicamentosDAO();
  } catch (error) {
    console.error('Error consultando medicamentos:', error);
    throw error;
  }
}

/**
 * RF53:
 * Consultar una receta por su identificador.
 */
export async function obtenerRecetaServicio(recetaId) {
  const id = validarIdentificador(
    recetaId,
    'El identificador de la receta no es válido.'
  );

  try {
    return await consultarRecetaPorIdDAO(id);
  } catch (error) {
    console.error('Error consultando receta:', error);
    throw error;
  }
}

/**
 * RF53:
 * Consultar recetas asociadas directamente a una atención.
 */
export async function obtenerRecetasPorAtencionServicio(atencionId) {
  const id = validarIdentificador(
    atencionId,
    'El identificador de la atención no es válido.'
  );

  try {
    return await consultarRecetasPorAtencionDAO(id);
  } catch (error) {
    console.error(
      'Error consultando recetas de atención:',
      error
    );
    throw error;
  }
}

/**
 * RF53:
 * Registrar una receta médica.
 *
 * Datos:
 * - atencion_id
 * - diagnostico
 * - recomendaciones
 * - fecha_registro (opcional)
 *
 * No recibe actividad_id.
 */
export async function registrarRecetaServicio(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error('Debes proporcionar los datos de la receta.');
  }

  const atencionId = validarIdentificador(
    datos.atencion_id,
    'No se encontró una atención válida para registrar la receta.'
  );

  const diagnostico = String(
    datos.diagnostico ?? ''
  ).trim();

  const recomendaciones = String(
    datos.recomendaciones ?? ''
  ).trim();

  const datosNormalizados = {
    atencion_id: atencionId,
    diagnostico: diagnostico || null,
    recomendaciones: recomendaciones || null,
  };

  if (datos.fecha_registro) {
    const fecha = new Date(datos.fecha_registro);

    if (Number.isNaN(fecha.getTime())) {
      throw new Error('La fecha de la receta no es válida.');
    }

    datosNormalizados.fecha_registro = fecha.toISOString();
  }

  try {
    return await registrarRecetaDAO(datosNormalizados);
  } catch (error) {
    console.error('Error registrando receta:', error);
    throw error;
  }
}

/**
 * RF53:
 * Registrar medicamentos asociados a una receta.
 */
export async function registrarMedicamentosRecetaServicio(
  recetaId,
  medicamentos
) {
  const id = validarIdentificador(
    recetaId,
    'El identificador de la receta no es válido.'
  );

  if (!Array.isArray(medicamentos) || medicamentos.length === 0) {
    return [];
  }

  const detalles = medicamentos.map((medicamento, indice) => {
    const medicamentoId = validarIdentificador(
      medicamento.medicamento_id,
      `Selecciona un medicamento válido en la fila ${indice + 1}.`
    );

    const dosis = String(
      medicamento.dosis ?? ''
    ).trim();

    if (!dosis) {
      throw new Error(
        `Debes ingresar la dosis del medicamento ${indice + 1}.`
      );
    }

    return {
      receta_id: id,
      medicamento_id: medicamentoId,
      condicion_ingesta:
        String(medicamento.condicion_ingesta ?? '').trim() || null,
      dosis,
      frecuencia:
        String(medicamento.frecuencia ?? '').trim() || null,
      duracion_tratamiento:
        String(medicamento.duracion_tratamiento ?? '').trim() || null,
    };
  });

  try {
    return await registrarDetalleRecetaDAO(detalles);
  } catch (error) {
    console.error('Error registrando medicamentos:', error);
    throw error;
  }
}
