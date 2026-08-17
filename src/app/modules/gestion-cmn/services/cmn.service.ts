import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MetodoService } from '../../../core/services/metodo.service';

/**
 * Acceso al módulo Gestión CMN. Un método por endpoint, sin lógica.
 *
 * NO SE ARMA EL BLOQUE Actor AQUÍ. Lo completa el backend desde la sesión,
 * sobrescribiendo lo que venga del navegador: si el cliente pudiera declararlo,
 * podría declararse jefe de otra unidad. Este servicio manda únicamente los
 * datos del negocio.
 *
 * Las acciones del flujo (firmar, observar, derivar, validar, recepcionar) van
 * por api/sigcm/ejecutarTransicion y no por endpoints propios del CMN: el motor
 * de estados es el mismo para todos los módulos.
 */
@Injectable({
  providedIn: 'root'
})
export class CmnService {

  constructor(private apiService: MetodoService) { }

  /* ---------------------------------------------------------------------- */
  /* Anexo 3                                                                */
  /* ---------------------------------------------------------------------- */

  listarSolicitud(filtro: any): Observable<any> {
    return this.apiService.GET('api/cmn/listarSolicitud', { Filtro: filtro });
  }

  obtenerSolicitud(idSolicitud: string): Observable<any> {
    return this.apiService.GET('api/cmn/obtenerSolicitud', { IdSolicitud: idSolicitud });
  }

  registrarSolicitud(solicitud: any, items: any[]): Observable<any> {
    return this.apiService.POST('api/cmn/registrarSolicitud', { Solicitud: solicitud, Items: items });
  }

  /* ---------------------------------------------------------------------- */
  /* Máquina de estados                                                     */
  /* ---------------------------------------------------------------------- */

  listarTransicionDisponible(idExpediente: string): Observable<any> {
    return this.apiService.GET('api/sigcm/listarTransicionDisponible', { IdExpediente: idExpediente });
  }

  /**
   * La Version es la que el cliente leyó. Si otro usuario movió el expediente
   * entretanto, la rutina responde CONFLICTO en vez de pisar ese cambio.
   */
  ejecutarTransicion(idExpediente: string, codigoTransicion: string,
                     version: number, comentario: string | null = null,
                     tipoInclusion: string | null = null): Observable<any> {
    return this.apiService.POST('api/sigcm/ejecutarTransicion', {
      IdExpediente: idExpediente,
      CodigoTransicion: codigoTransicion,
      Version: version,
      Comentario: comentario,
      TipoInclusion: tipoInclusion
    });
  }

  obtenerTrazabilidad(idExpediente: string): Observable<any> {
    return this.apiService.GET('api/sigcm/obtenerTrazabilidad', { IdExpediente: idExpediente });
  }

  /* ---------------------------------------------------------------------- */
  /* Documentos                                                             */
  /* ---------------------------------------------------------------------- */

  /** Documentos del expediente con su versión vigente y si este rol puede firmar. */
  listarDocumento(idExpediente: string): Observable<any> {
    return this.apiService.GET('api/sigcm/listarDocumento', { IdExpediente: idExpediente });
  }

  /**
   * Registra el PDF ya subido al file server.
   * El orden es: subir el archivo, y recién entonces guardar documento_sistema aquí.
   */
  registrarDocumento(idExpediente: string, codigoTipoDocumento: string,
                     generadoDocumento: string, nombreDocumento: string,
                     payload: any = null): Observable<any> {
    return this.apiService.POST('api/sigcm/registrarDocumento', {
      IdExpediente: idExpediente,
      CodigoTipoDocumento: codigoTipoDocumento,
      GeneradoDocumento: generadoDocumento,
      NombreDocumento: nombreDocumento,
      Payload: payload
    });
  }

  /**
   * Firma la versión vigente. No mueve el expediente: la acción del flujo se
   * ejecuta después con `ejecutarTransicion`, que comprueba que esté firmado.
   */
  firmarDocumento(idExpediente: string, codigoTipoDocumento: string): Observable<any> {
    return this.apiService.POST('api/sigcm/firmarDocumento', {
      IdExpediente: idExpediente,
      CodigoTipoDocumento: codigoTipoDocumento
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Maestros de SIGA                                                       */
  /* ---------------------------------------------------------------------- */

  /**
   * Un solo endpoint para los nueve maestros. El nombre del maestro es un dato,
   * no una ruta: agregar uno nuevo no obliga a tocar el backend.
   */
  listarMaestroSiga(maestro: string, parametros: any = {}): Observable<any> {
    return this.apiService.GET('api/sigcm/listarMaestroSiga', { Maestro: maestro, ...parametros });
  }
}
