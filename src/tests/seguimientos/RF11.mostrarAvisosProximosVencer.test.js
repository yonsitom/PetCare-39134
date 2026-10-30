
/**
 * ============================================================
 * PETCARE — TDD RF11
 * MOSTRAR AVISOS DE ACTIVIDADES PRÓXIMAS A VENCER
 * ============================================================
 *
 * CP01: mostrar aviso y destacar actividad próxima a vencer.
 * CP02: error al aplicar el aviso visual.
 * CP03: fecha prevista inválida.
 * CP04: error al verificar el vencimiento.
 * ============================================================
 */

import {
  crearAvisosProximosVencerService,
} from '../../services/avisosProximosVencerServicio';

describe('RF11 - Mostrar avisos próximos a vencer', () => {
  let repositorio;
  let aplicarAvisoVisual;
  let obtenerFechaActual;
  let servicio;

  const fechaActual = new Date(
    '2026-10-29T10:00:00'
  );

  const actividadProxima = {
    actividad_id: 101,
    atencion_id: 20,
    estado: 'Pendiente',
    fecha_prevista: '2026-10-29T22:00:00',
    nombre_mascota: 'Firulais',
    tipo: 'Medicación',
    eliminado: false,
  };

  beforeEach(() => {
    repositorio = {
      consultarActividadesProximasAVencer:
        jest.fn(),
    };

    aplicarAvisoVisual = jest.fn();

    obtenerFechaActual = jest.fn(
      () => new Date(fechaActual)
    );

    servicio = crearAvisosProximosVencerService({
      repositorio,
      aplicarAvisoVisual,
      obtenerFechaActual,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================
  // CP01 — AVISO CORRECTO
  // ==========================================================

  test(
    'CP01: debe mostrar el aviso y destacar una actividad pendiente dentro de las próximas 24 horas',
    async () => {
      repositorio.consultarActividadesProximasAVencer
        .mockResolvedValue([
          actividadProxima,
          {
            actividad_id: 102,
            estado: 'Pendiente',
            fecha_prevista: '2026-10-30T12:00:00',
            eliminado: false,
          },
          {
            actividad_id: 103,
            estado: 'Completada',
            fecha_prevista: '2026-10-29T15:00:00',
            eliminado: false,
          },
          {
            actividad_id: 104,
            estado: 'Pendiente',
            fecha_prevista: '2026-10-29T09:00:00',
            eliminado: false,
          },
        ]);

      const resultado =
        await servicio.obtenerAvisosProximosVencer();

      expect(resultado.ok).toBe(true);
      expect(resultado.avisos).toHaveLength(1);
      expect(resultado.total).toBe(1);

      expect(resultado.avisos[0]).toEqual(
        expect.objectContaining({
          actividad_id: 101,
          nombre_mascota: 'Firulais',
          estado: 'Pendiente',
          destacar: true,
          aviso: 'Actividad próxima a vencer',
          accion: 'Ver actividad',
        })
      );

      expect(
        repositorio.consultarActividadesProximasAVencer
      ).toHaveBeenCalledTimes(1);

      expect(aplicarAvisoVisual).toHaveBeenCalledTimes(1);

      expect(aplicarAvisoVisual).toHaveBeenCalledWith(
        expect.objectContaining({
          actividad_id: 101,
          destacar: true,
        })
      );
    }
  );

  // ==========================================================
  // CP02 — ERROR AL APLICAR AVISO VISUAL
  // ==========================================================

  test(
    'CP02: debe informar cuando ocurre un error al aplicar el aviso visual',
    async () => {
      repositorio.consultarActividadesProximasAVencer
        .mockResolvedValue([
          actividadProxima,
        ]);

      aplicarAvisoVisual.mockImplementation(() => {
        throw new Error(
          'Error al destacar la tarjeta'
        );
      });

      const resultado =
        await servicio.obtenerAvisosProximosVencer();

      expect(resultado.ok).toBe(false);
      expect(resultado.avisos).toEqual([]);

      expect(resultado.mensaje).toBe(
        'No se pudo mostrar el aviso de actividad a vencer. Intente nuevamente'
      );

      expect(aplicarAvisoVisual).toHaveBeenCalledTimes(1);
    }
  );

  // ==========================================================
  // CP03 — FECHA PREVISTA INVÁLIDA
  // ==========================================================

  test(
    'CP03: debe informar cuando la fecha prevista de una actividad es inválida',
    async () => {
      repositorio.consultarActividadesProximasAVencer
        .mockResolvedValue([
          {
            actividad_id: 105,
            atencion_id: 20,
            estado: 'Pendiente',
            fecha_prevista: 'fecha-invalida',
            eliminado: false,
          },
        ]);

      const resultado =
        await servicio.obtenerAvisosProximosVencer();

      expect(resultado.ok).toBe(false);
      expect(resultado.avisos).toEqual([]);

      expect(resultado.mensaje).toBe(
        'No se pudo verificar la fecha prevista de la actividad'
      );

      expect(aplicarAvisoVisual).not.toHaveBeenCalled();
    }
  );

  // ==========================================================
  // CP04 — ERROR AL VERIFICAR VENCIMIENTO
  // ==========================================================

  test(
    'CP04: debe informar cuando no se puede obtener la fecha actual para verificar el vencimiento',
    async () => {
      obtenerFechaActual.mockImplementation(() => {
        throw new Error(
          'No se pudo obtener la fecha actual'
        );
      });

      const resultado =
        await servicio.obtenerAvisosProximosVencer();

      expect(resultado.ok).toBe(false);
      expect(resultado.avisos).toEqual([]);

      expect(resultado.mensaje).toBe(
        'No se pudo verificar el vencimiento de la actividad'
      );

      expect(
        repositorio.consultarActividadesProximasAVencer
      ).not.toHaveBeenCalled();

      expect(aplicarAvisoVisual).not.toHaveBeenCalled();
    }
  );
});
