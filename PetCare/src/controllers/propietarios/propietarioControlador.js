/**
 * CONTROLADOR DE PROPIETARIOS
 *
 * Arquitectura: MVC + DAO + Servicios.
 *
 * Responsabilidades:
 * - Coordinar las operaciones del módulo.
 * - Validar los parámetros recibidos.
 * - Delegar el acceso a datos al DAO.
 * - Delegar las reglas de estado al servicio.
 * - Entregar respuestas uniformes a las vistas.
 *
 * No realiza consultas directas a Supabase.
 */

import * as propietarioDAO from '../../dao/propietario/propietarioDAO';

import {
  crearPropietarioEstadoServicio,
} from '../../services/propietario/propietarioEstadoServicio';

// ============================================================
// CREAR SERVICIO DE ESTADO
// ============================================================

const propietarioEstadoServicio =
  crearPropietarioEstadoServicio({
    buscarPorCriterio: propietarioDAO.buscarPorCriterio,
    actualizarEstado: propietarioDAO.actualizarEstado,
  });

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function respuestaExitosa(datos, mensaje) {
  return {
    exito: true,
    datos,
    mensaje,
    error: null,
  };
}

function respuestaFallida(mensaje, error = null) {
  return {
    exito: false,
    datos: null,
    mensaje,
    error,
  };
}

function obtenerMensajeError(error, mensajePredeterminado) {
  return error?.message || mensajePredeterminado;
}

// ============================================================
// RF12 - LISTAR PROPIETARIOS
// ============================================================

export async function listarPropietarios() {
  try {
    const propietarios =
      await propietarioDAO.consultarPropietarios();

    return respuestaExitosa(
      propietarios,
      propietarios.length > 0
        ? 'Propietarios consultados correctamente.'
        : 'No hay propietarios registrados.'
    );
  } catch (error) {
    return respuestaFallida(
      'No se pudo consultar la lista de propietarios.',
      error
    );
  }
}

// ============================================================
// CONSULTAR PROPIETARIO POR ID
// ============================================================

export async function obtenerPropietario(propietarioId) {
  if (!propietarioId) {
    return respuestaFallida(
      'El identificador del propietario es obligatorio.'
    );
  }

  try {
    const propietario =
      await propietarioDAO.consultarPropietarioPorId(
        propietarioId
      );

    return respuestaExitosa(
      propietario,
      'Información del propietario consultada correctamente.'
    );
  } catch (error) {
    return respuestaFallida(
      obtenerMensajeError(
        error,
        'No se pudo consultar la información del propietario.'
      ),
      error
    );
  }
}

// ============================================================
// CONSULTAR MASCOTAS POR PROPIETARIO
// ============================================================

export async function obtenerMascotasPorPropietario(propietarioId) {
  if (!propietarioId) {
    return respuestaFallida(
      'El identificador del propietario es obligatorio.'
    );
  }

  try {
    const mascotas =
      await propietarioDAO.consultarMascotasPorPropietario(
        propietarioId
      );

    return respuestaExitosa(
      mascotas,
      mascotas.length > 0
        ? 'Mascotas consultadas correctamente.'
        : 'El propietario todavía no tiene mascotas registradas.'
    );
  } catch (error) {
    return respuestaFallida(
      'No se pudieron consultar las mascotas del propietario.',
      error
    );
  }
}

// ============================================================
// RF12 - VALIDAR DISPONIBILIDAD DE DATOS
// ============================================================

export async function validarDisponibilidad(datos) {
  try {
    await propietarioDAO.validarDisponibilidadPropietario(datos);

    return respuestaExitosa(
      true,
      'El DNI y el correo electrónico están disponibles.'
    );
  } catch (error) {
    return respuestaFallida(
      obtenerMensajeError(
        error,
        'No se pudo comprobar la disponibilidad de los datos.'
      ),
      error
    );
  }
}

// ============================================================
// REGISTRAR PROPIETARIO
// ============================================================

export async function registrarPropietario(datos) {
  if (!datos || typeof datos !== 'object') {
    return respuestaFallida(
      'Debe proporcionar los datos del propietario.'
    );
  }

  try {
    const propietario =
      await propietarioDAO.registrarPropietario(datos);

    return respuestaExitosa(
      propietario,
      'Propietario registrado correctamente.'
    );
  } catch (error) {
    return respuestaFallida(
      obtenerMensajeError(
        error,
        'No se pudo registrar al propietario.'
      ),
      error
    );
  }
}

// ============================================================
// ACTUALIZAR PROPIETARIO
// ============================================================

export async function actualizarPropietario(propietarioId, datos) {
  if (!propietarioId) {
    return respuestaFallida(
      'El identificador del propietario es obligatorio.'
    );
  }

  if (!datos || typeof datos !== 'object') {
    return respuestaFallida(
      'Debe proporcionar los datos que desea actualizar.'
    );
  }

  try {
    const propietario =
      await propietarioDAO.actualizarPropietario(
        propietarioId,
        datos
      );

    return respuestaExitosa(
      propietario,
      'Propietario actualizado correctamente.'
    );
  } catch (error) {
    return respuestaFallida(
      obtenerMensajeError(
        error,
        'No se pudo actualizar al propietario.'
      ),
      error
    );
  }
}

// ============================================================
// RF48 - BUSCAR PROPIETARIO
// ============================================================


// ============================================================
// RF48 - BUSCAR PROPIETARIO
// ============================================================

export async function buscarPropietario(criterio) {
  try {
    const resultado =
      await propietarioEstadoServicio.buscarPropietario(criterio);

    return {
      exito: resultado.exito,
      datos: resultado.propietario,
      mensaje: resultado.mensaje,
      error: resultado.error ?? null,
    };
  } catch (error) {
    return respuestaFallida(
      'No se pudo realizar la búsqueda del propietario.',
      error
    );
  }
}

// ============================================================
// RF48 - GESTIONAR ESTADO DEL PROPIETARIO
// ============================================================

export async function gestionarEstado(
  propietarioId,
  nuevoEstado,
  motivoDesactivacion = ''
) {
  try {
    const resultado =
      await propietarioEstadoServicio.gestionarEstado(
        propietarioId,
        nuevoEstado,
        motivoDesactivacion
      );

    return {
      exito: resultado.exito,
      datos: resultado.propietario,
      mensaje: resultado.mensaje,
      error: resultado.error ?? null,
    };
  } catch (error) {
    return respuestaFallida(
      'No se pudo gestionar el estado del propietario.',
      error
    );
  }
}


// ============================================================
// CONTROLADOR AGRUPADO
// Permite importar una sola instancia desde las pantallas.
// ============================================================

const propietarioControlador = {
  listarPropietarios,
  obtenerPropietario,
  obtenerMascotasPorPropietario,
  validarDisponibilidad,
  registrarPropietario,
  actualizarPropietario,
  buscarPropietario,
  gestionarEstado,
};

export default propietarioControlador;