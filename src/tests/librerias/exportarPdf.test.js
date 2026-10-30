// Pruebas de la exportación a PDF (expo-print + expo-sharing).
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async () => ({ uri: 'file:///cache/atencion.pdf' })),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  construirHtmlAtencion,
  escaparHtml,
  exportarAtencionPdf,
} from '../../services/exportarPdfServicio';

const atencion = { atencion_id: 15, estado: 'Activa', fecha_inicio: '2026-10-20T10:00:00Z' };
const mascota = { nombre: 'Luna', numero_historia: 'HC000001', especie: 'Perro' };
const actividades = [{ tipo: 'Vacunacion', estado: 'Pendiente' }];

describe('Exportar atención a PDF', () => {
  test('escapa el HTML para evitar inyección de código', () => {
    expect(escaparHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(escaparHtml('')).toBe('No registrado');
  });

  test('el HTML incluye los datos de la mascota y sus actividades', () => {
    const html = construirHtmlAtencion({ atencion, mascota, actividades });
    expect(html).toContain('Luna');
    expect(html).toContain('HC000001');
    expect(html).toContain('Vacunacion');
  });

  test('genera el PDF y abre el menú para compartirlo', async () => {
    const uri = await exportarAtencionPdf({ atencion, mascota, actividades });

    expect(Print.printToFileAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file:///cache/atencion.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' })
    );
    expect(uri).toBe('file:///cache/atencion.pdf');
  });

  test('lanza un error si no hay atención cargada', async () => {
    await expect(exportarAtencionPdf({ atencion: null })).rejects.toThrow(
      'No hay una atención cargada para exportar.'
    );
  });
});
