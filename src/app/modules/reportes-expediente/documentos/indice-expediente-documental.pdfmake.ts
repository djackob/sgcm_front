import { ExpedienteDocumental } from '../models/reporte.model';

const NEGRO = '#000000';
const BORDE = '#000000';
const GRIS = '#D9D9D9';

export interface ItemIndice {
  grupo: string;
  nombre: string;
  fecha: string | null;
  /** SI: unido al PDF; NO: sólo en el ZIP (formato no PDF); FALTA: no se pudo descargar. */
  estado: 'SI' | 'NO' | 'FALTA';
}

/**
 * Carátula del expediente documental: datos de la contratación, cadena de
 * expedientes por los que pasó, índice de documentos y trazabilidad
 * consolidada de todos los módulos.
 */
export function construirIndiceExpedienteDocumental(det: ExpedienteDocumental, items: ItemIndice[], paraZip: boolean): any {
  const c = det.Cabecera;
  const orden = `${c.TipoOrden === 'OC' ? 'Orden de compra' : 'Orden de servicio'} ${c.NumeroOrden || '(sin número SIGA)'}`;
  const rotuloEstado = (e: ItemIndice['estado']) =>
    e === 'SI' ? (paraZip ? 'Incluido' : 'Unido') : e === 'NO' ? 'Solo en ZIP' : 'No disponible';

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [36, 36, 36, 36],
    info: {
      title: `Expediente ${orden}`,
      author: 'Autoridad Nacional de Infraestructura'
    },
    footer: (pagina: number, total: number) => ({
      text: `${orden} · índice ${pagina} de ${total}`,
      alignment: 'right', fontSize: 7, margin: [36, 8, 36, 0]
    }),
    content: [
      { text: 'AUTORIDAD NACIONAL DE INFRAESTRUCTURA', style: 'entidad' },
      { text: 'EXPEDIENTE DE LA CONTRATACIÓN', style: 'titulo' },
      { text: orden.toUpperCase(), style: 'titulo', margin: [0, 0, 0, 12] },

      {
        table: {
          widths: [130, '*', 120, 160],
          body: [
            [etiqueta('DENOMINACIÓN'), { ...celda(c.Denominacion), colSpan: 3 }, {}, {}],
            [etiqueta('FECHA DE LA ORDEN'), celda(fecha(c.FechaOrden)), etiqueta('MONTO'), celda(c.Monto != null ? moneda(c.Monto) : '')],
            [etiqueta('PROVEEDOR'), celda(c.Proveedor), etiqueta('RUC / DNI'), celda(c.RucProveedor)],
            [etiqueta('REQUERIMIENTO'), celda(c.CodigoRequerimiento), etiqueta('CMN'), celda(c.CodigoCmn)],
            [etiqueta('ÁREA USUARIA'), celda(c.Unidad), etiqueta('CONTRATO'), celda([c.CodigoContrato, c.EstadoContrato].filter(Boolean).join(' · '))],
            [etiqueta('ENTREGABLES PAGADOS'), celda(`${c.EntregablesPagados} de ${c.Entregables} · ${moneda(c.MontoPagado)}`),
             etiqueta('CONSTANCIA'), celda(c.Constancia || 'No emitida')],
            [etiqueta('GENERADO'), { ...celda(new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })), colSpan: 3 }, {}, {}]
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 12]
      },

      { text: 'CADENA DE EXPEDIENTES', style: 'subtitulo' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 120, '*', 100, 70, 40],
          body: [
            [cabecera('MÓDULO'), cabecera('EXPEDIENTE'), cabecera('ESTADO'), cabecera('DERIVA DE'), cabecera('CREADO'), cabecera('DOCS')],
            ...det.Expedientes.map(e => [
              celdaTabla(e.Modulo), celdaTabla(e.Codigo), celdaTabla(e.Estado),
              celdaTabla(e.Padre), celdaCentro(fecha(e.Creado)), celdaCentro(e.Documentos)
            ])
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 12]
      },

      { text: 'ÍNDICE DE DOCUMENTOS', style: 'subtitulo' },
      {
        table: {
          headerRows: 1,
          widths: [24, 190, '*', 60, 70],
          body: [
            [cabecera('N.°'), cabecera('MÓDULO · EXPEDIENTE'), cabecera('DOCUMENTO'), cabecera('FECHA'), cabecera(paraZip ? 'EN EL ZIP' : 'EN ESTE PDF')],
            ...(items.length
              ? items.map((it, i) => [
                  celdaCentro(i + 1), celdaTabla(it.grupo), celdaTabla(it.nombre),
                  celdaCentro(fecha(it.fecha)), celdaCentro(rotuloEstado(it.estado))
                ])
              : [[{ text: 'El expediente no tiene documentos registrados.', style: 'tabla', colSpan: 5, margin: [3, 3, 3, 3] }, {}, {}, {}, {}]])
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 12]
      },

      { text: 'TRAZABILIDAD', style: 'subtitulo', pageBreak: det.Historial.length > 12 ? 'before' : undefined },
      {
        table: {
          headerRows: 1,
          widths: [70, 150, '*', 140, '*'],
          body: [
            [cabecera('FECHA'), cabecera('MÓDULO · EXPEDIENTE'), cabecera('MOVIMIENTO'), cabecera('ACTOR'), cabecera('COMENTARIO')],
            ...(det.Historial.length
              ? det.Historial.map(h => [
                  celdaCentro(fechaHora(h.OcurridoEn)),
                  celdaTabla(`${h.Modulo} · ${h.CodigoExpediente}`),
                  celdaTabla(`${h.EstadoOrigen || 'Inicio'} → ${h.EstadoDestino || ''}`),
                  celdaTabla([h.Actor, h.ActorRol, h.Unidad].filter(Boolean).join(' · ')),
                  celdaTabla(h.Comentario)
                ])
              : [[{ text: 'Sin movimientos registrados.', style: 'tabla', colSpan: 5, margin: [3, 3, 3, 3] }, {}, {}, {}, {}]])
          ]
        },
        layout: marco()
      }
    ],
    styles: {
      entidad: { fontSize: 9, bold: true, alignment: 'center', color: NEGRO, margin: [0, 0, 0, 4] },
      titulo: { fontSize: 12, bold: true, alignment: 'center', color: NEGRO },
      subtitulo: { fontSize: 9, bold: true, color: NEGRO, margin: [0, 0, 0, 4] },
      cabecera: { fontSize: 7.5, bold: true, color: NEGRO },
      valor: { fontSize: 8.5, color: NEGRO },
      tabla: { fontSize: 7.5, color: NEGRO }
    },
    defaultStyle: { fontSize: 8, color: NEGRO }
  };
}

function marco(): any {
  return {
    hLineColor: () => BORDE,
    vLineColor: () => BORDE,
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5
  };
}

function cabecera(rotulo: string): any {
  return { text: rotulo, style: 'cabecera', alignment: 'center', fillColor: GRIS, margin: [2, 3, 2, 3] };
}

function etiqueta(rotulo: string): any {
  return { text: rotulo, style: 'cabecera', fillColor: GRIS, margin: [3, 3, 3, 3] };
}

function celda(valor: string | number | null | undefined): any {
  return { text: texto(valor), style: 'valor', margin: [3, 3, 3, 3] };
}

function celdaTabla(valor: string | number | null | undefined): any {
  return { text: texto(valor), style: 'tabla', margin: [3, 2, 3, 2] };
}

function celdaCentro(valor: string | number | null | undefined): any {
  return { text: texto(valor), style: 'tabla', alignment: 'center', margin: [2, 2, 2, 2] };
}

function texto(valor: string | number | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor);
}

function moneda(valor: number | null | undefined): string {
  return `S/ ${Number(valor || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fecha(valor: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function fechaHora(valor: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(valor || '');
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : fecha(valor);
}
