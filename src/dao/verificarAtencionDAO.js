
import { consultarActividadesPorAtencion } from './actividadesDAO';

const ESTADOS_TERMINALES = ['Completada', 'No realizada'];

/**
 * RF26: comprueba si todas las actividades vigentes
 * tienen un estado terminal.
 *
 * No modifica ni finaliza la atención.
 */
export async function verificarAtencionListaParaFinalizar(
  atencionId
) {
  if (
    atencionId === undefined ||
    atencionId === null ||
    String(atencionId).trim() === ''
  ) {
    throw new Error(
      'No se indicó la atención que desea verificar.'
    );
  }

  const actividades =
    await consultarActividadesPorAtencion(atencionId);

  const lista = (actividades ?? []).filter(
    (actividad) => actividad?.eliminado !== true
  );

  const completadas = lista.filter(
    (actividad) => actividad.estado === 'Completada'
  ).length;

  const noRealizadas = lista.filter(
    (actividad) => actividad.estado === 'No realizada'
  ).length;

  const pendientes = lista.filter(
    (actividad) => actividad.estado === 'Pendiente'
  ).length;

  const listaParaFinalizar =
    lista.length > 0 &&
    lista.every((actividad) =>
      ESTADOS_TERMINALES.includes(actividad?.estado)
    );

  return {
    listaParaFinalizar,
    totalActividades: lista.length,
    pendientes,
    completadas,
    noRealizadas,
  };
}
