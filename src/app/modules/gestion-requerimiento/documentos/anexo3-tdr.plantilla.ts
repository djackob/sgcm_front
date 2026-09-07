/**
 * Textos del TDR de locación (Anexo N.° 3 de la Directiva 002-2026-ANIN,
 * pp. 32–37). Los bloques fijos salen tal cual del anexo; los editables
 * son lo que el especialista completa en el formulario.
 */

export interface TdrActividad {
  Descripcion: string;
}

export interface TdrEntregable {
  Nombre: string;
  Dias: number;
}

export interface TdrLocacion {
  EsProyecto: boolean;
  NombreProyecto: string;
  FinalidadPublica: string;
  Objetivo: string;
  Justificacion: string;
  IntroActividades: string;
  Actividades: TdrActividad[];
  /** 7.1.3 Grado de instrucción */
  PerfilProveedor: string;
  /** 7.1.4 Capacitación requerida */
  Capacitacion: string;
  ExperienciaGeneral: string;
  /** Si false, no se exige ni se imprime experiencia específica. */
  ExigeExperienciaEspecifica: boolean;
  ExperienciaEspecifica: string;
  UnidadOrganizacional: string;
  UnidadConformidad: string;
  /** Si true, se designa un informe previo / VB antes de la conformidad. */
  ExigeInformePrevio: boolean;
  UnidadInforme: string;
  LugarPrestacion: string;
  OtrasPenalidades: string;
  Entregables: TdrEntregable[];
}

export const AYUDA_FINALIDAD =
  'Describir el interés público que se pretende satisfacer con la contratación, indicando cómo la prestación contribuirá al cumplimiento de las funciones, objetivos institucionales o necesidades de la Entidad.';

export const AYUDA_OBJETIVO =
  'Indique qué se consigue de forma técnica con la ejecución de las actividades: ¿qué producto, capacidad o resultado operativo se logra? No limite el texto al nombre del servicio; describa el resultado técnico esperado.';

export const AYUDA_JUSTIFICACION =
  'Consignar una breve descripción de los antecedentes considerados por el área usuaria para la determinación de la necesidad, respecto del motivo por el cual se efectúa el requerimiento de contratación de servicios y cómo esta contribuirá al cumplimiento de sus funciones, objetivos institucionales o metas programadas.';

export const MARCO_LEGAL = [
  'Ley N° 31841, Ley que crea la Autoridad Nacional de Infraestructura.',
  'Ley N° 32069, Ley General de Contrataciones Públicas, en adelante La Ley.',
  'Decreto Supremo N° 009-2025-EF, que aprueba el Reglamento de la Ley Nº 32069, Ley General de Contrataciones Públicas, modificado por el Decreto Supremo N° 001-2026-EF, en adelante el Reglamento.',
  'Resolución Jefatural N° 002-2023-ANIN-JEFATURA, que aprueba el Texto Integrado del Reglamento de Organización y Funciones de la Autoridad Nacional de Infraestructura.',
  'Resolución de Gerencia General N.° 000004-2026-ANIN/GG, que aprueba la Directiva N° 002-2026-ANIN – Versión 1 “Directiva para la Gestión de Contratos Menores en la Autoridad Nacional de Infraestructura”.',
  'Demás normas que resulten aplicables durante la ejecución de la prestación.'
].map(linea => `• ${linea}`).join('\n');

export const FINALIDAD_EDITABLE = 'finalidad 1';

export const FINALIDAD_COMPLEMENTO =
  ', mediante la prestación del servicio requerido, contribuyendo al cumplimiento oportuno y eficiente de las funciones, actividades, objetivos institucionales o compromisos de gestión del área usuaria, en el marco de las competencias de la Autoridad Nacional de Infraestructura.';

export const OBJETIVO_EDITABLE = 'objetivo 1';

export const JUSTIFICACION_EDITABLE = 'justificación 1';

export const JUSTIFICACION_COMPLEMENTO =
  'En ese sentido, la contratación resulta necesaria e idónea, toda vez que contribuirá al adecuado cumplimiento de las funciones del área usuaria, optimizando el uso de los recursos públicos, asegurando la continuidad de las actividades institucionales y el logro de los objetivos previstos.';

