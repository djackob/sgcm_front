import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AccordionModule } from 'ngx-bootstrap/accordion';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPedidoComponent } from '../../components/form-pedido/form-pedido.component';
import { FormProveedorComponent } from '../../components/form-proveedor/form-proveedor.component';
import { ModalAnexo3RequerimientoComponent } from '../modal-anexo3/modal-anexo3.component';
import { RequerimientoService } from '../../services/requerimiento.service';
import { SessionService } from '../../../../core/services/session.service';
import { ConfigService } from '../../../../core/services/config.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../../../shared/funciones/archivo';
import {
  construirAnexo5,
  nombreArchivoAnexo5,
  TIPO_ANEXO_5,
  CARPETA_ANEXO_5
} from '../../documentos/anexo5.pdfmake';
import {
  CatalogoSiga,
  ItemFormularioRequerimiento,
  PedidoFormularioRequerimiento,
  PedidoSiga,
  ProveedorFormularioRequerimiento,
  TipoContratacionRequerimiento,
  crearItemFormularioRequerimiento,
  crearPedidoFormularioRequerimiento,
  crearProveedorFormularioRequerimiento,
  montoTotalProveedor
} from '../../models/requerimiento.model';

/**
 * Registro del requerimiento — REQ-01 a REQ-09.
 *
 * El Especialista registra la necesidad y los pedidos SIGA (REQ-12). El
 * documento técnico (Anexo 1 / TDR) se elabora después (REQ-13).
 * Las cuatro validaciones de tope, CMN con adjunto, plazo y coherencia de
 * monto que viven en la rutina: el tope y el monto sí se aplican aquí; el
 * Anexo 1 ya no se exige en este guardado.
 *
 * El tope de ocho UIT sí se muestra, pero como ayuda visual y no como regla: se
 * lee de requerimiento.ParametroAnio a través del maestro, cambia cada año y la
 * que decide es la rutina.
 *
 * EL MONTO NO SE ESCRIBE
 * Es la suma de los ítems. Dejarlo editable permitiría declarar un monto que no
 * corresponde a lo que se va a contratar, y la rutina lo rechazaría igual: es un
 * campo calculado, y se muestra como tal.
 *
 * LOS PEDIDOS SIGA SE ELIGEN DEL MAESTRO PEDIDO
 * El combo se llena con listarMaestroSiga('PEDIDO'). Al elegir un N°,
 * PEDIDO_DETALLE trae la tarea del centro y el resumen de items.
 */
@Component({
  selector: 'app-modal-registro-requerimiento',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AccordionModule,
    BreadcrumbComponent,
    FormPedidoComponent,
    FormProveedorComponent,
    ModalAnexo3RequerimientoComponent
  ],
  templateUrl: './modal-registro.component.html',
  styleUrl: './modal-registro.component.scss',
})
export class ModalRegistroRequerimientoComponent {

  @Output() registrado = new EventEmitter<void>();
  /** Anexo 5 y Anexo 3 guardados; listo para iniciar «Firma especialista». */
  @Output() anexosCompletados = new EventEmitter<{
    IdRequerimiento: string;
    IdExpediente: string;
    Version: number;
  }>();
  /** Locación: el Anexo 5 ya está en el file server; toca abrir el TDR. */
  @Output() anexo5Creado = new EventEmitter<string>();

  @ViewChild('tdrEmbebido') tdrEmbebido?: ModalAnexo3RequerimientoComponent;

  readonly breadcrumb = ['Requerimiento', 'Registro de la necesidad'];
  pestanaTrabajo: 'anexo5' | 'anexo3' = 'anexo5';

  readonly objetos: { valor: TipoContratacionRequerimiento; nombre: string }[] = [
    { valor: 'BIEN', nombre: 'Bien' },
    { valor: 'SERVICIO', nombre: 'Servicio' },
    { valor: 'CONSULTORIA', nombre: 'Consultoría' },
    { valor: 'LOCACION', nombre: 'Locación de servicios' }
  ];

  abierto = false;
  guardando = false;
  cargandoEdicion = false;
  cargandoCmn = false;
  modoEdicion = false;
  idRequerimientoEdicion: string | null = null;
  codigoEdicion = '';

  /* Cabecera */
  anoEje = new Date().getFullYear();
  centroCosto = '';
  centroCostoNombre = '';
  responsable = '';
  cargo = '';

  denominacion = '';
  codigoTipoContratacion: TipoContratacionRequerimiento = 'LOCACION';
  codigoDec: 'ABASTECIMIENTO' | 'DAI' = 'ABASTECIMIENTO';
  condicionCmn: 'INCLUIDO' | 'NO_INCLUIDO' = 'INCLUIDO';
  idSolicitudCmn: string | null = null;
  generadoDocumentoCmn = '';
  nombreDocumentoCmn = '';
  plazoDias: number | null = null;
  fechaInicioPrevisto = '';
  ate = '';
  rucSugerido = '';
  tieneDisponibilidad = false;
  generadoDocumentoDisponibilidad = '';
  nombreDocumentoDisponibilidad = '';
  sustento = '';

