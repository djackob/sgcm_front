import { RequerimientoDetalle } from '../models/requerimiento.model';
import { ANTICORRUPCION } from './anexo3-tdr.plantilla';

/** Instructivo de denuncia y Política de Integridad y Antisoborno ANIN. */
export const TIPO_PAQUETE_INTEGRIDAD = 'REQ_PAQUETE_INTEGRIDAD';
export const CARPETA_INTEGRIDAD = 'requerimiento';

const NEGRO = '#000000';

export function nombreArchivoIntegridad(detalle: { Codigo?: string }): string {
  return `Integridad y anticorrupcion - ${detalle.Codigo || 'requerimiento'}.pdf`;
}

export function construirPaqueteIntegridad(detalle: RequerimientoDetalle | any): any {
  const codigo = detalle?.Codigo || '';

  return {
    pageSize: 'A4',
    pageMargins: [56, 52, 56, 48],
    info: {
      title: `Integridad ANIN · ${codigo}`,
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
      { text: 'AUTORIDAD NACIONAL DE INFRAESTRUCTURA', style: 'titulo' },
      {
        text: 'INSTRUCTIVO PARA DENUNCIAR PRESUNTOS ACTOS DE CORRUPCIÓN Y POLÍTICA DE INTEGRIDAD Y ANTISOBORNO',
        style: 'subtitulo',
        margin: [0, 6, 0, 14]
      },
      { text: `Expediente de referencia: ${codigo}`, style: 'dato', margin: [0, 0, 0, 12] },

      { text: '1. Instructivo para denunciar un presunto acto de corrupción', style: 'seccion' },
      {
        text: 'Cualquier persona puede comunicar a las autoridades competentes, de manera directa y oportuna, un presunto acto o conducta ilícita o corrupta de la que tuviera conocimiento en el marco de esta contratación. El canal institucional de la ANIN está publicado en gob.pe:',
        style: 'cuerpo',
        margin: [0, 6, 0, 6]
      },
      {
        text: 'https://www.gob.pe/21129-denunciar-un-presunto-acto-de-corrupcion?child=61287',
        style: 'enlace',
        margin: [0, 0, 0, 10]
      },
      {
        text: 'La denuncia debe describir los hechos, fechas, personas involucradas (si se conocen) y, de ser posible, adjuntar la documentación de sustento. La ANIN protege la identidad del denunciante conforme a la normativa de integridad pública vigente.',
        style: 'cuerpo',
        margin: [0, 0, 0, 14]
      },

      { text: '2. Política de Integridad y Antisoborno de la ANIN', style: 'seccion' },
      {
        text: 'Aprobada por Resolución Jefatural N.° 083-2024-ANIN-JEF. Se transcribe la cláusula que el locador declara conocer y aceptar al presentar su cotización:',
        style: 'cuerpo',
        margin: [0, 6, 0, 8]
      },
      { text: ANTICORRUPCION, style: 'cuerpo', margin: [0, 0, 0, 12] },
      {
        text: 'Este documento forma parte del paquete de indagación de mercado (locación de servicios, invitación directa) y se entrega junto con el Anexo 3 (TDR), el Anexo 6 (cotización) y el Anexo 7 (declaración jurada).',
        style: 'nota'
      }
    ],
    styles: {
      titulo: { fontSize: 12, bold: true, alignment: 'center', color: NEGRO },
      subtitulo: { fontSize: 10, bold: true, alignment: 'center', color: NEGRO },
      seccion: { fontSize: 11, bold: true, color: NEGRO },
      dato: { fontSize: 9, color: NEGRO },
      cuerpo: { fontSize: 9, alignment: 'justify', color: NEGRO },
      enlace: { fontSize: 8, color: NEGRO },
      nota: { fontSize: 8, italics: true, color: NEGRO }
    },
    defaultStyle: { fontSize: 9, color: NEGRO }
  };
}
