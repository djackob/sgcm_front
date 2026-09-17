import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { RequerimientoService } from '../../services/requerimiento.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { MaestraService } from '../../../../shared/services/maestra.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../../../shared/funciones/archivo';
import { RequerimientoBandeja, RequerimientoDetalle } from '../../models/requerimiento.model';
import { construirMemorandoCcp } from '../../documentos/memo-ccp.pdfmake';
import {
  CARPETA_MEMO_CCP,
  FiltroIdoneidadVista,
  TIPO_MEMO_CCP,
  construirTextoMemorando,
  documentoLocador,
  encabezadoMemorandoCcp,
  etiquetaAptitud,
  etiquetaCortaFiltro,
  hayImpedimentoIdoneidad,
  montoTotalLocacion,
  nombreArchivoMemoCcp,
  nombreCompletoLocador,
  pedidoExtra,
  pedidoPrincipal,
  proveedorPrincipal
} from '../../documentos/filtro-idoneidad.util';

@Component({
  selector: 'app-modal-solicitar-ccp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-solicitar-ccp.component.html',
  styleUrl: './modal-solicitar-ccp.component.scss'
})
export class ModalSolicitarCcpComponent {

  @Output() completado = new EventEmitter<void>();

  abierto = false;
  cargando = false;
  procesando = false;
  paso = '';

  fila: RequerimientoBandeja | null = null;
  detalle: RequerimientoDetalle | null = null;
  filtros: FiltroIdoneidadVista[] = [];

  cuerpoMemorando = '';
  notasMemorando = '';
  numeroMemorando = '';
  nombreDocumentoMemo = '';

  readonly mensajeBloqueo =
    'El postor registra impedimentos en los filtros de idoneidad. No es posible solicitar CCP.';

  constructor(
    private requerimientoService: RequerimientoService,
    private documentoService: DocumentoService,
    private maestraService: MaestraService,
    private funciones: Funciones
  ) { }

  abrir(fila: RequerimientoBandeja): void {
    this.fila = fila;
    this.detalle = null;
    this.filtros = [];
    this.cuerpoMemorando = '';
    this.notasMemorando = '';
    this.numeroMemorando = '';
    this.nombreDocumentoMemo = '';
    this.paso = '';
    this.abierto = true;
    this.cargando = true;

    forkJoin({
      detalle: this.requerimientoService.obtenerRequerimiento(fila.IdRequerimiento),
      filtros: this.requerimientoService.listarFiltroIdoneidad(fila.IdRequerimiento, {
        ReservarNumeroMemo: 1
      })
    }).subscribe({
      next: (respuesta) => {
        this.cargando = false;
        this.detalle = respuesta.detalle;
        this.filtros = this.normalizarFiltros(respuesta.filtros?.Filtros);
        this.numeroMemorando = respuesta.filtros?.NumeroMemorando
          || respuesta.detalle?.Ccp?.NumeroMemorando
          || '';
        this.cuerpoMemorando = construirTextoMemorando(this.detalle);
      },
      error: () => {
        this.cargando = false;
        this.abierto = false;
        this.funciones.mensaje('error', 'No fue posible cargar los datos para solicitar la CCP.');
      }
    });
  }

  cerrar(): void {
    if (this.procesando) {
      return;
    }
    this.abierto = false;
  }

  get bloqueado(): boolean {
    return hayImpedimentoIdoneidad(this.filtros);
  }

  get puedeConfirmar(): boolean {
    return !this.bloqueado
      && !!this.cuerpoMemorando.trim()
      && !this.procesando;
  }

  get encabezadoMemorando(): string {
    return encabezadoMemorandoCcp(this.numeroMemorando, this.detalle?.AnoEje);
  }

  get proveedor() {
    return proveedorPrincipal(this.detalle);
  }

  get pedido() {
    return pedidoPrincipal(this.detalle);
  }

  get pedidoExtraData() {
    return pedidoExtra(this.detalle, this.pedido?.NumeroPedido || this.proveedor?.NumeroPedido || '');
  }

  get montoTotal(): number {
    return montoTotalLocacion(this.detalle, this.proveedor);
  }

  get nombreLocador(): string {
    return nombreCompletoLocador(this.proveedor);
  }

  get documentoLocadorTexto(): string {
    return documentoLocador(this.proveedor);
  }

