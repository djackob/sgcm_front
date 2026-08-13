export interface AppConfig {
  env: string;
  apiUrl: string;
  profile: any[];
  /**
   * Unidad ejecutora en SIGA (SEC_EJEC). Toda consulta a SIGA va filtrada por
   * ella; consultar SIGA sin filtro está prohibido. Es configuración de
   * despliegue, no una constante del código: cambia entre la copia local y
   * producción.
   */
  secEjec: number;
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
