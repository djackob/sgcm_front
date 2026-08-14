import { ItemSolicitudCmn, SolicitudDetalleCmn } from '../models/cmn.model';

/**
 * Anexo N.º 03 según el formato de la Directiva (MEF): marco, tabla de
 * exclusión/inclusión, sustento, notas y firma del responsable del área usuaria.
 */

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

function aniosConMovimiento(items: ItemSolicitudCmn[], anoEje: number): string {
  const anios = new Set<number>();
  for (const item of items) {
    [item.CantidadAno0, item.CantidadAno1, item.CantidadAno2, item.CantidadAno3]
      .forEach((cantidad, indice) => {
        if (Number(cantidad) > 0) {
          anios.add(anoEje + indice);
        }
      });
  }
  return [...anios].sort((a, b) => a - b).join(', ');
}

function filaItem(item: ItemSolicitudCmn): string {
  const exclusion = esExclusion(item.TipoMovimiento);
  const cantidad = Number(item.CantidadTotal)
    || [item.CantidadAno0, item.CantidadAno1, item.CantidadAno2, item.CantidadAno3]
      .reduce((acc, n) => acc + (Number(n) || 0), 0);
  const valor = Number(item.MontoTotal)
    || [item.MontoAno0, item.MontoAno1, item.MontoAno2, item.MontoAno3]
      .reduce((acc, n) => acc + (Number(n) || 0), 0);
  const cant = numero(cantidad);
  const val = numero(valor);
  return `<tr>
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
export function htmlAnexo3(solicitud: SolicitudDetalleCmn, _origen = ''): string {
  const ahora = new Date();
  const items = solicitud.Items || [];
  const filas = items.map(filaItem).join('')
    || `<tr><td colspan="7" class="c">&nbsp;</td></tr>`;
  const anios = aniosConMovimiento(items, solicitud.AnoEje || ahora.getFullYear());
  const numeroAnexo = (solicitud.Codigo || '').replace(/^CMN-/, '') || solicitud.Codigo || '';
  const area = [solicitud.CentroCostoNombre, solicitud.CentroCosto]
    .filter(x => !!x)
    .join(' — ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Anexo N.º 03 · ${esc(solicitud.Codigo)}</title>
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
      font-size: 11px;
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
    .puntos { border-bottom: 1px dotted #000; }
    .firma {
      margin-top: 28px;
      display: flex;
      justify-content: flex-end;
    }
    .firma .bloque {
      width: 280px;
      text-align: center;
      font-size: 12px;
    }
    .firma .linea {
      border-top: 1px solid #000;
      margin: 36px 8px 6px;
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
      ANEXO Nº 03: SOLICITUD DE MODIFICACIÓN DEL CUADRO MULTIANUAL DE NECESIDADES Nº ${esc(numeroAnexo)}
    </div>

    <div class="campo"><span class="lbl">Área usuaria:</span> ${esc(area)}</div>
    <div class="campo"><span class="lbl">Fecha:</span> ${fechaGuion(solicitud.FechaSolicitud)}</div>

    <table class="grid">
      <thead>
        <tr>
          <th colspan="3">ITEM</th>
          <th colspan="4">CANTIDAD Y/O VALORES</th>
        </tr>
        <tr>
          <th rowspan="2" style="width:12%">Código</th>
          <th rowspan="2" style="width:36%">Descripción</th>
          <th rowspan="2" style="width:12%">Unidad de Medida</th>
          <th colspan="2">EXCLUSIÓN</th>
          <th colspan="2">INCLUSIÓN</th>
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
      <p>
        Sustento para la aprobación de modificaciones del CMN, al día hábil siguiente de su presentación
        (numeral 32.7 del artículo 32 de la Directiva):
        <span class="puntos">${esc(solicitud.Sustento) || '&nbsp;'.repeat(80)}</span>
      </p>
      <p>
        De ser el caso, indicar el/los año(s) que corresponda(n) realizar la inclusión o exclusión de la programación
        <span class="puntos">${esc(anios) || '&nbsp;'.repeat(40)}</span>
      </p>
      <p>1/ La información registrada en el presente Anexo corresponde a campos mínimos y obligatorios que pueden ser ampliados por la Entidad del Sector Público.</p>
      <p>2/ La información registrada en los campos de “exclusión” e “inclusión” considera la cantidad y/o valor acumulado de todos los años de la programación.</p>
      <p>3/ El campo de “cantidad total” se completa solo en el caso de bienes.</p>
      <p>4/ La presente información tiene carácter de Declaración Jurada; por lo que, en señal de conformidad y en representación del Área usuaria, se suscribe:</p>
    </div>

    <div class="firma">
      <div class="bloque">
        <div class="linea"></div>
        Firma: Responsable del Área usuaria
        ${solicitud.Responsable ? `<div>${esc(solicitud.Responsable)}</div>` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}