export const INTRO_ACTIVIDADES =
  'Las actividades que realizará el CONTRATISTA durante la prestación del servicio son:';

export const INTRO_ENTREGABLES =
  'Cada entregable deberá contener un (01) un informe que describa el desarrollo total o parcial de las actividades (según corresponda).';

export const OBSERVACION_ENTREGABLES =
  'De existir alguna observación al entregable, esta deberá ser subsanada por el contratista en el plazo establecido en la comunicación de la Dependencia Encargada de las Contrataciones (DEC), de conformidad al numeral 144.4 del artículo 144 del Reglamento de la Ley N° 32069, Ley General de Contrataciones Públicas, contados desde el día siguiente de la notificación de la observación.\n\nLas observaciones que puedan contener los documentos indicados en los literales b, c, d y e del numeral IX, podrán ser subsanadas por el contratista a solicitud de la Unidad de Abastecimiento a través de correo electrónico.\n\nLos entregables deberán ser presentados en concordancia con lo descrito en los numerales IX y X.';

export const PERFIL_EJEMPLO = 'perfil 1';

export const CAPACITACION_EJEMPLO = 'capacitación 1';

export const EXPERIENCIA_GENERAL_EJEMPLO = 'experiencia general 1';

export const EXPERIENCIA_ESPECIFICA_EJEMPLO = 'experiencia específica 1';

export const ACREDITACION_ESTUDIOS =
  '• Los estudios y/o capacitaciones deberán ser acreditados con certificados y/o diplomas y/o constancias y/o algún documento que demuestre fehacientemente los estudios y/o capacitaciones realizadas.\n• La experiencia del proveedor deberá ser acreditada con: Certificados y/o Constancias de Trabajo, contratos y/u órdenes de servicios acompañadas de sus respectivas conformidades o constancias de prestación de servicios u otro documento que acredite fehacientemente la experiencia; asimismo, en caso de presentar adendas, estas deben estar adjuntas al contrato primigenio. Para el caso de resoluciones y/o documentos de designación, deberán adjuntarse las respectivas resoluciones y/o documentos de cese.';

export const RECURSOS_PROVEEDOR =
  '7.2.1. Contar con seguro obligatorio para servicios con presencia en campo y/u obra(s): SCTR y EPP.\n\nIMPORTANTE\nEl área usuaria tomará todas las medidas de control necesarias durante la ejecución del servicio con el fin de asegurar que el contratista cumpla con lo establecido en los presentes términos de referencia.';

export const CONFORMIDAD_FIJA =
  'La conformidad se emite en un plazo máximo de siete días (07) contabilizados desde el día siguiente de recibido el entregable, salvo que se requiera efectuar pruebas que permitan verificar el cumplimiento de la obligación, bajo responsabilidad del servidor o funcionario que debe emitir la conformidad.\n\nDe corresponder, deberá contener un informe donde el funcionario responsable verifique, dependiendo de la naturaleza de la prestación, la calidad, cantidad y cumplimiento de las condiciones contractuales.\n\nAsimismo, son aplicables las disposiciones correspondientes a la conformidad establecidas en el artículo 144 del Reglamento de la Ley N° 32069, Ley General de Contrataciones Públicas, aprobado mediante Decreto Supremo N° 009-2025-EF.';

export const FORMA_PAGO_DOCUMENTOS =
  'Los documentos para el trámite de pago que deberá presentar el contratista son los siguientes:\na) Entregable, de acuerdo al numeral 6.\nb) Recibo por honorarios electrónico (al crédito), consignando el número de la orden de servicio o número del contrato, según corresponda, y el número de entregable correspondiente.\nc) Validez del recibo por honorarios electrónico emitido.\nd) Suspensión de renta 4ta categoría (de corresponder).\ne) Notificación de la orden de servicio, de corresponder.\n\nEl pago se realizará en un plazo máximo de diez (10) días hábiles luego de otorgada la conformidad por parte del área usuaria y es prorrogable, previa justificación de la demora, por cinco días hábiles.\n\nEl pago incluirá los impuestos de Ley y todo costo o retención que recaiga en el servicio, no debiendo proceder pagos a cuenta por servicios no efectuados, ni adelanto alguno.';

