/**
 * Carta institucional de la Direccion de Ejecucion de Contrataciones.
 *
 * La Directiva 002-2026-ANIN no trae un anexo para las cartas de ampliacion,
 * modificacion, apercibimiento ni resolucion: son cartas simples (7.3.5.4,
 * 7.3.7.2.e, 7.3.7.3). Un solo formato para todas, con el cuerpo que arma cada
 * modulo. Sin leyendas del sistema (ESTANDARES 4.7): lo que va es lo que
 * llevaria la carta en papel.
 */

const NEGRO = '#000000';

export interface CartaAnin {
  numero: string | null;
  fecha: Date;
  destinatario: string;
  documentoDestinatario?: string | null;
  correoDestinatario?: string | null;
  asunto: string;
  referencia: string;
  /** Parrafos del cuerpo, en orden. */
  parrafos: string[];
  /** Cargo de quien firma. */
  firmante: string;
  cargoFirmante: string;
  codigoExpediente: string;
}

export function construirCartaAnin(c: CartaAnin): any {
  return {
    pageSize: 'A4',
    pageMargins: [64, 60, 64, 56],
    info: { title: `${c.numero || 'Carta'} · ${c.codigoExpediente}`, author: 'Autoridad Nacional de Infraestructura' },
    footer: (pagina: number, total: number) => ({
      margin: [64, 8, 64, 16],
      columns: [
        { text: c.codigoExpediente, fontSize: 8, color: NEGRO },
        { text: `Página ${pagina} de ${total}`, fontSize: 8, alignment: 'right', color: NEGRO }
      ]
    }),
    content: [
      { text: 'AUTORIDAD NACIONAL DE INFRAESTRUCTURA', style: 'entidad' },
      { text: 'Dirección de Ejecución de Contrataciones', style: 'direccion', margin: [0, 0, 0, 18] },

      { text: `Lima, ${fechaLarga(c.fecha)}`, style: 'cuerpo', margin: [0, 0, 0, 12] },
      { text: c.numero || 'CARTA N° ______-2026-ANIN-DEC', style: 'numero', margin: [0, 0, 0, 14] },

      { text: 'Señor(es):', style: 'cuerpo' },
      { text: c.destinatario, style: 'destinatario' },
      c.documentoDestinatario ? { text: c.documentoDestinatario, style: 'cuerpo' } : {},
      c.correoDestinatario ? { text: c.correoDestinatario, style: 'cuerpo' } : {},
      { text: 'Presente.-', style: 'cuerpo', margin: [0, 6, 0, 14] },

      {
        table: {
          widths: [70, '*'],
          body: [
            [{ text: 'Asunto:', style: 'rotulo' }, { text: c.asunto, style: 'cuerpoNegrita' }],
            [{ text: 'Referencia:', style: 'rotulo' }, { text: c.referencia, style: 'cuerpo' }]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 14]
      },

      ...c.parrafos.map(p => ({ text: p, style: 'cuerpo', margin: [0, 0, 0, 9] })),

      { text: 'Atentamente,', style: 'cuerpo', margin: [0, 18, 0, 46] },

      { text: '________________________________', alignment: 'center', style: 'cuerpo' },
      { text: c.firmante, alignment: 'center', style: 'cuerpoNegrita' },
      { text: c.cargoFirmante, alignment: 'center', style: 'cuerpo' },
      { text: 'Autoridad Nacional de Infraestructura', alignment: 'center', style: 'cuerpo' }
    ],
    styles: {
      entidad: { fontSize: 11, bold: true, alignment: 'center', color: NEGRO },
      direccion: { fontSize: 9.5, alignment: 'center', color: NEGRO },
      numero: { fontSize: 10.5, bold: true, color: NEGRO },
      destinatario: { fontSize: 10, bold: true, color: NEGRO },
      rotulo: { fontSize: 9.5, bold: true, color: NEGRO },
      cuerpo: { fontSize: 9.5, alignment: 'justify', color: NEGRO, lineHeight: 1.25 },
      cuerpoNegrita: { fontSize: 9.5, bold: true, color: NEGRO, lineHeight: 1.25 }
    },
    defaultStyle: { fontSize: 9.5, color: NEGRO }
  };
}

export function fechaLarga(d: Date): string {
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function fechaCorta(valor: string | Date | null | undefined): string {
  if (!valor) {
    return '____';
  }
  const soloFecha = typeof valor === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor) : null;
  const d = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
    : new Date(valor);
  return Number.isNaN(d.getTime()) ? '____' : d.toLocaleDateString('es-PE');
}

export function moneda(valor: number | null | undefined): string {
  return `S/ ${Number(valor || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
