import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MetodoService } from '../../../core/services/metodo.service';

/* Un metodo por endpoint y nada mas (ESTANDARES 4.3). El bloque Actor lo
   completa el backend desde la sesion. */
@Injectable({
  providedIn: 'root'
})
export class EjecucionService {

  constructor(private api: MetodoService) { }

  listarContrato(filtro: any): Observable<any> {
    return this.api.GET('api/ejecucion/listarContrato', { Filtro: filtro });
  }

  obtenerContrato(idContrato: string): Observable<any> {
    return this.api.GET('api/ejecucion/obtenerContrato', { IdContrato: idContrato });
  }

  listarVerificadorDisponible(idContrato: string): Observable<any> {
    return this.api.GET('api/ejecucion/listarVerificadorDisponible', { IdContrato: idContrato });
  }

  actualizarContrato(payload: any): Observable<any> {
    return this.api.POST('api/ejecucion/actualizarContrato', payload);
  }

  anunciarEntrega(payload: any): Observable<any> {
    return this.api.POST('api/ejecucion/anunciarEntrega', payload);
  }

  autorizarIngreso(idExpediente: string, version: number): Observable<any> {
    return this.api.POST('api/ejecucion/autorizarIngreso', { IdExpediente: idExpediente, Version: version });
  }

  designarVerificador(idExpediente: string, version: number, idVerificador: string): Observable<any> {
    return this.api.POST('api/ejecucion/designarVerificador', {
      IdExpediente: idExpediente, Version: version, IdVerificador: idVerificador
    });
  }

  verificarEntrega(payload: any): Observable<any> {
    return this.api.POST('api/ejecucion/verificarEntrega', payload);
  }

  entregarBienAu(payload: any): Observable<any> {
    return this.api.POST('api/ejecucion/entregarBienAu', payload);
  }

  ejecutarAccionEntrega(idExpediente: string, version: number, codigoTransicion: string,
                        comentario: string | null = null): Observable<any> {
    return this.api.POST('api/ejecucion/ejecutarAccionEntrega', {
      IdExpediente: idExpediente, Version: version, CodigoTransicion: codigoTransicion, Comentario: comentario
    });
  }

  registrarIncidencia(payload: any): Observable<any> {
    return this.api.POST('api/ejecucion/registrarIncidencia', payload);
  }

  atenderIncidencia(idIncidencia: string, respuesta: string): Observable<any> {
    return this.api.POST('api/ejecucion/atenderIncidencia', { IdIncidencia: idIncidencia, Respuesta: respuesta });
  }

  culminarContrato(idExpediente: string, version: number): Observable<any> {
    return this.api.POST('api/ejecucion/culminarContrato', { IdExpediente: idExpediente, Version: version });
  }

  /* Transversales de sigcm, iguales que en los otros modulos. */

  obtenerTrazabilidad(idExpediente: string): Observable<any> {
    return this.api.GET('api/sigcm/obtenerTrazabilidad', { IdExpediente: idExpediente });
  }

  listarDocumento(idExpediente: string): Observable<any> {
    return this.api.GET('api/sigcm/listarDocumento', { IdExpediente: idExpediente });
  }

  registrarDocumento(idExpediente: string, codigoTipoDocumento: string,
                     generadoDocumento: string, nombreDocumento: string): Observable<any> {
    return this.api.POST('api/sigcm/registrarDocumento', {
      IdExpediente: idExpediente,
      CodigoTipoDocumento: codigoTipoDocumento,
      GeneradoDocumento: generadoDocumento,
      NombreDocumento: nombreDocumento,
      Payload: null
    });
  }
}
