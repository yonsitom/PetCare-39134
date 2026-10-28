
/**
 * PetCare — Controlador de Atenciones.
 * MVC: coordina la vista con la capa de acceso a datos.
 */

import {
  consultarAtenciones,
  consultarMascotasParaAtencion,
  registrarAtencion,
} from '../../dao/atencionesDAO';

/**
 * Lista las atenciones registradas.
 */
export async function listarAtenciones() {
  return consultarAtenciones();
}

/**
 * Lista las mascotas disponibles para registrar una atención.
 */
export async function listarMascotasParaRegistro() {
  return consultarMascotasParaAtencion();
}

/**
 * Registra una atención.
 */
export async function crearAtencion(datos) {
  if (!datos || typeof datos !== 'object') {
    throw new Error('Los datos de la atención son obligatorios.');
  }

  return registrarAtencion(datos);
}