  /** Tope de ocho UIT del año. Referencia visual; la regla es de la rutina. */
  montoTope: number | null = null;

  /** Solicitudes CMN finalizadas, para el caso NO_INCLUIDO (REQ-04). */
  solicitudesCmn: { IdSolicitud: string; Codigo: string; CentroCosto: string }[] = [];

  pedidos: PedidoFormularioRequerimiento[] = [];
  pedidosSiga: PedidoSiga[] = [];
  cargandoPedidosSiga = false;
  items: ItemFormularioRequerimiento[] = [];
  proveedores: ProveedorFormularioRequerimiento[] = [];
  acordeonDocumento = true;
  acordeonProveedor = false;

  constructor(
    private requerimientoService: RequerimientoService,
    private sesion: SessionService,
    private documentoService: DocumentoService,
    private funciones: Funciones
  ) { }

  get secEjec(): number {
    return ConfigService.settings?.secEjec || 1750;
  }

  /* ---------------------------------------------------------------------- */
  /* Apertura y cierre                                                      */
  /* ---------------------------------------------------------------------- */

  abrir(centroCosto: string, anoEje: number): void {
    const info = this.sesion.getInfoUsuario();
    const detalle = info?.detalle?.[0];

    this.modoEdicion = false;
    this.idRequerimientoEdicion = null;
    this.codigoEdicion = '';
    this.cargandoEdicion = false;

    this.centroCosto = centroCosto || detalle?.centro_costo || '';
    this.centroCostoNombre = detalle?.dependencia || '';
    this.responsable = [info?.nombre, info?.apellido_paterno].filter(Boolean).join(' ');
    this.cargo = info?.cargo || detalle?.perfil?.[0]?.perfil || '';
    this.anoEje = anoEje || new Date().getFullYear();

    this.limpiarFormulario();
    this.pestanaTrabajo = 'anexo5';
    this.abierto = true;

    this.cargarTope();
    this.cargarPedidosSiga();
  }

  /**
   * Abre el mismo formulario con los datos ya registrados, para subsanar una
   * observación (REQ-27, REQ-28) o para completar un borrador. La subsanación no
   * se limita al punto observado: puede corregir datos generales, pedidos e
   * ítems, y por eso se reabre el formulario entero y no una parte.
   */
  abrirEdicion(idRequerimiento: string): void {
    const info = this.sesion.getInfoUsuario();
    const detalle = info?.detalle?.[0];

    this.modoEdicion = true;
    this.idRequerimientoEdicion = idRequerimiento;
    this.codigoEdicion = '';
    this.cargandoEdicion = true;

    this.centroCosto = detalle?.centro_costo || '';
    this.centroCostoNombre = detalle?.dependencia || '';
    this.responsable = [info?.nombre, info?.apellido_paterno].filter(Boolean).join(' ');
    this.cargo = info?.cargo || detalle?.perfil?.[0]?.perfil || '';

    this.limpiarFormulario();
    this.pestanaTrabajo = 'anexo5';
    this.abierto = true;

    this.requerimientoService.obtenerRequerimiento(idRequerimiento).subscribe({
      next: (respuesta: any) => {
        this.cargandoEdicion = false;
        if (respuesta?.estado !== 1) {
          this.abierto = false;
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible cargar el requerimiento.');
          return;
        }

        this.codigoEdicion = respuesta.Codigo || '';
        this.anoEje = respuesta.AnoEje || this.anoEje;
        this.centroCosto = respuesta.CentroCosto || this.centroCosto;
        this.centroCostoNombre = respuesta.CentroCostoNombre || this.centroCostoNombre;
        this.denominacion = respuesta.Denominacion || '';
        this.codigoTipoContratacion = respuesta.CodigoTipoContratacion || 'LOCACION';
        this.codigoDec = respuesta.CodigoDec || 'ABASTECIMIENTO';
        this.condicionCmn = respuesta.CondicionCmn || 'INCLUIDO';
        this.idSolicitudCmn = respuesta.IdSolicitudCmn || null;
        this.generadoDocumentoCmn = respuesta.GeneradoDocumentoCmn || '';
        this.nombreDocumentoCmn = respuesta.NombreDocumentoCmn || '';
        this.plazoDias = respuesta.PlazoDias ?? null;
        this.fechaInicioPrevisto = (respuesta.FechaInicioPrevisto || '').substring(0, 10);
        this.ate = respuesta.Ate || '';
        this.rucSugerido = respuesta.RucSugerido || '';
        this.tieneDisponibilidad = !!respuesta.TieneDisponibilidad;
        this.generadoDocumentoDisponibilidad = respuesta.GeneradoDocumentoDisponibilidad || '';
        this.nombreDocumentoDisponibilidad = respuesta.NombreDocumentoDisponibilidad || '';
        this.sustento = respuesta.Sustento || '';
        this.pedidos = this.pedidosDesdeDetalle(respuesta.Pedidos || []);
        this.items = this.itemsDesdeDetalle(respuesta.Items || []);
        this.aplicarDatosAdicionales(respuesta.DatosAdicionales);

        this.cargarTope();
        this.cargarPedidosSiga();
        if (this.condicionCmn === 'NO_INCLUIDO') {
          this.cargarSolicitudesCmn();
        }
      },
      error: () => {
        this.cargandoEdicion = false;
        this.abierto = false;
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
      }
    });
  }

