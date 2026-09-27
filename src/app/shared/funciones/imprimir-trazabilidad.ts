export interface PasoTrazabilidadImpresion {
  origen?: string | null;
  destino?: string | null;
  actor?: string | null;
  rol?: string | null;
  unidad?: string | null;
  cuando?: string | null;
  comentario?: string | null;
}

function escapar(valor: string | null | undefined): string {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fechaVisible(valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return String(valor);
  }
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minuto = String(fecha.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()} ${hora}:${minuto}`;
}

/** Historial que devuelve paObtenerTrazabilidad, en cualquier módulo. */
export function imprimirHistorialExpediente(titulo: string, pasos: any[]): void {
  imprimirTrazabilidad(titulo, (pasos || []).map(paso => ({
    origen: paso?.CodigoEstadoOrigen,
    destino: paso?.CodigoEstadoDestino,
    actor: paso?.Actor,
    rol: paso?.ActorRol,
    unidad: paso?.Unidad,
    cuando: fechaVisible(paso?.OcurridoEn),
    comentario: paso?.Comentario
  })));
}

/** Abre el historial en una ventana y lanza el diálogo de impresión del navegador. */
export function imprimirTrazabilidad(titulo: string, pasos: PasoTrazabilidadImpresion[]): void {
  const filas = (pasos || []).map((paso, indice) => {
    const responsable = [paso.actor, paso.rol, paso.unidad].filter(x => !!x).join(' · ');
    return `<tr>
      <td>${indice + 1}</td>
      <td>${escapar(paso.origen || 'Inicio')}</td>
      <td>${escapar(paso.destino)}</td>
      <td>${escapar(responsable)}</td>
      <td>${escapar(paso.cuando)}</td>
      <td>${escapar(paso.comentario)}</td>
    </tr>`;
  }).join('');

  const cuerpo = filas
    ? `<table><thead><tr><th>N.°</th><th>Desde</th><th>Hacia</th><th>Responsable</th><th>Fecha</th><th>Comentario</th></tr></thead><tbody>${filas}</tbody></table>`
    : '<p>Sin movimientos registrados.</p>';

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${escapar(titulo)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      p.meta { margin: 0 0 16px; color: #444; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #bbb; padding: 6px 8px; vertical-align: top; font-size: 12px; text-align: left; }
      th { background: #f3f3f3; }
    </style></head><body>
    <h1>${escapar(titulo)}</h1>
    <p class="meta">Historial de trazabilidad</p>
    ${cuerpo}
    </body></html>`;

  const ventana = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!ventana) {
    return;
  }
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  ventana.print();
}
