
/**
 * ============================================================
 * PETCARE - RF55: REGISTRAR HALLAZGOS POR ÓRGANO
 * ============================================================
 *
 * Archivo:
 * RF55.registrarHallazgosEcografia.test.js
 *
 * Arquitectura: Servicio + DAO
 * Metodología: TDD
 * Actores: Administrador y Asistente
 *
 * CP01: Registro exitoso de hallazgos por órgano.
 * CP02: Sin órganos.
 * CP03: Hallazgos vacíos.
 * CP04: Órgano repetido.
 * CP05: Medición inválida.
 * CP06: Error al registrar.
 *
 * Contrato de datos propuesto para el detalle:
 *
 * detalle: {
 *   area_evaluar: '',
 *   organos: [
 *     {
 *       organo_id: 1,
 *       nombre_organo: '',
 *       hallazgos: '',
 *       mediciones_especificas: [
 *         {
 *           nombre_medicion: '',
 *           valor: 0,
 *           unidad: ''
 *         }
 *       ],
 *       conclusion_sugerida: ''
 *     }
 *   ]
 * }
 *
 * Las mediciones se representan mediante valores numéricos
 * y unidades. Este formato debe mantenerse alineado con
 * la implementación definitiva del módulo de ecografía.
 * ============================================================
 */

// ============================================================
// SERVICIO QUE SE VA A PROBAR
// ============================================================

import {
  registrarActividadServicio,
} from '../../services/actividadesServicio';

// ============================================================
// DAO QUE SE VA A SIMULAR
// ============================================================

import * as actividadesDAO from '../../dao/actividadesDAO';

// ============================================================
// MOCK DEL DAO
// ============================================================

jest.mock('../../dao/actividadesDAO', () => ({
  consultarActividadesPorEstado: jest.fn(),
  consultarActividadesPorAtencion: jest.fn(),
  actualizarEstadoActividad: jest.fn(),
  registrarActividad: jest.fn(),
}));

// ============================================================
// DATOS DE PRUEBA
// ============================================================

const crearDatosEcografia = () => ({
  atencion_id: 15,

  // Identificador de prueba del tipo Ecografía.
  // No representa necesariamente el ID de producción.
  tipo_id: 4,

  fecha_prevista: '2026-10-30',

  observaciones: 'Ecografía abdominal',

  detalle: {
    area_evaluar: 'Abdominal',

    organos: [
      {
        organo_id: 1,
        nombre_organo: 'Hígado',

        hallazgos:
          'Tamaño y ecogenicidad dentro de los parámetros esperados.',

        mediciones_especificas: [
          {
            nombre_medicion: 'Longitud',
            valor: 12.5,
            unidad: 'cm',
          },
        ],

        conclusion_sugerida:
          'Hígado sin alteraciones ecográficas evidentes.',
      },
    ],
  },
});

const actividadRegistrada = {
  actividad_id: 80,
  atencion_id: 15,
  tipo_id: 4,
  estado: 'Pendiente',
  fecha_prevista: '2026-10-30',
  observaciones: 'Ecografía abdominal',

  detalle: {
    area_evaluar: 'Abdominal',

    organos: [
      {
        organo_id: 1,
        nombre_organo: 'Hígado',

        hallazgos:
          'Tamaño y ecogenicidad dentro de los parámetros esperados.',

        mediciones_especificas: [
          {
            nombre_medicion: 'Longitud',
            valor: 12.5,
            unidad: 'cm',
          },
        ],

        conclusion_sugerida:
          'Hígado sin alteraciones ecográficas evidentes.',
      },
    ],
  },
};

// ============================================================
// CONFIGURACIÓN GENERAL
// ============================================================

