
/**
 * ============================================================
 * PETCARE - RF55: REGISTRAR HALLAZGOS DE ECOGRAFÍA
 * ============================================================
 *
 * Archivo:
 * RF55.registrarHallazgosEcografia.test.js
 *
 * Arquitectura:
 * Servicio -> DAO -> Supabase.
 *
 * Metodología: TDD.
 * Actores: Administrador y Asistente.
 *
 * Estructura del detalle:
 * - zona: zona anatómica evaluada.
 * - organos: identificadores y nombres de órganos.
 * - hallazgos: descripción general de los hallazgos.
 * - mediciones_especificas: mediciones independientes.
 *
 * CP01: Registro exitoso.
 * CP02: Sin órganos.
 * CP03: Hallazgos vacíos.
 * CP04: Órgano repetido.
 * CP05: Medición inválida.
 * CP06: Error técnico al registrar.
 * ============================================================
 */

// ============================================================
// SERVICIO QUE SE VA A PROBAR
// ============================================================

import {
  registrarActividadServicio,
} from '../../services/atencion/actividadesServicio';

// ============================================================
// DAO QUE SE VA A SIMULAR
// ============================================================

import * as actividadesDAO from '../../dao/actividades/actividadesDAO';

// ============================================================
// MOCK DEL DAO
// ============================================================

jest.mock('../../dao/actividades/actividadesDAO', () => ({
  consultarActividadesPorEstado: jest.fn(),
  consultarActividadesPorAtencion: jest.fn(),
  actualizarEstadoActividad: jest.fn(),
  registrarActividad: jest.fn(),
  consultarTiposActividad: jest.fn(),
  consultarCatalogoMedicamentos: jest.fn(),
  registrarVacunacionActividad: jest.fn(),
}));

// ============================================================
// DATOS DE PRUEBA
// ============================================================

