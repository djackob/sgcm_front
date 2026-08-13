export interface IUserInfo {
  mensaje: Mensaje;
  estado: string;
}

export interface Mensaje {
  apellido_materno: string;
  apellido_paterno: string;
  cambio_clave: string;
  correo: Correo[];
  cod_perfil: string;
  fecha_modificacion: string;
  id_perfil: number;
  perfil: string;
  token: string;
  usuario: string;
  id_usuario: number;
  componentes: string;
  detalle: Detalle[];
}

export interface Correo {
}

export interface Detalle {
  cod_dependencia: string;
  dependencia: string;
  perfil: Perfil[];
}

export interface Perfil {
  menu: any[];
}
