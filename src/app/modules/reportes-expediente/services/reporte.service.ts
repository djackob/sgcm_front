import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MetodoService } from '../../../core/services/metodo.service';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {

  constructor(private api: MetodoService) { }

  buscarOrden(filtro: any): Observable<any> {
    return this.api.GET('api/reporte/buscarOrden', { Filtro: filtro });
  }

  obtenerExpedienteDocumental(idOrdenServicio: string): Observable<any> {
    return this.api.GET('api/reporte/obtenerExpedienteDocumental', { IdOrdenServicio: idOrdenServicio });
  }
}
