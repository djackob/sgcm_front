import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../services/loader.service';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {

  constructor(private loaderService: LoaderService) {
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const urls_no_preload = ['subirDocumento'];

    if (this.buscarTextosEnCadena(request.url, urls_no_preload)) {
      return next.handle(request);
    }

    this.loaderService.show();
    return next.handle(request).pipe(
      finalize(() => { this.loaderService.hide(); })
    );
  }

  buscarTextosEnCadena(cadena: string, textos: string[]): boolean {
    for (let i = 0; i <= textos.length - 1; i++) {
      const regex = new RegExp(textos[i], 'i');
      if (regex.test(cadena)) {
        return true;
      }
    }
    return false;
  }
}