export const PLAZO_NOTA =
  '(Días calendario, contados a partir del día siguiente de la notificación de la orden de servicio o de suscrito el contrato)';

export const MESA_PARTES =
  'Los entregables, comprobantes de pago y/u otros documentos solicitados serán presentados mediante la mesa partes virtual o presencial de la ANIN.';

export const PENALIDAD_INTRO =
  'La suma de la aplicación de las penalidades por mora y de otras penalidades no puede exceder el 10% del monto del contrato menor.';

export const PENALIDAD_MORA_TEXTO =
  'En caso de retraso injustificado del contratista en la ejecución de las prestaciones objeto del contrato, la entidad contratante le aplica automáticamente una penalidad por mora por cada día de atraso que le sea imputable. La penalidad se aplica automáticamente y se calcula de acuerdo con la siguiente fórmula:';

export const PENALIDAD_MORA_CIERRE =
  'Tanto el monto como el plazo se refieren, según corresponda, al monto vigente del contrato, componente o ítem que debió ejecutarse o, en caso de que estos involucren entregables cuantificables en monto y plazo, al monto y plazo del entregable que fuera materia de retraso (para dichos casos, no se considerará el plazo acumulado).\n\nLa Entidad tiene derecho para exigir, además de la penalidad, el cumplimiento de la obligación.';

export const UNIDAD_ORGANIZACIONAL_EJEMPLO = 'unidad organizacional 1';

export const LUGAR_EJEMPLO = 'lugar 1';

export const OTRAS_PENALIDADES_EJEMPLO = '';

export const CONFIDENCIALIDAD =
  'El/La contratista no deberá divulgar, revelar, entregar o poner a disposición de terceros, dentro o fuera de la entidad, salvo autorización expresa de la misma, la información proporcionada por esta, para la prestación del servicio y en general toda la información a la que tenga acceso o la que pudiera producir con ocasión del servicio que presta, durante y después de concluida la vigencia del presente documento. Dicha información puede consistir en fotografías, informes, material videográfico, documentos y otros similares.';

export const ANTICORRUPCION =
  'El/La proveedor/a o contratista declara y garantiza no haber, directa o indirectamente, o tratándose de una persona jurídica a través de sus socios, integrantes de los órganos de administración, apoderados, representantes legales, funcionarios, asesores o personas vinculadas, en concordancia a lo establecido en la Ley N° 32069, Ley General de Contrataciones Públicas, y su Reglamento aprobado mediante Decreto Supremo N° 009-2025-EF, ofrecido, negociado o efectuado, cualquier pago o, en general, cualquier beneficio o incentivo legal en relación al contrato.\n\nAsimismo, el/la proveedor/a o contratista se obliga a conducirse en todo momento, durante la ejecución del contrato, con honestidad, probidad, veracidad e integridad y de no cometer actos ilegales o de corrupción, directa o indirectamente o a través de sus socios, accionistas, participacioncitas, integrantes de los órganos de administración, apoderados, representantes legales, funcionarios, asesores y personas vinculadas, en virtud a lo establecido en la Ley N° 32069, Ley General de Contrataciones Públicas, y su Reglamento aprobado mediante Decreto Supremo N° 009-2025-EF.\n\nAdemás, el/la proveedor/a o contratista se compromete a comunicar a las autoridades competentes, de manera directa y oportuna, cualquier acto o conducta ilícita o corrupta de la que tuviera conocimiento, y adoptar medidas técnicas, organizativas y/o de personal apropiados para evitar los referidos actos o prácticas.\n\nEn cumplimiento de la Resolución Jefatural N.° 083- 2024-ANIN-JEF, mediante el cual se aprueba la "Política de Integridad y Antisoborno de la Autoridad Nacional de Infraestructura", se pone de conocimiento el enlace para denunciar un presunto acto de corrupción:\nhttps://www.gob.pe/21129-denunciar-un-presunto-acto-de-corrupcion?child=61287';

export const CONFLICTO_INTERESES =
  'Son causales de resolución de contrato la presentación con información inexacta o falsa de la Declaración Jurada de Prohibiciones e Incompatibilidades a que se hace referencia en la Ley de prevención y mitigación del conflicto de intereses en el acceso y salida de personal del servicio público. Asimismo, en caso se incumpla con los impedimentos señalados en el artículo 5 de dicha ley se aplicará la inhabilitación por cinco años para contratar o prestar servicios al Estado, bajo cualquier modalidad.';

