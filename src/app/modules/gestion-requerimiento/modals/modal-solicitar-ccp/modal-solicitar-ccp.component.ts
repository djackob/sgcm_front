import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { RequerimientoService } from '../../services/requerimiento.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { MaestraService } from '../../../../shared/services/maestra.service';
import { ConfigService } from '../../../../core/services/config.service';
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
export class ModalSolicitarCcpComponent implements OnDestroy {

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
  /** PDF subido al file server (sin firmar). */
  documentoMemoSubido = '';
  /** PDF firmado por sfirma. */
  documentoMemoFirmado = '';
  nombreDocumentoMemo = '';

  private popupFirma: Window | null = null;
  private popupMonitorId: number | null = null;
  private messageListener: ((event: MessageEvent) => void) | null = null;

  readonly mensajeBloqueo =
    'El postor registra impedimentos en los filtros de idoneidad. No es posible solicitar CCP.';

  constructor(
    private requerimientoService: RequerimientoService,
    private documentoService: DocumentoService,
    private maestraService: MaestraService,
    private funciones: Funciones
  ) { }

  ngOnDestroy(): void {
    this.quitarListenerFirma();
    this.cerrarPopupFirma();
  }

  abrir(fila: RequerimientoBandeja): void {
    this.fila = fila;
    this.detalle = null;
    this.filtros = [];
    this.cuerpoMemorando = '';
    this.notasMemorando = '';
    this.numeroMemorando = '';
    this.documentoMemoSubido = '';
    this.documentoMemoFirmado = '';
    this.nombreDocumentoMemo = '';
    this.paso = '';
    this.abierto = true;
    this.cargando = true;
    this.registrarListenerFirma();

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
    this.quitarListenerFirma();
    this.cerrarPopupFirma();
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
    this.documentoMemoSubido = '';
    this.documentoMemoFirmado = '';
  }

  firmarMemorando(): void {
    if (!this.detalle || !this.fila || this.bloqueado || this.procesando) {
      return;
    }

    this.procesando = true;
    this.paso = 'Generando y guardando el memorando…';

    this.generarYRegistrarMemorando().pipe(
      switchMap((documentoSistema) =>
        this.maestraService.descargarArchivoConFallback(documentoSistema, CARPETA_MEMO_CCP, ['cmn']).pipe(
          map(() => documentoSistema)
        )
      )
    ).subscribe({
      next: (documentoSistema: string) => {
        this.documentoMemoSubido = documentoSistema;
        this.abrirFirmaPopup(documentoSistema);
      },
      error: (err) => {
        this.procesando = false;
        this.paso = '';
        this.funciones.mensaje(
          'error',
          err?.message || 'No fue posible guardar el memorando en el servidor para firmarlo.'
        );
      }
    });
  }

