/*
 * Exportación del detalle de una atención a PDF.
 *
 * Librerías:
 * - expo-print: genera el archivo PDF a partir de una plantilla HTML.
 * - expo-sharing: abre el menú del sistema para compartir el archivo
 *   (WhatsApp, correo, Drive, etc.).
 *
 * Seguridad: todos los textos se escapan antes de insertarlos en el
 * HTML para evitar inyección de código, y el archivo se genera en la
 * carpeta temporal privada de la aplicación.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { logger } from '../utils/logger';

const log = logger.modulo('ExportarPDF');

export function escaparHtml(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') {
    return 'No registrado';
  }

  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fecha(valor) {
  if (!valor) return 'No registrada';
  const f = new Date(valor);
  if (Number.isNaN(f.getTime())) return 'No disponible';
  return f.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const tipoActividad = (a) =>
  a?.tipos_actividad?.nombre || a?.tipo || 'Actividad';

export function construirHtmlAtencion({ atencion, mascota, actividades = [] }) {
  const filas = actividades.length
    ? actividades
        .map(
          (a, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escaparHtml(tipoActividad(a))}</td>
          <td>${escaparHtml(a.estado)}</td>
          <td>${escaparHtml(fecha(a.fecha_prevista))}</td>
          <td>${escaparHtml(a.observaciones)}</td>
        </tr>`
        )
        .join('')
    : '<tr><td colspan="5">La atención no tiene actividades registradas.</td></tr>';

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" />
<style>
  body { font-family: Arial, sans-serif; color: #243746; padding: 24px; }
  h1 { color: #12665E; margin: 0 0 4px; }
  .sub { color: #718096; margin-bottom: 20px; }
  h2 { color: #104F49; border-bottom: 2px solid #E0EAE7; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #12665E; color: #fff; text-align: left; padding: 6px; }
  td { border-bottom: 1px solid #E0EAE7; padding: 6px; vertical-align: top; }
  .datos td:first-child { font-weight: bold; width: 35%; }
  .pie { margin-top: 24px; font-size: 10px; color: #718096; }
</style></head>
<body>
  <h1>PetCare · Detalle de atención</h1>
  <div class="sub">Generado el ${escaparHtml(fecha(new Date()))}</div>

  <h2>Mascota</h2>
  <table class="datos">
    <tr><td>Nombre</td><td>${escaparHtml(mascota?.nombre)}</td></tr>
    <tr><td>N.° de historia clínica</td><td>${escaparHtml(mascota?.numero_historia || atencion?.numero_historia)}</td></tr>
    <tr><td>Especie</td><td>${escaparHtml(mascota?.especie)}</td></tr>
    <tr><td>Raza</td><td>${escaparHtml(mascota?.raza)}</td></tr>
  </table>

  <h2>Atención</h2>
  <table class="datos">
    <tr><td>Código</td><td>${escaparHtml(atencion?.atencion_id)}</td></tr>
    <tr><td>Estado</td><td>${escaparHtml(atencion?.estado)}</td></tr>
    <tr><td>Fecha de inicio</td><td>${escaparHtml(fecha(atencion?.fecha_inicio))}</td></tr>
    <tr><td>Fecha de fin</td><td>${escaparHtml(fecha(atencion?.fecha_fin))}</td></tr>
    <tr><td>Observaciones</td><td>${escaparHtml(atencion?.observaciones)}</td></tr>
  </table>

  <h2>Actividades</h2>
  <table>
    <tr><th>#</th><th>Tipo</th><th>Estado</th><th>Fecha prevista</th><th>Observaciones</th></tr>
    ${filas}
  </table>

  <div class="pie">Documento generado por PetCare. Uso interno de la veterinaria.</div>
</body></html>`;
}

/**
 * Genera el PDF de la atención y abre el menú para compartirlo.
 * Devuelve la ruta (URI) del archivo generado.
 */
export async function exportarAtencionPdf({ atencion, mascota, actividades }) {
  if (!atencion) {
    throw new Error('No hay una atención cargada para exportar.');
  }

  const html = construirHtmlAtencion({ atencion, mascota, actividades });
  const { uri } = await Print.printToFileAsync({ html });

  log.info('PDF generado para la atención', atencion.atencion_id);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Compartir detalle de atención',
      UTI: 'com.adobe.pdf',
    });
  } else {
    log.warn('El dispositivo no permite compartir archivos.');
  }

  return uri;
}