export const PROPIEDAD_INTELECTUAL =
  'La Entidad tendrá todos los derechos de propiedad intelectual incluidos, sin limitación, así como las patentes, derechos de autor, nombres comerciales y marcas registradas respecto a los productos o documentos y otros materiales que guarden una relación directa con la ejecución del servicio o que se hubiere creado o producido como consecuencia o en el desarrollo de la ejecución del servicio.';

export const VICIOS_OCULTOS =
  'El/La contratista es el responsable por la calidad ofrecida y por los vicios ocultos del servicio ofertado por un plazo no menor de un (01) año, contado a partir de la conformidad otorgada por la Entidad.';

export const DECLARACION_INTERESES =
  'Conforme al Artículo 2 de la Ley N° 31227 y su reglamento aprobado con Resolución de Contraloría Nº 158-2021-CG, constituye la presentación de la Declaración Jurada de Intereses, requisito indispensable para el ejercicio del cargo o función pública y demás situaciones que regula la presente ley, por lo que, su presentación debe realizar en los plazos establecidos, bajo sanción establecida en la Ley y su Reglamento.\n\n(Se consideran sujetos obligatorios, conforme al artículo 3 de la Ley N° 31227, entre otros, a las siguientes personas:\n- Responsables, asesores, coordinadores y consultores externos en entidades de la administración pública a cargo de los procesos para la ejecución de obras por iniciativa pública o privada, incluyendo los procesos para la elaboración de los expedientes técnicos de obras y la respectiva supervisión;\n- Aquellos que, en el ejercicio de su cargo, labor o función, sean responsables de la elaboración, aprobación o modificación de los requerimientos de contratación, expedientes de contratación y de los documentos del procedimiento de selección, en concordancia con la Ley 32069 - Ley General de Contrataciones del Estado y su reglamento vigente.\n- Profesionales y técnicos de la dependencia encargada de contrataciones que, en razón de sus funciones, intervienen en alguna de las fases de la contratación.)';

export const GASTOS_DESPLAZAMIENTO =
  'En caso de que, para el cumplimiento de sus actividades, se requiera el traslado del contratista en el ámbito nacional, los gastos inherentes a las mismas (pasajes, viáticos y tarifa única por uso de aeropuerto), serán asumidos por la ANIN. Dichos gastos se otorgarán y rendirán conforme a lo dispuesto en la DIRECTIVA PARA LA GESTIÓN DE VIÁTICOS, PASAJES Y OTRAS ASIGNACIONES POR COMISIÓN DE SERVICIOS AL INTERIOR Y EXTERIOR DEL PAÍS, EN LA ANIN.';

export const OTRAS_CONSIDERACIONES =
  `13.1. Confidencialidad\n\n${CONFIDENCIALIDAD}\n\n13.2. Cláusula anticorrupción y antisoborno\n\n${ANTICORRUPCION}\n\n13.3. Conflicto de intereses (Ley N° 31564)\n\n${CONFLICTO_INTERESES}\n\n13.4. Propiedad intelectual\n\n${PROPIEDAD_INTELECTUAL}\n\n13.5. Responsabilidad por vicios ocultos\n\n${VICIOS_OCULTOS}\n\n13.6. Declaración Jurada de Intereses [de corresponder]\n\n${DECLARACION_INTERESES}\n\n13.7. Gastos por desplazamiento [de corresponder]\n\n${GASTOS_DESPLAZAMIENTO}`;

export const RESOLUCION_CONTRACTUAL =
  'La ANIN puede resolver el contrato, en los siguientes casos:\n\na) Incumplimiento de obligaciones contractuales, por causa atribuible a la parte que incumple.\nb) Caso fortuito o fuerza mayor que imposibilite la continuación del contrato.\nc) Hecho sobreviniente al perfeccionamiento del contrato, de supuesto distinto al caso fortuito o fuerza mayor, no imputable a ninguna de las partes, que imposibilite la continuación del contrato.\nd) Por incumplimiento de la cláusula anticorrupción y antisoborno.\ne) Por la presentación de documentación falsa o inexacta durante la ejecución contractual y/o en la presentación de su cotización.\nf) Cuando la suma de la aplicación de las penalidades por mora y de otras penalidades exceda el 10% del monto del contrato menor.\n\nAsimismo, puede resolverse de forma total o parcial la orden de servicio y/o contrato por mutuo acuerdo entre las partes o de manera unilateral por la ANIN por fines institucionales, previa opinión del área usuaria que sustente dicha decisión.';

