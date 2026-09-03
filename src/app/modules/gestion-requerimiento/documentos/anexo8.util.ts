import { ItemRequerimiento, RequerimientoDetalle } from '../models/requerimiento.model';
import { extraDatosAdicionales, proveedoresDelRequerimiento } from './anexo5.pdfmake';
import { nombreCompletoLocador } from './filtro-idoneidad.util';

export const TIPO_ANEXO_8 = 'REQ_ANEXO_8_COTIZACIONES';
export const CARPETA_ANEXO_8 = 'requerimiento';

export interface ItemAnexo8 {
  IdItem: string;
  Orden: number;
  Descripcion: string;
  Unidad: string;
  Cantidad: number;
}

export interface PostorAnexo8 {
  Id: string;
  RazonSocial: string;
  Ruc: string;
  Contacto: string;
  Telefono: string;
  Email: string;
  Precios: Record<string, number | null>;
  Plazo: string;
  FormaPago: 'UNICO' | 'ARMADAS' | '';
  Garantia: string;
  Moneda: 'PEN' | 'USD' | 'OTRA';
  TipoCambio: number | null;
  FechaSolicitud: string;
  Reiteraciones: 0 | 1 | 2;
  FechaRecepcion: string;
  DedicaObjeto: boolean;
  AreaUsuariaVerifico: boolean;
  TomoEnCuentaValor: 'SI' | 'NO' | '';
}

export interface BorradorAnexo8 {
  Postores: PostorAnexo8[];
  IdAdjudicado: string;
  Criterio: string;
  Observaciones: string;
}

export function requiereAnexo8CuadroCotizaciones(
  detalle: RequerimientoDetalle | any,
  tipoBandeja?: string
): boolean {
  const tipo = detalle?.CodigoTipoContratacion || tipoBandeja || '';
  if (tipo === 'LOCACION') {
    return proveedoresDelRequerimiento(detalle).length >= 2;
  }
  return tipo === 'BIEN' || tipo === 'SERVICIO' || tipo === 'CONSULTORIA';
}

export function claveBorradorAnexo8(idRequerimiento: string): string {
  return `sgcm.anexo8.${idRequerimiento}`;
}

export function itemsAnexo8(detalle: RequerimientoDetalle | any): ItemAnexo8[] {
  const items: ItemRequerimiento[] = detalle?.Items || [];
  if (items.length) {
    return items.map((item, indice) => ({
      IdItem: item.IdRequerimientoItem || `item-${indice}`,
      Orden: item.Orden || indice + 1,
      Descripcion: item.Descripcion || item.DescripcionServicio || item.CodigoItem || 'Ítem',
      Unidad: item.UnidadAbreviatura || 'UND',
      Cantidad: Number(item.Cantidad) || 0
    }));
  }
  const extra = extraDatosAdicionales(detalle);
  const proveedores = proveedoresDelRequerimiento(detalle);
  const entregables = Number(proveedores[0]?.CantidadEntregables) || 1;
  return [{
    IdItem: 'servicio-1',
    Orden: 1,
    Descripcion: detalle?.Denominacion || extra?.Denominacion || 'Servicio',
    Unidad: 'UND',
    Cantidad: entregables
  }];
}

export function postorVacio(items: ItemAnexo8[], id?: string): PostorAnexo8 {
  const precios: Record<string, number | null> = {};
  for (const item of items) {
    precios[item.IdItem] = null;
  }
  return {
    Id: id || `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    RazonSocial: '',
    Ruc: '',
    Contacto: '',
    Telefono: '',
    Email: '',
    Precios: precios,
    Plazo: '',
    FormaPago: '',
    Garantia: '',
    Moneda: 'PEN',
    TipoCambio: null,
    FechaSolicitud: '',
    Reiteraciones: 0,
    FechaRecepcion: '',
    DedicaObjeto: false,
    AreaUsuariaVerifico: false,
    TomoEnCuentaValor: ''
  };
}

export function postoresIniciales(detalle: RequerimientoDetalle | any, items: ItemAnexo8[]): PostorAnexo8[] {
  const proveedores = proveedoresDelRequerimiento(detalle);
  const mapeados = proveedores.map((proveedor, indice) => {
    const postor = postorVacio(items, `prov-${indice}`);
    postor.RazonSocial = nombreCompletoLocador(proveedor);
    postor.Ruc = proveedor.Ruc || proveedor.Dni || '';
    postor.Contacto = postor.RazonSocial;
    postor.Telefono = proveedor.Celular || '';
    postor.Email = proveedor.Email || '';
    const unitario = Number(proveedor.MontoMensual);
    if (unitario > 0) {
      for (const item of items) {
        postor.Precios[item.IdItem] = unitario;
      }
    }
    return postor;
  });
  if (mapeados.length >= 2) {
    return mapeados;
  }
  if (mapeados.length === 1) {
    return [mapeados[0], postorVacio(items)];
  }
  return [postorVacio(items), postorVacio(items)];
}

export function totalItemPostor(item: ItemAnexo8, postor: PostorAnexo8): number {
  const unitario = Number(postor.Precios[item.IdItem]);
  if (!Number.isFinite(unitario)) {
    return 0;
  }
  return (Number(item.Cantidad) || 0) * unitario;
}

export function totalPostor(items: ItemAnexo8[], postor: PostorAnexo8): number {
  return items.reduce((suma, item) => suma + totalItemPostor(item, postor), 0);
}

export function etiquetaDec(codigo?: string | null): string {
  if (codigo === 'DAI') {
    return 'Dirección de Abastecimiento e Infraestructura (DAI)';
  }
  return 'Unidad de Abastecimiento';
}

export function validarAnexo8(
  items: ItemAnexo8[],
  postores: PostorAnexo8[],
  idAdjudicado: string,
  criterio: string
): string | null {
  if (postores.length < 2) {
    return 'El cuadro de cotizaciones exige al menos dos postores.';
  }
  for (const [indice, postor] of postores.entries()) {
    if (!postor.RazonSocial.trim() || !postor.Ruc.trim()) {
      return `Complete razón social y RUC del postor ${indice + 1}.`;
    }
    for (const item of items) {
      const precio = Number(postor.Precios[item.IdItem]);
      if (!Number.isFinite(precio) || precio <= 0) {
        return `Indique el precio unitario de «${item.Descripcion}» para ${postor.RazonSocial}.`;
      }
    }
    if (!postor.Plazo.trim() || !postor.FormaPago || !postor.Moneda) {
      return `Complete plazo, forma de pago y moneda de ${postor.RazonSocial}.`;
    }
    if (postor.Moneda !== 'PEN' && !(Number(postor.TipoCambio) > 0)) {
      return `Indique el tipo de cambio de ${postor.RazonSocial}.`;
    }
    if (!postor.FechaSolicitud || !postor.FechaRecepcion) {
      return `Indique las fechas de solicitud y recepción de ${postor.RazonSocial}.`;
    }
    if (!postor.DedicaObjeto || !postor.AreaUsuariaVerifico || !postor.TomoEnCuentaValor) {
      return `Marque las validaciones de negocio de ${postor.RazonSocial}.`;
    }
  }
  if (!idAdjudicado || !postores.some(p => p.Id === idAdjudicado)) {
    return 'Seleccione el proveedor adjudicado.';
  }
  if (!criterio.trim()) {
    return 'Redacte el criterio utilizado para determinar el monto a contratar.';
  }
  return null;
}

export function nombreArchivoAnexo8(detalle: { Codigo?: string }): string {
  return `Anexo 8 - Cuadro de cotizaciones - ${detalle?.Codigo || 'requerimiento'}.pdf`;
}
