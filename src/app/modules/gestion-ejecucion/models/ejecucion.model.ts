/* Formas que devuelven las rutinas del esquema [ejecucion] (F016). Los nombres
   son los de la base, en PascalCase, sin traducir (ESTANDARES 4.4). */

export interface TransicionEjecucion {
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

export interface ContratoBandeja {
  IdContrato: string;
  IdExpediente: string;
  Codigo: string;
  CodigoEstado: string;
  Version: number;
  Estado: string;
  RolResponsable: string | null;
  /** Si alguna accion del contrato o de sus entregas esta en manos de ESTE perfil. */
  MeToca: boolean;
  IdRequerimiento: string;
  CodigoRequerimiento: string;
  NumeroOrdenSiga: string | null;
  Denominacion: string;
  TipoPrestacion: 'BIEN' | 'SERVICIO' | 'CONSULTORIA' | 'LOCACION';
  TipoPrestacionNombre: string | null;
  FechaInicio: string;
  FechaFinPrevista: string;
  FechaFinReal: string | null;
  PlazoDias: number;
  /** Negativo = vencido. Nulo cuando el contrato ya cerro. */
  DiasRestantes: number | null;
  LugarEntrega: string | null;
  MontoContrato: number;
  NombreProveedor: string | null;
  RucProveedor: string | null;
  DniProveedor: string | null;
  UnidadOrigen: string;
  TotalEntregables: number;
  EntregablesConformes: number;
  TotalEntregas: number;
  EntregasPendientes: number;
  IncidenciasAbiertas: number;
  Transiciones: TransicionEjecucion[];
  ActualizadoEn?: string;
}

export interface EntregaContrato {
  IdEntrega: string;
  IdExpediente: string;
  Codigo: string;
  CodigoEstado: string;
  Version: number;
  Estado: string;
  RolResponsable: string | null;
  EsFinal: boolean;
  MeToca: boolean;
  NumeroEntrega: number;
  NumeroEntregable: number | null;
  IdExpedientePago: string | null;
  Lugar: 'SEDE_CENTRAL' | 'SEDE_DESCONCENTRADA';
  Detalle: string;
  FechaAnuncio: string;
  FechaPrevista: string;
  FechaIngreso: string | null;
  FechaVerificacion: string | null;
  FechaRecepcion: string | null;
  FechaRetiro: string | null;
  NumeroGuiaRemision: string;
  GuiaDocumento: string | null;
  GuiaSuscritaDocumento: string | null;
  ActaIncumplimientoDocumento: string | null;
  NumeroPecosa: string | null;
  PecosaDocumento: string | null;
  IdVerificador: string | null;
  Verificador: string | null;
  ResultadoVerificacion: 'CONFORME' | 'OBSERVADO' | null;
  DetalleVerificacion: string | null;
  Transiciones: TransicionEjecucion[];
}

/** El entregable del cronograma con su estado en Entregables y pagos. Solo lectura aqui. */
export interface EntregableContrato {
  IdExpedientePago: string;
  IdExpediente: string;
  Codigo: string;
  CodigoEstado: string;
  Estado: string;
  EsFinal: boolean;
  ConConformidad: boolean;
  NumeroEntregable: number;
  NombreEntregable: string;
  MontoEntregable: number;
  FechaLimiteCronograma: string | null;
  FechaPresentacion: string | null;
  FechaConformidadTecnica: string | null;
  DiasAtraso: number;
  MontoPenalidad: number;
}

export interface IncidenciaContrato {
  IdIncidencia: string;
  Tipo: 'INCIDENCIA' | 'INCUMPLIMIENTO' | 'RIESGO';
  Detalle: string;
  DocumentoSgd: string | null;
  InformeDocumento: string | null;
  Estado: 'COMUNICADA' | 'ATENDIDA';
  Respuesta: string | null;
  RegistradaEn: string;
  AtendidaEn: string | null;
  RegistradaPor: string | null;
  AtendidaPor: string | null;
}

export interface PlazoContrato {
  CodigoRegla: string;
  Nombre: string;
  Inicio: string;
  Vencimiento: string;
  AmpliadoHasta: string | null;
  CumplidoEn: string | null;
  Estado: string;
}

export interface ContratoDetalle extends ContratoBandeja {
  EsFinal: boolean;
  AnoEje: number;
  FechaNotificacion: string;
  DireccionEntrega: string | null;
  IdSupervisor: string | null;
  Supervisor: string | null;
  CorreoProveedor: string | null;
  UnidadOrigenNombre: string;
  Entregas: EntregaContrato[];
  Entregables: EntregableContrato[];
  Incidencias: IncidenciaContrato[];
  Plazos: PlazoContrato[];
  /* Lo que ESTE actor puede hacer fuera de la maquina de estados. Lo decide la
     base; la pantalla solo lo lee (ESTANDARES 4.5). */
  PuedeAnunciarEntrega: boolean;
  PuedeEditarContrato: boolean;
  PuedeRegistrarIncidencia: boolean;
  PuedeAtenderIncidencia: boolean;
}

export interface PersonaVerificadora {
  IdUsuario: string;
  Nombre: string;
  Cuenta: string;
  Rol: string;
}

export const TIPO_GUIA = 'EJE_GUIA_REMISION';
export const TIPO_GUIA_SUSCRITA = 'EJE_GUIA_REMISION_SUSCRITA';
export const TIPO_ACTA_INCUMPLIMIENTO = 'EJE_ACTA_INCUMPLIMIENTO';
export const TIPO_PECOSA = 'EJE_PECOSA';
export const TIPO_INFORME_INCIDENCIA = 'EJE_INFORME_INCIDENCIA';
export const CARPETA_EJECUCION = 'ejecucion';
