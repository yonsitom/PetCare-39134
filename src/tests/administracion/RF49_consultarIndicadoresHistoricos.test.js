
import {
  consultarIndicadoresHistoricos,
  consultarDetalleIndicadorHistorico,
} from '../../services/administracion/indicadoresHistoricosService';

import {
  consultarAtencionesHistoricasDAO,
  consultarDetalleAtencionesHistoricasDAO,
} from '../../dao/administracion/indicadoresHistoricosDAO';

jest.mock('../../dao/administracion/indicadoresHistoricosDAO', () => ({
  consultarAtencionesHistoricasDAO: jest.fn(),
  consultarDetalleAtencionesHistoricasDAO: jest.fn(),
}));

describe('RF49 - Consultar indicadores históricos de las atenciones', () => {
  const filtrosValidos = {
    fechaInicio: '2026-01-01',
    fechaFin: '2026-01-31',
  };

  const atencionesPrueba = [
    {
      atencion_id: 1,
      fecha_inicio: '2026-01-05T10:00:00.000Z',
      fecha_fin: null,
      estado: 'Activa',
      observaciones: 'Primera atención',
      numero_historia: 'HC-001',
      cita_id: null,
    },
    {
      atencion_id: 2,
      fecha_inicio: '2026-01-10T11:00:00.000Z',
      fecha_fin: '2026-01-10T12:00:00.000Z',
      estado: 'Activa',
      observaciones: 'Segunda atención',
      numero_historia: 'HC-002',
      cita_id: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // CP01 - Consulta exitosa de indicadores históricos.
  describe('CP01 - Consulta exitosa', () => {
    test('debe consultar las atenciones y devolver los indicadores y el gráfico', async () => {
      consultarAtencionesHistoricasDAO.mockResolvedValue({
        data: atencionesPrueba,
        error: null,
      });

      const resultado = await consultarIndicadoresHistoricos(filtrosValidos);

      expect(consultarAtencionesHistoricasDAO).toHaveBeenCalledWith(
        filtrosValidos
      );

      expect(resultado.totalAtenciones).toBe(2);

      expect(resultado.porEstado).toEqual({
        Activa: 2,
      });

      expect(resultado.atenciones).toEqual(atencionesPrueba);

      expect(resultado.grafico).toEqual({
        labels: ['2026-01-05', '2026-01-10'],
        datasets: [
          {
            data: [1, 1],
          },
        ],
      });

      expect(resultado.filtros).toEqual({
        fechaInicio: '2026-01-01',
        fechaFin: '2026-01-31',
        estado: null,
      });
    });

    test('debe permitir consultar indicadores filtrando por estado', async () => {
      const filtrosConEstado = {
        ...filtrosValidos,
        estado: 'Activa',
      };

      consultarAtencionesHistoricasDAO.mockResolvedValue({
        data: atencionesPrueba,
        error: null,
      });

      const resultado = await consultarIndicadoresHistoricos(
        filtrosConEstado
      );

      expect(consultarAtencionesHistoricasDAO).toHaveBeenCalledWith(
        filtrosConEstado
      );

      expect(resultado.filtros.estado).toBe('Activa');
      expect(resultado.totalAtenciones).toBe(2);
    });

    test('debe consultar el detalle de atenciones del indicador seleccionado', async () => {
      consultarDetalleAtencionesHistoricasDAO.mockResolvedValue({
        data: atencionesPrueba,
        error: null,
      });

      const resultado = await consultarDetalleIndicadorHistorico(
        filtrosValidos,
        'Activa'
      );

      expect(consultarDetalleAtencionesHistoricasDAO).toHaveBeenCalledWith({
        ...filtrosValidos,
        estado: 'Activa',
      });

      expect(resultado).toEqual(atencionesPrueba);
    });
  });

  // CP02 - El periodo seleccionado no tiene registros.
  describe('CP02 - Periodo sin registros', () => {
    test('debe informar cuando no existen atenciones en el periodo', async () => {
      consultarAtencionesHistoricasDAO.mockResolvedValue({
        data: [],
        error: null,
      });

      await expect(
        consultarIndicadoresHistoricos(filtrosValidos)
      ).rejects.toThrow(
        'No existen datos para el periodo seleccionado'
      );
    });

    test('debe informar cuando el detalle del indicador no tiene registros', async () => {
      consultarDetalleAtencionesHistoricasDAO.mockResolvedValue({
        data: [],
        error: null,
      });

      await expect(
        consultarDetalleIndicadorHistorico(filtrosValidos, 'Activa')
      ).rejects.toThrow(
        'No existen datos para el periodo seleccionado'
      );
    });
  });

  // CP03 - Filtros inválidos.
  describe('CP03 - Validación de filtros', () => {
    test('debe rechazar fechas vacías antes de consultar el DAO', async () => {
      const filtros = {
        fechaInicio: '',
        fechaFin: '',
      };

      await expect(
        consultarIndicadoresHistoricos(filtros)
      ).rejects.toThrow(
        'Seleccione un periodo válido para realizar la consulta'
      );

      expect(consultarAtencionesHistoricasDAO).not.toHaveBeenCalled();
    });

    test('debe rechazar un periodo incompleto antes de consultar el DAO', async () => {
      const filtros = {
        fechaInicio: '2026-01-01',
        fechaFin: '',
      };

      await expect(
        consultarIndicadoresHistoricos(filtros)
      ).rejects.toThrow(
        'Seleccione un periodo válido para realizar la consulta'
      );

      expect(consultarAtencionesHistoricasDAO).not.toHaveBeenCalled();
    });

    test('debe rechazar una fecha inicial posterior a la fecha final', async () => {
      const filtros = {
        fechaInicio: '2026-02-01',
        fechaFin: '2026-01-01',
      };

      await expect(
        consultarIndicadoresHistoricos(filtros)
      ).rejects.toThrow(
        'Seleccione un periodo válido para realizar la consulta'
      );

      expect(consultarAtencionesHistoricasDAO).not.toHaveBeenCalled();
    });

    test('debe rechazar fechas inexistentes del calendario', async () => {
      const filtros = {
        fechaInicio: '2026-02-30',
        fechaFin: '2026-03-01',
      };

      await expect(
        consultarIndicadoresHistoricos(filtros)
      ).rejects.toThrow(
        'Seleccione un periodo válido para realizar la consulta'
      );

      expect(consultarAtencionesHistoricasDAO).not.toHaveBeenCalled();
    });
  });

  // CP04 - Error al consultar la información.
  describe('CP04 - Error de consulta', () => {
    test('debe mostrar el mensaje general cuando falla la consulta de indicadores', async () => {
      consultarAtencionesHistoricasDAO.mockResolvedValue({
        data: null,
        error: new Error('Error de conexión'),
      });

      await expect(
        consultarIndicadoresHistoricos(filtrosValidos)
      ).rejects.toThrow(
        'No fue posible cargar los indicadores históricos. Intente nuevamente'
      );
    });

    test('debe mostrar el mensaje general cuando falla la consulta del detalle', async () => {
      consultarDetalleAtencionesHistoricasDAO.mockResolvedValue({
        data: null,
        error: new Error('Error de conexión'),
      });

      await expect(
        consultarDetalleIndicadorHistorico(filtrosValidos, 'Activa')
      ).rejects.toThrow(
        'No fue posible cargar los indicadores históricos. Intente nuevamente'
      );
    });

    test('debe manejar una excepción inesperada del DAO', async () => {
      consultarAtencionesHistoricasDAO.mockRejectedValue(
        new Error('Fallo inesperado')
      );

      await expect(
        consultarIndicadoresHistoricos(filtrosValidos)
      ).rejects.toThrow(
        'No fue posible cargar los indicadores históricos. Intente nuevamente'
      );
    });
  });
});
