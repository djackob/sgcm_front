import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MetodoService } from '../../../core/services/metodo.service';
import { idDocumentoSistema } from '../../../shared/funciones/archivo';

@Injectable({
  providedIn: 'root'
})
export class PagoService {

  constructor(private api: MetodoService) { }

  listarPago(filtro: any): Observable<any> {
    return this.api.GET('api/pago/listarPago', { Filtro: filtro });
  }

  obtenerPago(idExpediente: string): Observable<any> {
    return this.api.GET('api/pago/obtenerPago', { IdExpediente: idExpediente });
  }

  listarPortalLocador(): Observable<any> {
    return this.api.GET('api/pago/listarPortalLocador', {});
  }

  /** Estado real de la O/S en SIGA: emitida, comprometida en SIAF y su expediente. */
  sincronizarOrdenSiga(idExpediente: string): Observable<any> {
    return this.api.GET('api/pago/sincronizarOrdenSiga', { IdExpediente: idExpediente });
  }

  presentarEntregable(payload: any): Observable<any> {
    return this.api.POST('api/pago/presentarEntregable', payload);
  }

  observarEntregable(idExpediente: string, version: number, comentario: string): Observable<any> {
    return this.api.POST('api/pago/observarEntregable', {
      IdExpediente: idExpediente, Version: version, Comentario: comentario
    });
  }

  otorgarVistoBueno(idExpediente: string, version: number): Observable<any> {
    return this.api.POST('api/pago/otorgarVistoBueno', {
      IdExpediente: idExpediente, Version: version
    });
  }

  aprobarConformidadTecnica(idExpediente: string, version: number, retrasoJustificado = false): Observable<any> {
    return this.api.POST('api/pago/aprobarConformidadTecnica', {
      IdExpediente: idExpediente, Version: version, RetrasoJustificado: retrasoJustificado
    });
  }

  marcarConformidadFirmada(idExpediente: string, version: number): Observable<any> {
    return this.api.POST('api/pago/marcarConformidadFirmada', {
      IdExpediente: idExpediente, Version: version
    });
  }

  registrarChecklist(idExpediente: string, checklist: any[]): Observable<any> {
    return this.api.POST('api/pago/registrarChecklist', {
      IdExpediente: idExpediente, Checklist: checklist
    });
  }

  liquidarExpediente(idExpediente: string, version: number, confirmarAlerta = false): Observable<any> {
    return this.api.POST('api/pago/liquidarExpediente', {
      IdExpediente: idExpediente, Version: version, ConfirmarAlertaResolucion: confirmarAlerta
    });
  }

  registrarDevengado(idExpediente: string, version: number, expedienteSiaf: string): Observable<any> {
    return this.api.POST('api/pago/registrarDevengado', {
      IdExpediente: idExpediente, Version: version, ExpedienteSiaf: expedienteSiaf
    });
  }

  registrarGiro(payload: any): Observable<any> {
    return this.api.POST('api/pago/registrarGiro', payload);
  }

  registrarProrroga(idExpediente: string, dias: number, motivo: string): Observable<any> {
    return this.api.POST('api/pago/registrarProrroga', {
      IdExpediente: idExpediente, ProrrogaDias: dias, MotivoProrroga: motivo
    });
  }

  asignarEspecialista(idExpediente: string, version: number, idResponsable: string,
                      comentario: string | null = null): Observable<any> {
    return this.api.POST('api/pago/asignarEspecialista', {
      IdExpediente: idExpediente, Version: version,
      IdResponsableDestino: idResponsable, Comentario: comentario
    });
  }

  notificarObservacion(idExpediente: string, version: number, comentario: string | null): Observable<any> {
    return this.api.POST('api/pago/notificarObservacion', {
      IdExpediente: idExpediente, Version: version, Comentario: comentario
    });
  }

  actualizarNumeroContrato(idExpediente: string, numeroContrato: string): Observable<any> {
    return this.api.POST('api/pago/actualizarNumeroContrato', {
      IdExpediente: idExpediente, NumeroContrato: numeroContrato
    });
  }

  registrarDocumentoAdicional(idExpediente: string,
                              documentos: { GeneradoDocumento: string; NombreDocumento: string; Descripcion: string | null }[]): Observable<any> {
    return this.api.POST('api/pago/registrarDocumentoAdicional', {
      IdExpediente: idExpediente, Documentos: documentos
    });
  }

  anularDocumentoAdicional(idDocumentoAdicional: string): Observable<any> {
    return this.api.POST('api/pago/anularDocumentoAdicional', {
      IdDocumentoAdicional: idDocumentoAdicional
    });
  }

  resumenAlertas(): Observable<any> {
    return this.api.GET('api/pago/resumenAlertas', {});
  }

  listarCorreo(idExpediente: string): Observable<any> {
    return this.api.GET('api/pago/listarCorreo', { IdExpediente: idExpediente });
  }

  obtenerCorreo(idCorreo: string): Observable<any> {
    return this.api.GET('api/pago/listarCorreo', { IdCorreo: idCorreo });
  }

  emitirConstancia(idExpediente: string, emitir: boolean): Observable<any> {
    return this.api.POST('api/pago/emitirConstancia', { IdExpediente: idExpediente, Emitir: emitir });
  }

  registrarConstanciaDocumento(idExpediente: string, generadoDocumento: string, nombreDocumento: string): Observable<any> {
    return this.api.POST('api/pago/registrarConstanciaDocumento', {
      IdExpediente: idExpediente, GeneradoDocumento: generadoDocumento, NombreDocumento: nombreDocumento
    });
  }

  notificarConstancia(idExpediente: string): Observable<any> {
    return this.api.POST('api/pago/notificarConstancia', { IdExpediente: idExpediente });
  }

  listarDestinatarioDerivacion(idExpediente: string, codigoTransicion: string): Observable<any> {
    return this.api.GET('api/sigcm/listarDestinatarioDerivacion', {
      IdExpediente: idExpediente,
      CodigoTransicion: codigoTransicion
    });
  }

  ejecutarTransicion(idExpediente: string, codigoTransicion: string,
                     version: number, comentario: string | null = null): Observable<any> {
    return this.api.POST('api/sigcm/ejecutarTransicion', {
      IdExpediente: idExpediente,
      CodigoTransicion: codigoTransicion,
      Version: version,
      Comentario: comentario
    });
  }

  listarDocumento(idExpediente: string): Observable<any> {
    return this.api.GET('api/sigcm/listarDocumento', { IdExpediente: idExpediente });
  }

  obtenerTrazabilidad(idExpediente: string): Observable<any> {
    return this.api.GET('api/sigcm/obtenerTrazabilidad', { IdExpediente: idExpediente });
  }

  registrarDocumento(idExpediente: string, codigoTipoDocumento: string,
                     generadoDocumento: string, nombreDocumento: string,
                     payload: any = null): Observable<any> {
    return this.api.POST('api/sigcm/registrarDocumento', {
      IdExpediente: idExpediente,
      CodigoTipoDocumento: codigoTipoDocumento,
      GeneradoDocumento: generadoDocumento,
      NombreDocumento: nombreDocumento,
      Payload: payload
    });
  }

  firmarDocumento(idExpediente: string, codigoTipoDocumento: string,
                  opciones: { GeneradoDocumento?: string } = {}): Observable<any> {
    const body: any = {
      IdExpediente: idExpediente,
      CodigoTipoDocumento: codigoTipoDocumento
    };
    const generado = idDocumentoSistema(opciones.GeneradoDocumento);
    if (generado) {
      body.GeneradoDocumento = generado;
    }
    return this.api.POST('api/sigcm/firmarDocumento', body);
  }
}
