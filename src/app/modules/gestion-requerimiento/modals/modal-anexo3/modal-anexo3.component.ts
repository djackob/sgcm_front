import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'ngx-bootstrap/accordion';

import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPedidoComponent } from '../../components/form-pedido/form-pedido.component';
import { RequerimientoService } from '../../services/requerimiento.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../../../shared/funciones/archivo';
import {
  PedidoFormularioRequerimiento,
  RequerimientoDetalle,
  crearPedidoFormularioRequerimiento
} from '../../models/requerimiento.model';
import {
  ACREDITACION_ESTUDIOS,
  AYUDA_FINALIDAD,
  AYUDA_JUSTIFICACION,
  AYUDA_OBJETIVO,
  CONFORMIDAD_FIJA,
  FINALIDAD_COMPLEMENTO,
  FORMA_PAGO_DOCUMENTOS,
  INTRO_ACTIVIDADES,
  INTRO_ENTREGABLES,
  JUSTIFICACION_COMPLEMENTO,
  MARCO_LEGAL,
  MESA_PARTES,
  OBSERVACION_ENTREGABLES,
  OTRAS_CONSIDERACIONES,
  PLAZO_NOTA,
  RECURSOS_PROVEEDOR,
  RESOLUCION_CONTRACTUAL,
  SOLUCION_CONTROVERSIAS,
  TdrLocacion,
  ajustarEntregables,
  crearTdrLocacion,
  diasAcumuladosEntregable,
  plazoEntregables,
  recalcularNombresEntregables,
  textoFormaPago,
  validarActividadesTdr,
  validarEntregablesTdr
} from '../../documentos/anexo3-tdr.plantilla';
import {
  CARPETA_ANEXO_3,
  TIPO_ANEXO_3,
  construirAnexo3Tdr,
  nombreArchivoAnexo3,
  pedidosDesdeDetalle
} from '../../documentos/anexo3.pdfmake';
import { proveedoresDelRequerimiento } from '../../documentos/anexo5.pdfmake';
import { combinarTdr, leerTdrDesdePayload } from '../../documentos/orden-servicio.util';

/**
 * TDR de locación (Anexo 3). Se abre después de registrar el Anexo 5.
 * Los pedidos SIGA se copian del requerimiento y no se vuelven a capturar
 * (REQ-09). Lo que se elabora aquí son las cláusulas, actividades y entregables.
 */
@Component({
  selector: 'app-modal-anexo3-requerimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, AccordionModule, BreadcrumbComponent, FormPedidoComponent],
  templateUrl: './modal-anexo3.component.html',
  styleUrl: './modal-anexo3.component.scss',
})
export class ModalAnexo3RequerimientoComponent implements OnChanges {

  /** Dentro del registro: sin overlay, datos del Anexo 5 congelados. */
  @Input() embebido = false;
  /** Al setearse (pestaña Anexo 3 o tras grabar el Anexo 5) carga el TDR. */
  @Input() idParaAbrir: string | null = null;
  @Output() registrado = new EventEmitter<void>();
  /** Tras grabar con éxito en el flujo de registro (Anexo 5 + Anexo 3). */
  @Output() completado = new EventEmitter<{
    IdRequerimiento: string;
    IdExpediente: string;
    Version: number;
  }>();

  readonly breadcrumb = ['Requerimiento', 'TDR Locadores · Anexo 3'];
  readonly marcoLegal = MARCO_LEGAL;
  readonly finalidadComplemento = FINALIDAD_COMPLEMENTO;
  readonly justificacionComplemento = JUSTIFICACION_COMPLEMENTO;
  readonly introActividades = INTRO_ACTIVIDADES;
  readonly introEntregables = INTRO_ENTREGABLES;
  readonly observacionEntregables = OBSERVACION_ENTREGABLES;
  readonly otrasConsideraciones = OTRAS_CONSIDERACIONES;
  readonly resolucionContractual = RESOLUCION_CONTRACTUAL;
  readonly solucionControversias = SOLUCION_CONTROVERSIAS;
  readonly ayudaFinalidad = AYUDA_FINALIDAD;
  readonly ayudaObjetivo = AYUDA_OBJETIVO;
  readonly ayudaJustificacion = AYUDA_JUSTIFICACION;