export const SOLUCION_CONTROVERSIAS =
  'Todas las controversias que surjan entre las partes sobre la validez, nulidad, interpretación, ejecución, terminación o eficacia, se resuelven mediante conciliación, conforme lo dispuesto en el numeral 81.3 del artículo 81 de la Ley. El procedimiento conciliatorio será regulado mediante el numeral 330.2 del artículo 330 del Reglamento.';

export const PENALIDAD_MORA =
  `${PENALIDAD_INTRO}\n\n11.1. Penalidad por mora (Obligatorio)\n${PENALIDAD_MORA_TEXTO}\n\nPenalidad diaria = (0.10 × monto) / (0.40 × plazo)\n\n${PENALIDAD_MORA_CIERRE}`;

const LETRAS = [
  'CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE',
  'DIECIOCHO', 'DIECINUEVE', 'VEINTE'
];

const UNIDADES_MIN = [
  '', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'
];
const ESPECIALES_MIN = [
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
  'dieciocho', 'diecinueve'
];
const DECENAS_MIN = [
  '', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'
];
const CENTENAS_MIN = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos'
];

export function numeroEnLetras(valor: number): string {
  const n = Math.floor(Number(valor) || 0);
  return LETRAS[n] || String(n);
}

/** «cinco (05)» / «ciento veinte (120)» para entregables. */
export function diasEnLiteralYCifra(dias: number): string {
  const n = Math.max(0, Math.floor(Number(dias) || 0));
  const cifra = String(n).padStart(2, '0');
  return `${numeroDiasEnLetras(n)} (${cifra})`;
}

export function numeroDiasEnLetras(n: number): string {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if (v === 0) {
    return 'cero';
  }
  if (v === 100) {
    return 'cien';
  }
  if (v < 10) {
    return UNIDADES_MIN[v];
  }
  if (v < 20) {
    return ESPECIALES_MIN[v - 10];
  }
  if (v < 30) {
    return v === 20 ? 'veinte' : `veinti${UNIDADES_MIN[v - 20]}`;
  }
  if (v < 100) {
    const d = Math.floor(v / 10);
    const u = v % 10;
    return u === 0 ? DECENAS_MIN[d] : `${DECENAS_MIN[d]} y ${UNIDADES_MIN[u]}`;
  }
  if (v < 1000) {
    const c = Math.floor(v / 100);
    const r = v % 100;
    const cabeza = c === 1 && r === 0 ? 'cien' : CENTENAS_MIN[c];
    return r === 0 ? cabeza : `${cabeza} ${numeroDiasEnLetras(r)}`;
  }
  return String(v);
}

export function textoFormaPago(cantidadEntregables: number): string {
  const n = Math.max(1, Math.floor(Number(cantidadEntregables) || 1));
  const letras = numeroEnLetras(n);
  const cifra = String(n).padStart(2, '0');
  const noun = n === 1 ? 'entregable' : 'entregables';
  const modalidad = n === 1 ? 'en pago único' : 'en armadas';
  return `Previa presentación del entregable y emisión de la conformidad, la forma de pago se efectuará en: ${letras} (${cifra}) ${noun} ${modalidad}.`;
}

export function nombreEntregableUnico(plazo: number): string {
  return nombreEntregable(0, plazo > 0 ? plazo : 30, 1);
}

const ORDINALES_ENTREGABLE = [
  'PRIMER', 'SEGUNDO', 'TERCER', 'CUARTO', 'QUINTO',
  'SEXTO', 'SÉPTIMO', 'OCTAVO', 'NOVENO', 'DÉCIMO',
  'DECIMOPRIMER', 'DECIMOSEGUNDO', 'DECIMOTERCER', 'DECIMOCUARTO', 'DECIMOQUINTO',
  'DECIMOSEXTO', 'DECIMOSÉPTIMO', 'DECIMOCTAVO', 'DECIMONOVENO', 'VIGÉSIMO'
];

