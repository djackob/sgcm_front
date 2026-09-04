export interface TransicionPago {
  CodigoTransicion: string;
  NombreAccion: string;
  CodigoEstadoDestino: string;
  EstadoDestino: string;
  RequiereComentario: boolean;
  RequiereFirma: boolean;
  DocumentoRequerido: string | null;
  EncolaIntegracion: boolean;
  GeneraObservacion: boolean;
}

export interface ChecklistPago {
  CodigoItem: string;
  Nombre: string;
  Orden: number;
  Obligatorio: boolean;
  Valor: string;
  Observacion?: string;
}

/**
 * Lo que devuelve pago.paSincronizarOrdenSiga: el estado real de la orden de
 * servicio dentro de SIGA. `Aprobada` es ESTADO '1' + ESTADO_SIAF '2', que es
 * la única combinación con la que la orden está viva y comprometida.
 */
export interface OrdenServicioSiga {
  EnSiga: boolean;
  NumeroOrden: string | null;
  EstadoOrden: string | null;
  EstadoSiaf: string | null;
  Aprobada: boolean;
  ExpedienteSiaf: string | null;
  NroCertifica: number | null;
  FlagRecepcion: string | null;
  FechaRecepcion: string | null;
  mensaje: string;
}

export interface HitoPago {
  NumeroHito: number;
  NombreHito: string;
  Direccion: string;
  TablaSiga: string;
  Estado: string;
  Mensaje: string;
  FechaHito: string;
}

export interface ExpedientePagoBandeja {
  IdExpedientePago: string;
  IdExpediente: string;
  Codigo: string;
  CodigoEstado: string;
  Version: number;
  Estado: string;
  RolResponsable: string | null;
  IdRequerimiento: string;
  CodigoRequerimiento: string;
  NumeroOrdenSiga: string | null;
  NumeroEntregable: number;
  NombreEntregable: string;
  PlazoDias: number;
  MontoEntregable: number;
  MontoContrato: number;
  FechaLimiteCronograma: string | null;
  FechaPresentacion: string | null;
  DiasAtraso: number;
  MontoPenalidad: number;
  AlertaResolucion: boolean;
  NombreLocador: string | null;
  RucLocador: string | null;
  DniLocador: string | null;
  ExpedienteSiaf: string | null;
  NotaPagoSiaf: string | null;
  NumeroOperacion?: string | null;
  /** Si la acción está pendiente para ESTE perfil. La bandeja muestra todo lo
   *  de la unidad y esto es lo que distingue lo propio, como un correo sin leer;
   *  es además la primera clave del orden que manda la base. */
  MeToca?: boolean;
  Transiciones?: TransicionPago[];
  ActualizadoEn?: string;
}

export interface ExpedientePagoDetalle extends ExpedientePagoBandeja {
  Denominacion?: string;
  NumeroPedidoSiga?: string | null;
  MetaPresupuestal?: string | null;
  ClasificadorGasto?: string | null;
  PlazoContratoDias?: number | null;
  FechaRecepcionAu?: string | null;
  FechaConformidadTecnica?: string | null;
  FechaLimiteSubsanacion?: string | null;
  CorreoLocador?: string | null;
  Cci?: string | null;
  Banco?: string | null;
  RheSerie?: string | null;
  RheNumero?: string | null;
  RheValidadoSunat?: boolean;
  AplicaRetencion4ta?: boolean;
  ObservacionAu?: string | null;
  ObservacionUc?: string | null;
  RetrasoJustificado?: boolean;
  PenalidadDiaria?: number | null;
  MontoPenalidadAcumulada?: number;
  RetencionCuarta?: number;
  MontoNeto?: number | null;
  ProrrogaDias?: number;
  MotivoProrroga?: string | null;
  InformeDocumento?: string | null;
  RhePdfDocumento?: string | null;
  RheXmlDocumento?: string | null;
  Suspension4taDocumento?: string | null;
  NotaPagoDocumento?: string | null;
  ConstanciaDocumento?: string | null;
  PapeletaPenalidadDocumento?: string | null;
  Checklist?: ChecklistPago[];
  Hitos?: HitoPago[];
}

export interface EntregablePortalLocador {
  IdExpedientePago: string;
  IdExpediente: string;
  Codigo: string;
  CodigoEstado: string;
  Version: number;
  Estado: string;
  NumeroEntregable: number;
  NombreEntregable: string;
  PlazoDias: number;
  MontoEntregable: number;
  FechaLimiteCronograma: string | null;
  FechaPresentacion: string | null;
  FechaLimiteSubsanacion: string | null;
  ObservacionAu: string | null;
  DiasAtraso: number;
  Transiciones?: TransicionPago[];
}

export interface OrdenPortalLocador {
  IdRequerimiento: string;
  CodigoRequerimiento: string;
  NumeroOrdenSiga: string | null;
  NombreLocador: string | null;
  RucLocador: string | null;
  MontoContrato: number;
  Denominacion: string;
  Entregables: EntregablePortalLocador[];
}

export const TIPO_INFORME = 'PAG_INFORME_ENTREGABLE';
export const TIPO_RHE_PDF = 'PAG_RHE_PDF';
export const TIPO_RHE_XML = 'PAG_RHE_XML';
export const TIPO_SUSP_4TA = 'PAG_SUSPENSION_4TA';
export const TIPO_ANEXO_11 = 'PAG_ACTA_ANEXO11';
export const TIPO_NOTA_PAGO = 'PAG_NOTA_PAGO_SIAF';
export const TIPO_CONSTANCIA = 'PAG_CONSTANCIA_TRANSFERENCIA';
export const TIPO_PAPELETA = 'PAG_PAPELETA_PENALIDAD';
export const CARPETA_PAGO = 'pago';
