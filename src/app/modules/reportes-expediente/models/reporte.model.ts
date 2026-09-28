export type TipoOrden = 'OC' | 'OS';

export interface OrdenEncontrada {
  IdOrdenServicio: string;
  /** Null mientras SIGA no devuelve el número. */
  NumeroOrden: string | null;
  TipoOrden: TipoOrden;
  FechaOrden: string | null;
  CodigoRequerimiento: string;
  Denominacion: string | null;
  AnoEje: number | null;
  Unidad: string | null;
  UnidadSigla: string | null;
  Estado: string | null;
  Proveedor: string | null;
  RucProveedor: string | null;
  Monto: number | null;
  Entregables: number;
  EntregablesPagados: number;
}

export interface CabeceraExpedienteDocumental {
  IdOrdenServicio: string;
  NumeroOrden: string | null;
  TipoOrden: TipoOrden;
  FechaOrden: string | null;
  CodigoRequerimiento: string;
  Denominacion: string | null;
  CodigoTipoContratacion: string | null;
  CodigoCmn: string | null;
  Unidad: string | null;
  UnidadSigla: string | null;
  EstadoRequerimiento: string | null;
  CodigoContrato: string | null;
  EstadoContrato: string | null;
  FechaInicio: string | null;
  FechaFin: string | null;
  PlazoDias: number | null;
  Monto: number | null;
  Proveedor: string | null;
  RucProveedor: string | null;
  Entregables: number;
  EntregablesPagados: number;
  MontoPagado: number;
  Constancia: string | null;
}

export interface ExpedienteCadena {
  IdExpediente: string;
  CodigoModulo: string;
  Modulo: string;
  Codigo: string;
  Estado: string | null;
  EsFinal: boolean | null;
  Padre: string | null;
  Creado: string | null;
  Documentos: number;
}

export interface DocumentoCadena {
  CodigoModulo: string;
  Modulo: string;
  CodigoExpediente: string;
  Carpeta: string | null;
  Documento: string;
  Numero: string | null;
  GeneradoDocumento: string;
  NombreDocumento: string | null;
  Fecha: string | null;
  /** REGISTRO: sigcm.Documento; MODULO: columna propia del módulo. */
  Origen: 'REGISTRO' | 'MODULO';
}

export interface HistorialCadena {
  Modulo: string;
  CodigoExpediente: string;
  OcurridoEn: string;
  EstadoOrigen: string | null;
  EstadoDestino: string | null;
  Comentario: string | null;
  ActorRol: string | null;
  Actor: string | null;
  Unidad: string | null;
}

export interface ExpedienteDocumental {
  Cabecera: CabeceraExpedienteDocumental;
  Expedientes: ExpedienteCadena[];
  Documentos: DocumentoCadena[];
  Historial: HistorialCadena[];
}

export interface GrupoDocumentos {
  clave: string;
  Modulo: string;
  CodigoExpediente: string;
  documentos: DocumentoCadena[];
}