  etiquetaCorta(codigo: string): string {
    return etiquetaCortaFiltro(codigo);
  }

  aptitud(resultado: string): string {
    return etiquetaAptitud(resultado);
  }

  claseAptitud(resultado: string): string {
    if (resultado === 'CONFORME') {
      return 'ccp-filtro-chip--apto';
    }
    if (resultado === 'NO_CONFORME') {
      return 'ccp-filtro-chip--no-apto';
    }
    return 'ccp-filtro-chip--pendiente';
  }

  urlEvidencia(filtro: FiltroIdoneidadVista): string {
    const id = idDocumentoSistema(filtro.GeneradoDocumentoEvidencia);
    return id ? this.maestraService.urlDescarga(id, CARPETA_MEMO_CCP) : '';
  }

  actualizarMemorando(): void {
    this.cuerpoMemorando = construirTextoMemorando(this.detalle, this.notasMemorando);
  }

  confirmarSolicitud(): void {
    if (!this.puedeConfirmar || !this.fila || !this.detalle) {
      return;
    }

    this.procesando = true;
    this.paso = 'Generando el memorando…';
    this.generarYRegistrarMemorando().subscribe({
      next: (documentoSistema) => {
        this.paso = 'Enviando la solicitud a OPP…';
        this.requerimientoService.confirmarFiltrosIdoneidad(
          this.fila!.IdRequerimiento,
          this.detalle!.Version ?? this.fila!.Version,
          {
            CuerpoMemorando: this.cuerpoMemorando,
            NotasMemorando: this.notasMemorando,
            GeneradoDocumentoMemo: documentoSistema,
            NombreDocumentoMemo: this.nombreDocumentoMemo || nombreArchivoMemoCcp(this.detalle!, this.numeroMemorando),
            NumeroMemorando: this.numeroMemorando,
            EnviarSinFirma: 1
          }
        ).subscribe({
          next: (respuesta: any) => {
            this.procesando = false;
            this.paso = '';
            if (respuesta?.estado !== 1) {
              this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible solicitar la CCP.');
              return;
            }
            this.funciones.mensaje('success', respuesta.mensaje || 'Se solicitó la CCP a OPP.');
            this.abierto = false;
            this.completado.emit();
          },
          error: (err) => {
            this.procesando = false;
            this.paso = '';
            this.funciones.mensaje(
              'error',
              err?.error?.mensaje || err?.mensaje || 'No fue posible solicitar la CCP.'
            );
          }
        });
      },
      error: (err) => {
        this.procesando = false;
        this.paso = '';
        this.funciones.mensaje('error', err?.message || 'No fue posible generar el memorando.');
      }
    });
  }

  private normalizarFiltros(raw: any): FiltroIdoneidadVista[] {
    if (Array.isArray(raw)) {
      return raw;
    }
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private generarYRegistrarMemorando(): Observable<string> {
    if (!this.detalle || !this.fila) {
      throw new Error('No hay expediente cargado.');
    }

    const definicion = construirMemorandoCcp(this.detalle, this.cuerpoMemorando, this.numeroMemorando);
    const nombre = nombreArchivoMemoCcp(this.detalle, this.numeroMemorando);

    return this.documentoService.generarYSubir(definicion, nombre, CARPETA_MEMO_CCP).pipe(
      switchMap((archivo: any) => {
        const documentoSistema = idDocumentoSistema(archivo?.documento_sistema);
        if (archivo?.estado !== 1 || !documentoSistema) {
          throw new Error(archivo?.mensaje || 'No se pudo subir el memorando al servidor.');
        }
        this.nombreDocumentoMemo = archivo.documento_original || nombre;
        return this.requerimientoService.registrarDocumento(
          this.fila!.IdExpediente,
          TIPO_MEMO_CCP,
          documentoSistema,
          this.nombreDocumentoMemo,
          { CuerpoMemorando: this.cuerpoMemorando, NotasMemorando: this.notasMemorando, NumeroMemorando: this.numeroMemorando }
        ).pipe(
          switchMap((respuesta: any) => {
            if (respuesta?.estado !== 1) {
              throw new Error(respuesta?.mensaje || 'No se registró el memorando en el expediente.');
            }
            return of(documentoSistema);
          })
        );
      })
    );
  }
}
