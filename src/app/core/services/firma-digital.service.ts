import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ConfigService } from './config.service';
import { idDocumentoSistema } from '../../shared/funciones/archivo';

/**
 * El firmador institucional (sfirma/ONPE), visto desde el navegador.
 *
 * El PDF ya está subido al file server cuando esto se usa: la ventana de sfirma
 * recibe la ruta del archivo, el usuario coloca su representación gráfica con
 * su certificado y responde por `postMessage` con el `documento_sistema` del
 * PDF firmado, que es OTRO archivo. Quien llama registra ese id.
 *
 * POR QUÉ EXISTE `omitir_dispositivo`
 * La firma necesita el token y sus drivers en la máquina del usuario. En un
 * equipo que no los tiene —una sesión de escritorio remoto, por ejemplo— los
 * pasos que exigen firma quedan trabados y no se puede recorrer el flujo. Con
 * `firma.omitir_dispositivo = true` en config.json no se abre el firmador y se
 * sigue con el PDF sin firmar: la firma igual queda registrada en la base por
 * `sigcm.paFirmarDocumento`, que anota quién firmó y no valida contra ONPE.
 *
 * Es una llave de AMBIENTE, no una ruta alterna del negocio: en el equipo donde
 * se firma de verdad va en `false`, que es el valor por defecto si falta.
 */
@Injectable({
  providedIn: 'root'
})
export class FirmaDigitalService {

  private popup: Window | null = null;
  private monitorId: number | null = null;
  private listener: ((event: MessageEvent) => void) | null = null;
  private respuesta: Subject<string> | null = null;

  /** El equipo no tiene el dispositivo: se firma sin abrir el firmador. */
  get omitirDispositivo(): boolean {
    return ConfigService.settings?.firma?.omitir_dispositivo === true;
  }

  get configurada(): boolean {
    const firma = ConfigService.settings?.firma;
    return !!firma?.ruta_iframe && !!firma?.ruta_archivo;
  }

  /**
   * Carpeta que usa sfirma para los PDF de un módulo. `ruta_carpeta` de
   * config.json trae la del CMN (DESARROLLO/cmn); los demás módulos viven en la
   * misma base con otra subcarpeta.
   */
  carpeta(subcarpeta: string): string {
    const configurada = String(ConfigService.settings?.firma?.ruta_carpeta || 'DESARROLLO/cmn')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '');
    const partes = configurada.split('/').filter(Boolean);
    if (partes.length >= 2) {
      partes[partes.length - 1] = subcarpeta;
      return partes.join('/');
    }
    return partes.length === 1 && partes[0] === 'cmn'
      ? subcarpeta
      : `${configurada}/${subcarpeta}`.replace(/^\/+/, '');
  }

  /**
   * Abre el firmador y emite el `documento_sistema` del PDF firmado. Si el
   * usuario cancela, la secuencia termina sin emitir nada.
   *
   * Con `omitir_dispositivo` emite de inmediato el mismo documento que recibió.
   */
  abrir(opciones: {
    documentoSistema: string;
    subcarpeta: string;
    descripcion?: string;
    sistema?: string;
  }): Observable<string> {
    const sujeto = new Subject<string>();

    if (this.omitirDispositivo) {
      setTimeout(() => {
        sujeto.next(opciones.documentoSistema);
        sujeto.complete();
      });
      return sujeto.asObservable();
    }

    if (!this.configurada) {
      setTimeout(() => sujeto.error(
        'Falta la configuración de firma digital en config.json (firma.ruta_iframe / ruta_archivo).'));
      return sujeto.asObservable();
    }

    this.cerrar();
    this.respuesta = sujeto;
    this.escuchar();

    const firma = ConfigService.settings!.firma!;
    const origenApp = window.location.origin.replace(/\/+$/, '');
    const carpeta = this.carpeta(opciones.subcarpeta);
    const rutaRespuesta =
      (firma.ruta_respuesta || `${origenApp}/assets/formats/doc_firmado.html?firmado=&strdoc=`)
      + opciones.documentoSistema;
    const rutaArchivo =
      String(firma.ruta_archivo).replace(/\/+$/, '') + '/' + carpeta + '/' + opciones.documentoSistema;

    const urlFirma =
      firma.ruta_iframe +
      '?v=1.' + String(new Date().getTime()) +
      '&strcarpeta=' + encodeURIComponent(carpeta) +
      '&rutarespuesta=' + encodeURIComponent(rutaRespuesta) +
      '&ruta_archivo=' + encodeURIComponent(rutaArchivo) +
      '&descripcion=' + encodeURIComponent(opciones.descripcion || '') +
      '&sistema=' + encodeURIComponent(opciones.sistema || 'SCM');

    const width = 400;
    const height = 250;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    this.popup = window.open(
      urlFirma,
      'firma_onpe',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=no,location=no,toolbar=no,menubar=no`
    );

    if (!this.popup) {
      this.cerrar();
      setTimeout(() => sujeto.error(
        'El navegador bloqueó la ventana de firma digital. Permita ventanas emergentes para este sitio e inténtelo de nuevo.'));
      return sujeto.asObservable();
    }

    this.monitorear();
    return sujeto.asObservable();
  }

  private escuchar(): void {
    this.listener = (event: MessageEvent) => this.recibir(event);
    window.addEventListener('message', this.listener);
  }

  private recibir(event: MessageEvent): void {
    const origenFirma = this.origen(ConfigService.settings?.firma?.ruta_iframe);
    const origenApp = this.origen(window.location.origin);
    const origenEvento = this.origen(event.origin);

    // El firmador (sfirma) o doc_firmado.html (mismo origin del front) responden.
    if (origenEvento !== origenFirma && origenEvento !== origenApp) {
      return;
    }

    const rpta = this.leer(event.data);
    if (!rpta) {
      return;
    }

    const sujeto = this.respuesta;
    if (rpta.estado == 1) {
      const idFirmado = idDocumentoSistema(rpta.documento_sistema) || String(rpta.documento_sistema || '');
      this.cerrar();
      if (!idFirmado) {
        sujeto?.error('sfirma no devolvió el identificador del PDF firmado.');
        return;
      }
      sujeto?.next(idFirmado);
      sujeto?.complete();
      return;
    }

    this.cerrar();
    sujeto?.complete();
  }

  private origen(valor: string | undefined | null): string {
    return (valor || '').replace(/\/+$/, '');
  }

  private leer(data: any): any | null {
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

  private monitorear(): void {
    this.monitorId = window.setInterval(() => {
      if (!this.popup || this.popup.closed) {
        const sujeto = this.respuesta;
        this.cerrar();
        sujeto?.complete();
      }
    }, 500);
  }

  /** Cierra la ventana y suelta el listener; no completa la secuencia. */
  cerrar(): void {
    if (this.monitorId !== null) {
      window.clearInterval(this.monitorId);
      this.monitorId = null;
    }
    if (this.listener) {
      window.removeEventListener('message', this.listener);
      this.listener = null;
    }
    this.popup?.close();
    this.popup = null;
    this.respuesta = null;
  }
}
