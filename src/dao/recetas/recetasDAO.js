
import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';

const TABLA_ACTIVIDADES = 'actividades';
const TABLA_CONSULTA = 'actividad_consulta';
const TABLA_RECETAS = 'recetas';
const TABLA_DETALLES = 'detalle_receta';
const TABLA_MEDICAMENTOS = 'medicamentos';

export async function consultarMedicamentosDAO() {
  const { data, error } = await supabase
    .from(TABLA_MEDICAMENTOS)
    .select('medicamento_id, nombre_medicamento, concentracion, categoria')
    .eq('activo', true)
    .order('nombre_medicamento', { ascending: true });

  if (error) {
    logger.error('Error consultando medicamentos:', error);
    throw new Error('No se pudieron consultar los medicamentos.');
  }

  return data ?? [];
}

export async function consultarRecetaPorIdDAO(recetaId) {
  const { data, error } = await supabase
    .from(TABLA_RECETAS)
    .select(`
      receta_id,
      actividad_id,
      diagnostico,
      recomendaciones,
      proxima_cita,
      fecha_registro,
      detalle_receta (
        detalle_receta_id,
        medicamento_id,
        condicion_ingesta,
        dosis,
        frecuencia,
        duracion_tratamiento,
        medicamentos (
          nombre_medicamento,
          concentracion
        )
      ),
      dietas (
        dieta_id,
        tipo_dieta,
        opciones_proteina,
        opciones_vegetales,
        restriccion_nutricional
      )
    `)
    .eq('receta_id', recetaId)
    .maybeSingle();

  if (error) {
    logger.error('Error consultando receta:', error);
    throw new Error('No se pudo consultar la receta médica.');
  }

  return data;
}

export async function consultarRecetasPorAtencionDAO(atencionId) {
  const { data, error } = await supabase
    .from(TABLA_RECETAS)
    .select(`
      receta_id,
      actividad_id,
      diagnostico,
      recomendaciones,
      proxima_cita,
      fecha_registro,
      actividad_consulta (
        actividad_id,
        diagnostico,
        motivo_consulta
      ),
      actividades!inner (
        atencion_id,
        estado,
        eliminado
      )
    `)
    .eq('actividades.atencion_id', atencionId)
    .eq('actividades.eliminado', false)
    .order('fecha_registro', { ascending: false });

  if (error) {
    logger.error('Error consultando recetas de atención:', error);
    throw new Error('No se pudieron consultar las recetas de la atención.');
  }

  return data ?? [];
}

export async function registrarConsultaYRecetaDAO(datos) {
  const {
    atencion_id,
    tipo_id,
    fecha_prevista,
    observaciones,
    sintomas,
    diagnostico,
    motivo_consulta,
    peso,
    temperatura,
    recomendaciones,
    proxima_cita,
  } = datos;

  const { data: actividad, error: errorActividad } = await supabase
    .from(TABLA_ACTIVIDADES)
    .insert({
      atencion_id,
      tipo_id,
      tipo: 'Consulta',
      fecha_prevista,
      observaciones: observaciones || null,
      estado: 'Pendiente',
      eliminado: false,
      detalle: {},
    })
    .select('actividad_id')
    .single();

  if (errorActividad) {
    logger.error('Error creando actividad de consulta:', errorActividad);
    throw new Error('No se pudo crear la actividad de consulta.');
  }

  const actividadId = actividad.actividad_id;

  const { error: errorConsulta } = await supabase
    .from(TABLA_CONSULTA)
    .insert({
      actividad_id: actividadId,
      sintomas: sintomas || null,
      diagnostico: diagnostico || null,
      motivo_consulta: motivo_consulta || null,
      peso: peso === '' || peso == null ? null : Number(peso),
      temperatura:
        temperatura === '' || temperatura == null
          ? null
          : Number(temperatura),
      recomendaciones: recomendaciones || null,
    });

  if (errorConsulta) {
    logger.error('Error guardando datos clínicos:', errorConsulta);
    throw new Error(
      'Se creó la actividad, pero no se pudieron guardar sus datos clínicos. Verifica los permisos de actividad_consulta.'
    );
  }

  const { data: receta, error: errorReceta } = await supabase
    .from(TABLA_RECETAS)
    .insert({
      actividad_id: actividadId,
      diagnostico: diagnostico || null,
      recomendaciones: recomendaciones || null,
      proxima_cita: proxima_cita || null,
    })
    .select('receta_id, actividad_id')
    .single();

  if (errorReceta) {
    logger.error('Error creando receta:', errorReceta);
    throw new Error(
      'Se guardó la consulta, pero no se pudo crear la receta. Verifica los permisos de la tabla recetas.'
    );
  }

  return {
    actividad_id: actividadId,
    receta_id: receta.receta_id,
  };
}

export async function registrarDetalleRecetaDAO(detalles) {
  const { data, error } = await supabase
    .from(TABLA_DETALLES)
    .insert(detalles)
    .select();

  if (error) {
    logger.error('Error registrando medicamentos de receta:', error);
    throw new Error('No se pudieron registrar los medicamentos.');
  }

  return data ?? [];
}

export async function consultarDetalleRecetaDAO(recetaId) {
  const { data, error } = await supabase
    .from(TABLA_DETALLES)
    .select(`
      detalle_receta_id,
      receta_id,
      medicamento_id,
      condicion_ingesta,
      dosis,
      frecuencia,
      duracion_tratamiento,
      medicamentos (
        nombre_medicamento,
        concentracion
      )
    `)
    .eq('receta_id', recetaId);

  if (error) {
    logger.error('Error consultando detalle de receta:', error);
    throw new Error('No se pudieron consultar los medicamentos de la receta.');
  }

  return data ?? [];
}
