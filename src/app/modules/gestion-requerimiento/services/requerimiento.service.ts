import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MetodoService } from '../../../core/services/metodo.service';
import { idDocumentoSistema } from '../../../shared/funciones/archivo';
import { PedidoSiga, PedidoSigaDetalle } from '../models/requerimiento.model';

/**
 * Acceso al módulo Requerimiento a Notificación. Un método por endpoint, sin
 * lógica.
 *
 * NO SE ARMA EL BLOQUE Actor AQUÍ. Lo completa el backend desde la sesión,
 * sobrescribiendo lo que venga del navegador: si el cliente pudiera declararlo,
 * podría declararse jefe de otra unidad. Este servicio manda únicamente los
 * datos del negocio.
 *
 * Las acciones del flujo (derivar al Jefe, firmar, remitir a OA o a DAI,
 * observar, declarar conforme, aceptar la no objeción) van por
 * api/sigcm/ejecutarTransicion y no por endpoints propios del módulo: el motor
 * de estados es el mismo para todos.
 */
@Injectable({
  providedIn: 'root'
})
export class RequerimientoService {

  constructor(private apiService: MetodoService) { }

  /* ---------------------------------------------------------------------- */
  /* Requerimiento                                                          */
  /* ---------------------------------------------------------------------- */

  /** Filas de la bandeja. Cada una trae Transiciones para pintar botones. */
  listarRequerimiento(filtro: any): Observable<any> {
    return this.apiService.GET('api/requerimiento/listarRequerimiento', { Filtro: filtro });
  }

  obtenerRequerimiento(idRequerimiento: string): Observable<any> {
    return this.apiService.GET('api/requerimiento/obtenerRequerimiento', { IdRequerimiento: idRequerimiento });
  }

  /**
   * Registra la necesidad con sus pedidos SIGA y sus ítems.
   *
   * La rutina valida el tope de ocho UIT del año, la condición frente al CMN,
   * los diez días hábiles de antelación y que la suma de los ítems coincida con
   * el monto declarado. Ninguna de esas reglas se replica en el cliente.
   */
  registrarRequerimiento(requerimiento: any, pedidos: any[], items: any[]): Observable<any> {
    return this.apiService.POST('api/requerimiento/registrarRequerimiento', {
      Requerimiento: requerimiento,
      Pedidos: pedidos,
      Items: items
    });
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
   * Registra el archivo ya subido al file server.
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

  listarFiltroIdoneidad(idRequerimiento: string): Observable<any> {
    return this.apiService.GET('api/requerimiento/listarFiltroIdoneidad', {
      IdRequerimiento: idRequerimiento
    });
  }

  registrarFiltroIdoneidad(idRequerimiento: string, filtros: any[]): Observable<any> {
    return this.apiService.POST('api/requerimiento/registrarFiltroIdoneidad', {
      IdRequerimiento: idRequerimiento,
      Filtros: filtros
    });
  }

  derivarFiltrosIdoneidad(
    idRequerimiento: string,
    version: number,
    codigoTransicion: string
  ): Observable<any> {
    return this.apiService.POST('api/requerimiento/derivarFiltrosIdoneidad', {
      IdRequerimiento: idRequerimiento,
      Version: version,
      CodigoTransicion: codigoTransicion
    });
  }

  confirmarFiltrosIdoneidad(
    idRequerimiento: string,
    version: number,
    extras: Record<string, unknown> = {}
  ): Observable<any> {
    return this.apiService.POST('api/requerimiento/confirmarFiltrosIdoneidad', {
      IdRequerimiento: idRequerimiento,
      Version: version,
      ...extras
    });
  }

  registrarCcp(idRequerimiento: string, ccp: any): Observable<any> {
    return this.apiService.POST('api/requerimiento/registrarCcp', {
      IdRequerimiento: idRequerimiento,
      ...ccp
    });
  }

  registrarOrdenServicio(idRequerimiento: string, orden: any): Observable<any> {
    return this.apiService.POST('api/requerimiento/registrarOrdenServicio', {
      IdRequerimiento: idRequerimiento,
      ...orden
    });
  }

  notificarOrdenServicio(idRequerimiento: string, version: number): Observable<any> {
    return this.apiService.POST('api/requerimiento/notificarOrdenServicio', {
      IdRequerimiento: idRequerimiento,
      Version: version
    });
  }

  /**
   * Firma la versión vigente. No mueve el expediente: la acción del flujo se
   * ejecuta después con `ejecutarTransicion`, que comprueba que esté firmado.
   *
   * Si el firmador devolvió otro archivo, `GeneradoDocumento` reemplaza el PDF
   * sin firma en DocumentoVersion.
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
  /* Maestros de SIGA y puente con el CMN                                   */
  /* ---------------------------------------------------------------------- */

  /**
   * Un solo endpoint para los nueve maestros. El nombre del maestro es un dato,
   * no una ruta: agregar uno nuevo no obliga a tocar el backend.
   */
  listarMaestroSiga(maestro: string, parametros: any = {}): Observable<any> {
    return this.apiService.GET('api/sigcm/listarMaestroSiga', { Maestro: maestro, ...parametros });
  }

  /**
   * Pedidos SIGA del centro de costo y año. Es el maestro PEDIDO de
   * sigcm.paListarMaestroSiga (siga.vwPedido), no un HTTP aparte.
   */
  listarPedidosSiga(anoEje: number, centroCosto: string, secEjec?: number): Observable<PedidoSiga[]> {
    return this.listarMaestroSiga('PEDIDO', {
      AnoEje: anoEje,
      SecEjec: secEjec || 1750,
      CentroCosto: centroCosto
    }).pipe(
      map((rpta: any) => rpta?.datos || [])
    );
  }

  /**
   * Tarea del centro + resumen de items del pedido (un solo viaje).
   * Maestro PEDIDO_DETALLE de sigcm.paListarMaestroSiga.
   */
  listarPedidoDetalleSiga(
    anoEje: number,
    numeroPedido: string,
    centroCosto: string,
    secEjec?: number
  ): Observable<PedidoSigaDetalle | null> {
    return this.listarMaestroSiga('PEDIDO_DETALLE', {
      AnoEje: anoEje,
      SecEjec: secEjec || 1750,
      CentroCosto: centroCosto,
      NumeroPedido: numeroPedido
    }).pipe(
      map((rpta: any) => (rpta?.datos && rpta.datos[0]) || null)
    );
  }

  /**
   * Solicitudes CMN para el caso NO_INCLUIDO (REQ-04): hay que apoyarse en una
   * modificación cuyo Anexo 4 ya está en el área usuaria. Se piden con
   * SoloMiBandeja en falso porque la modificación pudo tramitarla otro perfil
   * de la misma área.
   */
  listarSolicitudCmnFinalizada(anoEje: number): Observable<any> {
    const filtro = (CodigoEstado: string) => this.apiService.GET('api/cmn/listarSolicitud', {
      Filtro: {
        SoloMiBandeja: false,
        CodigoEstado,
        AnoEje: anoEje,
        Limite: 100,
        Desplazamiento: 0
      }
    });

    return forkJoin({
      enviados: filtro('CMN_A4_ENVIADO'),
      finalizados: filtro('CMN_FINALIZADO')
    }).pipe(
      map(({ enviados, finalizados }) => ({
        estado: 1,
        Solicitudes: [
          ...(enviados?.Solicitudes || []),
          ...(finalizados?.Solicitudes || [])
        ]
      }))
    );
  }
}
