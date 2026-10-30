
/**
 * PETCARE - RF50
 * Consultar los cambios realizados en la información registrada.
 *
 * TDD - Pruebas unitarias.
 *
 * Se contemplan únicamente los cuatro escenarios definidos:
 * CP01, CP02, CP03 y CP04.
 */

jest.mock("../../dao/administracion/historialCambiosDAO", () => ({
  obtenerHistorialCambios: jest.fn(),
  obtenerDetalleHistorial: jest.fn(),
}));

import {
  obtenerHistorialCambios,
} from "../../dao/administracion/historialCambiosDAO";

import {
  consultarHistorialCambios,
} from "../../services/administracion/historialCambiosService";

describe("RF50 - Consultar los cambios realizados en la información registrada", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // CP01: Consulta exitosa de cambios coincidentes.
  test("CP01 - Debe mostrar los cambios que coinciden con los filtros seleccionados", async () => {
    const filtros = {
      usuario: "Camila",
      tipoInformacion: "Atención",
      tipoAccion: "MODIFICAR",
      fechaDesde: "2026-10-01",
      fechaHasta: "2026-10-31",
    };

    const registros = [
      {
        historial_cambio_id: 1,
        usuario_id: "usuario-001",
        rol_usuario: "Administrador",
        atencion_id: 15,
        actividad_id: null,
        tipo_accion: "MODIFICAR",
        datos_anteriores: {
          observaciones: "Observación anterior",
        },
        datos_nuevos: {
          observaciones: "Observación actualizada",
        },
        fecha_cambio: "2026-10-20T10:30:00.000Z",
      },
    ];

    obtenerHistorialCambios.mockResolvedValue(registros);

    const resultado = await consultarHistorialCambios(filtros);

    expect(obtenerHistorialCambios).toHaveBeenCalledWith(filtros);
    expect(resultado.correcto).toBe(true);
    expect(resultado.datos).toEqual(registros);
  });

  // CP02: No existen cambios coincidentes.
  test("CP02 - Debe informar cuando no existen cambios que coincidan con los filtros", async () => {
    const filtros = {
      usuario: "Usuario inexistente",
      tipoInformacion: "Actividad",
      tipoAccion: "ELIMINAR",
      fechaDesde: "2026-10-01",
      fechaHasta: "2026-10-31",
    };

    obtenerHistorialCambios.mockResolvedValue([]);

    const resultado = await consultarHistorialCambios(filtros);

    expect(obtenerHistorialCambios).toHaveBeenCalledWith(filtros);
    expect(resultado.correcto).toBe(false);
    expect(resultado.datos).toEqual([]);
    expect(resultado.mensaje).toBe(
      "No existen cambios que coincidan con los filtros seleccionados"
    );
  });

  // CP03: Filtros inválidos o incompletos.
  test("CP03 - Debe rechazar filtros inválidos o incompletos antes de consultar", async () => {
    const filtros = {
      usuario: "",
      tipoInformacion: "Todos",
      tipoAccion: "Todos",
      fechaDesde: "2026-10-25",
      fechaHasta: "",
    };

    const resultado = await consultarHistorialCambios(filtros);

    expect(obtenerHistorialCambios).not.toHaveBeenCalled();
    expect(resultado.correcto).toBe(false);
    expect(resultado.datos).toEqual([]);
    expect(resultado.mensaje).toBe(
      "Seleccione filtros válidos para realizar la consulta"
    );
  });

  // CP04: Error técnico al consultar.
  test("CP04 - Debe informar cuando ocurre un error técnico al cargar el historial", async () => {
    const filtros = {
      usuario: "",
      tipoInformacion: "Todos",
      tipoAccion: "Todos",
      fechaDesde: "",
      fechaHasta: "",
    };

    obtenerHistorialCambios.mockRejectedValue(
      new Error("Error de conexión con Supabase")
    );

    const resultado = await consultarHistorialCambios(filtros);

    expect(obtenerHistorialCambios).toHaveBeenCalledWith(filtros);
    expect(resultado.correcto).toBe(false);
    expect(resultado.datos).toEqual([]);
    expect(resultado.mensaje).toBe(
      "No fue posible cargar el historial de cambios. Intente nuevamente"
    );
  });
});
