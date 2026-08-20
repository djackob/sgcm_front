import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { CmnService } from '../../services/cmn.service';
import { SessionService } from '../../../../core/services/session.service';
import { ConfigService } from '../../../../core/services/config.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../../../shared/funciones/archivo';
import { construirAnexo3, nombreArchivoAnexo3 } from '../../documentos/anexo3.pdfmake';
import {
  CatalogoSiga,
  CuadroVigenteSiga,
  FuenteFinancSiga,
  ItemFormularioCmn,
  MetaSiga,
  TareaSiga,
  TechoSiga,
  crearItemFormularioCmn
} from '../../models/cmn.model';

/**
 * Registro del Anexo 3 — Solicitud de modificación del CMN.
 *
 * LOS DATOS NO SE ESCRIBEN A MANO
 * Cada ítem se elige de los maestros de SIGA: el catálogo para una inclusión, el
 * cuadro vigente para una exclusión o una modificación. La rutina valida contra
 * esos mismos maestros y rechaza lo que no exista, así que dejar escribir
 * códigos libremente solo produce formularios que se pierden al guardar.
 *
 * UN SOLO MOVIMIENTO POR ÍTEM
 * La regla del formato oficial —exclusión o inclusión, nunca ambas— aquí es
 * TipoMovimiento, un único valor por línea. El mockup lo representaba con dos
 * pares de columnas y confiaba en que el usuario llenara solo uno.
 *
 * LOS 48 PERÍODOS
 * El formulario captura una cantidad por año y el mes de imputación. El cliente
 * envía solo eso; la rutina materializa los 4 años × 12 meses rellenando con
 * cero. Pedir 48 casillas por ítem en pantalla sería inusable, y calcularlas
 * aquí sería duplicar lo que la base ya hace.
 */
@Component({
  selector: 'app-modal-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './modal-registro.component.html',
  styleUrl: './modal-registro.component.scss',
})
export class ModalRegistroComponent {

  @Output() registrado = new EventEmitter<void>();

