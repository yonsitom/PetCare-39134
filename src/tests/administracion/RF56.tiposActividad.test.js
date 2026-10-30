
/**
 * ============================================================
 * PETCARE - RF56: GESTIONAR CATÁLOGO DE TIPOS DE ACTIVIDAD
 * ============================================================
 *
 * Archivo:
 * RF56.tiposActividad.test.js
 *
 * Metodología: TDD.
 * Arquitectura: Servicio + DAO.
 * Actor: Administrador.
 *
 * CASOS DE PRUEBA DE LA MATRIZ:
 *
 * CP01: Éxito - tipo de actividad guardado.
 * CP02: E1 - campos incompletos.
 * CP03: E2 - nombre duplicado.
 * CP04: E3 - error al guardar.
 *
 * Este archivo contiene exactamente cuatro pruebas principales.
 * ============================================================
 */

// ============================================================
// SERVICIO QUE SE VA A PROBAR
// ============================================================

import {
  crearTipoActividadServicio,
  editarTipoActividadServicio,
  cambiarDisponibilidadTipoActividadServicio,
  consultarTiposActividadDisponiblesServicio,
} from '../../services/administracion/tiposActividadService';

// ============================================================
// DAO QUE SE VA A SIMULAR
// ============================================================

import * as tiposActividadDAO from '../../dao/administracion/tiposActividadDAO';

// ============================================================
// MOCK DEL DAO
// ============================================================

jest.mock('../../dao/administracion/tiposActividadDAO', () => ({
  listarTiposActividadDAO: jest.fn(),
  obtenerTipoActividadPorIdDAO: jest.fn(),
  crearTipoActividadDAO: jest.fn(),
  actualizarTipoActividadDAO: jest.fn(),
  cambiarEstadoTipoActividadDAO: jest.fn(),
}));

// ============================================================
// DATOS DE PRUEBA
// ============================================================

const tipoValido = {
  nombre: 'Ecografía',
  descripcion: 'Evaluación ecográfica por órganos.',
  requiere_medicamento: false,
};

const tipoRegistrado = {
  tipo_id: 10,
  codigo: 'ECOGRAFIA',
  nombre: 'Ecografía',
  descripcion: 'Evaluación ecográfica por órganos.',
  requiere_medicamento: false,
  activo: true,
};

const datosEditados = {
  nombre: 'Ecografía abdominal',
  descripcion: 'Evaluación abdominal por ecografía.',
  requiere_medicamento: false,
};

const tipoEditado = {
  tipo_id: 10,
  codigo: 'ECOGRAFIA',
  nombre: 'Ecografía abdominal',
  descripcion: 'Evaluación abdominal por ecografía.',
  requiere_medicamento: false,
  activo: true,
};

// ============================================================
// CONFIGURACIÓN GENERAL
// ============================================================

