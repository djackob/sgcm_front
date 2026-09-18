import { CAUSALES, ProcedimientoDetalle } from '../models/resolucion.model';
import { CartaAnin, construirCartaAnin, fechaCorta } from '../../../shared/documentos/carta-anin.pdfmake';

/**
 * Las tres cartas del procedimiento de resolucion (Directiva 7.3.7). No hay
 * anexo oficial: son cartas simples de la DEC, con el formato institucional
 * compartido. El texto de fondo es el de la Directiva; lo variable sale del
 * procedimiento.
 */

function nombreCausal(codigo: string): string {
  return CAUSALES.find(c => c.codigo === codigo)?.nombre || codigo;
}

function encabezado(p: ProcedimientoDetalle): string {
  return `Es grato dirigirme a usted en relación con la orden ${p.NumeroOrdenSiga || '____'}, correspondiente a «${p.Denominacion}» `
       + `(requerimiento ${p.CodigoRequerimiento}), cuya ejecución se inició el ${fechaCorta(p.ContratoInicio)} con término previsto el ${fechaCorta(p.ContratoFin)}.`;
}

export function nombreArchivoCartaApercibimiento(p: ProcedimientoDetalle): string {
  return `Carta de apercibimiento - ${p.Codigo}.pdf`;
}

/** 7.3.7.2.b: requerir el cumplimiento bajo apercibimiento de resolver, con el plazo que fijo la DEC. */
export function construirCartaApercibimiento(p: ProcedimientoDetalle, numero: string | null, firmante: string): any {
  const dias = p.PlazoApercibimientoDias || 0;
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  const carta: CartaAnin = {
    numero,
    fecha: new Date(),
    destinatario: p.NombreProveedor || 'Contratista',
    documentoDestinatario: p.RucProveedor ? `RUC ${p.RucProveedor}` : (p.DniProveedor ? `DNI ${p.DniProveedor}` : null),
    correoDestinatario: p.CorreoProveedor,
    asunto: `Requerimiento de cumplimiento bajo apercibimiento de resolución – orden ${p.NumeroOrdenSiga || ''}`,
    referencia: `Informe del área usuaria del ${fechaCorta(p.FechaInicio)} · expediente ${p.Codigo}`,
    parrafos: [
      encabezado(p),
      `El área usuaria ha comunicado a esta Dirección el incumplimiento de las obligaciones contractuales que se detalla a continuación: ${p.Hechos}`,
      `En consecuencia, conforme al literal b) del numeral 7.3.7.2 de la Directiva N.° 002-2026-ANIN, se le REQUIERE ejecutar la prestación materia `
        + `de incumplimiento en un plazo de ${dias} (${numeroEnLetras(dias)}) días calendario, computados desde el día siguiente de notificada la presente, `
        + `es decir, hasta el ${fechaCorta(limite)}, BAJO APERCIBIMIENTO DE RESOLVER EL CONTRATO MENOR de forma ${p.Alcance === 'PARCIAL' ? 'parcial' : 'total'}`
        + `${p.Alcance === 'PARCIAL' && p.ParteResuelta ? ` respecto de: ${p.ParteResuelta}` : ''}.`,
      'Vencido dicho plazo sin que se haya cumplido la prestación, la Autoridad Nacional de Infraestructura procederá a resolver el contrato menor '
        + 'de acuerdo con el literal c) del numeral 7.3.7.2 de la citada Directiva, sin perjuicio de las penalidades que correspondan.',
      'Sin otro particular, quedo de usted.'
    ],
    firmante,
    cargoFirmante: 'Jefe(a) de la Unidad de Abastecimiento',
    codigoExpediente: p.Codigo
  };
  return construirCartaAnin(carta);
}

export function nombreArchivoCartaResolucion(p: ProcedimientoDetalle): string {
  return `Carta de resolucion - ${p.Codigo}.pdf`;
}

