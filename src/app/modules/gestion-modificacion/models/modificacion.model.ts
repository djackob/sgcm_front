/* Formas que devuelven las rutinas del esquema [ampliacion] (F017). Nombres de
   la base, en PascalCase (ESTANDARES 4.4). */

export interface TransicionModificacion {
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

export type TipoSolicitud = 'MODIFICACION' | 'AMPLIACION_PLAZO';

export interface SolicitudBandeja {
  IdSolicitud: string;
  IdExpediente: string;
  Codigo: string;
  CodigoEstado: string;
  Version: number;
  Estado: string;
  RolResponsable: string | null;
  EsFinal: boolean;
  MeToca: boolean;
  IdContrato: string;
  ContratoCodigo: string;
  CodigoRequerimiento: string;
  NumeroOrdenSiga: string | null;
  Denominacion: string;
  NombreProveedor: string | null;
  RucProveedor: string | null;
  DniProveedor: string | null;
  UnidadOrigen: string;
  Tipo: TipoSolicitud;
  Origen: 'PROVEEDOR' | 'AREA_USUARIA';
  FechaPresentacion: string;
  Asunto: string;
  DiasSolicitados: number | null;
  DiasOtorgados: number | null;
  PresentadaEnPlazo: boolean | null;
  ResultadoAu: string | null;
  ResultadoDec: string | null;
  AceptacionTacita: boolean;
  NotificadaEn: string | null;
  PlazoVigente: string | null;
  /** Dias que faltan para el plazo que corre; negativo = vencido. */
  DiasPlazo: number | null;
  Transiciones: TransicionModificacion[];
}

export interface PlazoSolicitud {
  CodigoRegla: string;
  Nombre: string;
  Inicio: string;
  Vencimiento: string;
  AmpliadoHasta: string | null;
  CumplidoEn: string | null;
  Estado: string;
}

export interface SolicitudDetalle extends SolicitudBandeja {
  AnoEje: number;
  ContratoEstado: string;
  TipoPrestacion: string;
  MontoContrato: number;
  FechaInicio: string;
  PlazoDias: number;
  FechaFinPrevista: string;
  CorreoProveedor: string | null;
  UnidadOrigenNombre: string;
  Sustento: string;
  SolicitudDocumento: string | null;
  FechaFinHechoGenerador: string | null;
  FechaLimitePresentacion: string | null;
  FechaFinAnterior: string | null;
  NuevaFechaFin: string | null;
  DetalleModificacion: string | null;
  InformeAu: string | null;
  InformeAuDocumento: string | null;
  OpinionAuEn: string | null;
  OpinionAuPor: string | null;
  MotivoDec: string | null;
  InformeDecDocumento: string | null;
  DecisionEn: string | null;
  DecisionPor: string | null;
  NumeroActa: string | null;
  ActaDocumento: string | null;
  RegistroPladicop: string | null;
  SuscritaProveedorEn: string | null;
  NumeroCarta: string | null;
  CartaDocumento: string | null;
  MedioNotificacion: string | null;
  ResultadoNotificacion: string | null;
  VenceDecision: string | null;
  DecisionVencida: boolean;
  Plazos: PlazoSolicitud[];
  PuedeOpinarAu: boolean;
  PuedeDecidirDec: boolean;
  PuedeEmitirActa: boolean;
  PuedeNotificar: boolean;
}

/** Contrato vigente de Ejecucion, para elegir sobre cual se pide. */
export interface ContratoElegible {
  IdContrato: string;
  Codigo: string;
  CodigoRequerimiento: string;
  NumeroOrdenSiga: string | null;
  Denominacion: string;
  NombreProveedor: string | null;
  FechaFinPrevista: string;
  TipoPrestacion: string;
}

export const TIPO_MOD_SOLICITUD = 'MOD_SOLICITUD';
export const TIPO_MOD_INFORME_AU = 'MOD_INFORME_AU';
export const TIPO_MOD_INFORME_DEC = 'MOD_INFORME_DEC';
export const TIPO_MOD_ACTA = 'MOD_ACTA_MODIFICACION';
export const TIPO_MOD_CARTA = 'MOD_CARTA_RESPUESTA';
export const TIPO_AMP_SOLICITUD = 'AMP_SOLICITUD';
export const TIPO_AMP_INFORME_AU = 'AMP_INFORME_AU';
export const TIPO_AMP_CARTA = 'AMP_CARTA_RESPUESTA';
export const CARPETA_MODIFICACION = 'modificacion';
