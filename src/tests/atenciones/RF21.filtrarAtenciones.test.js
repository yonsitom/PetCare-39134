import {
  filtrarAtencionesPorEstado,
  obtenerFiltroEstadoInicial,
} from '../../services/atencionesFiltroServicio';

describe('RF21: Filtrar las atenciones según su estado', () => {
  // ARRANGE GENERAL: datos de prueba para los escenarios CP01 y CP04.
  const atenciones = [
    { atencion_id: 1, estado: 'Activa' },
    { atencion_id: 2, estado: 'Activa' },
    { atencion_id: 3, estado: 'Finalizada' },
  ];

  test('CP01 - Éxito: muestra solo las atenciones activas', () => {
    // ARRANGE: preparar las atenciones y el filtro seleccionado.
    const filtroEstado = 'Activa';

    // ACT: aplicar el filtro de estado.
    const resultado = filtrarAtencionesPorEstado(
      atenciones,
      filtroEstado
    );

    // ASSERT: verificar que solo se devuelvan las dos activas.
    expect(resultado).toHaveLength(2);
    expect(
      resultado.every((atencion) => atencion.estado === 'Activa')
    ).toBe(true);
  });

  test('CP02 - E1: muestra una lista vacía si no hay atenciones finalizadas', () => {
    // ARRANGE: preparar datos donde todas las atenciones están activas.
    const soloActivas = [
      { atencion_id: 1, estado: 'Activa' },
      { atencion_id: 2, estado: 'Activa' },
    ];
    const filtroEstado = 'Finalizada';

    // ACT: filtrar por atenciones finalizadas.
    const resultado = filtrarAtencionesPorEstado(
      soloActivas,
      filtroEstado
    );

    // ASSERT: comprobar que no existan resultados.
    expect(resultado).toEqual([]);
    expect(resultado).toHaveLength(0);
  });

  test('CP03 - E2: el controlador propaga el error si falla la consulta', async () => {
    // ARRANGE: simular un fallo del DAO sin consultar Supabase.
    jest.resetModules();

    jest.doMock('../../dao/atencionesDAO', () => ({
      consultarAtenciones: jest.fn().mockRejectedValue(
        new Error('Error simulado de conexión')
      ),
      consultarMascotasParaAtencion: jest.fn(),
      crearAtencionInicial: jest.fn(),
      guardarDatosConsulta: jest.fn(),
      consultarAtencionPorId: jest.fn(),
      consultarDatosConsulta: jest.fn(),
    }));

    jest.doMock('../../dao/actividadesDAO', () => ({
      consultarActividadesPorAtencion: jest.fn(),
      validarQueNoExistaActividadAbierta: jest.fn(),
    }));

    try {
      // ACT: cargar el controlador y ejecutar la consulta simulada.
      const controlador = require(
        '../../controllers/atenciones/atencionesControlador'
      );

      // ASSERT: comprobar que se propaga el error esperado.
      await expect(
        controlador.listarAtenciones()
      ).rejects.toThrow('Error simulado de conexión');
    } finally {
      // LIMPIEZA: retirar los mocks para no afectar otras pruebas.
      jest.dontMock('../../dao/atencionesDAO');
      jest.dontMock('../../dao/actividadesDAO');
      jest.resetModules();
    }
  });

  test('CP04 - E3: el filtro predeterminado es Todas', () => {
    // ARRANGE: no se proporciona ningún estado inicial.
    const estadoParametro = undefined;

    // ACT: obtener el filtro inicial y filtrar las atenciones.
    const filtroInicial = obtenerFiltroEstadoInicial(estadoParametro);
    const resultado = filtrarAtencionesPorEstado(
      atenciones,
      filtroInicial
    );

    // ASSERT: comprobar que se selecciona Todas y se conservan los tres registros.
    expect(filtroInicial).toBe('Todas');
    expect(resultado).toHaveLength(3);
    expect(resultado).toEqual(atenciones);
  });
});
