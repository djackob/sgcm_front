import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MetodoService } from '../../../core/services/metodo.service';
import { idDocumentoSistema } from '../../../shared/funciones/archivo';
import { ExpedienteLoteCmn } from '../models/cmn.model';

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

  /** Filas de la bandeja. Cada una trae Transiciones para pintar botones. */
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
                     version: number, comentario: string | null = null): Observable<any> {
    return this.apiService.POST('api/sigcm/ejecutarTransicion', {
      IdExpediente: idExpediente,
      CodigoTransicion: codigoTransicion,
      Version: version,
      Comentario: comentario
    });
  }

  /**
   * A quién puede derivarle este expediente el actor, para esta acción.
   *
   * Devuelve los puestos —coordinador, especialista— con las personas que los
   * ocupan. La lista NO se arma en el cliente: sale del árbol de
   * `sigcm.RolDerivacion` y viene ya acotada al rol que declara el estado
   * destino de la transición, que es lo único que `ejecutarTransicion` va a
   * aceptar después.
   *
   * Una acción que no es una derivación devuelve la lista vacía, y con eso la
   * pantalla sabe que no tiene nada que preguntar.
   */
  listarDestinatarioDerivacion(idExpediente: string, codigoTransicion: string): Observable<any> {
    return this.apiService.GET('api/sigcm/listarDestinatarioDerivacion', {
      IdExpediente: idExpediente,
      CodigoTransicion: codigoTransicion
    });
  }

  /**
   * La misma acción sobre varios expedientes a la vez, en una sola transacción.
   *
   * Es lo que mueve un Anexo 4 que agrupa Anexos 3 de varias áreas usuarias:
   * o avanzan todos o no avanza ninguno. Cada expediente manda su propia
   * Version, porque el control de concurrencia es por expediente y no por lote.
   */
  ejecutarTransicionLote(expedientes: ExpedienteLoteCmn[], codigoTransicion: string,
                         comentario: string | null = null,
                         idResponsableDestino: string | null = null): Observable<any> {
    return this.apiService.POST('api/sigcm/ejecutarTransicion', {
      IdExpedientes: expedientes,
      CodigoTransicion: codigoTransicion,
      Comentario: comentario,
      // A qué persona se deriva. Opcional: sin él, el expediente queda a nombre
      // del puesto y lo toma quien corresponda. La rutina lo vuelve a validar
      // contra el árbol, así que mandarlo no es una autorización.
      IdResponsableDestino: idResponsableDestino
    });
  }

  obtenerTrazabilidad(idExpediente: string): Observable<any> {
    return this.apiService.GET('api/sigcm/obtenerTrazabilidad', { IdExpediente: idExpediente });
  }

  /* ---------------------------------------------------------------------- */
  /* Anexo 4                                                                */
  /* ---------------------------------------------------------------------- */

  /**
   * Reserva el Anexo 4 y emite su código, antes de armar el PDF.
   *
   * El orden importa y no es negociable: el código se imprime en el documento, y
   * la regla de calendario —los Anexos 4 ordinarios salen los viernes— tiene que
   * fallar antes de que el navegador genere y suba nada.
   */
  generarAnexo4(idSolicitudes: string[], sustento: string | null = null): Observable<any> {
    return this.apiService.POST('api/cmn/generarAnexo4', {
      IdSolicitudes: idSolicitudes,
      Sustento: sustento
    });
  }

  /** El Anexo 4 completo, por su id o por el de cualquiera de sus Anexos 3. */
  obtenerAnexo4(clave: { IdPaquete?: string; IdSolicitud?: string }): Observable<any> {
    return this.apiService.GET('api/cmn/obtenerAnexo4', clave);
  }

  /** Deshace un Anexo 4 aún no firmado y libera sus Anexos 3. */
  anularAnexo4(idPaquete: string, motivo: string): Observable<any> {
    return this.apiService.POST('api/cmn/anularAnexo4', {
      IdPaquete: idPaquete,
      Motivo: motivo
    });
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
   * Registra UN documento que cubre varios expedientes: el Anexo 4 consolidado.
   *
   * Lleva número propio porque no puede tomarlo del código de ninguno de los
   * expedientes —elegir uno sería arbitrario—: es el código del Anexo 4 que
   * `generarAnexo4` ya emitió.
   */
  registrarDocumentoConsolidado(idExpedientes: string[], codigoTipoDocumento: string,
                                numero: string, generadoDocumento: string,
                                nombreDocumento: string, payload: any = null): Observable<any> {
    return this.apiService.POST('api/sigcm/registrarDocumento', {
      IdExpedientes: idExpedientes,
      CodigoTipoDocumento: codigoTipoDocumento,
      Numero: numero,
      GeneradoDocumento: generadoDocumento,
      NombreDocumento: nombreDocumento,
      Payload: payload
    });
  }

  /**
   * Firma la versión vigente. No mueve el expediente: la acción del flujo se
   * ejecuta después con `ejecutarTransicion`, que comprueba que esté firmado.
   *
   * Si el firmador institucional devolvió otro archivo, se manda en
   * `GeneradoDocumento` para reemplazar el PDF sin firma en DocumentoVersion.
   */
  firmarDocumento(
    idExpediente: string,
    codigoTipoDocumento: string,
    opciones: { GeneradoDocumento?: string; ArchivoHash?: string } = {}
  ): Observable<any> {
    const body: any = {
      IdExpediente: idExpediente,
      CodigoTipoDocumento: codigoTipoDocumento
    };
    const generado = idDocumentoSistema(opciones.GeneradoDocumento);
    if (generado) {
      body.GeneradoDocumento = generado;
    }
    if (opciones.ArchivoHash) {
      body.ArchivoHash = opciones.ArchivoHash;
    }
    return this.apiService.POST('api/sigcm/firmarDocumento', body);
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
