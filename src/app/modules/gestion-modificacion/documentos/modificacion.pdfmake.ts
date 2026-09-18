import { SolicitudDetalle } from '../models/modificacion.model';
import { CartaAnin, construirCartaAnin, fechaCorta, fechaLarga, moneda } from '../../../shared/documentos/carta-anin.pdfmake';

const NEGRO = '#000000';

/**
 * Acta de modificacion del contrato menor (Directiva 7.3.4.3).
 *
 * No hay anexo oficial: es el acta que suscriben la DEC y el contratista y se
 * registra en Pladicop. Los datos salen del contrato y de la solicitud; donde
 * el dato todavia no existe va la linea en blanco, como en el papel.
 */
export function nombreArchivoActa(s: SolicitudDetalle): string {
  return `Acta de modificacion - ${s.Codigo}.pdf`;
}

export function construirActaModificacion(s: SolicitudDetalle, firmante: string): any {
  return {
    pageSize: 'A4',
    pageMargins: [60, 54, 60, 50],
    info: { title: `Acta de modificación · ${s.Codigo}`, author: 'Autoridad Nacional de Infraestructura' },
    footer: (pagina: number, total: number) => ({
      margin: [60, 8, 60, 16], text: `Página ${pagina} de ${total}`, fontSize: 8, alignment: 'right', color: NEGRO
    }),
    content: [
      { text: 'ACTA DE MODIFICACIÓN DEL CONTRATO MENOR', style: 'titulo' },
      { text: s.NumeroActa || 'ACTA N° ______-2026-ANIN-DEC', style: 'subtitulo', margin: [0, 2, 0, 16] },

      {
        text: `En Lima, a los ${fechaLarga(new Date())}, la Autoridad Nacional de Infraestructura, a través de la `
            + 'Dirección de Ejecución de Contrataciones, y el contratista que se identifica en la presente acta, '
            + 'de común acuerdo y conforme al numeral 7.3.4 de la Directiva N.° 002-2026-ANIN, dejan constancia de la '
            + 'modificación del contrato menor que se detalla a continuación, la misma que no aumenta el monto '
            + 'contractual ni desnaturaliza el requerimiento.',
        style: 'cuerpo', margin: [0, 0, 0, 14]
      },

      { text: 'CONTRATO', style: 'seccion' },
      {
        table: {
          widths: [190, '*'],
          body: [
            [cab('ORDEN (O/S - O/C)'), cel(s.NumeroOrdenSiga)],
            [cab('REQUERIMIENTO'), cel(s.CodigoRequerimiento)],
            [cab('OBJETO'), cel(s.Denominacion)],
            [cab('CONTRATISTA'), cel(s.NombreProveedor)],
            [cab('RUC / DNI'), cel(s.RucProveedor || s.DniProveedor)],
            [cab('MONTO CONTRACTUAL'), cel(moneda(s.MontoContrato))],
            [cab('PLAZO DE EJECUCIÓN'), cel(`${s.PlazoDias} días · del ${fechaCorta(s.FechaInicio)} al ${fechaCorta(s.FechaFinPrevista)}`)],
            [cab('ÁREA USUARIA'), cel(s.UnidadOrigenNombre)]
          ]
        },
        layout: marco(), margin: [0, 4, 0, 14]
      },

      { text: 'MODIFICACIÓN ACORDADA', style: 'seccion' },
      {
        table: {
          widths: ['*'],
          body: [
            [cab('SOLICITUD')],
            [{ text: `${s.Codigo} · ${s.Asunto} · presentada por ${s.Origen === 'PROVEEDOR' ? 'el contratista' : 'el área usuaria'} el ${fechaCorta(s.FechaPresentacion)}`, style: 'valor', margin: [4, 5, 4, 5] }],
            [cab('CLÁUSULAS QUE SE MODIFICAN')],
            [{ text: s.DetalleModificacion || '', style: 'valor', margin: [4, 6, 4, 14] }],
            [cab('SUSTENTO DEL ÁREA USUARIA')],
            [{ text: s.InformeAu || '', style: 'valor', margin: [4, 6, 4, 14] }],
            [cab('PRONUNCIAMIENTO DE LA DEC')],
            [{ text: s.MotivoDec || '', style: 'valor', margin: [4, 6, 4, 14] }]
          ]
        },
        layout: marco(), margin: [0, 4, 0, 14]
      },

      {
        text: 'Las demás condiciones del contrato menor se mantienen inalterables. La presente acta forma parte '
            + 'integrante del contrato menor y se registra en la Plataforma Digital de Contrataciones Públicas.',
        style: 'cuerpo', margin: [0, 0, 0, 40]
      },

      {
        columns: [
          {
            width: '*', stack: [
              { text: '________________________________', alignment: 'center', style: 'valor' },
              { text: firmante, alignment: 'center', style: 'firmante' },
              { text: 'Jefe(a) de la Unidad de Abastecimiento', alignment: 'center', style: 'valor' },
              { text: 'Autoridad Nacional de Infraestructura', alignment: 'center', style: 'valor' }
            ]
          },
          {
            width: '*', stack: [
              { text: '________________________________', alignment: 'center', style: 'valor' },
              { text: s.NombreProveedor || '', alignment: 'center', style: 'firmante' },
              { text: s.RucProveedor ? `RUC ${s.RucProveedor}` : (s.DniProveedor ? `DNI ${s.DniProveedor}` : ''), alignment: 'center', style: 'valor' },
              { text: 'Contratista', alignment: 'center', style: 'valor' }
            ]
          }
        ]
      }
    ],
    styles: {
      titulo: { fontSize: 12, bold: true, alignment: 'center', color: NEGRO },
      subtitulo: { fontSize: 10, bold: true, alignment: 'center', color: NEGRO },
      seccion: { fontSize: 9, bold: true, color: NEGRO },
      cuerpo: { fontSize: 9.5, alignment: 'justify', color: NEGRO, lineHeight: 1.25 },
      cabecera: { fontSize: 7.5, bold: true, color: NEGRO },
      valor: { fontSize: 9, color: NEGRO },
      firmante: { fontSize: 9, bold: true, color: NEGRO }
    },
    defaultStyle: { fontSize: 9, color: NEGRO }
  };
}

