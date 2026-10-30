
/**
 * PETCARE
 * Servicio de Administración
 *
 * RF48: Consultar resumen general.
 *
 * Responsabilidad:
 * Procesar los datos recibidos del DAO y construir
 * el resumen general de usuarios, mascotas,
 * propietarios, atenciones y actividades.
 */

import {
  consultarConteosAdministracionDAO,
} from '../../dao/administracion/indicadoresAdministracionDAO';
import { logger } from '../../utils/logger';

// ------------------------------------------------------
// CONFIGURACIÓN DE RF48
// ------------------------------------------------------

const ESTADOS = {
  usuarios: ['Activo', 'Inactivo'],
  mascotas: ['Activo', 'Inactivo'],
  propietarios: ['Activo', 'Inactivo'],
  atenciones: ['Activa', 'Finalizada'],
  actividades: [
    'Pendiente',
    'Completada',
    'No realizada',
  ],
};

const TIPOS_ACTIVIDAD = {
  Consulta: 'Consulta',
  Medicacion: 'Medicación',
  Vacunacion: 'Vacunación',
  Ecografia: 'Ecografía',
  Esterilizacion: 'Esterilización',
  'Otro actividad': 'Otro',
};

// ------------------------------------------------------
// FUNCIONES AUXILIARES
// ------------------------------------------------------

/**
 * Crea un objeto de estados con cantidades iniciales en cero.
 */
function crearEstadosVacios(estados) {
  return estados.reduce((resultado, estado) => {
    resultado[estado] = 0;
    return resultado;
  }, {});
}

/**
 * Cuenta los registros de una categoría por estado.
 */
function contarPorEstado(registros, estados, columnaEstado) {
  const porEstado = crearEstadosVacios(estados);

  registros.forEach((registro) => {
    const estado = registro[columnaEstado];

    if (
      Object.prototype.hasOwnProperty.call(
        porEstado,
        estado
      )
    ) {
      porEstado[estado] += 1;
    }
  });

  return {
    total: registros.length,
    porEstado,
  };
}

/**
 * Procesa una categoría independiente.
 *
 * Si la consulta falla, no inventa cantidades.
 * Las demás categorías pueden continuar mostrándose.
 */
function procesarCategoria(
  resultadoDAO,
  estados,
  columnaEstado,
  nombreCategoria,
  advertencias
) {
  if (
    !resultadoDAO ||
    resultadoDAO.error ||
    !Array.isArray(resultadoDAO.data)
  ) {
    advertencias.push(nombreCategoria);

    return {
      disponible: false,
      error:
        resultadoDAO?.error?.message ||
        'Información no disponible',
    };
  }

  return contarPorEstado(
    resultadoDAO.data,
    estados,
    columnaEstado
  );
}

/**
 * Cuenta las actividades por estado y por tipo.
 */
function contarActividades(registros) {
  const porEstado = crearEstadosVacios(
    ESTADOS.actividades
  );

  const porTipo = crearEstadosVacios(
    Object.values(TIPOS_ACTIVIDAD)
  );

  registros.forEach((actividad) => {
    // Conteo por estado.
    if (
      Object.prototype.hasOwnProperty.call(
        porEstado,
        actividad.estado
      )
    ) {
      porEstado[actividad.estado] += 1;
    }

    // Conteo por tipo.
    const tipoPresentacion =
      TIPOS_ACTIVIDAD[actividad.tipo];

    if (
      tipoPresentacion &&
      Object.prototype.hasOwnProperty.call(
        porTipo,
        tipoPresentacion
      )
    ) {
      porTipo[tipoPresentacion] += 1;
    }
  });

  return {
    total: registros.length,
    porEstado,
    porTipo,
  };
}

// ------------------------------------------------------
// RF48 - CONSULTAR RESUMEN GENERAL
// ------------------------------------------------------

export async function consultarIndicadoresAdministracion() {
  try {
    const datosDAO =
      await consultarConteosAdministracionDAO();

    if (!datosDAO || typeof datosDAO !== 'object') {
      throw new Error(
        'No fue posible cargar el resumen general'
      );
    }

    const advertencias = [];

    // Usuarios.
    const usuarios = procesarCategoria(
      datosDAO.usuarios,
      ESTADOS.usuarios,
      'estado_cuenta',
      'usuarios',
      advertencias
    );

    // Mascotas.
    const mascotas = procesarCategoria(
      datosDAO.mascotas,
      ESTADOS.mascotas,
      'estado',
      'mascotas',
      advertencias
    );

    // Propietarios.
    const propietarios = procesarCategoria(
      datosDAO.propietarios,
      ESTADOS.propietarios,
      'estado',
      'propietarios',
      advertencias
    );

    // Atenciones.
    const atenciones = procesarCategoria(
      datosDAO.atenciones,
      ESTADOS.atenciones,
      'estado',
      'atenciones',
      advertencias
    );

    // Actividades.
    let actividades;

    if (
      !datosDAO.actividades ||
      datosDAO.actividades.error ||
      !Array.isArray(datosDAO.actividades.data)
    ) {
      advertencias.push('actividades');

      actividades = {
        disponible: false,
        error:
          datosDAO.actividades?.error?.message ||
          'Información no disponible',
      };
    } else {
      actividades = contarActividades(
        datosDAO.actividades.data
      );
    }

    // Verificar que al menos una categoría esté disponible.
    const categorias = [
      usuarios,
      mascotas,
      propietarios,
      atenciones,
      actividades,
    ];

    const hayCategoriaDisponible = categorias.some(
      (categoria) => categoria.disponible !== false
    );

    if (!hayCategoriaDisponible) {
      throw new Error(
        'No fue posible cargar el resumen general'
      );
    }

    return {
      usuarios,
      mascotas,
      propietarios,
      atenciones,
      actividades,
      advertencias,
    };
  } catch (error) {
    logger.error(
      'Error al consultar el resumen general:',
      error
    );

    throw new Error(
      'No fue posible cargar el resumen general'
    );
  }
}
