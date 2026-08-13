import { ExpedienteCmn } from '../models/expediente-cmn.model';

export const BANDEJA_CMN_MOCK: ExpedienteCmn[] = [
  {
    expediente: 'EXP-2026-00119',
    solicitudTitulo: 'Consultoría para evaluación de infraestructura',
    solicitudSubtitulo: 'Inclusión ordinaria - CMN-2026-0119',
    estado: {
      texto: 'Recepción y derivación de Anexo 3 - OA',
      tipo: 'warning',
    },
    responsable: 'Oficina de administración',
    plazo: '4 días',
    accionPendiente: false,
    acciones: ['ver'],
  },
  {
    expediente: 'EXP-2026-00118',
    solicitudTitulo: 'Servicio de mantenimiento de equipos',
    solicitudSubtitulo: 'Exclusión - CMN-2026-0118',
    estado: {
      texto: 'Firma Anexo 4',
      tipo: 'info',
    },
    responsable: 'Oficina de administración',
    plazo: 'Hoy',
    accionPendiente: false,
    acciones: ['guardar', 'ver'],
  },
  {
    expediente: 'EXP-2026-00117',
    solicitudTitulo: 'Adquisición de software especializado',
    solicitudSubtitulo: 'Inclusión ordinaria - CMN-2026-0117',
    estado: {
      texto: 'Recepción y derivación de Anexo 3 - OA',
      tipo: 'warning',
    },
    responsable: 'Oficina de administración',
    plazo: '2 días',
    accionPendiente: false,
    acciones: ['ver'],
  },
  {
    expediente: 'EXP-2026-00116',
    solicitudTitulo: 'Capacitación en gestión de proyectos',
    solicitudSubtitulo: 'Modificación - CMN-2026-0116',
    estado: {
      texto: 'Firma Anexo 4',
      tipo: 'info',
    },
    responsable: 'Oficina de administración',
    plazo: '1 día',
    accionPendiente: false,
    acciones: ['guardar', 'ver'],
  },
];
