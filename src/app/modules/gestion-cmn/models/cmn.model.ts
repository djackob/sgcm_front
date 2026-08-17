/**
 * Formas que devuelven las rutinas del módulo CMN.
 *
 * Los nombres van en PascalCase porque son los de las columnas de la base y los
 * de las rutinas. Renombrarlos a camelCase obligaría a mantener un traductor en
 * el medio y a leer dos vocabularios para seguir un dato de la pantalla a la
 * tabla.
 */

/** Sobre común: toda rutina responde con estado 1 (se hizo) o 0 (no se hizo). */
export interface RespuestaSigcm {
  estado: number;
  mensaje: string;
  codigo?: number | string;
}

/** Fila de la bandeja. cmn.paListarSolicitud */
export interface SolicitudCmn {
  IdSolicitud: string;
  Codigo: string;
  AnoEje: number;
  CentroCosto: string;
  TipoOperacion: string;
  TipoInclusion: string | null;
  FechaSolicitud: string;
  IdExpediente: string;
  CodigoEstado: string;
  Version: number;
  Estado: string;
  RolResponsable: string | null;
  Items: number;
  MontoTotal: number;
  ActualizadoEn: string;
  /** Id de archivo (documento_sistema) del Anexo 3 vigente. */
  DocumentoSistemaAnexo3?: string | null;
  /** Id de archivo (documento_sistema) del Anexo 4 vigente. */
  DocumentoSistemaAnexo4?: string | null;
}

/**
 * Acción disponible para ESTE actor sobre ESTE expediente.
 * sigcm.paListarTransicionDisponible
 *
 * La bandeja no deduce acciones a partir del estado: las pide. La máquina de
 * estados vive en la base y no se replica aquí.
 */
export interface TransicionCmn {
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

/** Un período de los 48 (4 años × 12 meses) que materializa la rutina. */
export interface PeriodoItemCmn {
  AnoOffset: number;
  Mes: number;
  Cantidad: number;
  Monto: number;
}

/** Ítem de la solicitud, tal como lo devuelve el visor. */
export interface ItemSolicitudCmn {
  IdSolicitudItem: string;
  Orden: number;
  TipoMovimiento: string;
  CodigoItem: string;
  Descripcion: string;
  UnidadMedida: number;
  UnidadAbreviatura: string;
  PrecioUnitario: number;
  SecFunc: number;
  Clasificador: string;
  TipoTarea?: string;
  NivelTarea?: string;
  CodigoTarea?: number | null;
  Origen?: string;
  FuenteFinanc?: string;
  TipoUso?: string;
  TipoBien?: string;
  GrupoBien?: string;
  ClaseBien?: string;
  FamiliaBien?: string;
  ItemBien?: string;
  RefSecCuadro: number | null;
  RefSecItem: number | null;
  CantidadAno0: number;
  CantidadAno1: number;
  CantidadAno2: number;
  CantidadAno3: number;
  MontoAno0: number;
  MontoAno1: number;
  MontoAno2: number;
  MontoAno3: number;
  CantidadTotal: number;
  MontoTotal: number;
  Periodos: PeriodoItemCmn[];
}

/** Solicitud completa. cmn.paObtenerSolicitud */
export interface SolicitudDetalleCmn extends RespuestaSigcm {
  IdSolicitud: string;
  Codigo: string;
  AnoEje: number;
  SecEjec: number;
  CentroCosto: string;
  CentroCostoNombre: string;
  TipoOperacion: string;
  TipoInclusion: string | null;
  Sustento: string;
  FechaSolicitud: string;
  IdExpediente: string;
  CodigoEstado: string;
  Version: number;
  Anulado: boolean;
  Estado: string;
  Responsable: string;
  Items: ItemSolicitudCmn[];
  DocumentoSistemaAnexo3?: string | null;
  DocumentoSistemaAnexo4?: string | null;
}

/** Un paso del historial. sigcm.paObtenerTrazabilidad */
export interface HistorialCmn {
  IdHistorial: number;
  CodigoEstadoOrigen: string | null;
  CodigoEstadoDestino: string;
  CodigoTransicion: string | null;
  Comentario: string | null;
  ActorRol: string;
  OcurridoEn: string;
  Actor: string;
  Unidad: string;
}

export interface ObservacionCmn {
  IdObservacion: string;
  CodigoRolOrigen: string;
  CodigoEstadoRetorno: string;
  Motivo: string;
  Estado: string;
  Respuesta: string | null;
  FechaCreacionAuditoria: string;
  RecepcionadaEn: string | null;
  SubsanadaEn: string | null;
  CerradaEn: string | null;
}

export interface OperacionIntegracionCmn {
  IdOperacion: string;
  Operacion: string;
  Estado: string;
  Secuencia: number;
  Intentos: number;
  MaxIntentos: number;
  ModoEjecucion: string;
  ErrorCodigo: string | null;
  ErrorMensaje: string | null;
  FechaCreacionAuditoria: string;
  CompletadoEn: string | null;
}

/* -------------------------------------------------------------------------- */
/* Maestros de SIGA                                                           */
/* -------------------------------------------------------------------------- */

/** Fila del catálogo de bienes y servicios de SIGA. */
export interface CatalogoSiga {
  CodigoItem: string;
  TipoBien: string;
  GrupoBien: string;
  ClaseBien: string;
  FamiliaBien: string;
  ItemBien: string;
  Descripcion: string;
  UnidadMedida: number;
  PrecioRef: number;
  Activo: boolean;
}

/** Ítem del cuadro vigente: lo que se puede excluir o modificar. */
export interface CuadroVigenteSiga {
  SecCuadro: number;
  SecItem: number;
  SecCuaModSal: number;
  CodigoItem: string;
  TipoBien: string;
  GrupoBien: string;
  ClaseBien: string;
  FamiliaBien: string;
  ItemBien: string;
  UnidadMedida: number;
  PrecioUnit: number;
  EstadoSiga: string;
  ProcedenciaDesc: string;
  MotivoDesc: string;
  CantAno0: number;
  CantAno1: number;
  CantAno2: number;
  CantAno3: number;
  TipoTarea: string;
  NivelTarea: string;
  CodigoTarea: number;
  SecFunc: number;
  Origen: string;
  FuenteFinanc: string;
  Clasificador: string;
  TipoUso: string;
}

export interface TareaSiga {
  TipoTarea: string;
  NivelTarea: string;
  CodigoTarea: number;
  NombreTarea: string;
  GrupoTarea: string;
  TipoUso: string;
  Activo: boolean;
}

export interface MetaSiga {
  SecFunc: number;
  Nombre: string;
  Meta: string;
  Finalidad: string;
  ActProy: string;
  Activo: boolean;
}

export interface FuenteFinancSiga {
  Origen: string;
  FuenteFinanc: string;
  Descripcion: string;
  MontoAsignado: number;
  Activo: boolean;
}

/* -------------------------------------------------------------------------- */
/* Formulario del Anexo 3                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Línea del formulario de registro. No es lo mismo que ItemSolicitudCmn: esto es
 * lo que el usuario está escribiendo, con los campos auxiliares que la pantalla
 * necesita y la rutina no recibe (descripción, unidad, el mes de referencia).
 */
export interface ItemFormularioCmn {
  TipoMovimiento: 'INCLUSION' | 'EXCLUSION' | 'MODIFICACION';

