export interface Login {
  id_usuario: number;
  id_padre?: any;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  cambio_clave: boolean;
  usuario: string;
  correo: [];
  telefono: [];
  token?: string;
  fecha_modificacion: any;
  detalle: Detalle_login[];
}

export interface Detalle_login {
  id_acceso: number;
  id_dependencia: number;
  dependencia: string;
  cod_dependencia: string;
  id_municipalidad: null;
  nombre_municipalidad: null;
  coddepa: null;
  nomdepa: null;
  codprov: null;
  nomprov: null;
  coddist: null;
  nomdist: null;
  perfil: Perfil[];
}

export interface Perfil {
  id_perfil_sistema: number;
  id_sistema: number;
  id_perfil: number;
  perfil: string;
  id_perfil_responsable: null;
  componente: Componente[];
  menu: Menu[];
  cod_perfil?: string;
}

export interface Componente {
  id_perfil_componente: number;
  id_perfil_sistema: number;
  id_componente: number;
  nombre_componente: string;
  descripcion: string;
  tipo_componente: string;
  seccion: string;
  evento: string;
  pagina: string;
  modulo: string;
}

export interface Menu {
  id_perfil_menu: number;
  id_perfil_sistema: number;
  id_menu: number;
  nombre_menu: string;
  id_menu_padre: null;
  url: string;
  nivel: number;
  orden: number;
  icono: string;
  es_componente: boolean;
}
