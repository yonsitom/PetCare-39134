
import {
  consultarMedicamentosDAO,
  consultarRecetaPorIdDAO,
  consultarRecetasPorAtencionDAO,
  registrarConsultaYRecetaDAO,
  registrarDetalleRecetaDAO,
} from '../../dao/recetas/recetasDAO';

export async function obtenerMedicamentosServicio() {
  return consultarMedicamentosDAO();
}

export async function obtenerRecetaServicio(recetaId) {
  if (!recetaId || !/^\d+$/.test(String(recetaId))) {
    throw new Error('El identificador de la receta no es válido.');
  }

  const receta = await consultarRecetaPorIdDAO(recetaId);

  if (!receta) {
    throw new Error('La receta solicitada no existe.');
  }

  return receta;
}

export async function obtenerRecetasPorAtencionServicio(atencionId) {
  if (!atencionId || !/^\d+$/.test(String(atencionId))) {
    throw new Error('El identificador de la atención no es válido.');
  }

  return consultarRecetasPorAtencionDAO(atencionId);
}

export async function registrarConsultaYRecetaServicio(datos) {
  if (!datos || typeof datos !== 'object') {
    throw new Error('Debes completar los datos de la consulta.');
  }

  if (!datos.atencion_id || !/^\d+$/.test(String(datos.atencion_id))) {
    throw new Error('La atención no es válida.');
  }

  if (!datos.tipo_id || !/^\d+$/.test(String(datos.tipo_id))) {
    throw new Error('No se encontró el tipo de actividad Consulta.');
  }

  if (!datos.fecha_prevista) {
    throw new Error('Debes indicar la fecha de la consulta.');
  }

  const peso = datos.peso === '' ? null : Number(datos.peso);
  const temperatura =
    datos.temperatura === '' ? null : Number(datos.temperatura);

  if (peso !== null && (!Number.isFinite(peso) || peso <= 0)) {
    throw new Error('El peso debe ser un número mayor que cero.');
  }

  if (
    temperatura !== null &&
    (!Number.isFinite(temperatura) || temperatura <= 0)
  ) {
    throw new Error('La temperatura debe ser un número mayor que cero.');
  }

  return registrarConsultaYRecetaDAO({
    ...datos,
    peso,
    temperatura,
  });
}

export async function registrarMedicamentosRecetaServicio(
  recetaId,
  medicamentos
) {
  if (!recetaId || !/^\d+$/.test(String(recetaId))) {
    throw new Error('La receta no es válida.');
  }

  if (!Array.isArray(medicamentos) || medicamentos.length === 0) {
    throw new Error('Agrega al menos un medicamento.');
  }

  const detalles = medicamentos.map((item) => {
    const medicamentoId = Number(item.medicamento_id);

    if (!Number.isSafeInteger(medicamentoId) || medicamentoId <= 0) {
      throw new Error('Selecciona un medicamento válido.');
    }

    if (!String(item.dosis ?? '').trim()) {
      throw new Error('Completa la dosis de cada medicamento.');
    }

    return {
      receta_id: Number(recetaId),
      medicamento_id: medicamentoId,
      condicion_ingesta: String(item.condicion_ingesta ?? '').trim() || null,
      dosis: String(item.dosis).trim(),
      frecuencia: String(item.frecuencia ?? '').trim() || null,
      duracion_tratamiento:
        String(item.duracion_tratamiento ?? '').trim() || null,
    };
  });

  return registrarDetalleRecetaDAO(detalles);
}
