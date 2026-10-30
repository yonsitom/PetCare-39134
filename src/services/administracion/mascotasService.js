
/**
 * RF46 / CUS46: Gestionar estado de mascotas.
 *
 * MVC:
 * - Vista: src/app/mascotaAdmin/gestionMascotas.jsx
 * - Servicio/control del caso de uso: este archivo
 * - Persistencia/DAO: src/dao/mascotaDAO.js
 *
 * SOLID:
 * - Responsabilidad única: coordinar las reglas de gestión de estado.
 * - La persistencia se delega al DAO.
 */

import {
  buscarMascotasAdministracionDAO,
  consultarMascotasAdministracionDAO,
  cambiarEstadoMascotaDAO,
} from '../../dao/mascotaDAO';

const ESTADOS_VALIDOS = ['Activo', 'Inactivo'];

export async function buscarMascotasAdministracion(termino) {
  const texto = String(termino ?? '').trim();

  if (!texto) {
    throw new Error(
      'Ingresa un dato para realizar la búsqueda de la mascota.'
    );
  }

  return buscarMascotasAdministracionDAO(texto);
}

export async function consultarMascotasAdministracion() {
  return consultarMascotasAdministracionDAO();
}

export async function gestionarEstadoMascota({
  numeroHistoria,
  nuevoEstado,
  motivo = '',
  confirmado = false,
}) {
  if (!confirmado) {
    return {
      ok: false,
      cancelado: true,
      mensaje: 'La operación fue cancelada.',
    };
  }

  const historia = String(numeroHistoria ?? '').trim();

  if (!historia) {
    return {
      ok: false,
      mensaje: 'Debe indicar el número de historia de la mascota.',
    };
  }

  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    return {
      ok: false,
      mensaje: 'El estado indicado no es válido.',
    };
  }

  const motivoLimpio = String(motivo ?? '').trim();

  if (nuevoEstado === 'Inactivo' && !motivoLimpio) {
    return {
      ok: false,
      mensaje: 'Es obligatorio indicar el motivo de desactivación.',
    };
  }

  try {
    const mascota = await cambiarEstadoMascotaDAO({
      numeroHistoria: historia,
      nuevoEstado,
      motivo: motivoLimpio,
    });

    if (!mascota) {
      return {
        ok: false,
        mensaje: 'No se encontró la mascota o no se pudo actualizar.',
      };
    }

    return {
      ok: true,
      mascota,
      mensaje:
        nuevoEstado === 'Activo'
          ? 'La mascota fue activada correctamente.'
          : 'La mascota fue desactivada correctamente.',
    };
  } catch (error) {
    return {
      ok: false,
      mensaje:
        'No se pudo actualizar el estado de la mascota. El estado anterior se mantiene.',
      error,
    };
  }
}
