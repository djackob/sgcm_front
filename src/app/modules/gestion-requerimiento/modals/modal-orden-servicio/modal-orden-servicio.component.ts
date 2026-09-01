import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { switchMap } from 'rxjs/operators';

import { RequerimientoService } from '../../services/requerimiento.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../../../shared/funciones/archivo';
import { RequerimientoBandeja, RequerimientoDetalle } from '../../models/requerimiento.model';
import {
  CONFORMIDAD_FIJA,
  FORMA_PAGO_DOCUMENTOS,
  OTRAS_CONSIDERACIONES,
  PENALIDAD_MORA,
  RESOLUCION_CONTRACTUAL,
  SOLUCION_CONTROVERSIAS,
  TdrLocacion,
  plazoEntregables,
  textoFormaPago
} from '../../documentos/anexo3-tdr.plantilla';
import {
  CARPETA_ORDEN_SERVICIO,
  TIPO_ORDEN_SERVICIO,
  construirOrdenServicio,
  nombreArchivoOrdenServicio
} from '../../documentos/orden-servicio.pdfmake';
import {
  cargarTdrExpediente,
  formularioOrdenVacio,
  resumenLocador,
  resumenMetaClasificador,
  resumenMonto
} from '../../documentos/orden-servicio.util';
import {
  ccpTieneDatos,
  normalizarCcp
} from '../../documentos/ccp-carga.util';
import {
  montoTotalLocacion,
  nombreCompletoLocador,
  pedidoPrincipal,
  proveedorPrincipal
} from '../../documentos/filtro-idoneidad.util';

@Component({
  selector: 'app-modal-orden-servicio',
  standalone: true,
  imports: [CommonModule, FormsModule, AccordionModule],
  templateUrl: './modal-orden-servicio.component.html',
  styleUrl: './modal-orden-servicio.component.scss'
})
export class ModalOrdenServicioComponent {

  @Output() completado = new EventEmitter<void>();

  @Output() solicitarCcp = new EventEmitter<RequerimientoBandeja>();

  abierto = false;
  cargando = false;
  procesando = false;
  paso = '';
  documentoGenerado = '';

  fila: RequerimientoBandeja | null = null;
  detalle: RequerimientoDetalle | null = null;
  tdr: TdrLocacion | null = null;
  formulario = formularioOrdenVacio();
  /** CCP recién guardada o pasada desde el modal anterior (evita depender solo del GET). */
  ccpSnapshot: Record<string, unknown> | null = null;

  readonly conformidad = CONFORMIDAD_FIJA;
  readonly penalidades = PENALIDAD_MORA;
  readonly otrasConsideraciones = OTRAS_CONSIDERACIONES;
  readonly resolucion = RESOLUCION_CONTRACTUAL;
  readonly controversias = SOLUCION_CONTROVERSIAS;

  constructor(
    private requerimientoService: RequerimientoService,
    private documentoService: DocumentoService,
    private funciones: Funciones
  ) { }

  abrir(fila: RequerimientoBandeja, ccpSnapshot?: Record<string, unknown> | null): void {
    this.fila = fila;
    this.detalle = null;
    this.tdr = null;
    this.ccpSnapshot = ccpSnapshot ?? null;
    this.formulario = formularioOrdenVacio();
    this.documentoGenerado = '';
    this.paso = '';
    this.abierto = true;
    this.cargando = true;

    this.requerimientoService.obtenerRequerimiento(fila.IdRequerimiento).pipe(
      switchMap((detalle: any) => {
        if (detalle?.estado === 0) {
          throw new Error(detalle?.mensaje || 'No fue posible cargar el expediente.');
        }
        this.detalle = detalle;
        if (!this.ccpSnapshot) {
          this.ccpSnapshot = normalizarCcp(detalle);
        }
        return cargarTdrExpediente(this.requerimientoService, detalle);
      })
    ).subscribe({
      next: (tdr) => {
        this.tdr = tdr;
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.abierto = false;
        this.funciones.mensaje('error', err?.message || 'No fue posible cargar los datos para la orden de servicio.');
      }
    });
  }

  cerrar(): void {
    if (this.procesando) {
      return;
    }
    this.abierto = false;
  }

  get proveedor() {
    return proveedorPrincipal(this.detalle);
  }

  get pedido() {
    return pedidoPrincipal(this.detalle);
  }

  get nombreLocador(): string {
    return nombreCompletoLocador(this.proveedor);
  }

  get montoTotal(): number {
    return montoTotalLocacion(this.detalle, this.proveedor);
  }