  private limpiarFormulario(): void {
    this.denominacion = '';
    this.codigoTipoContratacion = 'LOCACION';
    this.codigoDec = 'ABASTECIMIENTO';
    this.condicionCmn = 'INCLUIDO';
    this.idSolicitudCmn = null;
    this.generadoDocumentoCmn = '';
    this.nombreDocumentoCmn = '';
    this.plazoDias = null;
    this.fechaInicioPrevisto = '';
    this.ate = '';
    this.rucSugerido = '';
    this.tieneDisponibilidad = false;
    this.generadoDocumentoDisponibilidad = '';
    this.nombreDocumentoDisponibilidad = '';
    this.sustento = '';
    this.solicitudesCmn = [];
    this.pedidosSiga = [];
    this.pedidos = [crearPedidoFormularioRequerimiento()];
    this.pedidos[0].AnoPedido = this.anoEje;
    this.items = [crearItemFormularioRequerimiento()];
    this.proveedores = [crearProveedorFormularioRequerimiento()];
    this.acordeonDocumento = true;
    this.acordeonProveedor = false;
  }

  private pedidosDesdeDetalle(filas: any[]): PedidoFormularioRequerimiento[] {
    if (!filas.length) {
      return [crearPedidoFormularioRequerimiento()];
    }

    return filas.map(fila => ({
      NumeroPedido: fila.NumeroPedido || '',
      FechaPedido: (fila.FechaPedido || '').substring(0, 10),
      SecFunc: fila.SecFunc ?? null,
      Origen: fila.Origen || '',
      FuenteFinanc: fila.FuenteFinanc || '',
      Clasificador: fila.Clasificador || '',
      AnoPedido: fila.AnoEje ?? this.anoEje,
      ActividadOperativa: '',
      MetaPresupuestaria: fila.SecFunc != null ? String(fila.SecFunc) : '',
      Programa: '',
      ProdPy: '',
      CodigoItemPedido: '',
      NombreItemPedido: ''
    }));
  }

  private itemsDesdeDetalle(filas: any[]): ItemFormularioRequerimiento[] {
    if (!filas.length) {
      return [crearItemFormularioRequerimiento()];
    }

    return filas.map(fila => {
      const item = crearItemFormularioRequerimiento();
      item.TipoBien = fila.TipoBien || '';
      item.GrupoBien = fila.GrupoBien || '';
      item.ClaseBien = fila.ClaseBien || '';
      item.FamiliaBien = fila.FamiliaBien || '';
      item.ItemBien = fila.ItemBien || '';
      item.DescripcionServicio = fila.DescripcionServicio || '';
      item.UnidadMedida = fila.UnidadMedida ?? null;
      item.UnidadAbreviatura = fila.UnidadAbreviatura || '';
      item.Cantidad = fila.Cantidad ?? null;
      item.PrecioUnitario = fila.PrecioUnitario ?? null;
      item.NumeroPedido = fila.NumeroPedido || '';
      item.CodigoItem = fila.ItemBien ? (fila.CodigoItem || '') : '';
      item.Descripcion = fila.Descripcion || '';
      return item;
    });
  }

  cerrar(): void {
    this.abierto = false;
  }

  /* ---------------------------------------------------------------------- */
  /* Condición frente al CMN (REQ-03, REQ-04)                               */
  /* ---------------------------------------------------------------------- */

  /**
   * Cambiar la condición limpia la evidencia de la anterior: el Anexo 1 de un
   * requerimiento incluido y el Anexo 4 de uno no incluido son documentos
   * distintos, y arrastrar uno al otro caso deja al expediente sustentado con el
   * papel equivocado.
   */
  cambiarCondicionCmn(): void {
    this.idSolicitudCmn = null;
    this.generadoDocumentoCmn = '';
    this.nombreDocumentoCmn = '';

    if (this.condicionCmn === 'NO_INCLUIDO' && this.solicitudesCmn.length === 0) {
      this.cargarSolicitudesCmn();
    }
  }

