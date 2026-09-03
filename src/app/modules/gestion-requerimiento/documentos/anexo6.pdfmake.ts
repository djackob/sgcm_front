import {
  RequerimientoDetalle,
  montoTotalProveedor
} from '../models/requerimiento.model';
import { extraDatosAdicionales } from './anexo5.pdfmake';
import { nombreCompletoLocador, proveedorPrincipal } from './filtro-idoneidad.util';

/** Anexo N.° 6: cotización y DJ del locador (invitación uno a uno). */
export const TIPO_ANEXO_6 = 'REQ_COTIZACION_ANEXO6';
export const CARPETA_ANEXO_6 = 'requerimiento';

const NEGRO = '#000000';

export function nombreArchivoAnexo6(detalle: { Codigo?: string }): string {
  return `Anexo 6 - ${detalle.Codigo || 'requerimiento'}.pdf`;
}

export function construirAnexo6Cotizacion(detalle: RequerimientoDetalle | any): any {
  const proveedor = proveedorPrincipal(detalle);
  const extra = extraDatosAdicionales(detalle);
  const nombre = nombreCompletoLocador(proveedor) || '________________________________';
  const dni = proveedor?.Dni || '________________';
  const ruc = proveedor?.Ruc || '________________';
  const email = proveedor?.Email || '________________';
  const celular = proveedor?.Celular || '________________';
  const direccion = proveedor?.Direccion || '________________________________';
  const referencial = (proveedor ? montoTotalProveedor(proveedor) : 0)
    || Number(detalle?.Monto)
    || 0;
  const referencialTxt = referencial
    ? referencial.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '__________';
  const denominacion = detalle?.Denominacion || '';
  const codigo = detalle?.Codigo || '';

  return {
    pageSize: 'A4',
    pageMargins: [56, 52, 56, 48],
    info: {
      title: `Anexo N.° 6 · ${codigo}`,
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
      { text: 'ANEXO N.° 06', style: 'titulo' },
      {
        text: 'FORMATO DE COTIZACIÓN Y DECLARACIÓN JURADA DEL PROVEEDOR (PERSONA NATURAL — LOCACIÓN DE SERVICIOS)',
        style: 'subtitulo',
        margin: [0, 6, 0, 14]
      },
      { text: `Requerimiento: ${codigo}`, style: 'dato', margin: [0, 0, 0, 2] },
      { text: `Denominación: ${denominacion}`, style: 'dato', margin: [0, 0, 0, 12] },

      { text: '1. Datos del locador (Anexo 5)', style: 'seccion' },
      {
        table: {
          widths: [160, '*'],
          body: [
            fila('Nombres y apellidos', nombre),
            fila('DNI / CE', dni),
            fila('RUC', ruc),
            fila('Correo electrónico', email),
            fila('Celular', celular),
            fila('Domicilio', direccion)
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 4, 0, 12]
      },

      { text: '2. Propuesta económica', style: 'seccion' },
      {
        text: 'El monto se consigna en soles, redondeado a dos (2) dígitos decimales. El valor referencial del Área usuaria es informativo; el locador declara su propia propuesta.',
        style: 'nota',
        margin: [0, 4, 0, 8]
      },
      {
        table: {
          widths: [160, '*'],
          body: [
            fila('Valor referencial AU (S/)', referencialTxt),
            fila('Monto cotizado por el locador (S/)', '____________________'),
            fila('N.° de entregables', String(proveedor?.CantidadEntregables || extra?.CantidadEntregables || '______')),
            fila('Monto por entregable (S/)', '____________________')
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 12]
      },

      { text: '3. Datos bancarios (CCI)', style: 'seccion' },
      {
        table: {
          widths: [160, '*'],
          body: [
            fila('Banco', '________________________________'),
            fila('Tipo de cuenta', 'Ahorros / Corriente: ________'),
            fila('Número de cuenta', '________________________________'),
            fila('CCI (20 dígitos)', '________________________________')
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 4, 0, 12]
      },

      { text: '4. Declaraciones de ley', style: 'seccion' },
      {
        text: [
          'Declaro bajo juramento que la información consignada es veraz; que no me encuentro impedido para contratar con el Estado conforme a la Ley N.° 32069 y su Reglamento; que los montos están expresados en soles con dos decimales; y que asumo las consecuencias administrativas y penales por declaración falsa o inexacta.'
        ],
        style: 'cuerpo',
        margin: [0, 6, 0, 16]
      },

      {
        text: '_________________________________\nFirma, nombres y DNI del locador\nFecha: ____ / ____ / ________',
        style: 'firma',
        alignment: 'center',
        margin: [0, 24, 0, 0]
      }
    ],
    styles: {
      titulo: { fontSize: 13, bold: true, alignment: 'center', color: NEGRO },
      subtitulo: { fontSize: 10, bold: true, alignment: 'center', color: NEGRO },
      seccion: { fontSize: 11, bold: true, color: NEGRO, margin: [0, 4, 0, 0] },
      dato: { fontSize: 9, color: NEGRO },
      nota: { fontSize: 8, italics: true, color: NEGRO },
      cuerpo: { fontSize: 9, alignment: 'justify', color: NEGRO },
      etiqueta: { fontSize: 8, color: NEGRO },
      valor: { fontSize: 9, color: NEGRO },
      firma: { fontSize: 9, color: NEGRO }
    },
    defaultStyle: { fontSize: 9, color: NEGRO }
  };
}

function fila(etiqueta: string, valor: string): any[] {
  return [
    { text: etiqueta, style: 'etiqueta', bold: true },
    { text: valor, style: 'valor' }
  ];
}