  get plazoTotal(): number {
    return this.tdr ? plazoEntregables(this.tdr) : (this.detalle?.PlazoDias || 0);
  }

  get textoFormaPago(): string {
    const n = this.proveedor?.CantidadEntregables || this.tdr?.Entregables?.length || 1;
    return `${textoFormaPago(n)}\n\n${FORMA_PAGO_DOCUMENTOS}`;
  }

  get textoPlazo(): string {
    const plazo = this.plazoTotal;
    return plazo
      ? `${plazo} días calendario, contados a partir del día siguiente de la notificación de la orden de servicio.`
      : 'Conforme al TDR (Anexo 3).';
  }

  get resumenLocadorTexto(): string {
    return resumenLocador(this.detalle);
  }

  get resumenMontoTexto(): string {
    return resumenMonto(this.detalle);
  }

  get resumenMetaTexto(): string {
    return resumenMetaClasificador(this.detalle);
  }

  get ccp() {
    return this.ccpSnapshot || normalizarCcp(this.detalle);
  }

  get faltaCcp(): boolean {
    return !ccpTieneDatos(this.ccp);
  }

  irARegistrarCcp(): void {
    if (!this.fila || this.procesando) {
      return;
    }
    this.abierto = false;
    this.solicitarCcp.emit(this.fila);
  }

  verVistaPrevia(): void {
    if (!this.detalle || !this.tdr) {
      return;
    }
    const definicion = construirOrdenServicio(
      this.detalle,
      this.tdr,
      this.ccp,
      this.formulario
    );
    this.documentoService.verPdf(definicion);
  }

  registrarYEmitir(): void {
    if (!this.fila || !this.detalle || !this.tdr || this.procesando) {
      return;
    }
    if (!ccpTieneDatos(this.ccp)) {
      this.funciones.mensaje(
        'info',
        'Complete el registro de la CCP en SCM (no en SIGA): use el botón «Registrar CCP» en la bandeja o «Completar registro de CCP» aquí.'
      );
      return;
    }

    this.procesando = true;
    this.paso = 'Generando el PDF de la orden de servicio…';

    const definicion = construirOrdenServicio(
      this.detalle,
      this.tdr,
      this.ccp,
      this.formulario
    );
    const nombre = nombreArchivoOrdenServicio(this.detalle);

    this.documentoService.generarYSubir(definicion, nombre, CARPETA_ORDEN_SERVICIO).pipe(
      switchMap((archivo: any) => {
        const documentoSistema = idDocumentoSistema(archivo?.documento_sistema);
        if (archivo?.estado !== 1 || !documentoSistema) {
          throw new Error(archivo?.mensaje || 'No se pudo subir la orden de servicio.');
        }
        this.documentoGenerado = documentoSistema;
        this.paso = 'Registrando el documento en el expediente…';
        return this.requerimientoService.registrarDocumento(
          this.fila!.IdExpediente,
          TIPO_ORDEN_SERVICIO,
          documentoSistema,
          archivo.documento_original || nombre,
          { Tdr: this.tdr, Notas: this.formulario.NotasAdicionales }
        );
      }),
      switchMap((alta: any) => {
        if (alta?.estado !== 1) {
          throw new Error(alta?.mensaje || 'No se registró la orden de servicio en el expediente.');
        }
        this.paso = 'Guardando datos de la orden…';
        return this.requerimientoService.registrarOrdenServicio(this.fila!.IdRequerimiento, {
          GeneradoDocumento: this.documentoGenerado,
          NombreDocumento: nombre
        });
      }),
      switchMap((respOs: any) => {
        if (respOs?.estado !== 1) {
          throw new Error(respOs?.mensaje || 'No se prepararon los datos de la orden.');
        }
        this.paso = 'Registrando la orden en SIGA…';
        return this.requerimientoService.ejecutarTransicion(
          this.fila!.IdExpediente,
          'REQ_EMITIR_OS',
          this.detalle!.Version ?? this.fila!.Version
        );
      })
    ).subscribe({
      next: (respuesta: any) => {
        this.procesando = false;
        this.paso = '';
        if (respuesta?.estado !== 1) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible emitir la orden en SIGA.');
          return;
        }
        this.funciones.mensaje(
          'success',
          respuesta.mensaje || 'Se generó la orden de servicio y se registró en SIGA.'
        );
        this.abierto = false;
        this.completado.emit();
      },
      error: (err) => {
        this.procesando = false;
        this.paso = '';
        this.funciones.mensaje(
          'error',
          err?.message || err?.error?.mensaje || 'No fue posible completar la emisión de la orden.'
        );
      }
    });
  }
}