const crearDatosEcografia = () => ({
  atencion_id: 15,

  tipo_id: 4,

  fecha_prevista: '2026-10-30',

  observaciones: 'Ecografía abdominal',

  detalle: {
    zona: 'Abdomen',

    organos: [
      {
        organo_id: 1,
        nombre_organo: 'Hígado',
      },
    ],

    hallazgos:
      'Tamaño y ecogenicidad dentro de los parámetros esperados.',

    mediciones_especificas: [
      {
        nombre_medicion: 'Longitud',
        valor: 12.5,
        unidad: 'cm',
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
    zona: 'Abdomen',

    organos: [
      {
        organo_id: 1,
        nombre_organo: 'Hígado',
      },
    ],

    hallazgos:
      'Tamaño y ecogenicidad dentro de los parámetros esperados.',

    mediciones_especificas: [
      {
        nombre_medicion: 'Longitud',
        valor: 12.5,
        unidad: 'cm',
      },
    ],
  },
};

// ============================================================
// CONFIGURACIÓN GENERAL
// ============================================================

describe(
  'RF55 - Registrar hallazgos de ecografía por órgano',
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // El ID 4 corresponde a ECOGRAFIA.
      actividadesDAO.consultarTiposActividad.mockResolvedValue([
        {
          tipo_id: 4,
          codigo: 'ECOGRAFIA',
          nombre: 'Ecografía',
        },
      ]);

      actividadesDAO.registrarActividad.mockResolvedValue(
        actividadRegistrada
      );
    });

    // ========================================================
    // CP01 - REGISTRO EXITOSO
    // ========================================================

    test(
      'CP01 - Debe registrar los hallazgos con estado Pendiente',
      async () => {
        // ARRANGE
        const datosEcografia = crearDatosEcografia();

        // ACT
        const resultado = await registrarActividadServicio(
          datosEcografia
        );

        // ASSERT
        expect(
          actividadesDAO.consultarTiposActividad
        ).toHaveBeenCalledTimes(1);

        expect(
          actividadesDAO.registrarActividad
        ).toHaveBeenCalledTimes(1);

        expect(
          actividadesDAO.registrarActividad
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            atencion_id: 15,
            tipo_id: 4,
            tipo_codigo: 'ECOGRAFIA',
            tipo: 'Ecografía',
            estado: 'Pendiente',
            fecha_prevista: '2026-10-30',

            detalle: expect.objectContaining({
              zona: 'Abdomen',

              organos: expect.arrayContaining([
                expect.objectContaining({
                  organo_id: 1,
                  nombre_organo: 'Hígado',
                }),
              ]),

              hallazgos: expect.any(String),

              mediciones_especificas:
                expect.arrayContaining([
                  expect.objectContaining({
                    nombre_medicion: 'Longitud',
                    valor: 12.5,
                    unidad: 'cm',
                  }),
                ]),
            }),
          })
        );

        expect(resultado).toEqual(actividadRegistrada);
        expect(resultado.estado).toBe('Pendiente');
        expect(resultado.detalle.organos).toHaveLength(1);
      }
    );

    // ========================================================
    // CP02 - SIN ÓRGANOS
    // ========================================================

    test(
  'CP02 - Debe rechazar el registro cuando no se agrega ningún órgano',
  async () => {
    // ARRANGE
    const datosEcografia = crearDatosEcografia();

    datosEcografia.detalle.organos = [];

    // ACT / ASSERT
    await expect(
      registrarActividadServicio(datosEcografia)
    ).rejects.toThrow(
      'Agregue al menos un órgano evaluado.'
    );

    expect(
      actividadesDAO.registrarActividad
    ).not.toHaveBeenCalled();
  }
);

    // ========================================================
    // CP03 - HALLAZGOS VACÍOS
    // ========================================================

    test(
  'CP03 - Debe rechazar una ecografía sin hallazgos',
  async () => {
    // ARRANGE
    const datosEcografia = crearDatosEcografia();

    datosEcografia.detalle.hallazgos = '   ';

    // ACT / ASSERT
    await expect(
      registrarActividadServicio(datosEcografia)
    ).rejects.toThrow(
      'Ingrese los hallazgos de la ecografía.'
    );

    expect(
      actividadesDAO.registrarActividad
    ).not.toHaveBeenCalled();
  }
);
    // ========================================================
    // CP04 - ÓRGANO REPETIDO
    // ========================================================

    test(
      'CP04 - Debe impedir agregar dos veces el mismo órgano',
      async () => {
        // ARRANGE
        const datosEcografia = crearDatosEcografia();

        datosEcografia.detalle.organos.push({
          organo_id: 1,
          nombre_organo: 'Hígado',
        });

        // ACT / ASSERT
        await expect(
          registrarActividadServicio(datosEcografia)
        ).rejects.toThrow(
          'Este órgano ya fue agregado a la ecografía.'
        );

        expect(
          actividadesDAO.registrarActividad
        ).not.toHaveBeenCalled();
      }
    );

    // ========================================================
    // CP05 - MEDICIÓN INVÁLIDA
    // ========================================================

    test(
      'CP05 - Debe rechazar mediciones con formato incorrecto',
      async () => {
        // ARRANGE
        const datosEcografia = crearDatosEcografia();

        datosEcografia.detalle
          .mediciones_especificas[0].valor = 'no-numérico';

        // ACT / ASSERT
        await expect(
          registrarActividadServicio(datosEcografia)
        ).rejects.toThrow(
          'Ingrese mediciones con un formato válido.'
        );

        expect(
          actividadesDAO.registrarActividad
        ).not.toHaveBeenCalled();
      }
    );

    // ========================================================
    // CP06 - ERROR TÉCNICO AL REGISTRAR
    // ========================================================

    test(
      'CP06 - Debe controlar el error técnico al registrar la ecografía',
      async () => {
        // ARRANGE
        const datosEcografia = crearDatosEcografia();

        actividadesDAO.registrarActividad.mockRejectedValue(
          new Error('Error de conexión con Supabase')
        );

        // ACT / ASSERT
        await expect(
          registrarActividadServicio(datosEcografia)
        ).rejects.toThrow(
          'No fue posible registrar la actividad. Intente nuevamente.'
        );

        // La validación debe completarse y el servicio debe
        // intentar ejecutar el DAO antes de controlar el error.
        expect(
          actividadesDAO.registrarActividad
        ).toHaveBeenCalledTimes(1);
      }
    );
  }
);
