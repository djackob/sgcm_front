/**
 * Formas que devuelven las rutinas del módulo Requerimiento a Notificación.
 *
 * Los nombres van en PascalCase porque son los de las columnas de la base y los
 * de las rutinas. Renombrarlos a camelCase obligaría a mantener un traductor en
 * el medio y a leer dos vocabularios para seguir un dato de la pantalla a la
 * tabla.
 */

import { RespuestaSigcm, TransicionCmn, HistorialCmn, CatalogoSiga } from '../../gestion-cmn/models/cmn.model';

/**
 * El sobre común, la transición y el historial son del motor, no del CMN: los
 * comparten todos los módulos. Se reexportan desde aquí con el nombre del
 * módulo para que este archivo se lea solo, sin tener que saber que la primera
 * definición quedó escrita en la carpeta del CMN.
 *
 * Cuando exista un tercer módulo conviene mover las tres a core/models: hoy
 * moverlas obligaría a tocar gestion-cmn sin ninguna ganancia.
 */
export type { RespuestaSigcm, CatalogoSiga };
export type TransicionRequerimiento = TransicionCmn;
export type HistorialRequerimiento = HistorialCmn;

/** Los cuatro objetos de prestación (REQ-07). Gobiernan qué documento toca. */
export type TipoContratacionRequerimiento = 'BIEN' | 'SERVICIO' | 'CONSULTORIA' | 'LOCACION';

/** Dependencia encargada de las contrataciones. Decide la ruta (REQ-14). */
export type DecRequerimiento = 'ABASTECIMIENTO' | 'DAI';

/** REQ-03 y REQ-04: incluido en el CMN, o apoyado en una modificación aprobada. */
export type CondicionCmn = 'INCLUIDO' | 'NO_INCLUIDO';

/* -------------------------------------------------------------------------- */
/* Bandeja                                                                    */
/* -------------------------------------------------------------------------- */

/** Fila de la bandeja. requerimiento.paListarRequerimiento */
export interface RequerimientoBandeja {
  IdRequerimiento: string;
  Codigo: string;
  AnoEje: number;
  CentroCosto: string;
  Denominacion: string;
  CodigoTipoContratacion: TipoContratacionRequerimiento;
  TipoContratacion: string;
  CodigoDec: DecRequerimiento;
  CondicionCmn: CondicionCmn;
  Monto: number;
  PlazoDias: number;
  FechaInicioPrevisto: string | null;
  IdExpediente: string;
  CodigoEstado: string;
  Version: number;
  Estado: string;
  RolResponsable: string | null;
  /** Conteos, no colecciones: la bandeja no trae los ítems ni los pedidos. */
  Items: number;
  Pedidos: number;
  ActualizadoEn: string;
  /** Id de archivo (documento_sistema) del documento técnico vigente. */
  DocumentoSistema?: string | null;
  NombreDocumento?: string | null;
  EstadoDocumento?: string | null;
  CodigoTipoDocumento?: string | null;
  /** Acciones de este actor sobre este expediente. Las calcula
   *  requerimiento.paListarRequerimiento con la misma regla que
   *  sigcm.paListarTransicionDisponible. */
  Transiciones?: TransicionRequerimiento[];
}

/* -------------------------------------------------------------------------- */
/* Detalle                                                                    */
/* -------------------------------------------------------------------------- */

/** Pedido SIGA vinculado. La clave real en SIGA es AnoEje + SecEjec + NumeroPedido. */
export interface PedidoRequerimiento {
  IdRequerimientoPedido: string;
  AnoEje: number;
  SecEjec: number;
  NumeroPedido: string;
  SecPedido: number | null;
  FechaPedido: string | null;
  CentroCosto: string | null;
  SecFunc: number | null;
  Origen: string | null;
  FuenteFinanc: string | null;
  Clasificador: string | null;
  /**
   * Hoy siempre falso: no existe una vista de pedidos de SIGA contra la cual
   * comprobarlos. Cuando exista `siga.vwPedido`, la rutina de registro los
   * validará y esta bandera empezará a decir algo. Se muestra tal cual para
   * que nadie confunda «capturado» con «verificado».
   */
  Verificado: boolean;
}

