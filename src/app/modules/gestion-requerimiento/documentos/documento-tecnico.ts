import { DOCUMENTO_TECNICO, PedidoRequerimiento, RequerimientoDetalle, TipoContratacionRequerimiento } from '../models/requerimiento.model';
import { PENALIDAD_INTRO, PENALIDAD_MORA_CIERRE, PENALIDAD_MORA_TEXTO } from './anexo3-tdr.plantilla';
import { FilaOtraPenalidad, filasDesdeTextoPenalidad, normalizarFilasPenalidad, tablaOtrasPenalidades, textoFilasPenalidad } from './penalidad';

export const CARPETA_DOCUMENTO_TECNICO = 'requerimiento';

export interface DocumentoTecnicoFormulario {
  Finalidad: string;
  Descripcion: string;
  Lugar: string;
  Requisitos: string;
  Conformidad: string;
  FormaPago: string;
  OtrasPenalidades: FilaOtraPenalidad[];
}

export function crearDocumentoTecnico(): DocumentoTecnicoFormulario {
  return {
    Finalidad: '',
    Descripcion: '',
    Lugar: '',
    Requisitos: '',
    Conformidad: '',
    FormaPago: '',
    OtrasPenalidades: []
  };
}

export function leerDocumentoTecnico(payload: any): DocumentoTecnicoFormulario {
  const src = payload?.DocumentoTecnico || {};
  const base = crearDocumentoTecnico();
  (Object.keys(base) as (keyof DocumentoTecnicoFormulario)[]).forEach(clave => {
    const valor = src[clave];
    if (typeof valor === 'string' && clave !== 'OtrasPenalidades') {
      (base as unknown as Record<string, string>)[clave] = valor;
    }
  });
  const filas = normalizarFilasPenalidad(src.OtrasPenalidades);
  base.OtrasPenalidades = filas.length
    ? filas
    : filasDesdeTextoPenalidad(typeof src.OtrasPenalidades === 'string' ? src.OtrasPenalidades : '');
  return base;
}

export function metaDocumentoTecnico(tipo: string | undefined): { codigo: string; etiqueta: string; anexo: string } | null {
  if (!tipo || tipo === 'LOCACION') {
    return null;
  }
  const lista = DOCUMENTO_TECNICO[tipo as TipoContratacionRequerimiento] || [];
  return lista[0] || null;
}

export function etiquetaDescripcionTecnica(tipo: string | undefined): string {
  if (tipo === 'BIEN') {
    return 'Especificaciones técnicas del bien';
  }
  if (tipo === 'CONSULTORIA') {
    return 'Descripción de la consultoría';
  }
  return 'Descripción del servicio';
}

export function nombreArchivoDocumentoTecnico(detalle: { Codigo?: string }, anexo: string): string {
  return `${anexo} - ${detalle.Codigo || 'requerimiento'}.pdf`;
}

function parrafo(texto: string): any {
  return { text: texto || '—', fontSize: 10, margin: [0, 0, 0, 8] };
}

function titulo(texto: string): any {
  return { text: texto, bold: true, fontSize: 11, margin: [0, 8, 0, 4] };
}

