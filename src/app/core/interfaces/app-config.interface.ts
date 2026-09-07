export interface AppConfig {
  env: string;
  apiUrl: string;
  /**
   * URL del portal SSO al vencer la sesión o al abrir /sso-acceso sin token.
   * Cambia por ambiente (p. ej. https://dsso.anin.gob.pe/login).
   */
  ssoLoginUrl: string;
  /** Ruta de retorno del ingreso local de pruebas. */
  accesoLocalUrl?: string;
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
    /**
     * Equipo sin el dispositivo de firma: no se abre el firmador y el paso se
     * registra con el PDF sin firmar. Es configuración de ambiente; donde se
     * firma de verdad va en false, que es lo que vale si el campo falta.
     */
    omitir_dispositivo?: boolean;
  };
  MAX_SIZE_UPLOAD: number;
  KEY_DH: string;
  dias_habiles_plazo: number;
  rendicion_conceptos_generales: any[];
}
