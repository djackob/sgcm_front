import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppConfig } from '../interfaces/app-config.interface';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  static settings: AppConfig;
  private httpClient: HttpClient;

  constructor(handler: HttpBackend) {
    this.httpClient = new HttpClient(handler);
  }

  loadConfig(): Promise<void> {
    return new Promise<void>((resolve) => {
      const headers = new HttpHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const jsonFile = `assets/config/config.json`;
      this.httpClient.get<AppConfig>(jsonFile, { headers }).subscribe({
        next: (data: any) => {
          ConfigService.settings = data;
          resolve();
        },
        error: (err) => {
          console.error('config.json inválido o no se pudo leer. No use comentarios //: JSON.parse los rechaza.', err);
          resolve();
        }
      });
    });
  }
}
