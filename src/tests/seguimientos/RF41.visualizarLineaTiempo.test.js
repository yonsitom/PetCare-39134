
/**
 * ============================================================
 * TDD - RF41: VISUALIZAR LÍNEA DE TIEMPO
 * Proyecto: PetCare - UTP
 * ============================================================
 *
 * CP01: Consulta exitosa de la línea de tiempo.
 * CP02: Atención sin eventos registrados.
 * CP03: Eventos con información incompleta y nueva consulta.
 * CP04: Error al consultar los eventos.
 *
 * Patrón:
 * - Inyección de dependencias.
 * - Repositorio simulado en memoria.
 * - Arrange, Act, Assert.
 * ============================================================
 */

const {
    crearLineaTiempoService
} = require('../../services/lineaTiempoServicio');

describe('RF41 - Visualizar línea de tiempo de una atención', () => {

    let repositorio;
    let servicio;

    const eventosPrueba = [
        {
            evento_id: 1,
            atencion_id: 100,
            actividad_id: null,
            tipo_evento: 'INICIO_ATENCION',
            descripcion: 'Inicio de atención veterinaria',
            fecha_evento: '2026-10-20T08:00:00Z',
            estado_anterior: null,
            estado_nuevo: 'Activa'
        },
        {
            evento_id: 2,
            atencion_id: 100,
            actividad_id: 15,
            tipo_evento: 'REGISTRO_ACTIVIDAD',
            descripcion: 'Registro de actividad: Consulta',
            fecha_evento: '2026-10-20T08:30:00Z',
            estado_anterior: null,
            estado_nuevo: 'Pendiente'
        },
        {
            evento_id: 3,
            atencion_id: 100,
            actividad_id: 15,
            tipo_evento: 'CAMBIO_ESTADO',
            descripcion: 'Actividad marcada como completada',
            fecha_evento: '2026-10-20T10:00:00Z',
            estado_anterior: 'Pendiente',
            estado_nuevo: 'Completada'
        },
        {
            evento_id: 4,
            atencion_id: 100,
            actividad_id: null,
            tipo_evento: 'FINALIZACION_ATENCION',
            descripcion: 'Atención veterinaria finalizada',
            fecha_evento: '2026-10-20T11:00:00Z',
            estado_anterior: 'Activa',
            estado_nuevo: 'Finalizada'
        }
    ];

    beforeEach(() => {
        repositorio = {
            consultarEventosPorAtencion: jest.fn()
        };

        servicio = crearLineaTiempoService(repositorio);
    });

    // ========================================================
    // CP01: Consulta exitosa de la línea de tiempo.
    // ========================================================

    test('CP01: Debe mostrar los eventos de la atención ordenados cronológicamente', async () => {

        // ARRANGE
        repositorio.consultarEventosPorAtencion.mockResolvedValue([
            eventosPrueba[2],
            eventosPrueba[0],
            eventosPrueba[3],
            eventosPrueba[1]
        ]);

        // ACT
        const resultado = await servicio.obtenerLineaTiempo(100);

        // ASSERT
        expect(resultado.exito).toBe(true);
        expect(resultado.eventos).toHaveLength(4);

        expect(
            resultado.eventos.map(evento => evento.evento_id)
        ).toEqual([1, 2, 3, 4]);

        expect(
            repositorio.consultarEventosPorAtencion
        ).toHaveBeenCalledWith(100);
    });

    // ========================================================
    // CP02: Atención sin eventos registrados.
    // ========================================================

    test('CP02: Debe informar cuando la atención no tiene eventos registrados', async () => {

        // ARRANGE
        repositorio.consultarEventosPorAtencion.mockResolvedValue([]);

        // ACT
        const resultado = await servicio.obtenerLineaTiempo(100);

        // ASSERT
        expect(resultado.exito).toBe(true);
        expect(resultado.eventos).toEqual([]);

        expect(resultado.mensaje).toBe(
            'No existen eventos registrados para esta atención.'
        );
    });

    // ========================================================
    // CP03: Información incompleta y nueva consulta.
    // ========================================================

    test('CP03: Debe mostrar los eventos disponibles, advertir datos incompletos y permitir consultar nuevamente', async () => {

        // ARRANGE
        const eventoIncompleto = {
            ...eventosPrueba[2],
            descripcion: null
        };

        repositorio.consultarEventosPorAtencion
            .mockResolvedValueOnce([
                eventosPrueba[0],
                eventoIncompleto
            ])
            .mockResolvedValueOnce([
                eventosPrueba[0],
                eventosPrueba[2]
            ]);

        // ACT: primera consulta.
        const primeraConsulta = await servicio.obtenerLineaTiempo(100);

        // ACT: segunda consulta después de corregir la información.
        const segundaConsulta = await servicio.obtenerLineaTiempo(100);

        // ASSERT: información incompleta.
        expect(primeraConsulta.exito).toBe(true);
        expect(primeraConsulta.eventos).toHaveLength(2);
        expect(primeraConsulta.datosIncompletos).toBe(true);

        expect(primeraConsulta.advertencia).toBe(
            'Algunos eventos contienen información incompleta. Revise los datos disponibles.'
        );

        // ASSERT: información corregida.
        expect(segundaConsulta.exito).toBe(true);
        expect(segundaConsulta.datosIncompletos).toBe(false);
        expect(segundaConsulta.eventos).toHaveLength(2);

        expect(
            repositorio.consultarEventosPorAtencion
        ).toHaveBeenCalledTimes(2);
    });

    // ========================================================
    // CP04: Error al consultar los eventos.
    // ========================================================

    test('CP04: Debe informar el error sin mostrar resultados parciales', async () => {

        // ARRANGE
        repositorio.consultarEventosPorAtencion.mockRejectedValue(
            new Error('Error de conexión con Supabase')
        );

        // ACT
        const resultado = await servicio.obtenerLineaTiempo(100);

        // ASSERT
        expect(resultado.exito).toBe(false);
        expect(resultado.eventos).toEqual([]);

        expect(resultado.mensaje).toBe(
            'No fue posible cargar la línea de tiempo. Inténtelo nuevamente.'
        );
    });

});
