export type EstadoTipo = 'warning' | 'info' | 'success' | 'neutral';

export interface ExpedienteCmn {
  expediente: string;
  solicitudTitulo: string;
  solicitudSubtitulo: string;
  estado: {
    texto: string;
    tipo: EstadoTipo;
  };
  responsable: string;
  plazo: string;
  accionPendiente: boolean;
  acciones: Array<'ver' | 'guardar'>;
}
