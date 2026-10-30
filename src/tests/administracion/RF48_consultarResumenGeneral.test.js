
/**
 * PETCARE - TDD RF48
 *
 * RF48: Consultar resumen general de la información
 * de la veterinaria.
 *
 * CP01: Consulta exitosa.
 * CP02: Categorías sin registros.
 * CP03: Información incompleta.
 * CP04: Error general de consulta.
 *
 * DAO simulado:
 * indicadoresAdministracionDAO.js
 */

jest.mock(
  '../../dao/administracion/indicadoresAdministracionDAO',
  () => ({
    consultarConteosAdministracionDAO: jest.fn(),
  })
);

import {
  consultarConteosAdministracionDAO,
} from '../../dao/administracion/indicadoresAdministracionDAO';

import {
  consultarIndicadoresAdministracion,
} from '../../services/administracion/administracionService';

// ------------------------------------------------------
// DATOS AUXILIARES
// ------------------------------------------------------

const crearResultadoDAO = (data, error = null) => ({
  data,
  error,
});

const crearResumenExitoso = () => ({
  usuarios: crearResultadoDAO([
    { estado_cuenta: 'Activo' },
    { estado_cuenta: 'Activo' },
    { estado_cuenta: 'Activo' },
    { estado_cuenta: 'Activo' },
    { estado_cuenta: 'Inactivo' },
  ]),

  mascotas: crearResultadoDAO([
    ...Array(10).fill({ estado: 'Activo' }),
    ...Array(2).fill({ estado: 'Inactivo' }),
  ]),

  propietarios: crearResultadoDAO([
    ...Array(7).fill({ estado: 'Activo' }),
    { estado: 'Inactivo' },
  ]),

  atenciones: crearResultadoDAO([
    ...Array(3).fill({ estado: 'Activa' }),
    ...Array(7).fill({ estado: 'Finalizada' }),
  ]),

  actividades: crearResultadoDAO([
    {
      estado: 'Pendiente',
      tipo: 'Consulta',
      eliminado: false,
    },
    {
      estado: 'Pendiente',
      tipo: 'Medicacion',
      eliminado: false,
    },
    {
      estado: 'Pendiente',
      tipo: 'Vacunacion',
      eliminado: false,
    },
    {
      estado: 'Pendiente',
      tipo: 'Ecografia',
      eliminado: false,
    },
    {
      estado: 'Pendiente',
      tipo: 'Esterilizacion',
      eliminado: false,
    },
    {
      estado: 'Completada',
      tipo: 'Consulta',
      eliminado: false,
    },
    {
      estado: 'Completada',
      tipo: 'Medicacion',
      eliminado: false,
    },
    {
      estado: 'Completada',
      tipo: 'Vacunacion',
      eliminado: false,
    },
    {
      estado: 'Completada',
      tipo: 'Otro actividad',
      eliminado: false,
    },
    {
      estado: 'No realizada',
      tipo: 'Consulta',
      eliminado: false,
    },
    {
      estado: 'No realizada',
      tipo: 'Ecografia',
      eliminado: false,
    },
    {
      estado: 'No realizada',
      tipo: 'Esterilizacion',
      eliminado: false,
    },
  ]),
});

const crearResumenVacio = () => ({
  usuarios: crearResultadoDAO([]),
  mascotas: crearResultadoDAO([]),
  propietarios: crearResultadoDAO([]),
  atenciones: crearResultadoDAO([]),
  actividades: crearResultadoDAO([]),
});

// ------------------------------------------------------
// PRUEBAS RF48
// ------------------------------------------------------

