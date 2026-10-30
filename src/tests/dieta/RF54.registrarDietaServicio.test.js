
/**
 * ============================================================
 * PETCARE - RF54: REGISTRAR LA DIETA INDICADA A UNA MASCOTA
 * ============================================================
 *
 * Archivo:
 * src/tests/dieta/RF54.registrarDietaServicio.test.js
 *
 * Metodología: TDD
 * Arquitectura: Servicio + DAO
 * Actores: Administrador y Asistente
 *
 * CP01: Éxito - dieta registrada.
 * CP02: E1 - dieta no seleccionada.
 * CP03: E2 - dieta sin alimentos.
 * CP04: E3 - error al cargar catálogo.
 * CP05: E4 - error al registrar.
 * ============================================================
 */

import {
  obtenerRecetasDisponiblesParaDietaServicio,
  registrarDietaServicio,
} from '../../services/dieta/dietaServicio';

import * as dietaDAO from '../../dao/dieta/dietaDAO';

// ============================================================
// MOCK DEL DAO
// ============================================================

jest.mock('../../dao/dieta/dietaDAO', () => ({
  consultarDietaPorRecetaDAO: jest.fn(),
  consultarRecetasDisponiblesParaDietaDAO: jest.fn(),
  registrarDietaDAO: jest.fn(),
}));

// ============================================================
// DATOS DE PRUEBA
// ============================================================

const dietaValida = {
  receta_id: 25,
  tipo_dieta: 'Dieta blanda',
  opciones_proteina: 'Pollo sancochado',
  opciones_vegetales: 'Zanahoria cocida',
  restriccion_nutricional: 'Sin sal',
};

const dietaRegistrada = {
  dieta_id: 1,
  receta_id: 25,
  tipo_dieta: 'Dieta blanda',
  opciones_proteina: 'Pollo sancochado',
  opciones_vegetales: 'Zanahoria cocida',
  restriccion_nutricional: 'Sin sal',
};

// ============================================================
// CONFIGURACIÓN
// ============================================================

describe('RF54 - Registrar la dieta indicada a una mascota', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    dietaDAO.registrarDietaDAO.mockResolvedValue(
      dietaRegistrada
    );

    dietaDAO.consultarRecetasDisponiblesParaDietaDAO
      .mockResolvedValue([]);
  });

  // ==========================================================
  // CP01 - ÉXITO: DIETA REGISTRADA
  // ==========================================================

  test('CP01 - Debe registrar correctamente una dieta con datos válidos', async () => {
    const resultado = await registrarDietaServicio(
      dietaValida
    );

    expect(dietaDAO.registrarDietaDAO).toHaveBeenCalledTimes(1);

    expect(dietaDAO.registrarDietaDAO).toHaveBeenCalledWith({
      receta_id: 25,
      tipo_dieta: 'Dieta blanda',
      opciones_proteina: 'Pollo sancochado',
      opciones_vegetales: 'Zanahoria cocida',
      restriccion_nutricional: 'Sin sal',
    });

    expect(resultado).toEqual(dietaRegistrada);
  });

  // ==========================================================
  // CP02 - E1: DIETA NO SELECCIONADA
  // ==========================================================

  test('CP02 - Debe rechazar el registro cuando no se selecciona un tipo de dieta', async () => {
    const datosSinTipoDieta = {
      receta_id: 25,
      tipo_dieta: '',
      opciones_proteina: 'Pollo sancochado',
      opciones_vegetales: 'Zanahoria cocida',
      restriccion_nutricional: 'Sin sal',
    };

    await expect(
      registrarDietaServicio(datosSinTipoDieta)
    ).rejects.toThrow(
      'Seleccione un tipo de dieta.'
    );

    expect(dietaDAO.registrarDietaDAO)
      .not.toHaveBeenCalled();
  });

  // ==========================================================
  // CP03 - E2: DIETA SIN ALIMENTOS
  // ==========================================================

  test('CP03 - Debe rechazar una dieta que no tiene alimentos asociados', async () => {
    const dietaSinAlimentos = {
      receta_id: 25,
      tipo_dieta: 'Dieta blanda',
      opciones_proteina: '',
      opciones_vegetales: '',
      restriccion_nutricional: 'Sin sal',
    };

    await expect(
      registrarDietaServicio(dietaSinAlimentos)
    ).rejects.toThrow(
      'La dieta seleccionada no tiene alimentos registrados.'
    );

    expect(dietaDAO.registrarDietaDAO)
      .not.toHaveBeenCalled();
  });

  // ==========================================================
  // CP04 - E3: ERROR AL CARGAR CATÁLOGO
  // ==========================================================

  test('CP04 - Debe mostrar un mensaje controlado cuando falla la carga de dietas', async () => {
    dietaDAO.consultarRecetasDisponiblesParaDietaDAO
      .mockRejectedValue(
        new Error('Error de conexión con Supabase')
      );

    await expect(
      obtenerRecetasDisponiblesParaDietaServicio(15)
    ).rejects.toThrow(
      'No fue posible cargar las dietas. Intente nuevamente.'
    );

    expect(
      dietaDAO.consultarRecetasDisponiblesParaDietaDAO
    ).toHaveBeenCalledWith(15);
  });

  // ==========================================================
  // CP05 - E4: ERROR AL REGISTRAR
  // ==========================================================

  test('CP05 - Debe mostrar un mensaje controlado cuando falla el registro de la dieta', async () => {
    dietaDAO.registrarDietaDAO.mockRejectedValue(
      new Error('Error de conexión con Supabase')
    );

    await expect(
      registrarDietaServicio(dietaValida)
    ).rejects.toThrow(
      'No fue posible registrar la actividad. Intente nuevamente.'
    );

    expect(dietaDAO.registrarDietaDAO)
      .toHaveBeenCalledTimes(1);
  });
});
