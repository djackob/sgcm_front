import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MetodoService } from './metodo.service';

/** Terna usuario-rol-unidad vigente, tal como la devuelve sigcm.paListarPerfilAcceso. */
export interface PerfilAcceso {
  Cuenta: string;
  NombreCompleto: string;
  Cargo: string;
  CodigoRol: string;
  Rol: string;
  CodigoUnidad: string;
  Unidad: string;
  Sigla: string;
  CentroCosto?: string;
  EsAreaUsuaria: boolean;
  EsTitular: boolean;
  Modulos: Array<{ CodigoModulo: string; Nombre: string; Ruta: string }>;
}

/**
 * Ingreso por selección de perfil, para trabajar fuera de la red de la ANIN.
 *
 * Es el reemplazo local de la pantalla del SSO y nada más: el backend devuelve
 * el mismo JWT y una sesión con la misma forma, de modo que session.service, el
 * guard y el menú lateral no distinguen por dónde entró el usuario.
 *
 * En producción el backend apaga estos endpoints (appSettings:acceso_local) y
 * responden 404.
 */
@Injectable({
  providedIn: 'root'
})
export class AccesoService {

  constructor(private apiService: MetodoService) { }

  /** Ternas vigentes hoy. Una fila por terna, no por persona. */
  listarPerfil(texto: string | null = null): Observable<any> {
    return this.apiService.GET('api/acceso/listarPerfil', { Texto: texto, Limite: 100 });
  }

  /** Abre sesión con la terna elegida. Responde igual que api/token/tksistema. */
  iniciarSesion(perfil: PerfilAcceso): Observable<any> {
    return this.apiService.POST('api/acceso/iniciarSesion', {
      Cuenta: perfil.Cuenta,
      CodigoRol: perfil.CodigoRol,
      CodigoUnidad: perfil.CodigoUnidad
    });
  }

  /** Ruta de retorno al cerrar sesión local. */
  cerrarSesion(): Observable<any> {
    return this.apiService.GET('api/acceso/loginOut');
  }
}
