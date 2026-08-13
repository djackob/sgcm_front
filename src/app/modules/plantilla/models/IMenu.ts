export interface Menu {
  id_perfil_menu: number;
  id_perfil_sistema: number;
  id_menu: number;
  nombre_menu: string;
  id_menu_padre: number;
  url: string;
  nivel: number;
  orden: number;
  icono: string;
  es_componente: boolean;
  hijos: Menu[];
}
