export interface AppConfig {
  env: string;
  apiUrl: string;
  profile: any[];
  firma: {
    ruta_logo: '';
    ruta_js: '';
    ruta_metodo: '';
    ruta_iframe: '';
    ruta_carpeta: '';
    ruta_respuesta: '';
    ruta_archivo: '';
  };
  MAX_SIZE_UPLOAD: number;
  KEY_DH: string;
  dias_habiles_plazo: number;
  rendicion_conceptos_generales: any[];
}
