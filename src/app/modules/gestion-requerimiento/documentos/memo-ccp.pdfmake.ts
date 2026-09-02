import { RequerimientoDetalle } from '../models/requerimiento.model';
import {
  construirTextoMemorando,
  encabezadoMemorandoCcp,
  pedidoPrincipal,
  proveedorPrincipal
} from './filtro-idoneidad.util';

const NEGRO = '#000000';

export function construirMemorandoCcp(
  detalle: RequerimientoDetalle | any,
  cuerpo: string,
  numeroMemorando?: string | null
): any {
  const proveedor = proveedorPrincipal(detalle);
  const pedido = pedidoPrincipal(detalle);
  const anio = detalle?.AnoEje || new Date().getFullYear();
  const texto = (cuerpo || construirTextoMemorando(detalle)).split('\n');
  const titulo = encabezadoMemorandoCcp(numeroMemorando, anio);

  return {
    pageSize: 'A4',
    pageMargins: [56, 56, 56, 56],
    info: {
      title: `${titulo} · ${detalle?.Codigo || ''}`,
      author: 'Autoridad Nacional de Infraestructura'
    },
    content: [
      { text: titulo, style: 'titulo', alignment: 'center', margin: [0, 0, 0, 18] },
      { text: 'A: Oficina de Planeamiento y Presupuesto (OPP)', style: 'campo', margin: [0, 0, 0, 6] },
      { text: 'DE: Unidad de Abastecimiento', style: 'campo', margin: [0, 0, 0, 6] },
      { text: 'ASUNTO: Solicitud de Certificación de Crédito Presupuestario (CCP)', style: 'campo', margin: [0, 0, 0, 6] },
      { text: `REFERENCIA: ${detalle?.Codigo || ''} · Pedido SIGA N° ${pedido?.NumeroPedido || proveedor?.NumeroPedido || '—'}`, style: 'campo', margin: [0, 0, 0, 18] },
      { text: texto, style: 'cuerpo', alignment: 'justify', lineHeight: 1.25 },
      { text: 'Atentamente,', style: 'cuerpo', margin: [0, 28, 0, 40] },
      { text: '_________________________________', alignment: 'center' },
      { text: 'Especialista de Abastecimiento', alignment: 'center', style: 'pie' }
    ],
    styles: {
      titulo: { fontSize: 12, bold: true, color: NEGRO },
      campo: { fontSize: 10, color: NEGRO },
      cuerpo: { fontSize: 10, color: NEGRO },
      pie: { fontSize: 9, color: NEGRO, italics: true }
    },
    defaultStyle: {
      font: 'Roboto'
    }
  };
}