  /* Identificación del bien o servicio en el catálogo de SIGA */
  TipoBien: string;
  GrupoBien: string;
  ClaseBien: string;
  FamiliaBien: string;
  ItemBien: string;

  /* Clasificación presupuestal */
  TipoTarea: string;
  NivelTarea: string;
  CodigoTarea: number | null;
  SecFunc: number | null;
  Origen: string;
  FuenteFinanc: string;
  Clasificador: string;
  TipoUso: string;

  PrecioUnitario: number | null;

  /* Referencia al cuadro vigente: obligatoria salvo en INCLUSION */
  RefSecCuadro: number | null;
  RefSecItem: number | null;

  /* Cantidad por año. El mes es el de imputación dentro de cada año. */
  Cantidades: [number | null, number | null, number | null, number | null];
  Mes: number;

  /* Auxiliares de pantalla */
  CodigoItem: string;
  Descripcion: string;
  UnidadAbreviatura: string;
  buscando: boolean;
  textoBusqueda: string;
  resultados: CatalogoSiga[];
}

export function crearItemFormularioCmn(): ItemFormularioCmn {
  return {
    TipoMovimiento: 'INCLUSION',
    TipoBien: '',
    GrupoBien: '',
    ClaseBien: '',
    FamiliaBien: '',
    ItemBien: '',
    TipoTarea: '',
    NivelTarea: '',
    CodigoTarea: null,
    SecFunc: null,
    Origen: '',
    FuenteFinanc: '',
    Clasificador: '',
    TipoUso: 'C',
    PrecioUnitario: null,
    RefSecCuadro: null,
    RefSecItem: null,
    Cantidades: [null, null, null, null],
    Mes: 1,
    CodigoItem: '',
    Descripcion: '',
    UnidadAbreviatura: '',
    buscando: false,
    textoBusqueda: '',
    resultados: []
  };
}
