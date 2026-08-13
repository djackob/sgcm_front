import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IUserInfo } from '../models/IUserInfo';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  constructor(private http: HttpClient) {
  }

  SessionStorageUserInfo(UsuarioApp: IUserInfo) {
    if (!UsuarioApp) {
      throw new Error('Registro es null');
    }

    const primeraCondicion: Boolean = (UsuarioApp.mensaje.cambio_clave == 'True');
    const hacerCambioClave = primeraCondicion;

    if (hacerCambioClave) {
      return (subscriber: any) => {
        subscriber.next(true);
      };
    }

    return (subscriber: any) => {
      subscriber.next(false);
    };
  }
}
