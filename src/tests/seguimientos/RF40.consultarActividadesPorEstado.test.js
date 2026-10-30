
/**
 * ============================================================
 * PETCARE — PRUEBAS UNITARIAS RF40
 * Consultar actividades por estado de una atención.
 * ============================================================
 *
 * Modelo de pruebas de la profesora:
 * - Repositorio falso en memoria.
 * - Inyección de dependencias.
 * - beforeEach, describe, test y expect.
 * - Arrange, Act y Assert.
 *
 * CP01: consulta exitosa.
 * CP02: categoría sin actividades pendientes.
 * CP03: estado seleccionado sin actividades.
 * CP04: consulta de detalle sin modificar registros.
 * ============================================================
 */

import {
  crearSeguimientoService,
} from '../../services/seguimientoServicio';

/**
 * Repositorio falso en memoria.
 */
function crearRepositorioFalso() {
  const actividades = new Map();

  return {
    guardar: (actividad) => {
      actividades.set(
        actividad.actividad_id,
        { ...actividad }
      );
    },

    consultarActividadesPorAtencion: async (atencionId) => {
      return Array.from(actividades.values())
        .filter(
          (actividad) =>
            String(actividad.atencion_id) ===
            String(atencionId)
        )
        .map((actividad) => ({ ...actividad }));
    },

    obtenerTodos: () => {
      return Array.from(actividades.values()).map(
        (actividad) => ({ ...actividad })
      );
    },
  };
}

describe('RF40 - Consultar actividades por estado', () => {
  let repositorio;
  let seguimiento;

  const atencionId = 100;

  beforeEach(() => {
    repositorio = crearRepositorioFalso();

    seguimiento = crearSeguimientoService(repositorio);

    // Datos de la atención de Firulais.

    repositorio.guardar({
      actividad_id: 1,
      atencion_id: atencionId,
      tipo: 'Consulta',
      estado: 'Pendiente',
      observaciones: 'Evaluación general',
      eliminado: false,
    });

    repositorio.guardar({
      actividad_id: 2,
      atencion_id: atencionId,
      tipo: 'Medicación',
      estado: 'Pendiente',
      observaciones: 'Administrar medicamento',
      eliminado: false,
    });

    repositorio.guardar({
      actividad_id: 3,
      atencion_id: atencionId,
      tipo: 'Vacunación',
      estado: 'En proceso',
      observaciones: 'Vacunación en curso',
      eliminado: false,
    });

    repositorio.guardar({
      actividad_id: 4,
      atencion_id: atencionId,
      tipo: 'Ecografía',
      estado: 'Completada',
      observaciones: 'Ecografía realizada',
      eliminado: false,
    });

    repositorio.guardar({
      actividad_id: 5,
      atencion_id: atencionId,
      tipo: 'Consulta',
      estado: 'Completada',
      observaciones: 'Control realizado',
      eliminado: false,
    });

    repositorio.guardar({
      actividad_id: 6,
      atencion_id: atencionId,
      tipo: 'Esterilización',
      estado: 'No realizada',
      observaciones: 'Procedimiento no realizado',
      eliminado: false,
    });
  });

  test('CP01 - Consulta exitosa de actividades clasificadas por estado', async () => {
    // ARRANGE
    const idAtencion = atencionId;

    // ACT
    const resultado =
      await seguimiento.obtenerActividadesPorEstado(
        idAtencion,
        'Todas'
      );

    const pendientes =
      await seguimiento.obtenerActividadesPorEstado(
        idAtencion,
        'Pendiente'
      );

    const completadas =
      await seguimiento.obtenerActividadesPorEstado(
        idAtencion,
        'Completada'
      );

    const noRealizadas =
      await seguimiento.obtenerActividadesPorEstado(
        idAtencion,
        'No realizada'
      );

    // ASSERT
    expect(resultado.total).toBe(5);
    expect(pendientes.total).toBe(2);
    expect(completadas.total).toBe(2);
    expect(noRealizadas.total).toBe(1);

    expect(
      resultado.actividades.every((actividad) =>
        [
          'Pendiente',
          'Completada',
          'No realizada',
        ].includes(actividad.estado)
      )
    ).toBe(true);

    expect(
      resultado.actividades.some(
        (actividad) => actividad.estado === 'En proceso'
      )
    ).toBe(false);
  });

  test('CP02 - La categoría Pendiente no contiene actividades', async () => {
    // ARRANGE
    const idAtencion = atencionId;

    // Reemplazar las dos actividades pendientes.
    repositorio.guardar({
      actividad_id: 1,
      atencion_id: idAtencion,
      tipo: 'Consulta',
      estado: 'Completada',
      observaciones: 'Evaluación realizada',
      eliminado: false,
    });

    repositorio.guardar({
      actividad_id: 2,
      atencion_id: idAtencion,
      tipo: 'Medicación',
      estado: 'Completada',
      observaciones: 'Medicación completada',
      eliminado: false,
    });

    // ACT
    const resultado =
      await seguimiento.obtenerActividadesPorEstado(
        idAtencion,
        'Pendiente'
      );

    // ASSERT
    expect(resultado.actividades).toEqual([]);
    expect(resultado.total).toBe(0);
    expect(resultado.mensaje).toBe(
      'No hay actividades pendientes'
    );
  });

  test('CP03 - El estado seleccionado no contiene actividades', async () => {
    // ARRANGE
    const idAtencion = atencionId;

    // Reemplazar la actividad No realizada.
    repositorio.guardar({
      actividad_id: 6,
      atencion_id: idAtencion,
      tipo: 'Esterilización',
      estado: 'Completada',
      observaciones: 'Procedimiento completado',
      eliminado: false,
    });

    // ACT
    const resultado =
      await seguimiento.obtenerActividadesPorEstado(
        idAtencion,
        'No realizada'
      );

    // ASSERT
    expect(resultado.actividades).toEqual([]);
    expect(resultado.total).toBe(0);
    expect(resultado.mensaje).toBe(
      'No hay actividades no realizadas'
    );
  });

  test('CP04 - Consulta el detalle de una actividad sin modificar otros registros', async () => {
    // ARRANGE
    const idAtencion = atencionId;
    const idActividad = 4;

    const registrosAntes = repositorio.obtenerTodos();

    // ACT
    const resultado =
      await seguimiento.obtenerDetalleActividad(
        idAtencion,
        idActividad
      );

    const registrosDespues = repositorio.obtenerTodos();

    // ASSERT
    expect(resultado.actividad_id).toBe(idActividad);
    expect(resultado.atencion_id).toBe(idAtencion);
    expect(resultado.tipo).toBe('Ecografía');
    expect(resultado.estado).toBe('Completada');

    expect(registrosDespues).toEqual(registrosAntes);
  });
});
