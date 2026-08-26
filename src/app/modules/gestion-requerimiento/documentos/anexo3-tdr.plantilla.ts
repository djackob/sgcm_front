/**
 * Textos oficiales del TDR de locación (Anexo 3 / Anexo N.° 03 de la Directiva).
 * Los bloques marcados como fijos no se editan; los editables salen con el
 * ejemplo del sistema anterior para que el especialista los complete.
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
  PerfilProveedor: string;
  ExperienciaGeneral: string;
  ExperienciaEspecifica: string;
  UnidadOrganizacional: string;
  UnidadConformidad: string;
  UnidadInforme: string;
  LugarPrestacion: string;
  OtrasPenalidades: string;
  Entregables: TdrEntregable[];
}

export const AYUDA_FINALIDAD =
  'Describir el interés público que se pretende satisfacer con la contratación, indicando cómo la prestación contribuirá al cumplimiento de las funciones, objetivos institucionales o necesidades de la Entidad.';

export const AYUDA_OBJETIVO =
  'Identificar el propósito de la contratación, precisando "¿qué se requiere contratar?" y "¿para qué?", en función de la necesidad identificada por el área usuaria.';

export const AYUDA_JUSTIFICACION =
  'Consignar una breve descripción de los antecedentes considerados por el área usuaria para la determinación de la necesidad, respecto del motivo por el cual se efectúa el requerimiento de contratación de servicios y cómo esta contribuirá al cumplimiento de sus funciones, objetivos institucionales o metas programadas.';

export const MARCO_LEGAL = [
  'Ley N° 31841, Ley que crea la Autoridad Nacional de Infraestructura.',
  'Ley N° 32069, Ley General de Contrataciones Públicas, en adelante La Ley.',
  'Decreto Supremo N° 009-2025-EF, que aprueba el Reglamento de la Ley Nº 32069, Ley General de Contrataciones Públicas, modificado por el Decreto Supremo N° 001-2026-EF, en adelante el Reglamento.',
  'Resolución Jefatural N° 002-2023-ANIN-JEFATURA, que aprueba el Texto Integrado del Reglamento de Organización y Funciones de la Autoridad Nacional de Infraestructura.',
  'Resolución de Gerencia General N.° 000004-2026-ANIN/GG, que aprueba la Directiva N° 002-2026-ANIN – Versión 1 “Directiva para la Gestión de Contratos Menores en la Autoridad Nacional de Infraestructura”.',
  'Demás normas que resulten aplicables durante la ejecución de la prestación.'
].map(linea => `-	${linea}`).join('\n');

export const FINALIDAD_EDITABLE =
  'La presente contratación tiene por finalidad contribuir directamente a [mencionar el impacto social/beneficio final para el ciudadano: ej. asegurar el acceso oportuno a la salud, mejorar las condiciones educativas, garantizar la seguridad ribereña] en favor de la población de [ámbito geográfico o público objetivo]';

export const FINALIDAD_COMPLEMENTO =
  ', mediante la prestación del servicio requerido, contribuyendo al cumplimiento oportuno y eficiente de las funciones, actividades, objetivos institucionales o compromisos de gestión del área usuaria, en el marco de las competencias de la Autoridad Nacional de Infraestructura.';

export const OBJETIVO_EDITABLE =
  'El objetivo del presente requerimiento es contratar el servicio de [indicar la denominación del servicio], a fin de desarrollar, ejecutar, apoyar, asesorar o brindar asistencia técnica en [describir las principales actividades principales o entregables clave], conforme a las condiciones establecidas en los presentes Términos de Referencia.';

export const JUSTIFICACION_EDITABLE =
  'En el marco de las funciones asignadas a la [Nombre del área usuaria], y de las actividades, objetivos o metas institucionales previstas para el periodo correspondiente, se ha identificado la necesidad de contratar el servicio de [indicar denominación del servicio], con la finalidad de atender los requerimientos propios de la gestión institucional y asegurar el cumplimiento oportuno de las actividades a su cargo. \nEl servicio se desarrollará en la [De corresponder a proyecto, especificar fase, etapa del proyecto: ej. Fase de ejecución] bajo las condiciones de los presentes Términos de Referencia, asegurando el cumplimiento de los plazos, estándares de calidad, costos y requerimientos técnicos establecidos.\n';

export const JUSTIFICACION_COMPLEMENTO =
  'En ese sentido, la contratación resulta necesaria e idónea, toda vez que contribuirá al adecuado cumplimiento de las funciones del área usuaria, optimizando el uso de los recursos públicos, asegurando la continuidad de las actividades institucionales y el logro de los objetivos previstos.';

export const INTRO_ACTIVIDADES =
  '5.1.\tActividades (*)\nLas actividades que realizará el CONTRATISTA durante la prestación del servicio son:\n';

export const INTRO_ENTREGABLES =
  'Cada entregable deberá contener un (01) un informe que describa el desarrollo total o parcial de las actividades (según corresponda) y adjuntar la información que sustente el cumplimiento de las actividades de corresponder.';

export const OBSERVACION_ENTREGABLES =
  'De existir alguna observación al entregable, esta deberá ser subsanada por el contratista en el plazo establecido en la comunicación de la Dependencia Encargada de las Contrataciones (DEC), de conformidad al numeral 144.4 del artículo 144 del Reglamento de la Ley N° 32069, Ley General de Contrataciones Públicas, contados desde el día siguiente de la notificación de la observación. \n\nLas observaciones que puedan contener los documentos indicados en los literales b, c, d y e del numeral 9, podrán ser subsanadas por el contratista a solicitud de la Unidad de Abastecimiento a través de correo electrónico.\n\nLos entregables deberán ser presentados en concordancia con lo descrito en los numerales 9 y 10.\n';

export const PERFIL_EJEMPLO =
  'Ejemplo: Título Técnico o Profesional de Ingeniero Mecánico Electricista. Colegiado y habilitado.';

export const EXPERIENCIA_GENERAL_EJEMPLO =
  'Ejemplo: cinco (05) años en el sector público y/o privado.';

export const EXPERIENCIA_ESPECIFICA_EJEMPLO =
  'Ejemplo: tres (03) años en el sector público y/o privado, Instalaciones Mecánicas y/o Instalaciones Mecánicas y Eléctricas y/o Asistente de campo y/o Supervisor y/o Supervisor de Obras y/o Residente de Montaje Electromecánico y/o Ingeniero Residente en obra.';

export const REQUISITOS_PLANTILLA =
  '\n7.1.\tRequisitos del/de la proveedor/a\n\n7.1.1.\tRegistro Nacional de Proveedores vigente.\n7.1.2.\tNo contar con impedimento para contratar con el Estado, según el artículo 30 de la Ley General de Contrataciones Públicas.\n7.1.3.\tRUC Activo y Habido.\n7.1.4.\t{{EXPERIENCIA_PROVEEDOR}}\n7.1.5.\tExperiencia laboral general mínima de {{EXPERIENCIA_GENERAL}}\nExperiencia laboral específica mínima de {{EXPERIENCIA_ESPECIFICA}}\n\n•\tLos estudios y/o capacitaciones deberán ser acreditados con certificados y/o diplomas y/o constancias y/o algún documento que demuestre fehacientemente los estudios y/o capacitaciones realizadas. \n•\tLa experiencia del proveedor deberá ser acreditada con: Certificados y/o Constancias de Trabajo, contratos y/u órdenes de servicios acompañadas de sus respectivas conformidades o constancias de prestación de servicios u otro documento que acredite fehacientemente la experiencia; asimismo, en caso de presentar adendas, estas deben estar adjuntas al contrato primigenio. Para el caso de resoluciones y/o documentos de designación, deberán adjuntarse las respectivas resoluciones y/o documentos de cese. \n\n7.2.\tRecursos a ser provistos por el/la proveedora\n\n7.2.1.\tContar con seguro obligatorio para servicios con presencia en campo y/u obra(s): SCTR y EPP. \n\nIMPORTANTE\nEl área usuaria tomará todas las medidas de control necesarias durante la ejecución del servicio con el fin de asegurar que el contratista cumpla con lo establecido en los presentes términos de referencia.\n';

export const UNIDAD_ORGANIZACIONAL_EJEMPLO =
  '[ indicar nombre de la unidad orgánica que es el área usuaria] [previo informe de cumplimiento, indicar el área técnica, (de corresponder) ] ';

export const CONFORMIDAD_PLANTILLA =
  '8.1.\tÁrea usuaria que emite la conformidad: \nLa conformidad del servicio será otorgada por {{UNIDAD_ORGANIZACIONAL}}de conformidad de verificación y cumplimiento de las actividades contratadas y la suscripción del formato de conformidad.\n\nLa conformidad se emite en un plazo máximo de siete días (07) contabilizados desde el día siguiente de recibido el entregable, salvo que se requiera efectuar pruebas que permitan verificar el cumplimiento de la obligación, bajo responsabilidad del servidor o funcionario que debe emitir la conformidad. \n\nDe corresponder, deberá contener un informe donde el funcionario responsable verifique, dependiendo de la naturaleza de la prestación, la calidad, cantidad y cumplimiento de las condiciones contractuales.\n\nAsimismo, son aplicables las disposiciones correspondientes a la conformidad establecidas en el artículo 144 del Reglamento de la Ley N° 32069, Ley General de Contrataciones Públicas, aprobado mediante Decreto Supremo N° 009-2025-EF.\n';

export const FORMA_PAGO =
  'Previa presentación del entregable y emisión de la conformidad:\n\nLos documentos para el trámite de pago que deberá presentar el contratista son los siguientes:\na)\tEntregable, de acuerdo al numeral 6.\nb)\tRecibo por honorarios electrónico (al crédito), consignando el número de la orden de servicio o número del contrato, según corresponda, y el número de entregable correspondiente.\nc)\tValidez del recibo por honorarios electrónico emitido.\nd)\tSuspensión de renta 4ta categoría (de corresponder).\ne)\tNotificación de la orden de servicio, de corresponder.\n\nEl pago se realizará en un plazo máximo de diez (10) días hábiles luego de otorgada la conformidad por parte del área usuaria y es prorrogable, previa justificación de la demora, por cinco (05) días hábiles.\n\nEl pago incluirá los impuestos de Ley y todo costo o retención que recaiga en el servicio, no debiendo proceder pagos a cuenta por servicios no efectuados, ni adelanto alguno.\n';

export const LUGAR_EJEMPLO =
  'Ejemplo: 10.1.\tLugar de prestación:\nEl servicio será realizado de forma presencial en el Hospital Provincial de Cascas II-1, Distrito de Cascas, Provincia de Gran Chimú, Región La Libertad.\n';

export const PLAZO_PLANTILLA =
  '10.2.\tPlazo: \nEl plazo será hasta {{PLAZO}} días calendario, contados a partir del día siguiente de la notificación del contrato menor.\n\n10.3.\tLos entregables, comprobantes de pago y/u otros documentos solicitados serán presentados mediante la mesa partes virtual o presencial de la ANIN.\n';

export const PENALIDAD_MORA =
  'La suma de la aplicación de las penalidades por mora y de otras penalidades no puede exceder el 10% del monto del contrato menor.\n\n\tPenalidad por mora (Obligatorio)\nEn caso de retraso injustificado del contratista en la ejecución de las prestaciones objeto del contrato, la entidad contratante le aplica automáticamente una penalidad por mora por cada día de atraso que le sea imputable. La penalidad se aplica automáticamente y se calcula de acuerdo con la siguiente fórmula:\n\nPenalidad diaria=  (0.10×monto)/(0.40×plazo)\n\nTanto el monto como el plazo se refieren, según corresponda, al monto vigente del contrato, componente o ítem que debió ejecutarse o, en caso de que estos involucren entregables cuantificables en monto y plazo, al monto y plazo del entregable que fuera materia de retraso (para dichos casos, no se considerará el plazo acumulado). \n\nLa Entidad tiene derecho para exigir, además de la penalidad, el cumplimiento de la obligación.\n\n';

export const OTRAS_PENALIDADES_EJEMPLO =
  '11.2.\tOtras Penalidades (De corresponder)\nCompletar de corresponder\n';

export const OTRAS_CONSIDERACIONES =
  '12.1.\tConfidencialidad \n\nEl/La contratista no deberá divulgar, revelar, entregar o poner a disposición de terceros, dentro o fuera de la entidad, salvo autorización expresa de la misma, la información proporcionada por esta, para la prestación del servicio y en general toda la información a la que tenga acceso o la que pudiera producir con ocasión del servicio que presta, durante y después de concluida la vigencia del presente documento. Dicha información puede consistir en fotografías, informes, material videográfico, documentos y otros similares.\n \n12.2.\tCláusula anticorrupción y antisoborno \n\nEl/la contratista declara y garantiza no haber, directa o indirectamente, o tratándose de una persona jurídica a través de sus socios, integrantes de los órganos de administración, apoderados, representantes legales, funcionarios, asesores o personas vinculadas, en concordancia a lo establecido en la Ley N° 32069, Ley General de Contrataciones Públicas, y su Reglamento aprobado mediante Decreto Supremo N° 009-2025-EF, ofrecido, negociado o efectuado, cualquier pago o, en general, cualquier beneficio o incentivo legal en relación al contrato.\n\nAsimismo, el/la contratista se obliga a conducirse en todo momento, durante la ejecución del contrato, con honestidad, probidad, veracidad e integridad y de no cometer actos ilegales o de corrupción, directa o indirectamente o a través de sus socios, accionistas, participacioncitas, integrantes de los órganos de administración, apoderados, representantes legales, funcionarios, asesores y personas vinculadas, en virtud a lo establecido en la Ley N° 32069, Ley General de Contrataciones Públicas, y su Reglamento aprobado mediante Decreto Supremo N° 009-2025-EF.\n\nAdemás, el/la contratista se compromete a comunicar a las autoridades competentes, de manera directa y oportuna, cualquier acto o conducta ilícita o corrupta de la que tuviera conocimiento, y adoptar medidas técnicas, organizativas y/o de personal apropiados para evitar los referidos actos o prácticas.\n\nEn cumplimiento de la Resolución Jefatural N° 083- 2024-ANIN-JEF, mediante el cual se aprueba la "Política de Integridad y Antisoborno de la Autoridad Nacional de Infraestructura", se pone de conocimiento el enlace para denunciar un presunto acto de corrupción: https://www.gob.pe/21129-denunciar-un-presunto-acto-de-corrupcion?child=61287\n';

export const RESOLUCION_CONTRACTUAL =
  'La ANIN puede resolver el contrato, en los siguientes casos:\n\na)\tIncumplimiento de obligaciones contractuales, por causa atribuible a la parte que incumple.\nb)\tCaso fortuito o fuerza mayor que imposibilite la continuación del contrato.\nc)\tHecho sobreviniente al perfeccionamiento del contrato, de supuesto distinto al caso fortuito o fuerza mayor, no imputable a ninguna de las partes, que imposibilite la continuación del contrato.\nd)\tPor incumplimiento de la cláusula anticorrupción y antisoborno.\ne)\tPor la presentación de documentación falsa o inexacta durante la ejecución contractual y/o en la presentación de su cotización.\nf)\tCuando la suma de la aplicación de las penalidades por mora y de otras penalidades exceda el 10% del monto del contrato menor.\n\nAsimismo, puede resolverse de forma total o parcial del contrato menor por mutuo acuerdo entre las partes o de manera unilateral por la ANIN por fines institucionales, previa opinión del área usuaria que sustente dicha decisión. \n';

export const SOLUCION_CONTROVERSIAS =
  'Todas las controversias que surjan entre las partes sobre la validez, nulidad, interpretación, ejecución, terminación o eficacia, se resuelven mediante conciliación, conforme lo dispuesto en el numeral 81.3 del artículo 81 de la Ley. El procedimiento conciliatorio será regulado mediante el numeral 330.2 del artículo 330 del Reglamento.';

export function interpolar(texto: string, vars: Record<string, string>): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, clave) => vars[clave] ?? '');
}

export function nombreEntregableUnico(plazo: number): string {
  const dias = plazo > 0 ? plazo : 30;
  return `ÚNICO ENTREGABLE Hasta los ${dias} días calendario, contados a partir del día siguiente de notificada la orden de servicio o de suscrito el contrato.`;
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
    ExperienciaGeneral: EXPERIENCIA_GENERAL_EJEMPLO,
    ExperienciaEspecifica: EXPERIENCIA_ESPECIFICA_EJEMPLO,
    UnidadOrganizacional: unidad || UNIDAD_ORGANIZACIONAL_EJEMPLO,
    UnidadConformidad: unidad,
    UnidadInforme: '',
    LugarPrestacion: LUGAR_EJEMPLO,
    OtrasPenalidades: OTRAS_PENALIDADES_EJEMPLO,
    Entregables: [{ Nombre: nombreEntregableUnico(plazo), Dias: plazo }]
  };
}

export function plazoEntregables(tdr: TdrLocacion): number {
  return (tdr.Entregables || []).reduce((suma, e) => suma + (Number(e.Dias) || 0), 0);
}

export function ajustarEntregables(tdr: TdrLocacion, cantidad: number): void {
  const n = Math.max(1, Math.min(20, Math.floor(Number(cantidad) || 1)));
  const plazo = plazoEntregables(tdr) || tdr.Entregables[0]?.Dias || 30;
  while (tdr.Entregables.length < n) {
    tdr.Entregables.push({ Nombre: '', Dias: plazo });
  }
  if (tdr.Entregables.length > n) {
    tdr.Entregables.length = n;
  }
  if (n === 1 && !tdr.Entregables[0].Nombre) {
    tdr.Entregables[0].Nombre = nombreEntregableUnico(tdr.Entregables[0].Dias || plazo);
  }
}
