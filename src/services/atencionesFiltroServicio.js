/**
 * Servicio de filtrado de atenciones.
 * Requerimiento: RF21.
 *
 * SOLID:
 * SRP: este archivo se encarga exclusivamente de filtrar atenciones
 * y determinar el filtro inicial.
 *
 * TDD:
 * Las funciones son puras y pueden probarse sin conectarse a Supabase.
 */

/**
 * Normaliza un valor para comparar textos sin distinguir mayúsculas,
 * minúsculas ni tildes.
 *
 * @param {*} valor
 * @returns {string}
 */
function normalizar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Determina el filtro inicial de la pantalla.
 *
 * @param {string|undefined} estadoParametro
 * @returns {'Todas'|'Activa'|'Finalizada'}
 */
export function obtenerFiltroEstadoInicial(estadoParametro) {
  const estado = normalizar(estadoParametro);

  if (estado === 'activa' || estado === 'activas') {
    return 'Activa';
  }

  if (estado === 'finalizada' || estado === 'finalizadas') {
    return 'Finalizada';
  }

  return 'Todas';
}

/**
 * Filtra las atenciones por su estado.
 *
 * @param {Array} atenciones
 * @param {string} filtroEstado
 * @returns {Array}
 */
export function filtrarAtencionesPorEstado(atenciones, filtroEstado) {
  // Si los datos no son una lista, se devuelve una lista vacía.
  if (!Array.isArray(atenciones)) {
    return [];
  }

  // Si el filtro es Todas o no se seleccionó uno, no se excluye nada.
  if (!filtroEstado || normalizar(filtroEstado) === 'todas') {
    return atenciones;
  }

  // Devuelve únicamente las atenciones que coinciden con el estado.
  return atenciones.filter(
    (atencion) =>
      normalizar(atencion?.estado) === normalizar(filtroEstado)
  );
}