describe('RF56 - Gestionar catálogo de tipos de actividad', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    tiposActividadDAO.listarTiposActividadDAO
      .mockResolvedValue([]);

    tiposActividadDAO.crearTipoActividadDAO
      .mockResolvedValue(tipoRegistrado);

    tiposActividadDAO.actualizarTipoActividadDAO
      .mockResolvedValue(tipoEditado);

    tiposActividadDAO.cambiarEstadoTipoActividadDAO
      .mockImplementation(async (tipoId, activo) => ({
        ...tipoRegistrado,
        tipo_id: tipoId,
        activo,
      }));
  });

  // ==========================================================
  // CP01 - ÉXITO: TIPO DE ACTIVIDAD GUARDADO
  // ==========================================================

  test('CP01 - Debe guardar y permitir gestionar un tipo de actividad', async () => {
    // --------------------------------------------------------
    // 1. Registrar un nuevo tipo de actividad y confirmar.
    // --------------------------------------------------------

    tiposActividadDAO.listarTiposActividadDAO
      .mockResolvedValueOnce([]);

    const resultadoRegistro =
      await crearTipoActividadServicio(
        tipoValido,
        true
      );

    expect(
      tiposActividadDAO.crearTipoActividadDAO
    ).toHaveBeenCalledWith({
      nombre: 'Ecografía',
      descripcion: 'Evaluación ecográfica por órganos.',
      requiere_medicamento: false,
      codigo: 'ECOGRAFIA',
    });

    expect(resultadoRegistro).toEqual({
      ok: true,
      mensaje:
        'El tipo de actividad se guardó correctamente.',
      data: tipoRegistrado,
    });

    // --------------------------------------------------------
    // 2. Editar un tipo existente y confirmar.
    // --------------------------------------------------------

    tiposActividadDAO.listarTiposActividadDAO
      .mockResolvedValueOnce([
        tipoRegistrado,
      ]);

    const resultadoEdicion =
      await editarTipoActividadServicio(
        10,
        datosEditados,
        true
      );

    expect(
      tiposActividadDAO.actualizarTipoActividadDAO
    ).toHaveBeenCalledWith(
      10,
      datosEditados
    );

    expect(resultadoEdicion).toEqual({
      ok: true,
      mensaje:
        'El tipo de actividad se guardó correctamente.',
      data: tipoEditado,
    });

    // --------------------------------------------------------
    // 3. Desactivar el tipo sin eliminarlo.
    // --------------------------------------------------------

    const resultadoDesactivacion =
      await cambiarDisponibilidadTipoActividadServicio(
        10,
        false,
        true
      );

    expect(
      tiposActividadDAO.cambiarEstadoTipoActividadDAO
    ).toHaveBeenCalledWith(10, false);

    expect(resultadoDesactivacion.data.activo).toBe(false);

    // --------------------------------------------------------
    // 4. Activar nuevamente el tipo.
    // --------------------------------------------------------

    const resultadoActivacion =
      await cambiarDisponibilidadTipoActividadServicio(
        10,
        true,
        true
      );

    expect(
      tiposActividadDAO.cambiarEstadoTipoActividadDAO
    ).toHaveBeenCalledWith(10, true);

    expect(resultadoActivacion.data.activo).toBe(true);

    // --------------------------------------------------------
    // 5. Consultar los tipos disponibles para nuevas actividades.
    // --------------------------------------------------------

    tiposActividadDAO.listarTiposActividadDAO
      .mockResolvedValueOnce([
        tipoRegistrado,
      ]);

    const disponibles =
      await consultarTiposActividadDisponiblesServicio();

    expect(
      tiposActividadDAO.listarTiposActividadDAO
    ).toHaveBeenLastCalledWith({
      soloActivos: true,
    });

    expect(disponibles).toEqual([
      tipoRegistrado,
    ]);
  });

  // ==========================================================
  // CP02 - E1: CAMPOS INCOMPLETOS
  // ==========================================================

  test('CP02 - Debe mostrar el mensaje cuando el nombre está vacío y no guardar', async () => {
    const datosIncompletos = {
      nombre: '   ',
      descripcion: 'Descripción de prueba.',
      requiere_medicamento: false,
    };

    await expect(
      crearTipoActividadServicio(
        datosIncompletos,
        true
      )
    ).rejects.toThrow(
      'Complete los campos obligatorios.'
    );

    expect(
      tiposActividadDAO.listarTiposActividadDAO
    ).not.toHaveBeenCalled();

    expect(
      tiposActividadDAO.crearTipoActividadDAO
    ).not.toHaveBeenCalled();
  });

  // ==========================================================
  // CP03 - E2: NOMBRE DUPLICADO
  // ==========================================================

  test('CP03 - Debe impedir guardar un tipo de actividad con un nombre existente', async () => {
    tiposActividadDAO.listarTiposActividadDAO
      .mockResolvedValue([
        tipoRegistrado,
      ]);

    const tipoDuplicado = {
      nombre: ' ECOGRAFIA ',
      descripcion: 'Otra descripción.',
      requiere_medicamento: true,
    };

    await expect(
      crearTipoActividadServicio(
        tipoDuplicado,
        true
      )
    ).rejects.toThrow(
      'Ya existe un tipo de actividad con ese nombre.'
    );

    expect(
      tiposActividadDAO.crearTipoActividadDAO
    ).not.toHaveBeenCalled();
  });

  // ==========================================================
  // CP04 - E3: ERROR AL GUARDAR
  // ==========================================================

  test('CP04 - Debe mostrar un mensaje controlado si falla el guardado o cambio de estado', async () => {
    const mensajeEsperado =
      'No fue posible completar la operación. Intente nuevamente.';

    // --------------------------------------------------------
    // Error al registrar.
    // --------------------------------------------------------

    tiposActividadDAO.listarTiposActividadDAO
      .mockResolvedValueOnce([]);

    tiposActividadDAO.crearTipoActividadDAO
      .mockRejectedValueOnce(
        new Error('Error de conexión con Supabase')
      );

    await expect(
      crearTipoActividadServicio(
        tipoValido,
        true
      )
    ).rejects.toThrow(mensajeEsperado);

    // --------------------------------------------------------
    // Error al editar.
    // --------------------------------------------------------

    tiposActividadDAO.listarTiposActividadDAO
      .mockResolvedValueOnce([
        tipoRegistrado,
      ]);

    tiposActividadDAO.actualizarTipoActividadDAO
      .mockRejectedValueOnce(
        new Error('Error de conexión con Supabase')
      );

    await expect(
      editarTipoActividadServicio(
        10,
        datosEditados,
        true
      )
    ).rejects.toThrow(mensajeEsperado);

    // --------------------------------------------------------
    // Error al cambiar disponibilidad.
    // --------------------------------------------------------

    tiposActividadDAO.cambiarEstadoTipoActividadDAO
      .mockRejectedValueOnce(
        new Error('Error de conexión con Supabase')
      );

    await expect(
      cambiarDisponibilidadTipoActividadServicio(
        10,
        false,
        true
      )
    ).rejects.toThrow(mensajeEsperado);
  });
});