  abierto = false;
  cargando = false;
  guardando = false;
  acordeonMarco = true;
  acordeonFinalidad = false;
  acordeonObjetivo = false;
  acordeonJustificacion = false;
  acordeonCaracteristicas = false;
  acordeonEntregables = false;
  acordeonRequisitos = false;
  acordeonConformidad = false;
  acordeonFormaPago = false;
  acordeonLugar = false;
  acordeonOtrasPenalidades = false;
  acordeonOtras = false;
  acordeonResolucion = false;
  acordeonControversias = false;

  detalle: RequerimientoDetalle | null = null;
  tdr: TdrLocacion = crearTdrLocacion({});
  pedidos: PedidoFormularioRequerimiento[] = [];
  cantidadEntregables = 1;
  /** Cantidad de entregables capturada en el Anexo 5. Si es > 0, el TDR no la cambia. */
  cantidadDesdeAnexo5 = 0;

  constructor(
    private requerimientoService: RequerimientoService,
    private documentoService: DocumentoService,
    private funciones: Funciones
  ) { }

  get codigo(): string {
    return this.detalle?.Codigo || '';
  }

  get textoUnidad(): string {
    return [this.detalle?.CentroCosto, this.detalle?.CentroCostoNombre]
      .filter(x => !!x)
      .join(' — ');
  }

  get plazoContrato(): number {
    return Number(this.detalle?.PlazoDias) > 0 ? Number(this.detalle?.PlazoDias) : 0;
  }

  /** Alias: el plazo del Anexo 5 no se recalcula con los entregables. */
  get plazoTotal(): number {
    return this.plazoContrato;
  }

  get cantidadFijaAnexo5(): boolean {
    return this.cantidadDesdeAnexo5 > 0;
  }

  get textoRequisitos(): string {
    const lineas = [
      '7.1.1. Registro Nacional de Proveedores vigente.',
      '7.1.2. No contar con impedimento para contratar con el Estado, según el artículo 30 de la Ley General de Contrataciones Públicas.',
      `7.1.3. Grado de instrucción: ${this.tdr.PerfilProveedor || ''}`,
      `7.1.4. Capacitación requerida: ${this.tdr.Capacitacion || ''}`,
      `7.1.5. Experiencia general mínima: ${this.tdr.ExperienciaGeneral || ''}`
    ];
    if (this.tdr.ExigeExperienciaEspecifica) {
      lineas.push(`7.1.6. Experiencia específica mínima: ${this.tdr.ExperienciaEspecifica || ''}`);
    }
    lineas.push('', ACREDITACION_ESTUDIOS, '', '7.2. Recursos a ser provistos por el/la proveedora', RECURSOS_PROVEEDOR);
    return lineas.join('\n');
  }

  get textoConformidad(): string {
    const base = CONFORMIDAD_FIJA;
    if (!this.tdr.ExigeInformePrevio) {
      return base;
    }
    const quien = (this.tdr.UnidadInforme || '').trim() || '[indicar área o especialista]';
    return `${base}\n\nPrevio a la emisión de la conformidad, se requiere informe técnico / visto bueno de: ${quien}.`;
  }

  onExigeExperienciaEspecifica(): void {
    if (!this.tdr.ExigeExperienciaEspecifica) {
      this.tdr.ExperienciaEspecifica = '';
    }
  }

  onExigeInformePrevio(): void {
    if (!this.tdr.ExigeInformePrevio) {
      this.tdr.UnidadInforme = '';
    }
  }

  get textoFormaPagoVista(): string {
    return `${textoFormaPago(this.tdr.Entregables?.length || 1)}\n\n${FORMA_PAGO_DOCUMENTOS}`;
  }

