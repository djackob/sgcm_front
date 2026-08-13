import { Injectable } from '@angular/core';
import { CryptoService } from './crypto.service';
import { Login } from '../interfaces/login.interface';

/** Clave de sesión del usuario/menús/dependencias (equivalente a data_sissgp). */
export const SESSION_DATA_KEY = 'data_scm';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  public data_usuario: Login = {
    id_usuario: 0,
    id_padre: 0,
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    cambio_clave: false,
    usuario: '',
    correo: [],
    telefono: [],
    token: '',
    fecha_modificacion: null,
    detalle: []
  };

  constructor(private crypto: CryptoService) {
  }

  public getUsuario(): Login {
    try {
      const raw = sessionStorage.getItem(SESSION_DATA_KEY);
      if (raw != null && raw !== 'undefined') {
        return this.data_usuario = JSON.parse(this.crypto.desencriptar(raw || '{}'));
      }
      return this.data_usuario;
    } catch (e: any) {
      return this.data_usuario;
    }
  }

  public getInfoUsuario(): any {
    try {
      const raw = sessionStorage.getItem(SESSION_DATA_KEY);
      if (raw != null && raw !== 'undefined') {
        return JSON.parse(this.crypto.desencriptar(raw || '{}'));
      }
      return null;
    } catch (e: any) {
      return null;
    }
  }
}
