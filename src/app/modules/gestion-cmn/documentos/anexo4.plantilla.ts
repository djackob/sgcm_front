import { ItemSolicitudCmn, SolicitudDetalleCmn } from '../models/cmn.model';

/**
 * Anexo N.º 04 según el formato de la Directiva (MEF): entidad, tabla de
 * exclusión/inclusión, notas y las dos firmas de Abastecimiento y de la máxima
 * autoridad administrativa.
 */

const ENTIDAD = 'Autoridad Nacional de Infraestructura';
const IDENTIFICACION = 'ANIN';

function esc(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function numero(valor: number | null | undefined): string {
  const n = Number(valor);
  if (!Number.isFinite(n) || n === 0) {
    return '';
  }
  return n.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function fechaGuion(valor: Date | string | null | undefined): string {
  const d = valor instanceof Date ? valor : (valor ? new Date(valor) : null);
  if (!d || Number.isNaN(d.getTime())) {
    return '';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function horaAmPm(d: Date): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const sufijo = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) {
    h = 12;
  }
  return `${String(h).padStart(2, '0')}:${m} ${sufijo}`;
}

function esExclusion(tipo: string): boolean {
  return (tipo || '').toUpperCase() === 'EXCLUSION';
}

function esBien(item: ItemSolicitudCmn): boolean {
  return (item.TipoBien || '').toUpperCase() !== 'S'
    && (item.TipoBien || '').toUpperCase() !== 'O';
}

function filaItem(item: ItemSolicitudCmn, solicitud: SolicitudDetalleCmn, esPrimero: boolean): string {
  const exclusion = esExclusion(item.TipoMovimiento);
  const cantidad = Number(item.CantidadTotal)
    || [item.CantidadAno0, item.CantidadAno1, item.CantidadAno2, item.CantidadAno3]
      .reduce((acc, n) => acc + (Number(n) || 0), 0);
  const valor = Number(item.MontoTotal)
    || [item.MontoAno0, item.MontoAno1, item.MontoAno2, item.MontoAno3]
      .reduce((acc, n) => acc + (Number(n) || 0), 0);
  const cant = esBien(item) ? numero(cantidad) : '';
  const val = numero(valor);
  return `<tr>
      <td class="c">${esPrimero ? esc(fechaGuion(solicitud.FechaSolicitud)) : ''}</td>
      <td class="c">${esPrimero ? esc(solicitud.Codigo) : ''}</td>
      <td class="c">${esc(item.CodigoItem)}</td>
      <td>${esc(item.Descripcion)}</td>
      <td class="c">${esc(item.UnidadAbreviatura)}</td>
      <td class="n">${exclusion ? cant : ''}</td>
      <td class="n">${exclusion ? val : ''}</td>
      <td class="n">${exclusion ? '' : cant}</td>
      <td class="n">${exclusion ? '' : val}</td>
    </tr>`;
}

/** Documento A4 horizontal, autocontenido, listo para ver o imprimir como PDF. */
export function htmlAnexo4(solicitud: SolicitudDetalleCmn, _origen = ''): string {
  const ahora = new Date();
  const items = solicitud.Items || [];
  const filas = items.map((item, indice) => filaItem(item, solicitud, indice === 0)).join('')
    || `<tr><td colspan="9" class="c">&nbsp;</td></tr>`;
  const numeroAnexo = (solicitud.Codigo || '').replace(/^CMN-/, '') || solicitud.Codigo || '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Anexo N.º 04 · ${esc(solicitud.Codigo)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #e2e8f0;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
    }
    .hoja {
      width: 277mm;
      min-height: 190mm;
      margin: 10px auto;
      padding: 8mm 9mm 10mm;
      background: #fff;
      border: 1px solid #000;
      box-shadow: 0 8px 28px rgba(15, 23, 42, 0.18);
    }
    .meta-der {
      text-align: right;
      font-size: 11px;
      line-height: 1.45;
      margin-bottom: 8px;
    }
    .titulo {
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      margin: 4px 0 14px;
      letter-spacing: 0.01em;
    }
    .campo {
      font-size: 12px;
      margin: 3px 0;
    }
    .campo .lbl { font-weight: 700; }
    table.grid {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 10.5px;
    }
    table.grid th, table.grid td {
      border: 1px solid #000;
      padding: 4px 5px;
      vertical-align: middle;
    }
    table.grid th {
      font-weight: 700;
      text-align: center;
      background: #fff;
    }
    table.grid td.c { text-align: center; }
    table.grid td.n { text-align: right; white-space: nowrap; }
    table.grid tbody tr { height: 22px; }
    .notas {
      margin-top: 12px;
      font-size: 11px;
      line-height: 1.45;
    }
    .notas p { margin: 0 0 6px; }
    .firmas {
      margin-top: 28px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
    }
    .firmas .bloque {
      flex: 1;
      text-align: center;
      font-size: 11px;
    }
    .firmas .linea {
      border-top: 1px solid #000;
      margin: 42px 12px 6px;
    }
    @media print {
      body { background: #fff; }
      .hoja { margin: 0; box-shadow: none; width: auto; min-height: 0; border: 1px solid #000; }
    }
  </style>
</head>
<body>
  <div class="hoja">
    <div class="meta-der">
      Fecha: ${fechaGuion(ahora)}<br />
      Hora: ${horaAmPm(ahora)}<br />
      Página: 1/1
    </div>

    <div class="titulo">
      ANEXO Nº 04: APROBACIÓN DE MODIFICACIONES AL CUADRO MULTIANUAL DE NECESIDADES Nº ${esc(numeroAnexo)}
    </div>

    <div class="campo"><span class="lbl">Entidad del Sector Público:</span> ${esc(ENTIDAD)}</div>
    <div class="campo"><span class="lbl">Nro de Identificación:</span> ${esc(IDENTIFICACION)}</div>

    <table class="grid">
      <thead>
        <tr>
          <th rowspan="3" style="width:10%">Fecha de solicitud</th>
          <th rowspan="3" style="width:12%">Nº de Solicitud de Modificación</th>
          <th rowspan="3" style="width:11%">Código Ítem Nº</th>
          <th rowspan="3" style="width:22%">Descripción del ítem</th>
          <th rowspan="3" style="width:9%">Unidad de Medida</th>
          <th colspan="4">CANTIDAD Y/O VALORES</th>
        </tr>
        <tr>
          <th colspan="2">EXCLUSION</th>
          <th colspan="2">INCLUSION</th>
        </tr>
        <tr>
          <th>Cantidad Total</th>
          <th>Valor Total S/</th>
          <th>Cantidad Total</th>
          <th>Valor Total S/</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>

    <div class="notas">
      <p>1/ La información registrada en el presente Anexo corresponde a campos mínimos y obligatorios que pueden ser ampliados por la Entidad del Sector Público.</p>
      <p>2/ La información registrada en los campos de “exclusión” e “inclusión” considera la cantidad y/o valor acumulado de todos los años de la programación.</p>
      <p>3/ El campo de “cantidad total” se completa solo en el caso de bienes.</p>
      <p>4/ La presente información tiene carácter de Declaración Jurada; por lo que, en señal de conformidad y en representación de la Entidad del Sector Público, se suscribe:</p>
    </div>

    <div class="firmas">
      <div class="bloque">
        <div class="linea"></div>
        Firma 1: Responsable de la Oficina de Abastecimiento
      </div>
      <div class="bloque">
        <div class="linea"></div>
        Firma 2: Máxima autoridad administrativa de la Entidad del Sector Público, o a quien se hubiera delegado dicha facultad
      </div>
    </div>
  </div>
</body>
</html>`;
}