  private cargarSolicitudesCmn(): void {
    this.cargandoCmn = true;
    this.requerimientoService.listarSolicitudCmnFinalizada(this.anoEje).subscribe({
      next: (respuesta: any) => {
        this.cargandoCmn = false;
        this.solicitudesCmn = (respuesta?.Solicitudes || []).map((s: any) => ({
          IdSolicitud: s.IdSolicitud,
          Codigo: s.Codigo,
          CentroCosto: s.CentroCosto
        }));
      },
      error: () => { this.cargandoCmn = false; }
    });
  }

  cargarPedidosSiga(): void {
    if (!this.centroCosto || !this.anoEje) {
      this.pedidosSiga = [];
      return;
    }

    this.cargandoPedidosSiga = true;
    this.requerimientoService.listarPedidosSiga(
      this.anoEje, this.centroCosto, this.secEjec, this.codigoTipoContratacion
    ).subscribe({
      next: (filas) => {
        this.cargandoPedidosSiga = false;
        this.pedidosSiga = filas || [];
      },
      error: () => {
        this.cargandoPedidosSiga = false;
        this.pedidosSiga = [];
        this.funciones.mensaje('info', 'No fue posible listar los pedidos SIGA.');
      }
    });
  }

  /** El tope de ocho UIT del año, para mostrarlo junto al monto calculado. */
  private cargarTope(): void {
    this.requerimientoService.listarMaestroSiga('PARAMETRO_EJECUTORA_ANIO', {
      AnoEje: this.anoEje, SecEjec: this.secEjec
    }).subscribe({
      next: (r: any) => {
        // El maestro puede no traer el tope: es un dato del módulo, no de SIGA.
        // Si no llega se deja en nulo y la pantalla no muestra la referencia;
        // la regla la aplica la rutina de todos modos.
        this.montoTope = r?.datos?.[0]?.MontoTope ?? null;
      },
      error: () => { this.montoTope = null; }
    });
  }

  private aplicarDatosAdicionales(valor: any): void {
    const extra = this.leerJson(valor);
    const listaProv = extra.Proveedores || extra.proveedores;
    const filasProv = Array.isArray(listaProv) && listaProv.length
      ? listaProv
      : (extra.Proveedor || extra.proveedor ? [extra.Proveedor || extra.proveedor] : []);
    this.proveedores = (filasProv.length ? filasProv : [{}]).map((prov: any) => this.proveedorDesdeExtra(prov));

    const listaPed = extra.PedidosExtra || extra.pedidosExtra;
    const extrasPedido = Array.isArray(listaPed) && listaPed.length
      ? listaPed
      : (extra.Pedido || extra.pedido ? [extra.Pedido || extra.pedido] : []);
    extrasPedido.forEach((pedidoExtra: any, i: number) => {
      if (!this.pedidos[i]) {
        const nuevo = crearPedidoFormularioRequerimiento();
        nuevo.AnoPedido = this.anoEje;
        this.pedidos.push(nuevo);
      }
      this.aplicarExtraPedido(this.pedidos[i], pedidoExtra);
    });
    if (this.pedidos[0] && !extrasPedido.length) {
      this.aplicarExtraPedido(this.pedidos[0], extra.Pedido || extra.pedido || {});
    }
  }

  private proveedorDesdeExtra(prov: any): ProveedorFormularioRequerimiento {
    return {
      ...crearProveedorFormularioRequerimiento(),
      TipoDocumento: prov?.TipoDocumento || 'DNI',
      Dni: prov?.Dni || '',
      Ruc: prov?.Ruc || this.rucSugerido || '',
      TipoRegistro: prov?.TipoRegistro || 'NUEVO',
      Nombres: prov?.Nombres || '',
      RazonSocial: prov?.RazonSocial || '',
      ApellidoPaterno: prov?.ApellidoPaterno || '',
      ApellidoMaterno: prov?.ApellidoMaterno || '',
      Celular: prov?.Celular || '',
      CantidadEntregables: prov?.CantidadEntregables ?? null,
      MontoMensual: prov?.MontoMensual ?? null,
      Email: prov?.Email || '',
      NumeroPedido: prov?.NumeroPedido || '',
      Direccion: prov?.Direccion || '',
      CodDepartamento: prov?.CodDepartamento || '',
      Departamento: prov?.Departamento || '',
      CodProvincia: prov?.CodProvincia || '',
      Provincia: prov?.Provincia || '',
      CodDistrito: prov?.CodDistrito || '',
      Distrito: prov?.Distrito || ''
    };
  }