/** Ítem del requerimiento, tal como lo devuelve el visor. */
export interface ItemRequerimiento {
  IdRequerimientoItem: string;
  Orden: number;
  CodigoItem: string;
  TipoBien: string | null;
  GrupoBien: string | null;
  ClaseBien: string | null;
  FamiliaBien: string | null;
  ItemBien: string | null;
  /** Un servicio o una consultoría puede no estar en el catálogo y se describe. */
  DescripcionServicio: string | null;
  UnidadMedida: number | null;
  UnidadAbreviatura: string | null;
  Descripcion: string;
  Cantidad: number;
  PrecioUnitario: number;
  Monto: number;
  NumeroPedido: string | null;
}

/** Requerimiento completo. requerimiento.paObtenerRequerimiento */
export interface RequerimientoDetalle extends RespuestaSigcm {
  IdRequerimiento: string;
  Codigo: string;
  AnoEje: number;
  SecEjec: number;
  CentroCosto: string;
  CentroCostoNombre: string;
  Denominacion: string;
  CodigoTipoContratacion: TipoContratacionRequerimiento;
  TipoContratacion: string;
  CodigoDec: DecRequerimiento;
  CondicionCmn: CondicionCmn;
  IdSolicitudCmn: string | null;
  /** Código de la solicitud CMN en que se apoya, si la hay. */
  SolicitudCmn: string | null;
  GeneradoDocumentoCmn: string | null;
  NombreDocumentoCmn: string | null;
  Monto: number;
  PlazoDias: number;
  FechaInicioPrevisto: string | null;
  Ate: string | null;
  RucSugerido: string | null;
  TieneDisponibilidad: boolean;
  GeneradoDocumentoDisponibilidad: string | null;
  NombreDocumentoDisponibilidad: string | null;
  Sustento: string;
  DatosAdicionales: string;
  Filtros?: any[];
  Ccp?: any;
  OrdenServicio?: any;
  IdExpediente: string;
  CodigoEstado: string;
  Version: number;
  Anulado: boolean;
  Estado: string;
  Responsable: string;
  Pedidos: PedidoRequerimiento[];
  Items: ItemRequerimiento[];
}

/* -------------------------------------------------------------------------- */
/* Formulario                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Línea del formulario de registro. No es lo mismo que ItemRequerimiento: esto
 * es lo que el usuario está escribiendo, con los campos auxiliares que la
 * pantalla necesita y la rutina no recibe (el buscador del catálogo).
 */
export interface ItemFormularioRequerimiento {
  /* Identificación en el catálogo de SIGA. Van vacías si es un servicio
     descrito en texto: la base exige ItemBien O DescripcionServicio. */
  TipoBien: string;
  GrupoBien: string;
  ClaseBien: string;
  FamiliaBien: string;
  ItemBien: string;
  DescripcionServicio: string;

  UnidadMedida: number | null;
  Cantidad: number | null;
  PrecioUnitario: number | null;

  /** Pedido SIGA al que pertenece la línea, por su número. */
  NumeroPedido: string;

  /* Auxiliares de pantalla */
  CodigoItem: string;
  Descripcion: string;
  UnidadAbreviatura: string;
  buscando: boolean;
  textoBusqueda: string;
  resultados: CatalogoSiga[];
}

export function crearItemFormularioRequerimiento(): ItemFormularioRequerimiento {
  return {
    TipoBien: '',
    GrupoBien: '',
    ClaseBien: '',
    FamiliaBien: '',
    ItemBien: '',
    DescripcionServicio: '',
    UnidadMedida: null,
    Cantidad: null,
    PrecioUnitario: null,
    NumeroPedido: '',
    CodigoItem: '',
    Descripcion: '',
    UnidadAbreviatura: '',
    buscando: false,
    textoBusqueda: '',
    resultados: []
  };
}

/** Pedido SIGA que devuelve el maestro PEDIDO de paListarMaestroSiga. */
export interface PedidoSiga {
  NumeroPedido: string;
  MotivoPedido: string;
  AnoEje: number;
  TipoPedido: string;
  ActProy: string;
  FuenteFinanc: string;
  CodigoTarea: number | string;
  SecFunc: number | string;
  FechaPedido?: string;
  Origen?: string;
  Programa?: string;
}

/**
 * Cabecera de tarea + resumen de items del pedido elegido.
 * Maestro PEDIDO_DETALLE: une listarCentroCostoTarea y listarItemsPedidoResumen.
 */
export interface PedidoSigaDetalle {
  NumeroPedido: string;
  AnoEje: number;
  CodigoTarea: number | string;
  TipoTarea?: string;
  NivelTarea?: string;
  NombreTarea: string;
  ActProy?: string;
  Origen?: string;
  FuenteFinanc?: string;
  Programa?: string;
  SecFunc?: number | string;
  CodigoItem: string;
  NombreItem: string;
  Clasificador: string;
}