/** Carta que resuelve el contrato, total o parcialmente (7.3.7.2.c, 7.3.7.3, 7.3.7.4, 7.3.7.5). */
export function construirCartaResolucion(p: ProcedimientoDetalle, numero: string | null, firmante: string): any {
  const parrafos: string[] = [encabezado(p)];
  const causal = nombreCausal(p.Causal);

  if (p.Causal === 'INCUMPLIMIENTO' && p.ApercibimientoNotificadoEn) {
    parrafos.push(
      `Mediante ${p.NumeroCartaApercibimiento || 'carta'} notificada el ${fechaCorta(p.ApercibimientoNotificadoEn)}, se le requirió cumplir la prestación `
      + `materia de incumplimiento en un plazo de ${p.PlazoApercibimientoDias} días calendario, que venció el ${fechaCorta(p.FechaLimiteSubsanacion)}, `
      + `bajo apercibimiento de resolver el contrato. `
      + (p.ResultadoApercibimiento === 'SIN_RESPUESTA'
          ? 'Vencido dicho plazo, no se ha cumplido con la prestación requerida.'
          : `El área usuaria ha evaluado lo presentado y concluye que el incumplimiento no fue subsanado: ${p.InformeAu || ''}`)
    );
  } else {
    parrafos.push(`La causal que motiva la presente resolución es la siguiente: ${causal}. Hechos: ${p.Hechos}`);
    if (p.InformeAu) {
      parrafos.push(`Opinión del área usuaria: ${p.InformeAu}`);
    }
  }

  parrafos.push(
    `Por lo expuesto, de conformidad con el numeral 7.3.7 de la Directiva N.° 002-2026-ANIN, la Autoridad Nacional de Infraestructura `
    + `RESUELVE el contrato menor derivado de la orden ${p.NumeroOrdenSiga || '____'} de forma ${p.Alcance === 'PARCIAL' ? 'PARCIAL' : 'TOTAL'}`
    + (p.Alcance === 'PARCIAL' && p.ParteResuelta ? `, únicamente respecto de: ${p.ParteResuelta}` : '')
    + `, quedando resuelto a partir de la notificación de la presente.`
  );
  if (p.MotivoDec) {
    parrafos.push(`Sustento de la decisión: ${p.MotivoDec}`);
  }
  parrafos.push('Se deja constancia de que la presente resolución no exime al contratista de las penalidades y demás responsabilidades que correspondan conforme al contrato menor y a la normativa aplicable.');
  parrafos.push('Sin otro particular, quedo de usted.');

  const carta: CartaAnin = {
    numero,
    fecha: new Date(),
    destinatario: p.NombreProveedor || 'Contratista',
    documentoDestinatario: p.RucProveedor ? `RUC ${p.RucProveedor}` : (p.DniProveedor ? `DNI ${p.DniProveedor}` : null),
    correoDestinatario: p.CorreoProveedor,
    asunto: `Resolución ${p.Alcance === 'PARCIAL' ? 'parcial' : 'total'} del contrato menor – orden ${p.NumeroOrdenSiga || ''}`,
    referencia: `Expediente ${p.Codigo} · ${causal}`,
    parrafos,
    firmante,
    cargoFirmante: 'Jefe(a) de la Unidad de Abastecimiento',
    codigoExpediente: p.Codigo
  };
  return construirCartaAnin(carta);
}

export function nombreArchivoCartaRespuesta(p: ProcedimientoDetalle): string {
  return `Carta de respuesta - ${p.Codigo}.pdf`;
}

/** Respuesta negando la solicitud de resolucion del proveedor (mutuo acuerdo, hecho sobreviniente). */
export function construirCartaRespuestaNegativa(p: ProcedimientoDetalle, numero: string | null, firmante: string): any {
  const carta: CartaAnin = {
    numero,
    fecha: new Date(),
    destinatario: p.NombreProveedor || 'Contratista',
    documentoDestinatario: p.RucProveedor ? `RUC ${p.RucProveedor}` : (p.DniProveedor ? `DNI ${p.DniProveedor}` : null),
    correoDestinatario: p.CorreoProveedor,
    asunto: `Respuesta a solicitud de resolución del contrato menor – orden ${p.NumeroOrdenSiga || ''}`,
    referencia: `Solicitud del ${fechaCorta(p.FechaInicio)} · expediente ${p.Codigo}`,
    parrafos: [
      encabezado(p),
      `Mediante la solicitud de la referencia usted pidió la resolución del contrato menor por ${nombreCausal(p.Causal).toLowerCase()}, sustentada en lo siguiente: ${p.Hechos}`,
      `El área usuaria, previa evaluación, ha emitido pronunciamiento desfavorable: ${p.InformeAu || ''}`,
      'En consecuencia, conforme al numeral 7.3.7 de la Directiva N.° 002-2026-ANIN, no resulta procedente la resolución solicitada, '
        + 'manteniéndose vigentes las obligaciones contractuales pactadas.',
      'Sin otro particular, quedo de usted.'
    ],
    firmante,
    cargoFirmante: 'Dirección de Ejecución de Contrataciones',
    codigoExpediente: p.Codigo
  };
  return construirCartaAnin(carta);
}

function numeroEnLetras(n: number): string {
  const unidades = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince',
                    'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
  if (n >= 0 && n <= 20) { return unidades[n]; }
  if (n < 30) { return `veinti${unidades[n - 20]}`; }
  const decenas = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const d = Math.floor(n / 10), u = n % 10;
  if (n < 100) { return u === 0 ? decenas[d] : `${decenas[d]} y ${unidades[u]}`; }
  return String(n);
}