describe('RF48 - Consultar resumen general', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----------------------------------------------------
  // CP01 - CONSULTA EXITOSA
  // ----------------------------------------------------

  test(
    'CP01 - Debe consultar las cinco categorías y mostrar cantidades por estado y tipo',
    async () => {
      consultarConteosAdministracionDAO.mockResolvedValue(
        crearResumenExitoso()
      );

      const resultado =
        await consultarIndicadoresAdministracion();

      expect(
        consultarConteosAdministracionDAO
      ).toHaveBeenCalledTimes(1);

      // Usuarios.
      expect(resultado.usuarios).toEqual({
        total: 5,
        porEstado: {
          Activo: 4,
          Inactivo: 1,
        },
      });

      // Mascotas.
      expect(resultado.mascotas).toEqual({
        total: 12,
        porEstado: {
          Activo: 10,
          Inactivo: 2,
        },
      });

      // Propietarios.
      expect(resultado.propietarios).toEqual({
        total: 8,
        porEstado: {
          Activo: 7,
          Inactivo: 1,
        },
      });

      // Atenciones.
      expect(resultado.atenciones).toEqual({
        total: 10,
        porEstado: {
          Activa: 3,
          Finalizada: 7,
        },
      });

      // Actividades.
      expect(resultado.actividades.total).toBe(12);

      expect(resultado.actividades.porEstado).toEqual({
        Pendiente: 5,
        Completada: 4,
        'No realizada': 3,
      });

      // Seis tipos de actividades.
      expect(resultado.actividades.porTipo).toEqual({
        Consulta: 3,
        Medicación: 2,
        Vacunación: 2,
        Ecografía: 2,
        Esterilización: 2,
        Otro: 1,
      });

      // Medicación pertenece a los tipos de actividad.
      expect(
        resultado.actividades.porTipo
      ).toHaveProperty('Medicación', 2);

      // No incluir históricos.
      expect(resultado).not.toHaveProperty('cambios');
      expect(resultado).not.toHaveProperty('historial');
    }
  );

  // ----------------------------------------------------
  // CP02 - CATEGORÍAS SIN REGISTROS
  // ----------------------------------------------------

  test(
    'CP02 - Debe mostrar cero cuando una o varias categorías no tienen registros',
    async () => {
      const datos = crearResumenVacio();

      datos.usuarios = crearResultadoDAO([
        { estado_cuenta: 'Activo' },
        { estado_cuenta: 'Activo' },
      ]);

      datos.mascotas = crearResultadoDAO([
        { estado: 'Activo' },
      ]);

      consultarConteosAdministracionDAO.mockResolvedValue(
        datos
      );

      const resultado =
        await consultarIndicadoresAdministracion();

      expect(resultado.usuarios.total).toBe(2);
      expect(resultado.mascotas.total).toBe(1);

      expect(resultado.propietarios.total).toBe(0);
      expect(resultado.atenciones.total).toBe(0);
      expect(resultado.actividades.total).toBe(0);

      expect(resultado.actividades.porEstado).toEqual({
        Pendiente: 0,
        Completada: 0,
        'No realizada': 0,
      });

      expect(resultado.actividades.porTipo).toEqual({
        Consulta: 0,
        Medicación: 0,
        Vacunación: 0,
        Ecografía: 0,
        Esterilización: 0,
        Otro: 0,
      });

      expect(
        consultarConteosAdministracionDAO
      ).toHaveBeenCalledTimes(1);
    }
  );

  // ----------------------------------------------------
  // CP03 - INFORMACIÓN INCOMPLETA
  // ----------------------------------------------------

  test(
    'CP03 - Debe mostrar categorías disponibles e identificar la información incompleta',
    async () => {
      const datos = crearResumenExitoso();

      datos.propietarios = {
        data: null,
        error: {
          message:
            'No fue posible obtener la información de propietarios.',
        },
      };

      consultarConteosAdministracionDAO.mockResolvedValue(
        datos
      );

      const resultado =
        await consultarIndicadoresAdministracion();

      // Conservar la información disponible.
      expect(resultado.usuarios.total).toBe(5);
      expect(resultado.mascotas.total).toBe(12);
      expect(resultado.atenciones.total).toBe(10);
      expect(resultado.actividades.total).toBe(12);

      // Identificar la categoría incompleta.
      expect(resultado.advertencias).toContain(
        'propietarios'
      );

      expect(resultado.propietarios).toMatchObject({
        disponible: false,
      });

      // No inventar cantidades.
      expect(
        resultado.propietarios.total
      ).toBeUndefined();

      // Medicación continúa disponible.
      expect(
        resultado.actividades.porTipo
      ).toHaveProperty('Medicación', 2);
    }
  );

  // ----------------------------------------------------
  // CP04 - ERROR GENERAL
  // ----------------------------------------------------

  test(
    'CP04 - Debe controlar el error cuando el servicio de consulta no está disponible',
    async () => {
      consultarConteosAdministracionDAO.mockRejectedValue(
        new Error('Servicio de consulta no disponible')
      );

      await expect(
        consultarIndicadoresAdministracion()
      ).rejects.toThrow(
        'No fue posible cargar el resumen general'
      );

      expect(
        consultarConteosAdministracionDAO
      ).toHaveBeenCalledTimes(1);
    }
  );
});
