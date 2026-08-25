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
  /** Si este actor puede corregir el contenido del Anexo 3. Lo decide
   *  `cmn.fnPuedeEditar` en la base, con la misma regla que aplica la rutina al
   *  guardar; la pantalla no lo deduce del estado. */
  PuedeEditar?: boolean;
  /** Área usuaria que originó el expediente. En la bandeja de Abastecimiento
   *  conviven varias y sin esto la fila no dice de quién es. */
  AreaUsuaria?: string;
  SiglaArea?: string;
  /** Anexo 4 que ya agrupa esta solicitud, si lo hay. */
  IdPaquete?: string | null;
  CodigoAnexo4?: string | null;
  /** Id de archivo (documento_sistema) del Anexo 3 vigente. */
  DocumentoSistemaAnexo3?: string | null;
  /** Id de archivo (documento_sistema) del Anexo 4 vigente. */
  DocumentoSistemaAnexo4?: string | null;
  /** Informe o nota técnica con que el área usuaria sustenta una solicitud
   *  extraordinaria. Viaja en la bandeja porque es ahí donde Abastecimiento
   *  decide si la urgencia está justificada. */
  DocumentoSustentoUrgencia?: string | null;
  /** Acciones de este actor sobre este expediente. Las calcula
   *  cmn.paListarSolicitud con la misma regla que
   *  sigcm.paListarTransicionDisponible. */
  Transiciones?: TransicionCmn[];
}

/**
 * Una firma de la cadena, tal como la devuelve sigcm.paListarDocumento.
 *
 * Los anexos llevan firmas en cadena: el Anexo 3 la del jefe del área usuaria
 * y el Anexo 4 la del jefe de Abastecimiento. La lista viene completa —firmadas
 * y pendientes— para que la pantalla pueda mostrar en qué punto está el
 * documento sin deducirlo del estado.
 */
export interface FirmaDocumentoCmn {
  OrdenFirma: number;
  CodigoRol: string;
  Rol: string;
  Estado: 'FIRMADA' | 'PENDIENTE' | 'INVALIDADA';
  FirmanteNombre: string | null;
  FirmanteCargo: string | null;
  FirmadoEn: string | null;
}

/** Documento del expediente. sigcm.paListarDocumento */
export interface DocumentoCmn {
  IdDocumento: string;
  CodigoTipoDocumento: string;
  Numero: string;
  TipoDocumento: string;
  Version: number;
  /** BORRADOR mientras no hay firmas, PARCIAL con algunas, FIRMADO con todas. */
  Estado: 'BORRADOR' | 'PARCIAL' | 'FIRMADO' | 'SUPERADA' | 'ANULADA';
  GeneradoDocumento: string | null;
  NombreDocumento: string | null;
  FirmadoEn: string | null;
  Consolidado: boolean;
  PuedeFirmarEsteRol: boolean;
  EsteRolYaFirmo: boolean;
  Firmas: FirmaDocumentoCmn[];
}

/* -------------------------------------------------------------------------- */
/* Anexo 4                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Un Anexo 3 dentro de un Anexo 4, con sus ítems.
 *
 * El Anexo 4 se imprime agrupado por área usuaria: cada bloque es una de estas.
 */
export interface SolicitudDelPaqueteCmn {
  Orden: number;
  IdSolicitud: string;
  Codigo: string;
  CentroCosto: string;
  Sustento: string;
  TipoOperacion: string;
  TipoInclusion: string | null;
  JustificacionUrgencia?: string | null;
  FechaSolicitud: string;
  IdExpediente: string;
  CodigoExpediente: string;
  CodigoEstado: string;
  Version: number;
  AreaUsuaria: string;
  SiglaArea: string;
  Responsable: string | null;
  CargoResponsable: string | null;
  Items: ItemSolicitudCmn[];
}

/**
 * El Anexo 4 completo. cmn.paGenerarAnexo4 y cmn.paObtenerAnexo4.
 *
 * Un Anexo 4 puede cubrir uno o varios Anexos 3 de áreas usuarias distintas:
 * `Solicitudes` trae siempre al menos uno, y el PDF se arma recorriéndolos.
 */
export interface PaqueteAnexo4Cmn extends RespuestaSigcm {
  IdPaquete: string;
  Codigo: string;
  AnoEje: number;
  SecEjec: number;
  TipoInclusion: 'ORDINARIA' | 'EXTRAORDINARIA';
  Sustento: string | null;
  Anulado: boolean;
  FechaGeneracion: string;
  GeneradoPor: string;
  CargoGenerador: string | null;
  UnidadGeneradora: string;
  TotalSolicitudes: number;
  TotalItems: number;
  MontoTotal: number;
  Solicitudes: SolicitudDelPaqueteCmn[];
}

/** Un expediente del lote, para mover varios con una sola acción. */
export interface ExpedienteLoteCmn {
  IdExpediente: string;
  Version: number;
}

/**
 * Acción disponible para ESTE actor sobre ESTE expediente.
 *
 * En la bandeja llega dentro de cada fila de cmn.paListarSolicitud
 * (`Transiciones`). sigcm.paListarTransicionDisponible sigue existiendo para
 * consultar un expediente suelto. La máquina de estados vive en la base.
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
  /** El «por qué» de una solicitud extraordinaria, con base en las directivas
   *  del MEF. Obligatorio cuando TipoInclusion es EXTRAORDINARIA. */
  JustificacionUrgencia?: string | null;
  Sustento: string;
  FechaSolicitud: string;
  IdExpediente: string;
  CodigoEstado: string;
  Version: number;
  Anulado: boolean;
  Estado: string;
  PuedeEditar?: boolean;
  Responsable: string;
  Items: ItemSolicitudCmn[];
  DocumentoSistemaAnexo3?: string | null;
  DocumentoSistemaAnexo4?: string | null;
  DocumentoSustentoUrgencia?: string | null;
  NombreSustentoUrgencia?: string | null;
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
  Descripcion: string;
  CatalogoActivo: boolean;
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

/** Combinacion presupuestal real disponible para el centro de costo en SIGA. */
export interface TechoSiga {
  Secuencia: number;
  CentroCosto: string;
  FaseCuadro: number;
  TipoTarea: string;
  NivelTarea: string;
  CodigoTarea: number;
  SecFunc: number;
  SecFuncProp: number | null;
  Origen: string;
  FuenteFinanc: string;
  Clasificador: string;
  MontoTecho0: number;
  MontoUsado0: number;
  MontoDisponible0: number;
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
  /**
   * Solo inclusión o exclusión.
   *
   * MODIFICACION se retiró: el Anexo 3 oficial tiene dos pares de columnas
   * —exclusión e inclusión— y no una tercera para modificar. Cambiar la cantidad
   * de un ítem programado se expresa excluyendo la línea vigente e incluyéndola
   * con la cantidad nueva, que es lo que el área usuaria firma tal como se
   * imprime. `cmn.paRegistrarSolicitud` rechaza el valor con un mensaje que dice
   * eso mismo, así que quitar la opción del combo y dejarla viva en la rutina
   * serían dos criterios distintos.
   */
  TipoMovimiento: 'INCLUSION' | 'EXCLUSION';

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