  readonly breadcrumb = ['Gestión CMN', 'Anexo 3'];
  readonly meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Setiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' }
  ];

  abierto = false;
  guardando = false;
  pasoGuardar = '';
  cargandoMaestros = false;
  cargandoEdicion = false;
  modoEdicion = false;
  idSolicitudEdicion: string | null = null;
  codigoEdicion = '';
  /**
   * Si la solicitud que se está editando YA tiene su Anexo 3 en el servidor.
   *
   * Decide si al guardar hay que rehacer el PDF. En una subsanación sí: el
   * documento del servidor quedó con los datos observados y nadie más lo va a
   * regenerar —`CMN_SUBSANAR` no produce documento—. En un borrador no hay nada
   * que rehacer todavía; el PDF nace cuando se pulsa «Generar Anexo 3».
   */
  private teniaAnexo3 = false;

  /* Cabecera */
  anoEje = new Date().getFullYear();
  centroCosto = '';
  centroCostoNombre = '';
  responsable = '';
  cargo = '';
  sustento = '';

  /* Maestros de SIGA */
  tareas: TareaSiga[] = [];
  metas: MetaSiga[] = [];
  fuentes: FuenteFinancSiga[] = [];
  techos: TechoSiga[] = [];
  cuadroVigente: CuadroVigenteSiga[] = [];

  /* Ítems del formulario */
  items: ItemFormularioCmn[] = [];

  /* Selector del cuadro vigente */
  eligiendoCuadro: number | null = null;
  filtroCuadro = '';

  constructor(
    private cmnService: CmnService,
    private sesion: SessionService,
    private documentoService: DocumentoService,
    private funciones: Funciones
  ) { }

  private get secEjec(): number {
    return ConfigService.settings?.secEjec || 1750;
  }

  get anios(): number[] {
    return [this.anoEje, this.anoEje + 1, this.anoEje + 2, this.anoEje + 3];
  }

  /* ---------------------------------------------------------------------- */
  /* Apertura y cierre                                                      */
  /* ---------------------------------------------------------------------- */

  abrir(centroCosto: string, anoEje: number): void {
    const info = this.sesion.getInfoUsuario();
    const detalle = info?.detalle?.[0];

    this.modoEdicion = false;
    this.idSolicitudEdicion = null;
    this.codigoEdicion = '';
    this.cargandoEdicion = false;
    this.teniaAnexo3 = false;

    this.centroCosto = centroCosto || detalle?.centro_costo || '';
    this.centroCostoNombre = detalle?.dependencia || '';
    this.responsable = [info?.nombre, info?.apellido_paterno].filter(Boolean).join(' ');
    this.cargo = info?.cargo || detalle?.perfil?.[0]?.perfil || '';
    this.anoEje = anoEje || new Date().getFullYear();

    this.sustento = '';
    this.items = [crearItemFormularioCmn()];
    this.eligiendoCuadro = null;
    this.abierto = true;

    this.cargarMaestros();
  }

  /**
   * Abre el mismo formulario del Anexo 3 con los datos ya registrados, para
   * subsanar una observación. El estado del expediente no cambia hasta que el
   * jefe firma de nuevo.
   */
  abrirEdicion(idSolicitud: string): void {
    const info = this.sesion.getInfoUsuario();
    const detalle = info?.detalle?.[0];

    this.modoEdicion = true;
    this.idSolicitudEdicion = idSolicitud;
    this.codigoEdicion = '';
    this.cargandoEdicion = true;
    this.teniaAnexo3 = false;

    this.centroCosto = detalle?.centro_costo || '';
    this.centroCostoNombre = detalle?.dependencia || '';
    this.responsable = [info?.nombre, info?.apellido_paterno].filter(Boolean).join(' ');
    this.cargo = info?.cargo || detalle?.perfil?.[0]?.perfil || '';
    this.sustento = '';
    this.items = [crearItemFormularioCmn()];
    this.eligiendoCuadro = null;
    this.abierto = true;

    this.cmnService.obtenerSolicitud(idSolicitud).subscribe({
      next: (respuesta: any) => {
        this.cargandoEdicion = false;
        if (respuesta?.estado !== 1) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible cargar la solicitud.');
          this.abierto = false;
          return;
        }

        this.codigoEdicion = respuesta.Codigo || '';
        this.teniaAnexo3 = !!idDocumentoSistema(respuesta.DocumentoSistemaAnexo3);
        this.anoEje = respuesta.AnoEje || this.anoEje;
        this.centroCosto = respuesta.CentroCosto || this.centroCosto;
        this.centroCostoNombre = respuesta.CentroCostoNombre || this.centroCostoNombre;
        this.sustento = respuesta.Sustento || '';
        this.items = this.itemsDesdeDetalle(respuesta.Items || []);
        this.cargarMaestros();
      },
      error: () => {
        this.cargandoEdicion = false;
        this.abierto = false;
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
      }
    });
  }

  private itemsDesdeDetalle(filas: any[]): ItemFormularioCmn[] {
    if (!filas.length) {
      return [crearItemFormularioCmn()];
    }

    return filas.map(fila => {
      const item = crearItemFormularioCmn();
      const partes = String(fila.CodigoItem || '').split('.');

      item.TipoMovimiento = fila.TipoMovimiento || 'INCLUSION';
      item.CodigoItem = fila.CodigoItem || '';
      item.Descripcion = fila.Descripcion || '';
      item.UnidadAbreviatura = fila.UnidadAbreviatura || '';
      item.PrecioUnitario = fila.PrecioUnitario ?? null;
      item.TipoTarea = fila.TipoTarea || '';
      item.NivelTarea = fila.NivelTarea || '';
      item.CodigoTarea = fila.CodigoTarea ?? null;
      item.SecFunc = fila.SecFunc ?? null;
      item.Origen = fila.Origen || '';
      item.FuenteFinanc = fila.FuenteFinanc || '';
      item.Clasificador = fila.Clasificador || '';
      item.TipoUso = fila.TipoUso || 'C';
      item.TipoBien = fila.TipoBien || partes[0] || '';
      item.GrupoBien = fila.GrupoBien || partes[1] || '';
      item.ClaseBien = fila.ClaseBien || partes[2] || '';
      item.FamiliaBien = fila.FamiliaBien || partes[3] || '';
      item.ItemBien = fila.ItemBien || partes[4] || '';
      item.RefSecCuadro = fila.RefSecCuadro ?? null;
      item.RefSecItem = fila.RefSecItem ?? null;
      item.Cantidades = [
        fila.CantidadAno0 || null,
        fila.CantidadAno1 || null,
        fila.CantidadAno2 || null,
        fila.CantidadAno3 || null
      ];
      const periodo = (fila.Periodos || []).find((p: any) => Number(p.Cantidad) > 0);
      item.Mes = periodo?.Mes || 1;
      return item;
    });
  }

  cerrar(): void {
    this.abierto = false;
  }

  /**
   * Tarea, meta y fuente se traen enteras al abrir: son listas cortas y de
   * elección obligatoria en cada ítem. El catálogo NO se trae: son miles de
   * filas y se busca por descripción, que es como el área usuaria lo conoce.
   */
  private cargarMaestros(): void {
    this.cargandoMaestros = true;

    const base = { AnoEje: this.anoEje, SecEjec: this.secEjec, Limite: 500 };

    this.cmnService.listarMaestroSiga('TAREA', { ...base, CentroCosto: this.centroCosto })
      .subscribe({
        next: (r: any) => { this.tareas = r?.datos || []; this.cargandoMaestros = false; },
        error: () => { this.cargandoMaestros = false; }
      });

    this.cmnService.listarMaestroSiga('META', base)
      .subscribe({ next: (r: any) => this.metas = r?.datos || [] });

    this.cmnService.listarMaestroSiga('FUENTE_FINANC', base)
      .subscribe({ next: (r: any) => this.fuentes = r?.datos || [] });

    this.cmnService.listarMaestroSiga('TECHO', { ...base, CentroCosto: this.centroCosto })
      .subscribe({ next: (r: any) => this.techos = r?.datos || [] });

    this.cmnService.listarMaestroSiga('CUADRO_VIGENTE', {
      ...base, CentroCosto: this.centroCosto, TipoMovimiento: 'EXCLUSION'
    })
      .subscribe({ next: (r: any) => this.cuadroVigente = r?.datos || [] });
  }

  /* ---------------------------------------------------------------------- */
  /* Ítems                                                                  */
  /* ---------------------------------------------------------------------- */

  agregarItem(): void {
    this.items = [...this.items, crearItemFormularioCmn()];
  }

  /** La tabla es dinámica pero conserva al menos un ítem: una solicitud sin
      ítems no es una solicitud. */
  quitarItem(indice: number): void {
    if (this.items.length === 1) {
      this.funciones.mensaje('info', 'La solicitud debe conservar al menos un ítem.');
      return;
    }
    this.items = this.items.filter((_, i) => i !== indice);
  }

  /**
   * Cambiar el movimiento limpia la identificación del ítem: una inclusión se
   * elige del catálogo y una exclusión del cuadro vigente. Conservar lo anterior
   * dejaría una referencia al cuadro en una inclusión, que la rutina rechaza.
   */
  cambiarMovimiento(item: ItemFormularioCmn): void {
    item.CodigoItem = '';
    item.Descripcion = '';
    item.UnidadAbreviatura = '';
    item.TipoBien = '';
    item.GrupoBien = '';
    item.ClaseBien = '';
    item.FamiliaBien = '';
    item.ItemBien = '';
    item.RefSecCuadro = null;
    item.RefSecItem = null;
    item.resultados = [];
    item.textoBusqueda = '';
  }

  buscarCatalogo(item: ItemFormularioCmn): void {
    const texto = item.textoBusqueda.trim();
    if (texto.length < 3) {
      this.funciones.mensaje('info', 'Escriba al menos tres caracteres de la descripción.');
      return;
    }

    item.buscando = true;
    this.cmnService.listarMaestroSiga('CATALOGO', {
      SecEjec: this.secEjec,
      AnoEje: this.anoEje,
      CentroCosto: this.centroCosto,
      TipoMovimiento: item.TipoMovimiento,
      Texto: texto,
      Limite: 25
    }).subscribe({
      next: (r: any) => {
        item.buscando = false;
        item.resultados = r?.datos || [];
        if (item.resultados.length === 0) {
          this.funciones.mensaje('info', 'Sin coincidencias en el catálogo de SIGA.');
        }
      },
      error: () => { item.buscando = false; }
    });
  }

  elegirCatalogo(item: ItemFormularioCmn, fila: CatalogoSiga): void {
    item.CodigoItem = fila.CodigoItem;
    item.Descripcion = fila.Descripcion;
    item.TipoBien = fila.TipoBien;
    item.GrupoBien = fila.GrupoBien;
    item.ClaseBien = fila.ClaseBien;
    item.FamiliaBien = fila.FamiliaBien;
    item.ItemBien = fila.ItemBien;
    // El precio de referencia es una sugerencia del catálogo; el área usuaria
    // puede corregirlo, que es lo que sustenta.
    item.PrecioUnitario = item.PrecioUnitario ?? fila.PrecioRef;
    item.resultados = [];
  }

  abrirCuadro(indice: number): void {
    this.eligiendoCuadro = indice;
    this.filtroCuadro = '';
  }

  get cuadroFiltrado(): CuadroVigenteSiga[] {
    const texto = this.filtroCuadro.trim().toLowerCase();
    if (!texto) {
      return this.cuadroVigente.slice(0, 60);
    }
    return this.cuadroVigente
      .filter(x => (x.CodigoItem || '').toLowerCase().includes(texto)
        || (x.Descripcion || '').toLowerCase().includes(texto))
      .slice(0, 60);
  }

  /**
   * Elegir del cuadro vigente arrastra también la clasificación presupuestal:
   * tarea, meta, fuente y clasificador vienen de la fila que se va a modificar o
   * excluir, y volver a escribirlos solo abre la puerta a contradecir a SIGA.
   */
  elegirCuadro(fila: CuadroVigenteSiga): void {
    if (this.eligiendoCuadro === null) {
      return;
    }

    const item = this.items[this.eligiendoCuadro];

    item.CodigoItem = fila.CodigoItem;
    item.Descripcion = fila.Descripcion || 'Ítem del cuadro vigente ' + fila.CodigoItem;
    item.TipoBien = fila.TipoBien;
    item.GrupoBien = fila.GrupoBien;
    item.ClaseBien = fila.ClaseBien;
    item.FamiliaBien = fila.FamiliaBien;
    item.ItemBien = fila.ItemBien;
    item.RefSecCuadro = fila.SecCuadro;
    item.RefSecItem = fila.SecItem;
    item.PrecioUnitario = fila.PrecioUnit;
    item.TipoTarea = fila.TipoTarea;
    item.NivelTarea = fila.NivelTarea;
    item.CodigoTarea = fila.CodigoTarea;
    item.SecFunc = fila.SecFunc;
    item.Origen = fila.Origen;
    item.FuenteFinanc = fila.FuenteFinanc;
    item.Clasificador = fila.Clasificador;
    item.TipoUso = fila.TipoUso || 'C';
    item.Cantidades = [fila.CantAno0, fila.CantAno1, fila.CantAno2, fila.CantAno3];

    this.eligiendoCuadro = null;
  }

  /** La tarea llega como una sola selección porque en SIGA son tres campos que
      viajan juntos: separarlos permitiría combinaciones que no existen. */
  elegirTarea(item: ItemFormularioCmn, valor: string): void {
    const tarea = this.tareas.find(t => this.claveTarea(t) === valor);
    item.TipoTarea = tarea?.TipoTarea || '';
    item.NivelTarea = tarea?.NivelTarea || '';
    item.CodigoTarea = tarea?.CodigoTarea ?? null;

    /* EL TipoUso NO SE TOMA DE LA TAREA.
       Aquí decía `item.TipoUso = tarea?.TipoUso || item.TipoUso`, y son dos
       conceptos distintos que se llaman igual: el del maestro de tareas
       clasifica la TAREA, y el de la línea clasifica el ÍTEM del cuadro. En
       SIGA_1750, la tarea 1/C/104 de la OTI trae 'X' mientras las 8 222 líneas
       del cuadro modificado de 2026 llevan 'C'.

       El efecto era desconcertante: el ítem se registraba bien —estado, techo y
       solicitud correctos— pero SIGA agrupa la grilla por Actividad Operativa y
       Tipo Uso, así que la línea nueva caía en un grupo aparte al final, con su
       propio subtotal, y parecía que no se había registrado.

       Para una inclusión el valor lo pone la base ('C', el DEFAULT de
       cmn.SolicitudItem); para exclusión o modificación se copia de la línea
       vigente del cuadro, que es lo que hacen elegirCuadro y elegirCatalogo. */

    this.validarClasificador(item);
  }

  claveTarea(tarea: TareaSiga): string {
    return `${tarea.TipoTarea}|${tarea.NivelTarea}|${tarea.CodigoTarea}`;
  }

  claveTareaItem(item: ItemFormularioCmn): string {
    return `${item.TipoTarea}|${item.NivelTarea}|${item.CodigoTarea}`;
  }

  elegirFuente(item: ItemFormularioCmn, valor: string): void {
    const fuente = this.fuentes.find(f => this.claveFuente(f) === valor);
    item.Origen = fuente?.Origen || '';
    item.FuenteFinanc = fuente?.FuenteFinanc || '';
    this.validarClasificador(item);
  }

  /** Clasificadores respaldados por el techo real del centro de costo. */
  clasificadoresDisponibles(item: ItemFormularioCmn): TechoSiga[] {
    const vistos = new Set<string>();
    return this.techos.filter(techo => {
      const coincide = techo.SecFunc === item.SecFunc
        && techo.Origen === item.Origen
        && techo.FuenteFinanc === item.FuenteFinanc;
      if (!coincide || !techo.Clasificador || vistos.has(techo.Clasificador)) {
        return false;
      }
      vistos.add(techo.Clasificador);
      return true;
    });
  }

  validarClasificador(item: ItemFormularioCmn): void {
    if (item.TipoMovimiento !== 'INCLUSION') {
      return;
    }
    const disponibles = this.clasificadoresDisponibles(item);
    if (!disponibles.some(x => x.Clasificador === item.Clasificador)) {
      item.Clasificador = '';
    }
  }

  claveFuente(fuente: FuenteFinancSiga): string {
    return `${fuente.Origen}|${fuente.FuenteFinanc}`;
  }

  claveFuenteItem(item: ItemFormularioCmn): string {
    return `${item.Origen}|${item.FuenteFinanc}`;
  }

  totalItem(item: ItemFormularioCmn): number {
    const cantidad = item.Cantidades.reduce((suma: number, c) => suma + (Number(c) || 0), 0);
    return cantidad * (Number(item.PrecioUnitario) || 0);
  }

  get totalSolicitud(): number {
    return this.items.reduce((suma, item) => suma + this.totalItem(item), 0);
  }

  /* ---------------------------------------------------------------------- */
  /* Guardar                                                                */
  /* ---------------------------------------------------------------------- */

  /**
   * Se valida lo mínimo para no gastar un viaje al servidor con un formulario
   * evidentemente incompleto. La validación de verdad —que el ítem exista en el
   * catálogo, que la tarea esté activa para este centro de costo, que la
   * referencia exista en el cuadro vigente— es de la rutina, y no se replica
   * aquí: dos validaciones que dicen lo mismo terminan diciendo cosas distintas.
   */
  private primerError(): string | null {
    if (!this.centroCosto) {
      return 'Este perfil no tiene centro de costo asociado y no puede registrar solicitudes.';
    }
    if (!this.sustento.trim()) {
      return 'El sustento de la solicitud es obligatorio.';
    }
    if (this.items.length === 0) {
      return 'La solicitud debe tener al menos un ítem.';
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const n = i + 1;

      if (!item.ItemBien) {
        return `El ítem ${n} no tiene un bien o servicio seleccionado.`;
      }
      if (!item.PrecioUnitario || item.PrecioUnitario <= 0) {
        return `El ítem ${n} necesita un precio unitario mayor que cero.`;
      }
      if (item.TipoMovimiento !== 'INCLUSION' && (!item.RefSecCuadro || !item.RefSecItem)) {
        return `El ítem ${n} es una ${item.TipoMovimiento.toLowerCase()} y debe elegirse del cuadro vigente.`;
      }
      if (!item.CodigoTarea) {
        return `El ítem ${n} necesita una tarea.`;
      }
      if (!item.SecFunc) {
        return `El ítem ${n} necesita una meta.`;
      }
      if (!item.FuenteFinanc) {
        return `El ítem ${n} necesita una fuente de financiamiento.`;
      }
      if (!item.Clasificador) {
        return `El ítem ${n} necesita un clasificador válido de SIGA.`;
      }
      if (item.Cantidades.every(c => !c || Number(c) <= 0)) {
        return `El ítem ${n} no tiene ninguna cantidad mayor que cero.`;
      }
    }

    return null;
  }

  guardar(): void {
    if (this.guardando) {
      return;
    }

    const error = this.primerError();
    if (error) {
      this.funciones.mensaje('info', error);
      return;
    }

    const solicitud: any = {
      AnoEje: this.anoEje,
      SecEjec: this.secEjec,
      CentroCosto: this.centroCosto,
      TipoOperacion: 'MODIFICACION',
      Sustento: this.sustento.trim()
    };

    if (this.modoEdicion && this.idSolicitudEdicion) {
      solicitud.IdSolicitud = this.idSolicitudEdicion;
    }

    const items = this.items.map(item => ({
      TipoMovimiento: item.TipoMovimiento,
      TipoTarea: item.TipoTarea,
      NivelTarea: item.NivelTarea,
      CodigoTarea: item.CodigoTarea,
      SecFunc: item.SecFunc,
      Origen: item.Origen,
      FuenteFinanc: item.FuenteFinanc,
      Clasificador: item.Clasificador || null,
      TipoUso: item.TipoUso || 'C',
      TipoBien: item.TipoBien,
      GrupoBien: item.GrupoBien,
      ClaseBien: item.ClaseBien,
      FamiliaBien: item.FamiliaBien,
      ItemBien: item.ItemBien,
      PrecioUnitario: Number(item.PrecioUnitario),
      RefSecCuadro: item.RefSecCuadro,
      RefSecItem: item.RefSecItem,
      // Solo los años con cantidad. Los 48 períodos los completa la rutina.
      Periodos: item.Cantidades
        .map((cantidad, indice) => ({
          AnoOffset: indice,
          Mes: item.Mes,
          Cantidad: Number(cantidad) || 0
        }))
        .filter(periodo => periodo.Cantidad > 0)
    }));

    this.guardando = true;
    this.pasoGuardar = 'Registrando la solicitud…';

    this.cmnService.registrarSolicitud(solicitud, items).subscribe({
      next: (respuesta: any) => {
        if (respuesta?.estado !== 1) {
          this.guardando = false;
          this.pasoGuardar = '';
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible guardar la solicitud.');
          return;
        }

        /* Un borrador NO deja documento en el file server.

           Antes se armaba y se subía el Anexo 3 aquí mismo, y eso adelantaba un
           paso que el flujo tiene aparte: el expediente nacía en BORRADOR pero
           ya con PDF, así que la bandeja ofrecía el icono del Anexo 3 de algo
           que todavía no se había generado, y el aviso prometía un documento
           «guardado en el servidor» que aún no correspondía a ningún estado del
           trámite. El PDF nace con «Generar Anexo 3», que es la transición que
           lo declara hecho.

           La subsanación es el caso contrario: ahí el documento ya existe, se
           corrigió lo observado y ninguna transición posterior lo rehace. */
        if (this.modoEdicion && this.teniaAnexo3) {
          this.subirArchivoAnexo3(respuesta);
          return;
        }

        this.terminarGuardado(respuesta, true);
      },
      error: () => {
        this.guardando = false;
        this.pasoGuardar = '';
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
      }
    });
  }

  /**
   * Después de guardar la solicitud se arma el PDF del Anexo 3, se sube al
   * file server y se registra documento_sistema. Sin ese id el botón de la
   * grilla no tiene qué descargar.
   */
  private subirArchivoAnexo3(registro: any): void {
    this.pasoGuardar = 'Generando el Anexo 3…';

    this.cmnService.obtenerSolicitud(registro.IdSolicitud).subscribe({
      next: (detalle: any) => {
        if (detalle?.estado !== 1) {
          this.terminarGuardado(registro, false,
            detalle?.mensaje
              ? `La solicitud se guardó, pero no fue posible armar el Anexo 3: ${detalle.mensaje}`
              : 'La solicitud se guardó, pero no fue posible armar el Anexo 3.');
          return;
        }

        const definicion = construirAnexo3(detalle);
        const nombre = nombreArchivoAnexo3(detalle);
        this.pasoGuardar = 'Subiendo el Anexo 3 al servidor…';

        this.documentoService.generarYSubir(definicion, nombre, 'cmn').subscribe({
          next: (archivo: any) => {
            const documentoSistema = idDocumentoSistema(archivo?.documento_sistema);
            if (archivo?.estado !== 1 || !documentoSistema) {
              this.terminarGuardado(registro, false,
                archivo?.mensaje || 'La solicitud se guardó, pero no se pudo subir el Anexo 3.');
              return;
            }

            this.pasoGuardar = 'Registrando el archivo…';
            this.cmnService.registrarDocumento(
              registro.IdExpediente,
              'CMN_ANEXO_3_SOLICITUD_MODIFICACION',
              documentoSistema,
              archivo.documento_original,
              { Codigo: detalle.Codigo, Items: detalle.Items?.length || 0 }
            ).subscribe({
              next: (doc: any) => {
                this.terminarGuardado(registro, doc?.estado === 1,
                  doc?.estado === 1
                    ? null
                    : (doc?.mensaje || 'La solicitud se guardó, pero no se registró el archivo del Anexo 3.'));
              },
              error: () => this.terminarGuardado(registro, false,
                'La solicitud se guardó, pero no se registró el archivo del Anexo 3.')
            });
          },
          error: () => this.terminarGuardado(registro, false,
            'La solicitud se guardó, pero no se pudo subir el Anexo 3 al servidor.')
        });
      },
      error: () => this.terminarGuardado(registro, false,
        'La solicitud se guardó, pero no fue posible armar el Anexo 3.')
    });
  }

  private terminarGuardado(registro: any, archivoOk: boolean, aviso?: string | null): void {
    this.guardando = false;
    this.pasoGuardar = '';
    this.abierto = false;
    this.registrado.emit();

    if (archivoOk) {
      this.funciones.mensaje('success',
        this.modoEdicion
          ? (registro.mensaje || `Se actualizó la solicitud ${registro.Codigo}.`)
          : `Se registró la solicitud ${registro.Codigo}. Queda en borrador: puede editarla `
            + 'y, cuando esté conforme, use «Generar Anexo 3» para emitir el documento.');
      return;
    }

    this.funciones.mensaje('warning',
      aviso || `Se guardó la solicitud ${registro.Codigo}, pero el Anexo 3 no quedó en el servidor.`);
  }
}
