
import { supabase } from '../../services/supabase';

// DAO — RF52.
// Acceso a datos del catálogo de medicamentos.
// La interfaz no consulta Supabase directamente: lo hace este DAO.

const TABLA = 'medicamentos';

export async function consultarMedicamentosDAO({ incluirInactivos = false } = {}) {
  let consulta = supabase
    .from(TABLA)
    .select('medicamento_id, nombre_medicamento, concentracion, categoria, fecha_registro, activo')
    .order('nombre_medicamento', { ascending: true });

  if (!incluirInactivos) {
    consulta = consulta.eq('activo', true);
  }

  const { data, error } = await consulta;

  if (error) {
    throw new Error(`No se pudo consultar el catálogo de medicamentos: ${error.message}`);
  }

  return data ?? [];
}

export async function consultarMedicamentoPorIdDAO(medicamentoId) {
  const { data, error } = await supabase
    .from(TABLA)
    .select('medicamento_id, nombre_medicamento, concentracion, categoria, fecha_registro, activo')
    .eq('medicamento_id', medicamentoId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar el medicamento: ${error.message}`);
  }

  return data;
}

export async function crearMedicamentoDAO(medicamento) {
  const { data, error } = await supabase
    .from(TABLA)
    .insert({
      nombre_medicamento: medicamento.nombre_medicamento,
      concentracion: medicamento.concentracion || null,
      categoria: medicamento.categoria || 'Medicamento',
      activo: true,
    })
    .select('medicamento_id, nombre_medicamento, concentracion, categoria, fecha_registro, activo')
    .single();

  if (error) {
    throw new Error(`No se pudo registrar el medicamento: ${error.message}`);
  }

  return data;
}

export async function actualizarMedicamentoDAO(medicamentoId, cambios) {
  const { data, error } = await supabase
    .from(TABLA)
    .update({
      nombre_medicamento: cambios.nombre_medicamento,
      concentracion: cambios.concentracion || null,
      categoria: cambios.categoria || 'Medicamento',
    })
    .eq('medicamento_id', medicamentoId)
    .select('medicamento_id, nombre_medicamento, concentracion, categoria, fecha_registro, activo')
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo actualizar el medicamento: ${error.message}`);
  }

  if (!data) {
    throw new Error('No se encontró el medicamento o no tienes permiso para modificarlo.');
  }

  return data;
}

export async function cambiarEstadoMedicamentoDAO(medicamentoId, activo) {
  const { data, error } = await supabase
    .from(TABLA)
    .update({ activo })
    .eq('medicamento_id', medicamentoId)
    .select('medicamento_id, nombre_medicamento, concentracion, categoria, fecha_registro, activo')
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo cambiar el estado del medicamento: ${error.message}`);
  }

  if (!data) {
    throw new Error('No se encontró el medicamento o no tienes permiso para cambiar su estado.');
  }

  return data;
}
