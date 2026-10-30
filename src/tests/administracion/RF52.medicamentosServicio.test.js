
/**
 * ============================================================
 * PETCARE - RF52: GESTIONAR CATÁLOGO DE MEDICAMENTOS
 * ============================================================
 *
 * Archivo: RF52.medicamentosServicio.test.js
 * Arquitectura: Servicio + DAO
 * Metodología: TDD
 * Actor: Administrador
 *
 * Casos de prueba:
 *
 * CP01: Registrar medicamento correctamente.
 * CP02: Rechazar campos incompletos.
 * CP03: Evitar medicamentos duplicados.
 * CP04: Mostrar resultado vacío en una búsqueda sin coincidencias.
 * CP05: Controlar errores al guardar.
 *
 * IMPORTANTE:
 * Estas pruebas verifican el comportamiento esperado del RF52.
 * Los casos que no estén implementados todavía en el servicio
 * deberán corregirse después de ejecutar el TDD.
 * ============================================================
 */

import {
  consultarMedicamentos,
  registrarMedicamento,
} from '../../services/administracion/medicamentosService';

import * as medicamentosDAO from '../../dao/administracion/medicamentosDAO';

// ============================================================
// MOCK DEL DAO REAL
// ============================================================

jest.mock('../../dao/administracion/medicamentosDAO', () => ({
  consultarMedicamentosDAO: jest.fn(),
  consultarMedicamentoPorIdDAO: jest.fn(),
  crearMedicamentoDAO: jest.fn(),
  actualizarMedicamentoDAO: jest.fn(),
  cambiarEstadoMedicamentoDAO: jest.fn(),
}));

// ============================================================
// DATOS DE PRUEBA
// ============================================================

const medicamentoValido = {
  nombre_medicamento: 'Amoxicilina',
  concentracion: '500 mg',
  categoria: 'Medicamento',
};

const medicamentoRegistrado = {
  medicamento_id: 1,
  nombre_medicamento: 'Amoxicilina',
  concentracion: '500 mg',
  categoria: 'Medicamento',
  activo: true,
};

// ============================================================
// CONFIGURACIÓN GENERAL
// ============================================================

describe('RF52 - Gestionar catálogo de medicamentos', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    medicamentosDAO.consultarMedicamentosDAO.mockResolvedValue([]);

    medicamentosDAO.crearMedicamentoDAO.mockResolvedValue(
      medicamentoRegistrado
    );
  });

  // ==========================================================
  // CP01 - REGISTRO EXITOSO
  // ==========================================================

  test('CP01 - Debe registrar correctamente un medicamento válido', async () => {
    const resultado = await registrarMedicamento(medicamentoValido);

    expect(medicamentosDAO.crearMedicamentoDAO).toHaveBeenCalledWith({
      nombre_medicamento: 'Amoxicilina',
      concentracion: '500 mg',
      categoria: 'Medicamento',
    });

    expect(resultado).toEqual(medicamentoRegistrado);
  });

  // ==========================================================
  // CP02 - E1: CAMPOS INCOMPLETOS
  // ==========================================================

  test('CP02 - Debe rechazar el registro cuando el nombre está vacío', async () => {
    const datosIncompletos = {
      nombre_medicamento: '',
      concentracion: '500 mg',
      categoria: 'Medicamento',
    };

    await expect(
      registrarMedicamento(datosIncompletos)
    ).rejects.toThrow('Complete los campos obligatorios.');

    expect(medicamentosDAO.crearMedicamentoDAO)
      .not.toHaveBeenCalled();
  });

  // ==========================================================
  // CP03 - E2: MEDICAMENTO DUPLICADO
  // ==========================================================

  test('CP03 - Debe impedir registrar un medicamento duplicado', async () => {
    medicamentosDAO.consultarMedicamentosDAO.mockResolvedValue([
      medicamentoRegistrado,
    ]);

    await expect(
      registrarMedicamento(medicamentoValido)
    ).rejects.toThrow(
      'Ya existe un medicamento con ese nombre y concentración.'
    );

    expect(medicamentosDAO.crearMedicamentoDAO)
      .not.toHaveBeenCalled();
  });

  // ==========================================================
  // CP04 - E3: BÚSQUEDA SIN RESULTADOS
  // ==========================================================

  test('CP04 - Debe devolver una lista vacía cuando no existen coincidencias', async () => {
    medicamentosDAO.consultarMedicamentosDAO.mockResolvedValue([
      medicamentoRegistrado,
    ]);

    const resultado = await consultarMedicamentos({
      busqueda: 'MedicamentoInexistente',
    });

    expect(resultado).toEqual([]);

    expect(medicamentosDAO.consultarMedicamentosDAO)
      .toHaveBeenCalled();
  });

  // ==========================================================
  // CP05 - E4: ERROR AL GUARDAR
  // ==========================================================

  test('CP05 - Debe mostrar un error controlado cuando falla el registro', async () => {
    medicamentosDAO.crearMedicamentoDAO.mockRejectedValue(
      new Error('Error de conexión con Supabase')
    );

    await expect(
      registrarMedicamento(medicamentoValido)
    ).rejects.toThrow(
      'No fue posible guardar el medicamento. Intente nuevamente.'
    );
  });
});
