
/**
 * RF23: genera automáticamente la fecha y hora de inicio.
 */
export function generarFechaInicio() {
  try {
    return new Date().toISOString();
  } catch {
    throw new Error(
      'No se pudo registrar la fecha y hora de inicio. Intente nuevamente.'
    );
  }
}
