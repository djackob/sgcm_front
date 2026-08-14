import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CmnService } from '../../services/cmn.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import {
  HistorialCmn,
  ObservacionCmn,
  OperacionIntegracionCmn,
  SolicitudCmn,
  SolicitudDetalleCmn,
  TransicionCmn
} from '../../models/cmn.model';

/**
 * Visor del expediente: el Anexo 3 tal como quedó registrado y su trazabilidad.
 *
 * Tras una observación, Editar y Firmar viven aquí (como en el mockup), no en
 * la grilla de la bandeja.
 */
@Component({
  selector: 'app-modal-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-detalle.component.html',
  styleUrl: './modal-detalle.component.scss'
})
export class ModalDetalleComponent {

  @Output() editar = new EventEmitter<SolicitudCmn>();
  @Output() firmar = new EventEmitter<{ solicitud: SolicitudCmn; transicion: TransicionCmn }>();
  @Output() verPdf = new EventEmitter<SolicitudCmn>();

  abierto = false;
  cargando = false;
  pestana: 'anexo3' | 'trazabilidad' = 'anexo3';
  puedeEditar = false;
  transicionFirmar: TransicionCmn | null = null;

  resumen: SolicitudCmn | null = null;
  detalle: SolicitudDetalleCmn | null = null;

  historial: HistorialCmn[] = [];
  observaciones: ObservacionCmn[] = [];
  integracion: OperacionIntegracionCmn[] = [];
  /** Documentos del expediente con su versión vigente. */
  documentos: any[] = [];

  /** Los cuatro años del cuadro multianual, rotulados desde el año de ejecución. */
  get anios(): number[] {
    const base = this.detalle?.AnoEje || new Date().getFullYear();
    return [base, base + 1, base + 2, base + 3];
  }

  get observacionVigente(): ObservacionCmn | null {
    return this.observaciones.find(o => o.Estado === 'PENDIENTE' || o.Estado === 'RECEPCIONADA')
      || null;
  }

  get puedeFirmar(): boolean {
    return !!this.transicionFirmar && !!this.resumen;
  }

  constructor(
    private cmnService: CmnService,
    private funciones: Funciones
  ) { }

  abrir(
    solicitud: SolicitudCmn,
    opciones: { puedeEditar?: boolean; transicionFirmar?: TransicionCmn | null } = {}
  ): void {
    this.resumen = solicitud;
    this.detalle = null;
    this.historial = [];
    this.observaciones = [];
    this.integracion = [];
    this.pestana = 'anexo3';
    this.puedeEditar = !!opciones.puedeEditar;
    this.transicionFirmar = opciones.transicionFirmar || null;
    this.abierto = true;
    this.cargando = true;

    this.cmnService.obtenerSolicitud(solicitud.IdSolicitud).subscribe({
      next: (respuesta: any) => {
        this.cargando = false;
        if (respuesta?.estado === 1) {
          this.detalle = respuesta;
        } else {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible obtener la solicitud.');
        }
      },
      error: (error: any) => {
        this.cargando = false;
        this.funciones.mensaje('error',
          error?.mensaje || 'No fue posible comunicarse con el servicio.');
      }
    });

    this.cmnService.obtenerTrazabilidad(solicitud.IdExpediente).subscribe({
      next: (respuesta: any) => {
        if (respuesta?.estado === 1) {
          this.historial = respuesta.Historial || [];
          this.observaciones = respuesta.Observaciones || [];
          this.integracion = respuesta.Integracion || [];
        }
      }
    });

    this.cmnService.listarDocumento(solicitud.IdExpediente).subscribe({
      next: (respuesta: any) => {
        this.documentos = respuesta?.estado === 1 ? (respuesta.Documentos || []) : [];
      }
    });
  }

  cerrar(): void {
    this.abierto = false;
  }

  emitirEditar(): void {
    if (this.resumen) {
      this.editar.emit(this.resumen);
    }
  }

  emitirFirmar(): void {
    if (this.resumen && this.transicionFirmar) {
      this.firmar.emit({ solicitud: this.resumen, transicion: this.transicionFirmar });
    }
  }

  emitirPdf(): void {
    if (this.resumen) {
      this.verPdf.emit(this.resumen);
    }
  }

  cantidadAnio(item: any, indice: number): number {
    return [item.CantidadAno0, item.CantidadAno1, item.CantidadAno2, item.CantidadAno3][indice] || 0;
  }

  montoAnio(item: any, indice: number): number {
    return [item.MontoAno0, item.MontoAno1, item.MontoAno2, item.MontoAno3][indice] || 0;
  }

  /** Imprimir es la vía a PDF: el navegador ya sabe hacerlo y el formato oficial
      es un documento de una página. */
  imprimir(): void {
    window.print();
  }
}
