/** Fila del cuadro de otras penalidades (bienes y servicios). */
export interface FilaOtraPenalidad {
  Supuesto: string;
  FormaCalculo: string;
  Procedimiento: string;
}

export function filaOtraPenalidadVacia(): FilaOtraPenalidad {
  return { Supuesto: '', FormaCalculo: '', Procedimiento: '' };
}

export function normalizarFilasPenalidad(valor: unknown): FilaOtraPenalidad[] {
  if (!Array.isArray(valor)) {
    return [];
  }
  return valor
    .map(fila => ({
      Supuesto: String(fila?.Supuesto || '').trim(),
      FormaCalculo: String(fila?.FormaCalculo || '').trim(),
      Procedimiento: String(fila?.Procedimiento || '').trim()
    }))
    .filter(fila => fila.Supuesto || fila.FormaCalculo || fila.Procedimiento);
}

/** Un texto legado (un solo párrafo) entra como primera fila del cuadro. */
export function filasDesdeTextoPenalidad(texto: string | null | undefined): FilaOtraPenalidad[] {
  const limpio = String(texto || '').trim();
  if (!limpio) {
    return [];
  }
  return [{ Supuesto: limpio, FormaCalculo: '', Procedimiento: '' }];
}

export function sincronizarOtrasPenalidades(tdr: {
  OtrasPenalidades: string;
  OtrasPenalidadesFilas: FilaOtraPenalidad[];
}): void {
  const filas = normalizarFilasPenalidad(tdr.OtrasPenalidadesFilas);
  tdr.OtrasPenalidadesFilas = filas;
  tdr.OtrasPenalidades = textoFilasPenalidad(filas);
}

export function textoFilasPenalidad(filas: FilaOtraPenalidad[]): string {
  return normalizarFilasPenalidad(filas)
    .map((fila, indice) => {
      const partes = [
        fila.Supuesto,
        fila.FormaCalculo ? `Cálculo: ${fila.FormaCalculo}` : '',
        fila.Procedimiento ? `Procedimiento: ${fila.Procedimiento}` : ''
      ].filter(Boolean);
      return `${indice + 1}. ${partes.join('. ')}`;
    })
    .join('\n');
}

export function tablaOtrasPenalidades(filas: FilaOtraPenalidad[]): any | null {
  const limpias = normalizarFilasPenalidad(filas);
  if (!limpias.length) {
    return null;
  }
  const celda = (texto: string, bold = false) => ({
    text: texto || '—',
    bold,
    fontSize: 9,
    margin: [3, 4, 3, 4]
  });
  return {
    table: {
      headerRows: 1,
      widths: [22, '*', '*', '*'],
      body: [
        [
          celda('N.°', true),
          celda('Supuestos de aplicación de la penalidad', true),
          celda('Forma de cálculo', true),
          celda('Procedimiento', true)
        ],
        ...limpias.map((fila, indice) => [
          celda(String(indice + 1)),
          celda(fila.Supuesto),
          celda(fila.FormaCalculo),
          celda(fila.Procedimiento)
        ])
      ]
    },
    margin: [0, 4, 0, 8]
  };
}
