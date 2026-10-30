
/**
 * ============================================================
 * PETCARE — VALIDACIONES DE CONSULTA DE MASCOTAS
 * RF19: Consultar la información de una mascota.
 * ============================================================
 *
 * Responsabilidad:
 * - Obtener mensajes para búsquedas sin coincidencias.
 * - Informar cuando no existen atenciones.
 * - Detectar información incompleta.
 * - Evitar exponer errores técnicos al usuario.
 *
 * SOLID:
 * - SRP: centraliza las reglas de presentación de RF19.
 * - La pantalla utiliza estas funciones sin duplicar reglas.
 * ============================================================
 */

const MENSAJES = {
  sinResultados:
    'No se encontraron mascotas con los datos ingresados.',

  sinAtenciones:
    'Esta mascota aún no cuenta con atenciones registradas.',

  datosIncompletos:
    'Algunos datos de la mascota no se encuentran registrados.',

  errorConsulta:
    'No se pudo consultar la información de la mascota. Intente nuevamente.',
};

/**
 * CP02: mensaje cuando una búsqueda no devuelve mascotas.
 */
export function obtenerMensajeSinResultados(mascotas) {
  return Array.isArray(mascotas) && mascotas.length === 0
    ? MENSAJES.sinResultados
    : '';
}

/**
 * CP03: mensaje cuando una mascota no tiene atenciones.
 */
export function obtenerMensajeSinAtenciones(atenciones) {
  return Array.isArray(atenciones) && atenciones.length === 0
    ? MENSAJES.sinAtenciones
    : '';
}

/**
 * CP04: determina si faltan datos básicos de la mascota.
 *
 * No se considera peso porque no es una columna de mascotas
 * en el esquema actual de Supabase.
 */
export function tieneDatosIncompletos(mascota) {
  if (!mascota || typeof mascota !== 'object') {
    return true;
  }

  const camposOpcionales = [
    mascota.raza,
    mascota.sexo,
    mascota.fecha_nacimiento,
    mascota.color,
  ];

  return camposOpcionales.some(
    (valor) =>
      valor === null ||
      valor === undefined ||
      String(valor).trim() === ''
  );
}

/**
 * CP04: mensaje que debe mostrar la interfaz.
 */
export function obtenerMensajeDatosIncompletos(mascota) {
  return tieneDatosIncompletos(mascota)
    ? MENSAJES.datosIncompletos
    : '';
}

/**
 * CP05: devuelve un mensaje seguro para el usuario.
 *
 * El detalle técnico se conserva en los registros del sistema,
 * pero no se muestra en la interfaz.
 */
export function obtenerMensajeErrorConsulta(error) {
  return MENSAJES.errorConsulta;
}