  private aplicarExtraPedido(pedido: PedidoFormularioRequerimiento, extra: any): void {
    pedido.AnoPedido = extra?.AnoPedido ?? pedido.AnoPedido ?? this.anoEje;
    pedido.ActividadOperativa = extra?.ActividadOperativa || pedido.ActividadOperativa || '';
    pedido.Programa = extra?.Programa || pedido.Programa || '';
    pedido.ProdPy = extra?.ProdPy || pedido.ProdPy || '';
    pedido.CodigoItemPedido = extra?.CodigoItemPedido || pedido.CodigoItemPedido || '';
    pedido.NombreItemPedido = extra?.NombreItemPedido
      || pedido.NombreItemPedido
      || this.items.map(i => i.Descripcion || i.DescripcionServicio).filter(Boolean).join(', ');
    if (!pedido.MetaPresupuestaria && pedido.SecFunc != null) {
      pedido.MetaPresupuestaria = String(pedido.SecFunc);
    }
  }

  private leerJson(valor: any): any {
    if (!valor) {
      return {};
    }
    if (typeof valor === 'string') {
      try {
        return JSON.parse(valor) || {};
      } catch {
        return {};
      }
    }
    return valor;
  }

  get montoProveedorTotal(): number {
    return this.proveedores.reduce((total, p) => total + montoTotalProveedor(p), 0);
  }

  get textoUnidadSesion(): string {
    return [this.centroCosto, this.centroCostoNombre].filter(x => !!x).join(' — ');
  }

  /* ---------------------------------------------------------------------- */
  /* Pedidos SIGA                                                           */
  /* ---------------------------------------------------------------------- */

  agregarPedido(): void {
    const nuevo = crearPedidoFormularioRequerimiento();
    nuevo.AnoPedido = this.anoEje;
    this.pedidos = [...this.pedidos, nuevo];
  }

  /**
   * El N.° Pedido SIGA del proveedor es el mismo combo de Pedidos: si hay uno
   * solo, se copia a todos; si hay varios, solo rellena los que aún están vacíos.
   */
  alSeleccionarPedidoSiga(numero: string): void {
    const elegido = (numero || '').trim();
    const unicos = this.pedidos
      .map(p => (p.NumeroPedido || '').trim())
      .filter(n => !!n);

    this.proveedores.forEach(proveedor => {
      const actual = (proveedor.NumeroPedido || '').trim();
      if (unicos.length === 1) {
        proveedor.NumeroPedido = unicos[0];
        return;
      }
      if (!actual && elegido) {
        proveedor.NumeroPedido = elegido;
      }
    });
  }

  quitarPedido(indice: number): void {
    if (this.pedidos.length === 1) {
      this.funciones.mensaje('info', 'El requerimiento debe vincular al menos un pedido SIGA.');
      return;
    }

    const numero = this.pedidos[indice].NumeroPedido;
    this.pedidos = this.pedidos.filter((_, i) => i !== indice);

    // Los ítems que apuntaban a ese pedido quedan sin pedido, no se borran:
    // el usuario quitó el pedido, no la línea de lo que va a contratar.
    if (numero) {
      this.items.forEach(item => {
        if (item.NumeroPedido === numero) {
          item.NumeroPedido = '';
        }
      });
    }
  }

  agregarProveedor(): void {
    const nuevo = crearProveedorFormularioRequerimiento();
    if (this.pedidos.length === 1) {
      nuevo.NumeroPedido = this.pedidos[0].NumeroPedido || '';
    }
    this.proveedores = [...this.proveedores, nuevo];
    this.acordeonProveedor = true;
  }

  quitarProveedor(indice: number): void {
    if (this.proveedores.length === 1) {
      this.funciones.mensaje('info', 'Debe conservar al menos un proveedor.');
      return;
    }
    this.proveedores = this.proveedores.filter((_, i) => i !== indice);
  }

  get numerosDePedido(): string[] {
    return this.pedidos.map(p => p.NumeroPedido.trim()).filter(n => !!n);
  }

  /* ---------------------------------------------------------------------- */
  /* Ítems                                                                  */
  /* ---------------------------------------------------------------------- */

  agregarItem(): void {
    this.items = [...this.items, crearItemFormularioRequerimiento()];
  }

  quitarItem(indice: number): void {
    if (this.items.length === 1) {
      this.funciones.mensaje('info', 'El requerimiento debe conservar al menos un ítem.');
      return;
    }
    this.items = this.items.filter((_, i) => i !== indice);
  }

