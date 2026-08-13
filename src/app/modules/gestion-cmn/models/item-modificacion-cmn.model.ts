export interface ItemModificacionCmn {
  codigo: string;
  descripcion: string;
  unidadMedida: string;
  exclusionCantidad: string;
  exclusionValor: string;
  inclusionCantidad: string;
  inclusionValor: string;
}

export function crearItemModificacionVacio(): ItemModificacionCmn {
  return {
    codigo: '',
    descripcion: '',
    unidadMedida: '',
    exclusionCantidad: '',
    exclusionValor: '',
    inclusionCantidad: '',
    inclusionValor: '',
  };
}
