import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MetodoService } from '../../../core/services/metodo.service';
import { idDocumentoSistema } from '../../../shared/funciones/archivo';

@Injectable({
  providedIn: 'root'
})
export class ResolucionService {

  constructor(private api: MetodoService) { }

  listarProcedimiento(filtro: any): Observable<any> {
    return this.api.GET('api/resolucion/listarProcedimiento', { Filtro: filtro });
  }

  obtenerProcedimiento(idProcedimiento: string): Observable<any> {
    return this.api.GET('api/resolucion/obtenerProcedimiento', { IdProcedimiento: idProcedimiento });
  }

  registrarProcedimiento(payload: any): Observable<any> {
    return this.api.POST('api/resolucion/registrarProcedimiento', payload);
  }

  pronunciarAu(payload: any): Observable<any> {
    return this.api.POST('api/resolucion/pronunciarAu', payload);
  }

  decidirDec(payload: any): Observable<any> {
    return this.api.POST('api/resolucion/decidirDec', payload);
  }

  registrarCarta(payload: any): Observable<any> {
    return this.api.POST('api/resolucion/registrarCarta', payload);
  }

  ejecutarAccion(payload: any): Observable<any> {
    return this.api.POST('api/resolucion/ejecutarAccion', payload);
  }

  notificarCarta(idExpediente: string): Observable<any> {
    return this.api.POST('api/resolucion/notificarCarta', { IdExpediente: idExpediente });
  }

  marcarNotificada(idExpediente: string, medio: string, detalle: string): Observable<any> {
    return this.api.POST('api/resolucion/marcarNotificada', {
      IdExpediente: idExpediente, MedioNotificacion: medio, ResultadoCorreo: detalle, CorreoEnviado: false
    });
  }

  listarContratoVigente(texto: string): Observable<any> {
    return this.api.GET('api/ejecucion/listarContrato', { Filtro: { SoloVigentes: true, Texto: texto, Limite: 50 } });
  }

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