/** Pedido SIGA en el formulario. */
export interface PedidoFormularioRequerimiento {
  NumeroPedido: string;
  FechaPedido: string;
  SecFunc: number | null;
  Origen: string;
  FuenteFinanc: string;
  Clasificador: string;
  /** Año del pedido, si difiere del año del requerimiento. */
  AnoPedido: number | null;
  ActividadOperativa: string;
  MetaPresupuestaria: string;
  Programa: string;
  ProdPy: string;
  CodigoItemPedido: string;
  NombreItemPedido: string;
}

export function crearPedidoFormularioRequerimiento(): PedidoFormularioRequerimiento {
  return {
    NumeroPedido: '',
    FechaPedido: '',
    SecFunc: null,
    Origen: '',
    FuenteFinanc: '',
    Clasificador: '',
    AnoPedido: null,
    ActividadOperativa: '',
    MetaPresupuestaria: '',
    Programa: '',
    ProdPy: '',
    CodigoItemPedido: '',
    NombreItemPedido: ''
  };
}

/** Centro de costo de SIGA (unidad organizativa). */
export interface CentroCostoSiga {
  CentroCosto: string;
  NombreDepend: string;
  Abreviado?: string;
  TipoDepend?: string;
  Activo?: boolean;
}

/** Datos del proveedor capturados en el registro (van en DatosAdicionales). */
export interface ProveedorFormularioRequerimiento {
  TipoDocumento: 'DNI' | 'CE' | 'RUC';
  Dni: string;
  Ruc: string;
  TipoRegistro: 'NUEVO' | 'EXISTENTE';
  Nombres: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  Celular: string;
  CantidadEntregables: number | null;
  MontoMensual: number | null;
  Email: string;
  /** Pedido SIGA de esta fila del Anexo 5 (una propuesta = un pedido). */
  NumeroPedido: string;
}

export function crearProveedorFormularioRequerimiento(): ProveedorFormularioRequerimiento {
  return {
    TipoDocumento: 'DNI',
    Dni: '',
    Ruc: '',
    TipoRegistro: 'NUEVO',
    Nombres: '',
    ApellidoPaterno: '',
    ApellidoMaterno: '',
    Celular: '',
    CantidadEntregables: null,
    MontoMensual: null,
    Email: '',
    NumeroPedido: ''
  };
}

export function montoTotalProveedor(proveedor: ProveedorFormularioRequerimiento): number {
  return (Number(proveedor.CantidadEntregables) || 0)
    * (Number(proveedor.MontoMensual) || 0);
}

/* -------------------------------------------------------------------------- */
/* Documento técnico según el objeto (REQ-07)                                 */
/* -------------------------------------------------------------------------- */

/**
 * Qué documento técnico corresponde a cada objeto de prestación.
 *
 * Los códigos son los de `sigcm.TipoDocumento`, que ya los siembra S001. El
 * MAPEO objeto → documento, en cambio, no está en la base: `TipoDocumento` no
 * tiene columna de tipo de contratación. Es una decisión de pantalla, igual que
 * `DOCUMENTO_QUE_GENERA` en el CMN, y por eso vive aquí.
 *
 * Locación lleva dos y en este orden (REQ-08): primero la propuesta del Área
 * usuaria y su firma, y sólo después el TDR. El arreglo respeta esa secuencia.
 *
 * Si algún día conviene que sea dato, el lugar natural es una columna
 * `CodigoTipoContratacion` en `sigcm.TipoDocumento`, y este mapa desaparece.
 */
export const DOCUMENTO_TECNICO: {
  [objeto in TipoContratacionRequerimiento]: { codigo: string; etiqueta: string; anexo: string }[]
} = {
  BIEN: [
    { codigo: 'REQ_EETT_BIEN', etiqueta: 'EETT', anexo: 'Anexo 1' }
  ],
  SERVICIO: [
    { codigo: 'REQ_TDR_SERVICIO', etiqueta: 'TDR', anexo: 'Anexo 2' }
  ],
  CONSULTORIA: [
    { codigo: 'REQ_TDR_CONSULTORIA', etiqueta: 'TDR', anexo: 'Anexo 4' }
  ],
  LOCACION: [
    { codigo: 'REQ_PROPUESTA_LOCACION', etiqueta: 'Propuesta del Área usuaria', anexo: 'Anexo 5' },
    { codigo: 'REQ_TDR_LOCACION', etiqueta: 'TDR', anexo: 'Anexo 3' }
  ]
};