/**
 * Texto por defecto del entregable i (0-based).
 * `diasAcumulados` es el día límite (acumulativo), no un tramo a sumar.
 */
export function nombreEntregable(indice: number, diasAcumulados: number, cantidad: number): string {
  const dias = diasAcumulados > 0 ? diasAcumulados : 30;
  const cola =
    `Hasta los ${diasEnLiteralYCifra(dias)} días calendario, contados a partir del día siguiente de notificada la orden de servicio o de suscrito el contrato.`;
  if (cantidad <= 1) {
    return `ÚNICO ENTREGABLE. ${cola}`;
  }
  const ordinal = ORDINALES_ENTREGABLE[indice] || `${indice + 1}.°`;
  return `${ordinal} ENTREGABLE. ${cola}`;
}

function esNombreEntregableGenerado(nombre: string): boolean {
  const n = (nombre || '').trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!n) {
    return true;
  }
  if (n.startsWith('UNICO ENTREGABLE')) {
    return true;
  }
  return ORDINALES_ENTREGABLE.some(o => {
    const base = o.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    return n.startsWith(`${base} ENTREGABLE`);
  });
}

export function crearTdrLocacion(valores: {
  plazoDias?: number | null;
  unidad?: string;
}): TdrLocacion {
  const plazo = Number(valores.plazoDias) > 0 ? Number(valores.plazoDias) : 30;
  const unidad = (valores.unidad || '').trim();

  return {
    EsProyecto: false,
    NombreProyecto: '',
    FinalidadPublica: FINALIDAD_EDITABLE,
    Objetivo: OBJETIVO_EDITABLE,
    Justificacion: JUSTIFICACION_EDITABLE,
    IntroActividades: INTRO_ACTIVIDADES,
    Actividades: [],
    PerfilProveedor: PERFIL_EJEMPLO,
    Capacitacion: CAPACITACION_EJEMPLO,
    ExperienciaGeneral: EXPERIENCIA_GENERAL_EJEMPLO,
    ExigeExperienciaEspecifica: true,
    ExperienciaEspecifica: EXPERIENCIA_ESPECIFICA_EJEMPLO,
    UnidadOrganizacional: unidad || UNIDAD_ORGANIZACIONAL_EJEMPLO,
    UnidadConformidad: unidad,
    ExigeInformePrevio: false,
    UnidadInforme: '',
    LugarPrestacion: LUGAR_EJEMPLO,
    OtrasPenalidades: OTRAS_PENALIDADES_EJEMPLO,
    Entregables: [{ Nombre: nombreEntregableUnico(plazo), Dias: plazo }]
  };
}

/** Día límite del último entregable (acumulativo, no suma de tramos). */
export function plazoEntregables(tdr: TdrLocacion): number {
  const filas = tdr.Entregables || [];
  if (!filas.length) {
    return 0;
  }
  return Math.max(0, Math.floor(Number(filas[filas.length - 1].Dias) || 0));
}

/** En modelo acumulativo, Dias ya es el día límite hasta ese entregable. */
export function diasAcumuladosEntregable(tdr: TdrLocacion, indice: number): number {
  const filas = tdr.Entregables || [];
  if (indice < 0 || indice >= filas.length) {
    return 0;
  }
  return Math.max(0, Math.floor(Number(filas[indice]?.Dias) || 0));
}

/**
 * Regenera el texto por defecto. Dias es acumulativo (30, 50, 120…), no tramo.
 */
export function recalcularNombresEntregables(tdr: TdrLocacion): void {
  const filas = tdr.Entregables || [];
  const n = filas.length;
  filas.forEach((entregable, i) => {
    const dia = Math.max(0, Math.floor(Number(entregable.Dias) || 0));
    entregable.Dias = dia > 0 ? dia : 1;
    if (esNombreEntregableGenerado(entregable.Nombre)) {
      entregable.Nombre = nombreEntregable(i, entregable.Dias, n);
    }
  });
}