  confirmarSolicitud(): void {
    if (!this.puedeConfirmar || !this.fila || !this.detalle) {
      return;
    }

    const enviar = (memo: string, sinFirma: boolean) => {
      this.procesando = true;
      this.paso = 'Enviando la solicitud a OPP…';
      this.requerimientoService.confirmarFiltrosIdoneidad(
        this.fila!.IdRequerimiento,
        this.detalle!.Version ?? this.fila!.Version,
        {
          CuerpoMemorando: this.cuerpoMemorando,
          NotasMemorando: this.notasMemorando,
          GeneradoDocumentoMemo: memo,
          NombreDocumentoMemo: this.nombreDocumentoMemo || nombreArchivoMemoCcp(this.detalle!, this.numeroMemorando),
          NumeroMemorando: this.numeroMemorando,
          EnviarSinFirma: sinFirma ? 1 : 0
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
    };

    if (this.documentoMemoFirmado) {
      enviar(this.documentoMemoFirmado, false);
      return;
    }
    if (this.documentoMemoSubido) {
      enviar(this.documentoMemoSubido, true);
      return;
    }

    this.procesando = true;
    this.paso = 'Generando el memorando…';
    this.generarYRegistrarMemorando().subscribe({
      next: (documentoSistema) => {
        this.documentoMemoSubido = documentoSistema;
        enviar(documentoSistema, true);
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

  private carpetaFirmaMemorando(): string {
    const configurada = String(ConfigService.settings?.firma?.ruta_carpeta || 'DESARROLLO/cmn')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '');
    const partes = configurada.split('/').filter(Boolean);
    if (partes.length >= 2) {
      partes[partes.length - 1] = CARPETA_MEMO_CCP;
      return partes.join('/');
    }
    return partes.length === 1 && partes[0] === 'cmn'
      ? CARPETA_MEMO_CCP
      : `${configurada}/${CARPETA_MEMO_CCP}`.replace(/^\/+/, '');
  }

  private abrirFirmaPopup(documentoSistema: string): void {
    const archivo = idDocumentoSistema(documentoSistema);
    if (!archivo) {
      this.procesando = false;
      this.paso = '';
      return;
    }

    const firma = ConfigService.settings?.firma;
    if (!firma?.ruta_iframe || !firma.ruta_archivo) {
      this.procesando = false;
      this.paso = '';
      this.funciones.mensaje(
        'error',
        'Falta la configuración de firma digital en config.json (firma.ruta_iframe / ruta_archivo).'
      );
      return;
    }

    if (this.popupFirma && !this.popupFirma.closed) {
      this.cerrarPopupFirma();
    }

    this.paso = 'Abriendo el firmador digital…';
    const descripcion = `${this.fila?.Codigo || ''} · Memorando CCP`;
    const origenApp = window.location.origin.replace(/\/+$/, '');
    const rutaRespuesta =
      (firma.ruta_respuesta || `${origenApp}/assets/formats/doc_firmado.html?firmado=&strdoc=`)
      + archivo;
    const carpetaFirma = this.carpetaFirmaMemorando();
    const baseArchivo = String(firma.ruta_archivo).replace(/\/+$/, '') + '/';
    const rutaArchivo = baseArchivo + carpetaFirma + '/' + archivo;

    const urlFirma =
      firma.ruta_iframe +
      '?v=1.' +
      String(new Date().getTime()) +
      '&strcarpeta=' +
      encodeURIComponent(carpetaFirma) +
      '&rutarespuesta=' +
      encodeURIComponent(rutaRespuesta) +
      '&ruta_archivo=' +
      encodeURIComponent(rutaArchivo) +
      '&descripcion=' +
      encodeURIComponent(descripcion) +
      '&sistema=' +
      encodeURIComponent('SCM');

    const width = 400;
    const height = 250;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    this.popupFirma = window.open(
      urlFirma,
      'firma_onpe',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=no,location=no,toolbar=no,menubar=no`
    );

    if (!this.popupFirma) {
      this.procesando = false;
      this.paso = '';
      this.funciones.mensaje(
        'info',
        'Permita las ventanas emergentes para firmar digitalmente.'
      );
      return;
    }

    this.procesando = false;
    this.paso = 'Complete la firma digital del memorando.';
    this.iniciarMonitoreoPopup();
  }

  private registrarListenerFirma(): void {
    this.quitarListenerFirma();
    this.messageListener = (event: MessageEvent) => this.recibirMensajeFirma(event);
    window.addEventListener('message', this.messageListener);
  }

  private quitarListenerFirma(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
  }

  private recibirMensajeFirma(event: MessageEvent): void {
    const origenFirma = this.origenNormalizado(ConfigService.settings?.firma?.ruta_iframe);
    const origenApp = this.origenNormalizado(window.location.origin);
    const origenEvento = this.origenNormalizado(event.origin);
    if (origenEvento !== origenFirma && origenEvento !== origenApp) {
      return;
    }

    const rpta = this.leerRespuestaFirma(event.data);
    if (!rpta) {
      return;
    }

    if (rpta.estado == 1) {
      const idFirmado = idDocumentoSistema(rpta.documento_sistema) || String(rpta.documento_sistema || '');
      if (!idFirmado || !this.fila) {
        this.funciones.mensaje('error', 'sfirma no devolvió el identificador del PDF firmado.');
        this.procesando = false;
        this.paso = '';
        return;
      }
      this.cerrarPopupFirma();
      this.paso = 'Registrando la firma del memorando…';
      this.requerimientoService.firmarDocumento(this.fila.IdExpediente, TIPO_MEMO_CCP, {
        GeneradoDocumento: idFirmado
      }).subscribe({
        next: () => {
          this.documentoMemoFirmado = idFirmado;
          this.procesando = false;
          this.paso = '';
          this.funciones.mensaje('success', 'Memorando firmado. Ya puede confirmar la solicitud.');
        },
        error: () => {
          this.documentoMemoFirmado = idFirmado;
          this.procesando = false;
          this.paso = '';
          this.funciones.mensaje(
            'info',
            'El PDF firmado quedó en el servidor. Confirme la solicitud para continuar.'
          );
        }
      });
      return;
    }

    this.procesando = false;
    this.paso = '';
    this.funciones.mensaje('info', 'Proceso de firma digital cancelado.');
  }

  private cerrarPopupFirma(): void {
    this.detenerMonitoreoPopup();
    if (this.popupFirma && !this.popupFirma.closed) {
      this.popupFirma.close();
    }
    this.popupFirma = null;
  }

  private iniciarMonitoreoPopup(): void {
    this.detenerMonitoreoPopup();
    this.popupMonitorId = window.setInterval(() => {
      if (!this.popupFirma) {
        this.detenerMonitoreoPopup();
        return;
      }
      if (this.popupFirma.closed) {
        this.popupFirma = null;
        this.detenerMonitoreoPopup();
      }
    }, 500);
  }

  private detenerMonitoreoPopup(): void {
    if (this.popupMonitorId !== null) {
      window.clearInterval(this.popupMonitorId);
      this.popupMonitorId = null;
    }
  }

  private origenNormalizado(valor: string | undefined | null): string {
    return (valor || '').replace(/\/+$/, '');
  }

  private leerRespuestaFirma(data: any): any | null {
    try {
      if (data?.archivo) {
        const interior = typeof data.archivo === 'string' ? JSON.parse(data.archivo) : data.archivo;
        const rptaSg = interior?.rpta_sg ?? interior;
        return typeof rptaSg === 'string' ? JSON.parse(rptaSg) : rptaSg;
      }
      if (typeof data === 'string' && data) {
        const parsed = JSON.parse(data);
        const rptaSg = parsed?.rpta_sg ?? parsed;
        return typeof rptaSg === 'string' ? JSON.parse(rptaSg) : rptaSg;
      }
      if (data?.rpta_sg) {
        return typeof data.rpta_sg === 'string' ? JSON.parse(data.rpta_sg) : data.rpta_sg;
      }
      if (data?.documento_sistema) {
        return data;
      }
    } catch {
      return null;
    }
    return null;
  }
}