describe('RF55 - Registrar hallazgos de ecografía por órgano', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    actividadesDAO.registrarActividad.mockResolvedValue(
      actividadRegistrada
    );
  });

  // ==========================================================
  // CP01 - ÉXITO: HALLAZGOS POR ÓRGANO
  // ==========================================================

  test('CP01 - Debe registrar los hallazgos por órgano con estado Pendiente', async () => {
    const datosEcografia = crearDatosEcografia();

    const resultado = await registrarActividadServicio(
      datosEcografia
    );

    expect(actividadesDAO.registrarActividad)
      .toHaveBeenCalledTimes(1);

    expect(actividadesDAO.registrarActividad)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          atencion_id: 15,
          tipo_id: 4,
          estado: 'Pendiente',
          fecha_prevista: '2026-10-30',

          detalle: expect.objectContaining({
            area_evaluar: 'Abdominal',

            organos: expect.arrayContaining([
              expect.objectContaining({
                organo_id: 1,
                nombre_organo: 'Hígado',

                hallazgos: expect.any(String),

                mediciones_especificas:
                  expect.arrayContaining([
                    expect.objectContaining({
                      nombre_medicion: 'Longitud',
                      valor: 12.5,
                      unidad: 'cm',
                    }),
                  ]),

                conclusion_sugerida: expect.any(String),
              }),
            ]),
          }),
        })
      );

    expect(resultado).toEqual(actividadRegistrada);

    expect(resultado.estado).toBe('Pendiente');

    expect(resultado.detalle.organos).toHaveLength(1);
  });

  // ==========================================================
  // CP02 - E1: SIN ÓRGANOS
  // ==========================================================

  test('CP02 - Debe rechazar el registro cuando no se agrega ningún órgano', async () => {
    const datosEcografia = crearDatosEcografia();

    datosEcografia.detalle.organos = [];

    await expect(
      registrarActividadServicio(datosEcografia)
    ).rejects.toThrow(
      'Agregue al menos un órgano evaluado.'
    );

    expect(actividadesDAO.registrarActividad)
      .not.toHaveBeenCalled();
  });

  // ==========================================================
  // CP03 - E2: HALLAZGOS VACÍOS
  // ==========================================================

  test('CP03 - Debe rechazar un órgano sin hallazgos', async () => {
    const datosEcografia = crearDatosEcografia();

    datosEcografia.detalle.organos[0].hallazgos = '   ';

    await expect(
      registrarActividadServicio(datosEcografia)
    ).rejects.toThrow(
      'Ingrese los hallazgos del órgano seleccionado.'
    );

    expect(actividadesDAO.registrarActividad)
      .not.toHaveBeenCalled();
  });

  // ==========================================================
  // CP04 - E3: ÓRGANO REPETIDO
  // ==========================================================

  test('CP04 - Debe impedir agregar dos veces el mismo órgano', async () => {
    const datosEcografia = crearDatosEcografia();

    const segundoOrgano = {
      ...datosEcografia.detalle.organos[0],

      hallazgos: 'Segundo registro del mismo órgano.',
    };

    datosEcografia.detalle.organos.push(segundoOrgano);

    await expect(
      registrarActividadServicio(datosEcografia)
    ).rejects.toThrow(
      'Este órgano ya fue agregado a la ecografía.'
    );

    expect(actividadesDAO.registrarActividad)
      .not.toHaveBeenCalled();
  });

  // ==========================================================
  // CP05 - E4: MEDICIÓN INVÁLIDA
  // ==========================================================

  test('CP05 - Debe rechazar mediciones con formato incorrecto', async () => {
    const datosEcografia = crearDatosEcografia();

    datosEcografia.detalle.organos[0]
      .mediciones_especificas[0].valor = 'no-numérico';

    await expect(
      registrarActividadServicio(datosEcografia)
    ).rejects.toThrow(
      'Ingrese mediciones con un formato válido.'
    );

    expect(actividadesDAO.registrarActividad)
      .not.toHaveBeenCalled();
  });

  // ==========================================================
  // CP06 - E5: ERROR AL REGISTRAR
  // ==========================================================

  test('CP06 - Debe controlar el error técnico al registrar la ecografía', async () => {
    actividadesDAO.registrarActividad.mockRejectedValue(
      new Error('Error de conexión con Supabase')
    );

    const datosEcografia = crearDatosEcografia();

    await expect(
      registrarActividadServicio(datosEcografia)
    ).rejects.toThrow(
      'No fue posible registrar la actividad. Intente nuevamente.'
    );

    expect(actividadesDAO.registrarActividad)
      .toHaveBeenCalledTimes(1);
  });
});