/**
 * Hitos acumulativos que suman el plazo (p. ej. 120 / 4 → 30, 60, 90, 120).
 */
export function prorratearDias(plazo: number, cantidad: number): number[] {
  const n = Math.max(1, Math.min(20, Math.floor(Number(cantidad) || 1)));
  const total = Math.max(0, Math.floor(Number(plazo) || 0));
  if (n === 1) {
    return [total];
  }
  const base = Math.floor(total / n);
  const resto = total - base * n;
  const tramos = Array.from({ length: n }, (_, i) => base + (i >= n - resto ? 1 : 0));
  let acumulado = 0;
  return tramos.map(t => {
    acumulado += t;
    return acumulado;
  });
}

/** Al menos una actividad con descripción. */
export function validarActividadesTdr(tdr: TdrLocacion): string | null {
  const conTexto = (tdr.Actividades || []).filter(a => (a.Descripcion || '').trim());
  if (!conTexto.length) {
    return 'Registre al menos una actividad (Sección 5. CARACTERÍSTICAS Y CONDICIONES DE LA CONTRATACIÓN).';
  }
  return null;
}

/**
 * Días calendario acumulativos: estrictamente crecientes y el último = plazo.
 */
export function validarEntregablesTdr(
  tdr: TdrLocacion,
  cantidadRegistrada?: number | null,
  plazoContrato?: number | null
): string | null {
  const filas = tdr.Entregables || [];
  const conNombre = filas.filter(e => (e.Nombre || '').trim());
  const esperada = Math.floor(Number(cantidadRegistrada) || 0);

  if (esperada > 0) {
    if (filas.length !== esperada || conNombre.length !== esperada) {
      return `El Anexo 5 registró ${esperada} entregable(s). Complete exactamente esa cantidad en la sección 6 del TDR.`;
    }
  } else if (!conNombre.length) {
    return 'Registre al menos un entregable en el Anexo 3.';
  }

  if (conNombre.some(e => !(Number(e.Dias) > 0))) {
    return 'Cada entregable debe tener un plazo en días mayor que cero.';
  }

  for (let i = 1; i < filas.length; i++) {
    const prev = Math.floor(Number(filas[i - 1].Dias) || 0);
    const actual = Math.floor(Number(filas[i].Dias) || 0);
    if (actual <= prev) {
      return `Los días calendario son acumulativos: el entregable ${i + 1} debe ser mayor que el ${i} (${prev} días).`;
    }
  }

  const plazo = Math.floor(Number(plazoContrato) || 0);
  if (plazo > 0) {
    const ultimo = plazoEntregables(tdr);
    if (ultimo !== plazo) {
      return `El último entregable debe llegar al plazo del contrato (${plazo} días). Ahora figura ${ultimo}.`;
    }
  }
  return null;
}

/**
 * Ajusta la cantidad de filas. Si cambió el número o aún no hay días, reparte
 * hitos acumulativos; si ya había días, los conserva y refresca nombres.
 */
export function ajustarEntregables(tdr: TdrLocacion, cantidad: number, plazoContrato?: number | null): void {
  const n = Math.max(1, Math.min(20, Math.floor(Number(cantidad) || 1)));
  const plazo = Number(plazoContrato) > 0
    ? Math.floor(Number(plazoContrato))
    : (tdr.Entregables?.[tdr.Entregables.length - 1]?.Dias || 30);

  if (!Array.isArray(tdr.Entregables)) {
    tdr.Entregables = [];
  }

  const prev = tdr.Entregables.length;

  while (tdr.Entregables.length < n) {
    tdr.Entregables.push({ Nombre: '', Dias: 1 });
  }
  if (tdr.Entregables.length > n) {
    tdr.Entregables.length = n;
  }

  const countChanged = prev !== n;
  const sinDias = tdr.Entregables.every(e => !(Number(e.Dias) > 0));

  if (countChanged || sinDias) {
    const dias = prorratearDias(plazo, n);
    tdr.Entregables.forEach((entregable, i) => {
      entregable.Dias = dias[i];
      if (esNombreEntregableGenerado(entregable.Nombre) || countChanged) {
        entregable.Nombre = '';
      }
    });
  }

  recalcularNombresEntregables(tdr);
}
