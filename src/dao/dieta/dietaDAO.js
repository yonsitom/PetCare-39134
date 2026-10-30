
import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';

// Consultar la dieta asociada a una receta.
export async function consultarDietaPorRecetaDAO(recetaId) {
  const { data, error } = await supabase
    .from('dietas')
    .select('*')
    .eq('receta_id', recetaId)
    .maybeSingle();

  if (error) {
    logger.error('Error consultando dieta:', error);
    throw new Error(`No se pudo consultar la dieta: ${error.message}`);
  }

  return data;
}

// Registrar una dieta vinculada a una receta.
export async function registrarDietaDAO(datos) {
  const { data, error } = await supabase
    .from('dietas')
    .insert({
      receta_id: datos.receta_id,
      tipo_dieta: datos.tipo_dieta,
      opciones_proteina: datos.opciones_proteina || null,
      opciones_vegetales: datos.opciones_vegetales || null,
      restriccion_nutricional: datos.restriccion_nutricional || null,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error registrando dieta:', error);
    throw new Error(`No se pudo registrar la dieta: ${error.message}`);
  }

  return data;
}

// Consultar recetas de una atención que todavía no tienen dieta.
export async function consultarRecetasDisponiblesParaDietaDAO(atencionId) {
  // 1. Obtener las actividades de la atención.
  const { data: actividades, error: errorActividades } = await supabase
    .from('actividades')
    .select('actividad_id')
    .eq('atencion_id', atencionId)
    .eq('eliminado', false);

  if (errorActividades) {
    logger.error('Error consultando actividades:', errorActividades);
    throw new Error(
      `No se pudieron consultar las actividades: ${errorActividades.message}`
    );
  }

  if (!actividades || actividades.length === 0) {
    return [];
  }

  const actividadIds = actividades.map(
    (actividad) => actividad.actividad_id
  );

  // 2. Identificar cuáles actividades corresponden a consultas.
  const { data: consultas, error: errorConsultas } = await supabase
    .from('actividad_consulta')
    .select('actividad_id, diagnostico')
    .in('actividad_id', actividadIds);

  if (errorConsultas) {
    logger.error('Error consultando actividades de consulta:', errorConsultas);
    throw new Error(
      `No se pudieron consultar las consultas: ${errorConsultas.message}`
    );
  }

  if (!consultas || consultas.length === 0) {
    return [];
  }

  const consultaIds = consultas.map(
    (consulta) => consulta.actividad_id
  );

  // 3. Obtener las recetas vinculadas a esas consultas.
  const { data: recetas, error: errorRecetas } = await supabase
    .from('recetas')
    .select(`
      receta_id,
      actividad_id,
      fecha_registro
    `)
    .in('actividad_id', consultaIds)
    .order('fecha_registro', { ascending: false });

  if (errorRecetas) {
    logger.error('Error consultando recetas:', errorRecetas);
    throw new Error(
      `No se pudieron consultar las recetas: ${errorRecetas.message}`
    );
  }

  if (!recetas || recetas.length === 0) {
    return [];
  }

  // 4. Obtener las recetas que ya tienen una dieta.
  const recetaIds = recetas.map(
    (receta) => receta.receta_id
  );

  const { data: dietas, error: errorDietas } = await supabase
    .from('dietas')
    .select('receta_id')
    .in('receta_id', recetaIds);

  if (errorDietas) {
    logger.error('Error consultando dietas existentes:', errorDietas);
    throw new Error(
      `No se pudieron verificar las dietas existentes: ${errorDietas.message}`
    );
  }

  const recetasConDieta = new Set(
    (dietas || []).map((dieta) => String(dieta.receta_id))
  );

  // 5. Devolver solamente las recetas sin dieta.
  return recetas
    .filter(
      (receta) => !recetasConDieta.has(String(receta.receta_id))
    )
    .map((receta) => {
      const consulta = consultas.find(
        (item) => String(item.actividad_id) === String(receta.actividad_id)
      );

      return {
        ...receta,
        diagnostico: consulta?.diagnostico || null,
      };
    });
}