  buscarCatalogo(item: ItemFormularioRequerimiento): void {
    const texto = item.textoBusqueda.trim();
    if (texto.length < 3) {
      this.funciones.mensaje('info', 'Escriba al menos tres caracteres de la descripción.');
      return;
    }

    item.buscando = true;
    this.requerimientoService.listarMaestroSiga('CATALOGO', {
      SecEjec: this.secEjec, AnoEje: this.anoEje, Texto: texto, Limite: 25
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

  elegirCatalogo(item: ItemFormularioRequerimiento, fila: CatalogoSiga): void {
    item.CodigoItem = fila.CodigoItem;
    item.Descripcion = fila.Descripcion;
    item.TipoBien = fila.TipoBien;
    item.GrupoBien = fila.GrupoBien;
    item.ClaseBien = fila.ClaseBien;
    item.FamiliaBien = fila.FamiliaBien;
    item.ItemBien = fila.ItemBien;
    item.UnidadMedida = fila.UnidadMedida;
    // Elegir del catálogo excluye la descripción libre: la base exige uno u
    // otro, y tener los dos deja ambiguo qué se está contratando.
    item.DescripcionServicio = '';
    item.PrecioUnitario = item.PrecioUnitario ?? fila.PrecioRef;
    item.resultados = [];
  }

  /**
   * Vuelve la línea a descripción libre. Un servicio o una consultoría puede no
   * estar en el catálogo de bienes, y en ese caso las cinco partes van nulas.
   */
  limpiarCatalogo(item: ItemFormularioRequerimiento): void {
    item.CodigoItem = '';
    item.Descripcion = '';
    item.TipoBien = '';
    item.GrupoBien = '';
    item.ClaseBien = '';
    item.FamiliaBien = '';
    item.ItemBien = '';
    item.UnidadMedida = null;
    item.UnidadAbreviatura = '';
    item.resultados = [];
    item.textoBusqueda = '';
  }

  totalItem(item: ItemFormularioRequerimiento): number {
    return (Number(item.Cantidad) || 0) * (Number(item.PrecioUnitario) || 0);
  }

  /** El monto del requerimiento es la suma de sus ítems, no un campo escribible. */
  get montoTotal(): number {
    const suma = this.items.reduce((total, item) => total + this.totalItem(item), 0);
    return suma > 0 ? suma : this.montoProveedorTotal;
  }

  get excedeTope(): boolean {
    return !!this.montoTope && this.montoTotal > this.montoTope;
  }

  get esLocacion(): boolean {
    return this.codigoTipoContratacion === 'LOCACION';
  }

  mostrarAnexo3(): void {
    if (!this.idRequerimientoEdicion) {
      this.funciones.mensaje('info',
        'Guarde primero el Anexo 5 (propuesta) para que los datos viajen al TDR.');
      return;
    }
    this.pestanaTrabajo = 'anexo3';
    this.tdrEmbebido?.abrir(this.idRequerimientoEdicion);
  }

  alCompletarTdr(payload: { IdRequerimiento: string; IdExpediente: string; Version: number }): void {
    this.abierto = false;
    this.anexosCompletados.emit(payload);
  }

  alRegistrarTdr(): void {
    this.registrado.emit();
  }

  /* ---------------------------------------------------------------------- */
  /* Guardar                                                                */
  /* ---------------------------------------------------------------------- */

  /**
   * Si no hay ítems armados a mano, se toman del pedido (nombre/código) y de
   * cantidad de entregables × monto mensual del proveedor.
   */
  private asegurarItemsDesdeFormulario(): void {
    const hayItemUtil = this.items.some(item =>
      item.ItemBien || item.DescripcionServicio.trim()
    );
    if (hayItemUtil) {
      return;
    }

    const sintetizados: ItemFormularioRequerimiento[] = [];
    this.proveedores.forEach((proveedor, i) => {
      const pedido = this.pedidos.find(p => p.NumeroPedido === proveedor.NumeroPedido)
        || this.pedidos[i]
        || this.pedidos[0];
      const descripcion = (pedido?.NombreItemPedido || this.denominacion).trim();
      const cantidad = Number(proveedor.CantidadEntregables);
      const precio = Number(proveedor.MontoMensual);
      if (!descripcion || !(cantidad > 0) || !(precio > 0)) {
        return;
      }
      const item = crearItemFormularioRequerimiento();
      item.DescripcionServicio = descripcion.slice(0, 350);
      item.Descripcion = descripcion;
      item.Cantidad = cantidad;
      item.PrecioUnitario = precio;
      item.NumeroPedido = (pedido?.NumeroPedido || '').trim();
      sintetizados.push(item);
    });

    if (sintetizados.length) {
      this.items = sintetizados;
    }
  }

  private armarDatosAdicionales(): any {
    const proveedores = this.proveedores.map(p => ({
      ...p,
      MontoTotal: montoTotalProveedor(p)
    }));
    const pedidosExtra = this.pedidos.map(p => ({
      AnoPedido: p.AnoPedido,
      ActividadOperativa: p.ActividadOperativa,
      Programa: p.Programa,
      ProdPy: p.ProdPy,
      CodigoItemPedido: p.CodigoItemPedido,
      NombreItemPedido: p.NombreItemPedido
    }));
    return {
      Proveedores: proveedores,
      Proveedor: proveedores[0] || null,
      PedidosExtra: pedidosExtra,
      Pedido: pedidosExtra[0] || null
    };
  }

  private primerError(): string | null {
    if (!this.centroCosto) {
      return 'Este perfil no tiene centro de costo asociado y no puede registrar requerimientos.';
    }
    if (!this.denominacion.trim()) {
      return 'La denominación de la contratación es obligatoria.';
    }
    if (!this.sustento.trim() && !this.denominacion.trim()) {
      return 'El sustento del requerimiento es obligatorio.';
    }
    if (!this.plazoDias || this.plazoDias <= 0) {
      return 'El plazo de ejecución debe ser mayor que cero.';
    }
    const dniInvalido = this.proveedores.find(p =>
      p.TipoDocumento === 'DNI' && p.Dni && p.Dni.length !== 8
    );
    if (dniInvalido) {
      return 'El DNI del proveedor debe tener 8 dígitos.';
    }

    if (this.numerosDePedido.length === 0) {
      return 'El requerimiento debe vincular al menos un pedido SIGA.';
    }

    this.asegurarItemsDesdeFormulario();

    if (!this.items.some(item => item.ItemBien || item.DescripcionServicio.trim())) {
      return 'Indique el nombre del ítem del pedido y, en el proveedor, la cantidad de entregables y el monto mensual.';
    }
    if (this.montoTotal <= 0) {
      return 'El monto del requerimiento debe ser mayor que cero. Complete entregables y monto mensual.';
    }
    if (this.esLocacion && this.montoTope != null && this.montoProveedorTotal > this.montoTope) {
      return `El cálculo monto mensual × entregables (S/ ${this.montoProveedorTotal.toFixed(2)}) supera el tope de ocho UIT (S/ ${this.montoTope.toFixed(2)}). Una contratación mayor no se tramita por esta vía.`;
    }
    if (this.esLocacion && this.numerosDePedido.length > 1) {
      const sinPedido = this.proveedores.find(p => !(p.NumeroPedido || '').trim());
      if (sinPedido) {
        return 'Cada locador del Anexo 5 debe quedar asociado a su Pedido SIGA.';
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

    const requerimiento: any = {
      AnoEje: this.anoEje,
      SecEjec: this.secEjec,
      CentroCosto: this.centroCosto,
      Denominacion: this.denominacion.trim(),
      CodigoTipoContratacion: this.codigoTipoContratacion,
      CodigoDec: this.codigoDec,
      CondicionCmn: this.condicionCmn,
      IdSolicitudCmn: this.idSolicitudCmn,
      GeneradoDocumentoCmn: this.generadoDocumentoCmn.trim() || null,
      NombreDocumentoCmn: this.nombreDocumentoCmn.trim() || null,
      // El monto viaja calculado: la rutina comprueba que coincida con la suma
      // de los ítems, así que mandar otra cosa sólo produce un rechazo.
      Monto: Number(this.montoTotal.toFixed(2)),
      PlazoDias: Number(this.plazoDias),
      FechaInicioPrevisto: this.fechaInicioPrevisto || null,
      Ate: this.ate.trim() || null,
      RucSugerido: (this.proveedores[0]?.Ruc || this.rucSugerido).trim() || null,
      TieneDisponibilidad: this.tieneDisponibilidad,
      GeneradoDocumentoDisponibilidad: this.generadoDocumentoDisponibilidad.trim() || null,
      NombreDocumentoDisponibilidad: this.nombreDocumentoDisponibilidad.trim() || null,
      Sustento: this.sustento.trim() || this.denominacion.trim(),
      DatosAdicionales: this.armarDatosAdicionales()
    };

    if (this.modoEdicion && this.idRequerimientoEdicion) {
      requerimiento.IdRequerimiento = this.idRequerimientoEdicion;
    }

    const pedidos = this.pedidos
      .filter(p => p.NumeroPedido.trim())
      .map(p => {
        const meta = Number(p.MetaPresupuestaria);
        return {
          AnoEje: p.AnoPedido || this.anoEje,
          SecEjec: this.secEjec,
          NumeroPedido: p.NumeroPedido.trim(),
          FechaPedido: p.FechaPedido || null,
          CentroCosto: this.centroCosto,
          SecFunc: Number.isFinite(meta) && meta > 0 ? meta : (p.SecFunc || null),
          Origen: p.Origen.trim() || null,
          FuenteFinanc: (p.FuenteFinanc || '').trim() || null,
          Clasificador: p.Clasificador.trim() || null
        };
      });

    const items = this.items.map(item => ({
      TipoBien: item.TipoBien || null,
      GrupoBien: item.GrupoBien || null,
      ClaseBien: item.ClaseBien || null,
      FamiliaBien: item.FamiliaBien || null,
      ItemBien: item.ItemBien || null,
      DescripcionServicio: item.ItemBien ? null : (item.DescripcionServicio.trim() || null),
      UnidadMedida: item.UnidadMedida,
      Cantidad: Number(item.Cantidad),
      PrecioUnitario: Number(item.PrecioUnitario),
      NumeroPedido: item.NumeroPedido || null
    }));

    this.guardando = true;

    this.requerimientoService.registrarRequerimiento(requerimiento, pedidos, items).subscribe({
      next: (respuesta: any) => {
        if (respuesta?.estado !== 1) {
          this.guardando = false;
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible guardar el requerimiento.');
          return;
        }

        if (this.codigoTipoContratacion === 'LOCACION' && respuesta.IdRequerimiento) {
          this.subirArchivoAnexo5(respuesta);
          return;
        }

        this.terminarGuardado(respuesta, true);
      },
      error: () => {
        this.guardando = false;
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
      }
    });
  }

  /**
   * El Anexo 5 es el PDF oficial de la propuesta. Se arma con lo ya guardado,
   * se sube al file server y se registra documento_sistema. Sin ese id la
   * bandeja no puede mostrar el archivo.
   */
  private subirArchivoAnexo5(registro: any): void {
    this.requerimientoService.obtenerRequerimiento(registro.IdRequerimiento).subscribe({
      next: (detalle: any) => {
        if (detalle?.estado !== 1) {
          this.terminarGuardado(registro, false,
            detalle?.mensaje
              ? `El requerimiento se guardó, pero no fue posible armar el Anexo 5: ${detalle.mensaje}`
              : 'El requerimiento se guardó, pero no fue posible armar el Anexo 5.');
          return;
        }

        const definicion = construirAnexo5(detalle);
        const nombre = nombreArchivoAnexo5(detalle);

        this.documentoService.generarYSubir(definicion, nombre, CARPETA_ANEXO_5).subscribe({
          next: (archivo: any) => {
            const documentoSistema = idDocumentoSistema(archivo?.documento_sistema);
            if (archivo?.estado !== 1 || !documentoSistema) {
              this.terminarGuardado(registro, false,
                archivo?.mensaje || 'El requerimiento se guardó, pero no se pudo subir el Anexo 5.');
              return;
            }

            this.requerimientoService.registrarDocumento(
              detalle.IdExpediente,
              TIPO_ANEXO_5,
              documentoSistema,
              archivo.documento_original,
              { Codigo: detalle.Codigo }
            ).subscribe({
              next: (doc: any) => {
                this.terminarGuardado(registro, doc?.estado === 1,
                  doc?.estado === 1
                    ? null
                    : (doc?.mensaje || 'El requerimiento se guardó, pero no se registró el archivo del Anexo 5.'));
              },
              error: () => this.terminarGuardado(registro, false,
                'El requerimiento se guardó, pero no se registró el archivo del Anexo 5.')
            });
          },
          error: () => this.terminarGuardado(registro, false,
            'El requerimiento se guardó, pero no se pudo subir el Anexo 5 al servidor.')
        });
      },
      error: () => this.terminarGuardado(registro, false,
        'El requerimiento se guardó, pero no fue posible armar el Anexo 5.')
    });
  }

  private terminarGuardado(registro: any, archivoOk: boolean, aviso?: string | null): void {
    this.guardando = false;
    const eraEdicion = this.modoEdicion;
    if (this.esLocacion && registro?.IdRequerimiento) {
      this.modoEdicion = true;
      this.idRequerimientoEdicion = registro.IdRequerimiento;
      this.codigoEdicion = registro.Codigo || this.codigoEdicion;
      this.registrado.emit();
      if (archivoOk) {
        this.funciones.mensaje('success',
          eraEdicion
            ? (registro.mensaje || `Se actualizó el requerimiento ${registro.Codigo}.`)
            : (registro.mensaje || `Se registró el requerimiento ${registro.Codigo}.`));
        this.mostrarAnexo3();
        return;
      }
      this.funciones.mensaje('warning',
        aviso || `Se guardó el requerimiento ${registro.Codigo}, pero el Anexo 5 no quedó en el servidor.`);
      return;
    }

    this.abierto = false;
    this.registrado.emit();

    if (archivoOk) {
      this.funciones.mensaje('success',
        this.modoEdicion
          ? (registro.mensaje || `Se actualizó el requerimiento ${registro.Codigo}.`)
          : (registro.mensaje || `Se registró el requerimiento ${registro.Codigo}.`));
      return;
    }

    this.funciones.mensaje('warning',
      aviso || `Se guardó el requerimiento ${registro.Codigo}, pero el Anexo 5 no quedó en el servidor.`);
  }
}
