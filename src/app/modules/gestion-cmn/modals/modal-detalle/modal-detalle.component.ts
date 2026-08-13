import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CmnService } from '../../services/cmn.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import {
  HistorialCmn,
  ObservacionCmn,
  OperacionIntegracionCmn,
  SolicitudCmn,
  SolicitudDetalleCmn
} from '../../models/cmn.model';

/**
 * Visor del expediente: el Anexo 3 tal como quedó registrado y su trazabilidad.
 *
 * Es de solo lectura a propósito. Editar una solicitud ya enviada no es una
 * acción de pantalla sino una subsanación, que es una transición de estado con
 * su observación asociada; se ejecuta desde la bandeja como cualquier otra
 * acción del flujo.
 */
@Component({
  selector: 'app-modal-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-detalle.component.html',
  styleUrl: './modal-detalle.component.scss'
})
export class ModalDetalleComponent {

  abierto = false;
  cargando = false;
  pestana: 'anexo3' | 'trazabilidad' = 'anexo3';

  resumen: SolicitudCmn | null = null;
  detalle: SolicitudDetalleCmn | null = null;

  historial: HistorialCmn[] = [];
  observaciones: ObservacionCmn[] = [];
  integracion: OperacionIntegracionCmn[] = [];

  /** Los cuatro años del cuadro multianual, rotulados desde el año de ejecución. */
  get anios(): number[] {
    const base = this.detalle?.AnoEje || new Date().getFullYear();
    return [base, base + 1, base + 2, base + 3];
  }

  constructor(
    private cmnService: CmnService,
    private funciones: Funciones
  ) { }

  abrir(solicitud: SolicitudCmn): void {
    this.resumen = solicitud;
    this.detalle = null;
    this.historial = [];
    this.observaciones = [];
    this.integracion = [];
    this.pestana = 'anexo3';
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
      error: () => {
        this.cargando = false;
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
  }

  cerrar(): void {
    this.abierto = false;
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