export function construirDocumentoTecnico(
  detalle: RequerimientoDetalle | any,
  formulario: DocumentoTecnicoFormulario,
  pedidos: PedidoRequerimiento[]
): any {
  const meta = metaDocumentoTecnico(detalle?.CodigoTipoContratacion);
  const anexo = meta?.anexo || 'Anexo';
  const etiqueta = meta?.etiqueta || 'Documento técnico';
  const filas = (pedidos || []).map(p => [
    p.NumeroPedido || '—',
    p.Clasificador || '—',
    p.FuenteFinanc || '—'
  ]);

  return {
    pageSize: 'A4',
    pageMargins: [40, 48, 40, 48],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    content: [
      { text: `ANIN — ${anexo}`, alignment: 'center', bold: true, fontSize: 12 },
      { text: etiqueta, alignment: 'center', fontSize: 11, margin: [0, 2, 0, 10] },
      parrafo(`Requerimiento: ${detalle?.Codigo || '—'}`),
      parrafo(`Denominación: ${detalle?.Denominacion || '—'}`),
      parrafo(`Área usuaria: ${detalle?.CentroCostoNombre || detalle?.CentroCosto || '—'}`),
      parrafo(`Plazo: ${Number(detalle?.PlazoDias) > 0 ? detalle.PlazoDias + ' días calendario' : '—'}`),
      parrafo(`Monto estimado: S/ ${Number(detalle?.Monto || 0).toFixed(2)}`),
      titulo('1. Pedidos SIGA'),
      filas.length
        ? {
            table: {
              widths: ['*', '*', '*'],
              body: [
                [
                  { text: 'N.° pedido', bold: true },
                  { text: 'Clasificador', bold: true },
                  { text: 'Fuente', bold: true }
                ],
                ...filas
              ]
            },
            margin: [0, 0, 0, 8]
          }
        : parrafo('Sin pedidos vinculados.'),
      titulo('2. Finalidad'),
      parrafo(formulario.Finalidad),
      titulo(`3. ${etiquetaDescripcionTecnica(detalle?.CodigoTipoContratacion)}`),
      parrafo(formulario.Descripcion),
      titulo('4. Lugar de entrega o prestación'),
      parrafo(formulario.Lugar),
      titulo('5. Requisitos'),
      parrafo(formulario.Requisitos),
      titulo('6. Conformidad'),
      parrafo(formulario.Conformidad),
      titulo('7. Forma de pago'),
      parrafo(formulario.FormaPago),
      titulo('8. Penalidad por mora'),
      parrafo(PENALIDAD_INTRO),
      parrafo(PENALIDAD_MORA_TEXTO),
      parrafo('Penalidad diaria = (0.10 × monto) / (0.40 × plazo)'),
      parrafo(PENALIDAD_MORA_CIERRE),
      titulo('9. Otras penalidades'),
      tablaOtrasPenalidades(formulario.OtrasPenalidades) || parrafo(textoFilasPenalidad(formulario.OtrasPenalidades) || 'No se establecen otras penalidades.'),
      {
        text: 'Firma del Jefe del Área usuaria',
        bold: true,
        margin: [0, 28, 0, 36]
      },
      { text: '________________________________', margin: [0, 0, 0, 4] },
      { text: detalle?.JefeAreaUsuaria || 'Jefe del Área usuaria', fontSize: 10 }
    ]
  };
}

export function nombreArchivoOrden(detalle: { Codigo?: string }, esCompra: boolean): string {
  const tituloOrden = esCompra ? 'Orden de Compra' : 'Orden de Servicio';
  return `${tituloOrden} - ${detalle.Codigo || 'requerimiento'}.pdf`;
}

export function construirOrdenContratacion(
  detalle: RequerimientoDetalle | any,
  proveedor: { RazonSocial?: string; Ruc?: string; Email?: string },
  esCompra: boolean
): any {
  const tituloOrden = esCompra ? 'ORDEN DE COMPRA' : 'ORDEN DE SERVICIO';
  return {
    pageSize: 'A4',
    pageMargins: [40, 48, 40, 48],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    content: [
      { text: tituloOrden, alignment: 'center', bold: true, fontSize: 14, margin: [0, 0, 0, 12] },
      parrafo(`Requerimiento: ${detalle?.Codigo || '—'}`),
      parrafo(`Denominación: ${detalle?.Denominacion || '—'}`),
      parrafo(`Proveedor: ${proveedor.RazonSocial || '—'}`),
      parrafo(`RUC: ${proveedor.Ruc || '—'}`),
      parrafo(`Correo: ${proveedor.Email || '—'}`),
      parrafo(`Monto: S/ ${Number(detalle?.Monto || 0).toFixed(2)}`),
      parrafo(`Plazo: ${Number(detalle?.PlazoDias) > 0 ? detalle.PlazoDias + ' días calendario' : '—'}`),
      parrafo('La notificación de esta orden inicia el plazo de ejecución.')
    ]
  };
}