  get textoPlazo(): string {
    const plazo = this.plazoContrato;
    const linea = plazo
      ? `${plazo} días calendario, contados a partir del día siguiente de la notificación de la orden de servicio o de suscrito el contrato.`
      : PLAZO_NOTA;
    return `10.2. Plazo:\n${linea}\n\n10.3. ${MESA_PARTES}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    const id = changes['idParaAbrir']?.currentValue as string | null | undefined;
    if (this.embebido && id) {
      this.abrir(id);
    }
  }

  abrir(idRequerimiento: string): void {
    this.abierto = true;
    this.cargando = true;
    this.guardando = false;
    this.acordeonMarco = true;
    this.detalle = null;
    this.tdr = crearTdrLocacion({});
    this.pedidos = [crearPedidoFormularioRequerimiento()];
    this.cantidadDesdeAnexo5 = 0;
    this.cantidadEntregables = 1;

    this.requerimientoService.obtenerRequerimiento(idRequerimiento).subscribe({
      next: (detalle: any) => {
        if (detalle?.estado !== 1) {
          this.cargando = false;
          this.abierto = false;
          this.funciones.mensaje('error', detalle?.mensaje || 'No fue posible cargar el requerimiento.');
          return;
        }

        this.detalle = detalle;
        this.pedidos = pedidosDesdeDetalle(detalle);
        if (!this.pedidos.length) {
          const vacio = crearPedidoFormularioRequerimiento();
          vacio.AnoPedido = detalle.AnoEje;
          this.pedidos = [vacio];
        }

        this.requerimientoService.listarDocumento(detalle.IdExpediente).subscribe({
          next: (docs: any) => {
            const lista = this.listaDocumentos(docs);
            const tdrDoc = lista.find((d: any) => d.CodigoTipoDocumento === TIPO_ANEXO_3);
            const previo = leerTdrDesdePayload(tdrDoc?.Payload);
            /* combinarTdr conserva Actividades y Entregables del Payload; el
               merge suelto solo cuidaba Entregables y las actividades
               guardadas no reaparecian al reeditar. */
            this.tdr = combinarTdr(detalle, previo);
            this.tdr.Capacitacion = this.tdr.Capacitacion || '';
            if (this.tdr.ExigeExperienciaEspecifica == null) {
              this.tdr.ExigeExperienciaEspecifica = !!(this.tdr.ExperienciaEspecifica || '').trim();
            }
            if (this.tdr.ExigeInformePrevio == null) {
              this.tdr.ExigeInformePrevio = !!(this.tdr.UnidadInforme || '').trim();
            }
            this.tdr.UnidadConformidad = (detalle.CentroCostoNombre || this.tdr.UnidadConformidad || '').trim();
            this.tdr.Actividades = [...(this.tdr.Actividades || [])];
            this.sincronizarEntregablesConAnexo5();
            this.cargando = false;
          },
          error: () => {
            this.tdr = combinarTdr(detalle, null);
            this.sincronizarEntregablesConAnexo5();
            this.cargando = false;
          }
        });
      },
      error: () => {
        this.cargando = false;
        this.abierto = false;
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
      }
    });
  }

  cerrar(): void {
    if (this.guardando) {
      return;
    }
    this.abierto = false;
  }

  agregarActividad(): void {
    this.tdr.Actividades = [...this.tdr.Actividades, { Descripcion: '' }];
  }

  quitarActividad(indice: number): void {
    this.tdr.Actividades = this.tdr.Actividades.filter((_, i) => i !== indice);
  }

  onCantidadEntregables(): void {
    if (this.cantidadDesdeAnexo5 > 0) {
      queueMicrotask(() => {
        this.cantidadEntregables = this.cantidadDesdeAnexo5;
      });
      return;
    }
    if (!this.tdr.Entregables) {
      this.tdr.Entregables = [];
    }
    ajustarEntregables(this.tdr, this.cantidadEntregables, this.plazoContrato);
    this.tdr.Entregables = this.tdr.Entregables.slice();
    const n = this.tdr.Entregables.length;
    if (Number(this.cantidadEntregables) !== n) {
      queueMicrotask(() => {
        this.cantidadEntregables = n;
      });
    }
  }

  /**
   * Días Calendario = día límite acumulativo (30, 50, 120…), no tramo a sumar.
   * Al editar uno intermedio, el último se fija al plazo del Anexo 5.
   */
  onDiasEntregable(indice: number): void {
    const filas = this.tdr.Entregables || [];
    const n = filas.length;
    if (!n || indice < 0 || indice >= n) {
      return;
    }

    const dia = Math.floor(Number(filas[indice].Dias) || 0);
    filas[indice].Dias = dia > 0 ? dia : 1;

    const plazo = this.plazoContrato;
    if (plazo > 0 && n === 1) {
      filas[0].Dias = plazo;
    } else if (plazo > 0 && n > 1 && indice < n - 1) {
      filas[n - 1].Dias = plazo;
    }

    recalcularNombresEntregables(this.tdr);
    this.tdr.Entregables = filas.slice();
    this.errorCampo['entregables'] = null;
  }

  diasAcumulados(indice: number): number {
    return diasAcumuladosEntregable(this.tdr, indice);
  }

  get sumaDiasEntregables(): number {
    return plazoEntregables(this.tdr);
  }

  get diasEntregablesCuadran(): boolean {
    const plazo = this.plazoContrato;
    return plazo <= 0 || this.sumaDiasEntregables === plazo;
  }

  /** Errores por campo / sección (texto rojo bajo la caja). */
  errorCampo: { [clave: string]: string | null } = {};

  private limpiarErroresCampo(): void {
    this.errorCampo = {};
  }

  private marcarError(clave: string, mensaje: string): void {
    this.errorCampo = { ...this.errorCampo, [clave]: mensaje };
  }

  /**
   * Abre el acordeón de la observación en rojo y lleva el scroll hasta ella
   * (el pie «Grabar» suele quedar lejos de la sección fallida).
   */
  private dirigirAObservacion(clave: string, abrirAcordeon: () => void): void {
    abrirAcordeon();
    setTimeout(() => {
      const nodo = document.getElementById(`tdr-err-${clave}`);
      if (!nodo) {
        return;
      }
      nodo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 280);
  }

  private leerCantidadAnexo5(detalle: any): number {
    const proveedores = proveedoresDelRequerimiento(detalle);
    for (const proveedor of proveedores) {
      const n = Math.floor(Number(proveedor?.CantidadEntregables) || 0);
      if (n > 0) {
        return Math.min(20, n);
      }
    }
    return 0;
  }

  private sincronizarEntregablesConAnexo5(): void {
    this.cantidadDesdeAnexo5 = this.leerCantidadAnexo5(this.detalle);
    if (this.cantidadDesdeAnexo5 > 0) {
      ajustarEntregables(this.tdr, this.cantidadDesdeAnexo5, this.plazoContrato);
      this.tdr.Entregables = (this.tdr.Entregables || []).slice();
      this.cantidadEntregables = this.cantidadDesdeAnexo5;
      return;
    }
    this.cantidadEntregables = this.tdr.Entregables?.length || 1;
  }

  grabar(): void {
    if (!this.detalle || this.guardando) {
      return;
    }

    this.limpiarErroresCampo();

    const errActividades = validarActividadesTdr(this.tdr);
    if (errActividades) {
      this.marcarError('actividades', errActividades);
      this.dirigirAObservacion('actividades', () => { this.acordeonCaracteristicas = true; });
      return;
    }

    if (!(this.tdr.ExperienciaGeneral || '').trim()) {
      this.marcarError('experienciaGeneral', 'Complete la experiencia general mínima (sección 7).');
      this.dirigirAObservacion('experienciaGeneral', () => { this.acordeonRequisitos = true; });
      return;
    }

    if (this.tdr.ExigeExperienciaEspecifica && !(this.tdr.ExperienciaEspecifica || '').trim()) {
      this.marcarError('experienciaEspecifica', 'Marcó experiencia específica: complete el texto o desactive el check.');
      this.dirigirAObservacion('experienciaEspecifica', () => { this.acordeonRequisitos = true; });
      return;
    }

    if (this.tdr.ExigeInformePrevio && !(this.tdr.UnidadInforme || '').trim()) {
      this.marcarError('informePrevio', 'Indique el área o especialista del informe previo / visto bueno.');
      this.dirigirAObservacion('informePrevio', () => { this.acordeonConformidad = true; });
      return;
    }

    const errEntregables = validarEntregablesTdr(this.tdr, this.cantidadDesdeAnexo5, this.plazoContrato);
    if (errEntregables) {
      this.marcarError('entregables', errEntregables);
      this.dirigirAObservacion('entregables', () => { this.acordeonEntregables = true; });
      return;
    }

    const entregablesValidos = (this.tdr.Entregables || []).filter(e => (e.Nombre || '').trim());
    if (entregablesValidos.length === 1 && this.cantidadDesdeAnexo5 !== 1) {
      this.funciones.Mensaje(
        'question',
        'Un solo entregable',
        'La contratación quedará con <b>un único entregable</b>. ¿Desea guardar el Anexo 3 y continuar con la firma de los anexos?',
        (result: any) => {
          if (result.isConfirmed) {
            this.ejecutarGrabado();
          }
        },
        'Sí, guardar',
        'No'
      );
      return;
    }

    this.ejecutarGrabado();
  }

  private ejecutarGrabado(): void {
    if (!this.detalle || this.guardando) {
      return;
    }

    this.tdr.IntroActividades = INTRO_ACTIVIDADES;
    this.guardando = true;
    const definicion = construirAnexo3Tdr(this.detalle, this.tdr, this.pedidos);
    const nombre = nombreArchivoAnexo3(this.detalle);

    this.documentoService.generarYSubir(definicion, nombre, CARPETA_ANEXO_3).subscribe({
      next: (archivo: any) => {
        const documentoSistema = idDocumentoSistema(archivo?.documento_sistema);
        if (archivo?.estado !== 1 || !documentoSistema) {
          this.guardando = false;
          this.funciones.mensaje('error', archivo?.mensaje || 'No se pudo subir el Anexo 3.');
          return;
        }

        this.requerimientoService.registrarDocumento(
          this.detalle!.IdExpediente,
          TIPO_ANEXO_3,
          documentoSistema,
          archivo.documento_original,
          { Codigo: this.detalle!.Codigo, Tdr: this.tdr }
        ).subscribe({
          next: (doc: any) => {
            this.guardando = false;
            if (doc?.estado !== 1) {
              this.funciones.mensaje('error', doc?.mensaje || 'No se registró el Anexo 3.');
              return;
            }
            const codigo = this.detalle?.Codigo;
            const payload = this.detalle
              ? {
                  IdRequerimiento: this.detalle.IdRequerimiento,
                  IdExpediente: this.detalle.IdExpediente,
                  Version: this.detalle.Version
                }
              : null;

            this.abierto = false;
            this.registrado.emit();
            if (this.embebido && payload) {
              this.completado.emit(payload);
            }
            this.funciones.mensaje('success',
              `Se registró el TDR (Anexo 3) del requerimiento ${codigo}.`);
          },
          error: () => {
            this.guardando = false;
            this.funciones.mensaje('error', 'No se registró el archivo del Anexo 3.');
          }
        });
      },
      error: () => {
        this.guardando = false;
        this.funciones.mensaje('error', 'No se pudo subir el Anexo 3 al servidor.');
      }
    });
  }

  private listaDocumentos(docs: any): any[] {
    let lista = docs?.Documentos ?? docs?.documentos ?? [];
    if (typeof lista === 'string') {
      try {
        lista = JSON.parse(lista);
      } catch {
        lista = [];
      }
    }
    return Array.isArray(lista) ? lista : [];
  }
}
