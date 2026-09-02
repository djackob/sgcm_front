import { RequerimientoDetalle } from '../models/requerimiento.model';
import { nombreCompletoLocador, proveedorPrincipal } from './filtro-idoneidad.util';
import { CONFLICTO_INTERESES } from './anexo3-tdr.plantilla';

/** Anexo N.° 7: DJ de prohibiciones e incompatibilidades. */
export const TIPO_ANEXO_7 = 'REQ_DJ_ANEXO7';
export const CARPETA_ANEXO_7 = 'requerimiento';

const NEGRO = '#000000';

export function nombreArchivoAnexo7(detalle: { Codigo?: string }): string {
  return `Anexo 7 - ${detalle.Codigo || 'requerimiento'}.pdf`;
}

export function construirAnexo7Dj(detalle: RequerimientoDetalle | any): any {
  const proveedor = proveedorPrincipal(detalle);
  const nombre = nombreCompletoLocador(proveedor) || '________________________________';
  const dni = proveedor?.Dni || '________________';
  const codigo = detalle?.Codigo || '';
  const denominacion = detalle?.Denominacion || '';

  return {
    pageSize: 'A4',
    pageMargins: [56, 52, 56, 48],
    info: {
      title: `Anexo N.° 7 · ${codigo}`,
      author: 'Autoridad Nacional de Infraestructura'
    },
    footer: (pagina: number, total: number) => ({
      margin: [56, 8, 56, 16],
      text: `Página ${pagina} de ${total}`,
      fontSize: 8,
      alignment: 'right',
      color: NEGRO
    }),
    content: [
      { text: 'ANEXO N.° 07', style: 'titulo' },
      {
        text: 'DECLARACIÓN JURADA SOBRE PROHIBICIONES E INCOMPATIBILIDADES',
        style: 'subtitulo',
        margin: [0, 6, 0, 14]
      },
      { text: `Requerimiento: ${codigo}`, style: 'dato' },
      { text: `Denominación: ${denominacion}`, style: 'dato', margin: [0, 0, 0, 12] },
      {
        text: `Yo, ${nombre}, identificado/a con DNI/CE N.° ${dni}, en calidad de locador propuesto, declaro bajo juramento:`,
        style: 'cuerpo',
        margin: [0, 0, 0, 10]
      },
      {
        ol: [
          'No encontrarme incurso en las prohibiciones e incompatibilidades previstas en la Ley N.° 31564, Ley de prevención y mitigación del conflicto de intereses en el acceso y salida de personal del servicio público, y su reglamento.',
          'No estar impedido para contratar con el Estado, conforme a la Ley N.° 32069, Ley General de Contrataciones Públicas, y su Reglamento aprobado por Decreto Supremo N.° 009-2025-EF.',
          'Que la información que presento en la cotización (Anexo 6) y en esta declaración es veraz y no contiene documentación falsa o inexacta.',
          'Conocer que la presentación con información inexacta o falsa de esta declaración es causal de resolución, y que el incumplimiento de los impedimentos del artículo 5 de la Ley N.° 31564 acarrea inhabilitación por cinco años para contratar o prestar servicios al Estado, bajo cualquier modalidad.'
        ],
        style: 'cuerpo',
        margin: [0, 0, 0, 12]
      },
      { text: 'Marco específico (Ley N.° 31564)', style: 'seccion' },
      { text: CONFLICTO_INTERESES, style: 'cuerpo', margin: [0, 6, 0, 16] },
      {
        text: '_________________________________\nFirma, nombres y DNI del locador\nFecha: ____ / ____ / ________',
        style: 'firma',
        alignment: 'center',
        margin: [0, 28, 0, 0]
      }
    ],
    styles: {
      titulo: { fontSize: 13, bold: true, alignment: 'center', color: NEGRO },
      subtitulo: { fontSize: 10, bold: true, alignment: 'center', color: NEGRO },
      seccion: { fontSize: 11, bold: true, color: NEGRO },
      dato: { fontSize: 9, color: NEGRO, margin: [0, 0, 0, 2] },
      cuerpo: { fontSize: 9, alignment: 'justify', color: NEGRO },
      firma: { fontSize: 9, color: NEGRO }
    },
    defaultStyle: { fontSize: 9, color: NEGRO }
  };
}
