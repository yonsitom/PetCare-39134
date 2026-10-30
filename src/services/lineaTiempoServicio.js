
/**
 * ============================================================
 * PETCARE - SERVICIO DE LINEA DE TIEMPO
 * RF41: Visualizar eventos de una atención
 * ============================================================
 *
 * Arquitectura:
 * Controlador -> Servicio -> DAO -> Supabase
 *
 * TDD:
 * El repositorio se recibe mediante inyección de dependencias.
 * ============================================================
 */

export function crearLineaTiempoService(repositorio) {

  async function obtenerLineaTiempo(atencionId) {
    const respuestaVacia = {
      exito: false,
      eventos: [],
      mensaje: '',
      datosIncompletos: false,
      advertencia: '',
    };

    // Validación del identificador.
    if (
      atencionId === null ||
      atencionId === undefined ||
      String(atencionId).trim() === '' ||
      !Number.isInteger(Number(atencionId)) ||
      Number(atencionId) <= 0
    ) {
      return {
        ...respuestaVacia,
        mensaje: 'El identificador de la atención no es válido.',
      };
    }

    try {
      const resultado =
        await repositorio.consultarEventosPorAtencion(
          Number(atencionId)
        );

      const eventos = Array.isArray(resultado)
        ? [...resultado]
        : [];

      // Orden cronológico ascendente.
      eventos.sort((a, b) => {
        const fechaA = new Date(a.fecha_evento).getTime();
        const fechaB = new Date(b.fecha_evento).getTime();

        return fechaA - fechaB ||
          Number(a.evento_id ?? 0) - Number(b.evento_id ?? 0);
      });

      // CP02: no existen eventos.
      if (eventos.length === 0) {
        return {
          exito: true,
          eventos: [],
          mensaje:
            'No existen eventos registrados para esta atención.',
          datosIncompletos: false,
          advertencia: '',
        };
      }

      // CP03: identificar eventos con datos incompletos.
      const datosIncompletos = eventos.some((evento) => (
        !evento.fecha_evento ||
        !evento.tipo_evento ||
        !evento.descripcion
      ));

      return {
        exito: true,
        eventos,
        mensaje: '',
        datosIncompletos,
        advertencia: datosIncompletos
          ? 'Algunos eventos contienen información incompleta. Revise los datos disponibles.'
          : '',
      };

    } catch (error) {
      // CP04: no mostrar resultados parciales si falla la consulta.
      return {
        ...respuestaVacia,
        mensaje:
          'No fue posible cargar la línea de tiempo. Inténtelo nuevamente.',
      };
    }
  }

  return {
    obtenerLineaTiempo,
  };
}

/**
 * Repositorio real.
 * La implementación de persistencia permanece en el DAO.
 */
import {
  consultarEventosPorAtencion,
} from '../dao/eventosAtencionDAO';

const repositorioReal = {
  consultarEventosPorAtencion,
};

const lineaTiempoService =
  crearLineaTiempoService(repositorioReal);

export const obtenerLineaTiempo =
  lineaTiempoService.obtenerLineaTiempo;