/** Carta de respuesta a la solicitud (ampliacion aprobada/denegada, modificacion denegada). */
export function nombreArchivoCarta(s: SolicitudDetalle): string {
  return `Carta de respuesta - ${s.Codigo}.pdf`;
}

export function construirCartaRespuesta(s: SolicitudDetalle, resultado: 'APROBADA' | 'DENEGADA', motivo: string,
                                        diasOtorgados: number | null, numero: string | null, firmante: string): any {
  const esAmp = s.Tipo === 'AMPLIACION_PLAZO';
  const parrafos: string[] = [];

  parrafos.push(
    `Es grato dirigirme a usted en relación con la orden ${s.NumeroOrdenSiga || '____'}, correspondiente a «${s.Denominacion}», `
    + `y a su ${esAmp ? 'solicitud de ampliación de plazo' : 'solicitud de modificación del contrato'} presentada el ${fechaCorta(s.FechaPresentacion)} `
    + `(expediente ${s.Codigo}).`
  );

  if (esAmp && resultado === 'APROBADA') {
    const dias = diasOtorgados ?? s.DiasSolicitados ?? 0;
    const fin = s.FechaFinPrevista ? new Date(s.FechaFinPrevista) : null;
    if (fin) { fin.setDate(fin.getDate() + dias); }
    parrafos.push(
      `Al respecto, luego de la evaluación efectuada por el área usuaria y conforme al numeral 7.3.5 de la Directiva N.° 002-2026-ANIN, `
      + `se ha determinado la PROCEDENCIA de la ampliación del plazo contractual por ${dias} día(s) calendario, `
      + `con lo cual el nuevo término del plazo de ejecución es el ${fin ? fechaCorta(fin) : '____'}.`
    );
  } else if (esAmp) {
    parrafos.push(
      `Al respecto, conforme al numeral 7.3.5 de la Directiva N.° 002-2026-ANIN, se ha determinado la IMPROCEDENCIA `
      + 'de la ampliación del plazo contractual solicitada, manteniéndose el plazo de ejecución vigente.'
    );
  } else {
    parrafos.push(
      'Al respecto, conforme al numeral 7.3.4 de la Directiva N.° 002-2026-ANIN, la Dirección de Ejecución de Contrataciones '
      + 'ha determinado que la modificación solicitada no resulta procedente, manteniéndose las condiciones contractuales vigentes.'
    );
  }

  parrafos.push(`Sustento: ${motivo}`);
  parrafos.push('Sin otro particular, quedo de usted.');

  const carta: CartaAnin = {
    numero,
    fecha: new Date(),
    destinatario: s.NombreProveedor || 'Contratista',
    documentoDestinatario: s.RucProveedor ? `RUC ${s.RucProveedor}` : (s.DniProveedor ? `DNI ${s.DniProveedor}` : null),
    correoDestinatario: s.CorreoProveedor,
    asunto: esAmp
      ? `Respuesta a solicitud de ampliación de plazo – orden ${s.NumeroOrdenSiga || ''}`
      : `Respuesta a solicitud de modificación del contrato – orden ${s.NumeroOrdenSiga || ''}`,
    referencia: `Solicitud ${s.Codigo} del ${fechaCorta(s.FechaPresentacion)}`,
    parrafos,
    firmante,
    cargoFirmante: 'Dirección de Ejecución de Contrataciones',
    codigoExpediente: s.Codigo
  };
  return construirCartaAnin(carta);
}

function marco(): any {
  return { hLineColor: () => NEGRO, vLineColor: () => NEGRO, hLineWidth: () => 0.6, vLineWidth: () => 0.6 };
}
function cab(t: string): any { return { text: t, style: 'cabecera', margin: [3, 4, 3, 4] }; }
function cel(v: string | number | null | undefined): any { return { text: v === null || v === undefined ? '' : String(v), style: 'valor', margin: [3, 5, 3, 5] }; }
