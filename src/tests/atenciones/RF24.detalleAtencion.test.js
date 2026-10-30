
/**
 * PetCare - RF24
 * Consultar el detalle completo de una atención veterinaria.
 *
 * Patrón de pruebas: AAA
 * ARRANGE: preparar los datos y las dependencias simuladas.
 * ACT: ejecutar el controlador.
 * ASSERT: verificar el resultado y los mensajes esperados.
 */

const consultarAtencionPorIdMock = jest.fn();
const consultarActividadesPorAtencionMock = jest.fn();

function cargarControladorConMocks() {
  jest.resetModules();

  jest.doMock('../../dao/atencionesDAO', () => ({
    consultarAtenciones: jest.fn(),
    consultarMascotasParaAtencion: jest.fn(),
    crearAtencionInicial: jest.fn(),
    guardarDatosConsulta: jest.fn(),
    consultarAtencionPorId: consultarAtencionPorIdMock,
    consultarDatosConsulta: jest.fn(),
  }));

  jest.doMock('../../dao/actividadesDAO', () => ({
    consultarActividadesPorAtencion:
      consultarActividadesPorAtencionMock,
    validarQueNoExistaActividadAbierta: jest.fn(),
  }));

  return require(
    '../../controllers/atenciones/atencionesControlador'
  );
}

describe('RF24: Consultar el detalle completo de una atención veterinaria', () => {
  const atencionPrueba = {
    atencion_id: 1,
    estado: 'Activa',
    fecha_inicio: '2026-10-24T10:30:00.000Z',
    observaciones: 'Control veterinario',
    mascotas: {
      nombre: 'Firulais',
      especie: 'Perro',
      raza: 'Mestizo',
      numero_historia: 'HC-0001',
      propietarios: {
        propietario_id: 1,
        nombre: 'María',
        apellido: 'García',
        telefono: '999999999',
      },
    },
  };

  const actividadesPrueba = [
    {
      actividad_id: 10,
      atencion_id: 1,
      tipo: 'Consulta',
      estado: 'Completada',
      eliminado: false,
      observaciones: 'Evaluación inicial',
    },
    {
      actividad_id: 11,
      atencion_id: 1,
      tipo: 'Medicación',
      estado: 'Completada',
      eliminado: false,
      observaciones: 'Medicamento administrado',
    },
    {
      actividad_id: 12,
      atencion_id: 1,
      tipo: 'Vacunación',
      estado: 'Pendiente',
      eliminado: false,
      observaciones: null,
    },
    {
      actividad_id: 13,
      atencion_id: 1,
      tipo: 'Ecografía',
      estado: 'Pendiente',
      eliminado: false,
      observaciones: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    consultarAtencionPorIdMock.mockResolvedValue(atencionPrueba);

    consultarActividadesPorAtencionMock.mockResolvedValue(
      actividadesPrueba
    );
  });

  afterEach(() => {
    jest.dontMock('../../dao/atencionesDAO');
    jest.dontMock('../../dao/actividadesDAO');
    jest.resetModules();
  });

  test('CP01 - Éxito: devuelve la atención y todas sus actividades', async () => {
    // ARRANGE
    const controlador = cargarControladorConMocks();
    const atencionId = 1;

    // ACT
    const resultado =
      await controlador.obtenerDetalleCompletoAtencion(atencionId);

    // ASSERT
    expect(consultarAtencionPorIdMock).toHaveBeenCalledWith(atencionId);
    expect(consultarActividadesPorAtencionMock).toHaveBeenCalledWith(
      atencionId
    );

    expect(resultado.atencion).toEqual(
      expect.objectContaining({
        atencion_id: 1,
        estado: 'Activa',
        observaciones: 'Control veterinario',
      })
    );

    expect(resultado.actividades).toHaveLength(4);
    expect(
      resultado.actividades.filter(
        (actividad) => actividad.estado === 'Completada'
      )
    ).toHaveLength(2);

    const porcentajeProgreso = Math.round(
      (resultado.actividades.filter(
        (actividad) => actividad.estado === 'Completada'
      ).length /
        resultado.actividades.length) *
        100
    );

    expect(porcentajeProgreso).toBe(50);
  });

  test('CP02 - E1: informa cuando la atención no existe o ya no está disponible', async () => {
    // ARRANGE
    const controlador = cargarControladorConMocks();

    consultarAtencionPorIdMock.mockRejectedValue(
      new Error(
        'La atención seleccionada no se encuentra disponible.'
      )
    );

    // ACT y ASSERT
    await expect(
      controlador.obtenerDetalleCompletoAtencion(999)
    ).rejects.toThrow(
      'No se encontró la atención solicitada.'
    );

    expect(consultarActividadesPorAtencionMock).not.toHaveBeenCalled();
  });

  test('CP03 - E2: informa cuando no se puede cargar toda la información', async () => {
    // ARRANGE
    const controlador = cargarControladorConMocks();

    consultarActividadesPorAtencionMock.mockRejectedValue(
      new Error('Error simulado al consultar las actividades')
    );

    // ACT y ASSERT
    await expect(
      controlador.obtenerDetalleCompletoAtencion(1)
    ).rejects.toThrow(
      'No se pudo cargar toda la información de la atención. Intente nuevamente.'
    );

    expect(consultarAtencionPorIdMock).toHaveBeenCalledWith(1);
    expect(consultarActividadesPorAtencionMock).toHaveBeenCalledWith(1);
  });

  test('CP04 - E3: informa cuando falla la carga del detalle de la atención', async () => {
    // ARRANGE
    const controlador = cargarControladorConMocks();

    consultarAtencionPorIdMock.mockRejectedValue(
      new Error('Error simulado de conexión')
    );

    // ACT y ASSERT
    await expect(
      controlador.obtenerDetalleCompletoAtencion(1)
    ).rejects.toThrow(
      'No se pudo cargar el detalle de la atención. Intente nuevamente.'
    );

    expect(consultarAtencionPorIdMock).toHaveBeenCalledWith(1);
    expect(consultarActividadesPorAtencionMock).not.toHaveBeenCalled();
  });

  test('Valida el identificador vacío y no consulta los DAO', async () => {
    // ARRANGE
    const controlador = cargarControladorConMocks();

    // ACT y ASSERT
    await expect(
      controlador.obtenerDetalleCompletoAtencion(' ')
    ).rejects.toThrow(
      'No se encontró la atención solicitada.'
    );

    expect(consultarAtencionPorIdMock).not.toHaveBeenCalled();
    expect(consultarActividadesPorAtencionMock).not.toHaveBeenCalled();
  });
});
