import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MetodoService } from '../../../core/services/metodo.service';
import { idDocumentoSistema } from '../../../shared/funciones/archivo';

/* Un metodo por endpoint (ESTANDARES 4.3). */
@Injectable({
  providedIn: 'root'
})
export class ModificacionService {

  constructor(private api: MetodoService) { }

  listarSolicitud(filtro: any): Observable<any> {
    return this.api.GET('api/ampliacion/listarSolicitud', { Filtro: filtro });
  }

  obtenerSolicitud(idSolicitud: string): Observable<any> {
    return this.api.GET('api/ampliacion/obtenerSolicitud', { IdSolicitud: idSolicitud });
  }

  registrarSolicitud(payload: any): Observable<any> {
    return this.api.POST('api/ampliacion/registrarSolicitud', payload);
  }

  opinarAu(payload: any): Observable<any> {
    return this.api.POST('api/ampliacion/opinarAu', payload);
  }

  decidirDec(payload: any): Observable<any> {
    return this.api.POST('api/ampliacion/decidirDec', payload);
  }

  registrarActa(payload: any): Observable<any> {
    return this.api.POST('api/ampliacion/registrarActa', payload);
  }

  ejecutarAccion(idExpediente: string, version: number, codigoTransicion: string, comentario: string | null = null): Observable<any> {
    return this.api.POST('api/ampliacion/ejecutarAccion', {
      IdExpediente: idExpediente, Version: version, CodigoTransicion: codigoTransicion, Comentario: comentario
    });
  }

  notificarDecision(idExpediente: string): Observable<any> {
    return this.api.POST('api/ampliacion/notificarDecision', { IdExpediente: idExpediente });
  }

  marcarNotificada(idExpediente: string, medio: string, detalle: string): Observable<any> {
    return this.api.POST('api/ampliacion/marcarNotificada', {
      IdExpediente: idExpediente, MedioNotificacion: medio, ResultadoCorreo: detalle, CorreoEnviado: false
    });
  }

  /* Contratos vigentes de Ejecucion, para elegir sobre cual se pide. */
  listarContratoVigente(texto: string): Observable<any> {
    return this.api.GET('api/ejecucion/listarContrato', { Filtro: { SoloVigentes: true, Texto: texto, Limite: 50 } });
  }

  /* Transversales de sigcm. */

  obtenerTrazabilidad(idExpediente: string): Observable<any> {
    return this.api.GET('api/sigcm/obtenerTrazabilidad', { IdExpediente: idExpediente });
  }

  listarDocumento(idExpediente: string): Observable<any> {
    return this.api.GET('api/sigcm/listarDocumento', { IdExpediente: idExpediente });
  }

  registrarDocumento(idExpediente: string, codigoTipoDocumento: string, generadoDocumento: string,
                     nombreDocumento: string, payload: any = null): Observable<any> {
    return this.api.POST('api/sigcm/registrarDocumento', {
      IdExpediente: idExpediente, CodigoTipoDocumento: codigoTipoDocumento,
      GeneradoDocumento: generadoDocumento, NombreDocumento: nombreDocumento, Payload: payload
    });
  }

  firmarDocumento(idExpediente: string, codigoTipoDocumento: string, opciones: { GeneradoDocumento?: string } = {}): Observable<any> {
    const body: any = { IdExpediente: idExpediente, CodigoTipoDocumento: codigoTipoDocumento };
    const generado = idDocumentoSistema(opciones.GeneradoDocumento);
    if (generado) {
      body.GeneradoDocumento = generado;
    }
    return this.api.POST('api/sigcm/firmarDocumento', body);
  }
}
