/* Formas que devuelven las rutinas del esquema [resolucion] (F018). */

export interface TransicionResolucion {
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

export type Causal = 'INCUMPLIMIENTO' | 'CASO_FORTUITO' | 'HECHO_SOBREVINIENTE' | 'ANTICORRUPCION'
                   | 'DOCUMENTACION_FALSA' | 'PENALIDAD_MAXIMA' | 'MUTUO_ACUERDO' | 'UNILATERAL';

/* Las causales del 7.3.7.1 con su literal, y las dos del ultimo parrafo. Se
   muestran con estas etiquetas; el codigo es el de la base. */
export const CAUSALES: { codigo: Causal; nombre: string; quien: 'AREA_USUARIA' | 'PROVEEDOR' | 'AMBOS' }[] = [
  { codigo: 'INCUMPLIMIENTO',      nombre: 'a) Incumplimiento de obligaciones contractuales',        quien: 'AREA_USUARIA' },
  { codigo: 'CASO_FORTUITO',       nombre: 'b) Caso fortuito o fuerza mayor',                        quien: 'AREA_USUARIA' },
  { codigo: 'HECHO_SOBREVINIENTE', nombre: 'c) Hecho sobreviniente no imputable a las partes',       quien: 'AMBOS' },
  { codigo: 'ANTICORRUPCION',      nombre: 'd) Incumplimiento de la cláusula anticorrupción',        quien: 'AREA_USUARIA' },
  { codigo: 'DOCUMENTACION_FALSA', nombre: 'e) Documentación falsa o inexacta',                      quien: 'AREA_USUARIA' },
  { codigo: 'PENALIDAD_MAXIMA',    nombre: 'f) Penalidades superiores al 10 % del contrato',         quien: 'AREA_USUARIA' },
  { codigo: 'MUTUO_ACUERDO',       nombre: 'Mutuo acuerdo entre las partes',                         quien: 'PROVEEDOR' },
  { codigo: 'UNILATERAL',          nombre: 'Unilateral por fines institucionales',                   quien: 'AREA_USUARIA' }
];

export interface ProcedimientoBandeja {
  IdProcedimiento: string;
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
  Causal: Causal;
  Origen: 'AREA_USUARIA' | 'PROVEEDOR';
  Alcance: 'TOTAL' | 'PARCIAL';
  FechaInicio: string;
  RequiereApercibimiento: boolean;
  FechaLimiteSubsanacion: string | null;
  /** Dias que faltan para cumplir bajo apercibimiento; negativo = vencido. */
  DiasSubsanacion: number | null;
  ResultadoApercibimiento: string | null;
  ResultadoDec: string | null;
  FechaResolucion: string | null;
  NotificadaEn: string | null;
  Transiciones: TransicionResolucion[];
}

export interface PlazoProcedimiento {
  CodigoRegla: string;
  Nombre: string;
  Inicio: string;
  Vencimiento: string;
  AmpliadoHasta: string | null;
  CumplidoEn: string | null;
  Estado: string;
}

export interface ProcedimientoDetalle extends ProcedimientoBandeja {
  AnoEje: number;
  ContratoEstado: string;
  TipoPrestacion: string;
  MontoContrato: number;
  ContratoInicio: string;
  ContratoFin: string;
  PlazoDias: number;
  PenalidadAcumulada: number;
  CorreoProveedor: string | null;
  UnidadOrigenNombre: string;
  ParteResuelta: string | null;
  Hechos: string;
  InformeAuDocumento: string | null;
  SolicitudDocumento: string | null;
  PronunciamientoAu: string | null;
  InformeAu: string | null;
  PronunciamientoEn: string | null;
  PlazoBaseDias: number | null;
  PlazoApercibimientoMin: number | null;
  PlazoApercibimientoMax: number | null;
  PlazoApercibimientoDias: number | null;
  NumeroCartaApercibimiento: string | null;
  CartaApercibimientoDocumento: string | null;
  ApercibimientoNotificadoEn: string | null;
  RespuestaProveedor: string | null;
  RespuestaDocumento: string | null;
  RespondidaEn: string | null;
  MotivoDec: string | null;
  DecisionEn: string | null;
  DecisionPor: string | null;
  NumeroCarta: string | null;
  CartaDocumento: string | null;
  MedioNotificacion: string | null;
  ResultadoNotificacion: string | null;
  RegistroPladicop: string | null;
  Plazos: PlazoProcedimiento[];
  PuedePronunciarAu: boolean;
  PuedeDecidirDec: boolean;
  PuedeEmitirCarta: boolean;
  PuedeResponder: boolean;
  PuedeNotificar: boolean;
}

export const TIPO_RES_INFORME_AU = 'RES_INFORME_AU';
export const TIPO_RES_SOLICITUD = 'RES_SOLICITUD_PROVEEDOR';
export const TIPO_RES_CARTA_APERCIBIMIENTO = 'RES_CARTA_APERCIBIMIENTO';
export const TIPO_RES_RESPUESTA = 'RES_RESPUESTA_PROVEEDOR';
export const TIPO_RES_CARTA_RESOLUCION = 'RES_CARTA_RESOLUCION';
export const TIPO_RES_CARTA_RESPUESTA = 'RES_CARTA_RESPUESTA';
export const CARPETA_RESOLUCION = 'resolucion';
