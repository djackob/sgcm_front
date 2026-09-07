import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MaestraService } from '../../../../shared/services/maestra.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import {
  PedidoFormularioRequerimiento,
  ProveedorFormularioRequerimiento,
  montoTotalProveedor
} from '../../models/requerimiento.model';

export interface UbigeoDepartamento {
  iddpto: string;
  departamento: string;
}

export interface UbigeoProvincia {
  idprov: string;
  provincia: string;
}

export interface UbigeoDistrito {
  iddist: string;
  distrito: string;
}

@Component({
  selector: 'app-form-proveedor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-proveedor.component.html',
  styleUrl: './form-proveedor.component.scss',
})
export class FormProveedorComponent implements OnInit, OnChanges {

  @Input({ required: true }) proveedor!: ProveedorFormularioRequerimiento;
  @Input() indice = 0;
  @Input() total = 1;
  @Input() puedeQuitar = false;
  @Input() pedidos: PedidoFormularioRequerimiento[] = [];
  /** Tope 8 UIT del año; si llega, se valida al tipear monto/entregables. */
  @Input() montoTope: number | null = null;
  /** Suma locación (todos los proveedores). La regla del tope es sobre el total. */
  @Input() montoTotalLocacion = 0;
  /** Aviso de monto venido del padre (p. ej. rechazo VALIDACION_MONTO al guardar). */
  @Input() avisoMontoExterno: string | null = null;

  @Output() quitar = new EventEmitter<void>();
  @Output() montoCambiado = new EventEmitter<void>();

  /**
   * El RUC NO es una opción aquí, y es deliberado.
   *
   * Este combo dice con qué documento se identifica a la PERSONA. El RUC tiene
   * su propio campo, siempre visible, porque se pide en todos los casos —SIGA
   * reconoce al contratista por RUC—; ofrecerlo además como tipo de documento
   * obligaría a capturarlo dos veces y dejaría sin sentido el campo de al lado.
   */
  readonly tiposDocumento = [
    { valor: 'DNI' as const, nombre: 'DNI' },
    { valor: 'CE' as const, nombre: 'Carné de extranjería' }
  ];

  /**
   * Longitud del documento de identidad.
   *
   * El DNI son 8 dígitos, fijos por norma. El carné de extranjería no tiene una
   * longitud única —Migraciones ha emitido de 9 y de 12, y admite letras—, así
   * que 12 es el techo y no una exigencia.
   */
  private readonly LONGITUD_DOCUMENTO: { [tipo: string]: number } = {
    DNI: 8,
    CE: 12
  };

  readonly tiposRegistro = [
    { valor: 'NUEVO' as const, nombre: 'Nuevo' },
    { valor: 'EXISTENTE' as const, nombre: 'Existente' }
  ];

  departamentos: UbigeoDepartamento[] = [];
  provincias: UbigeoProvincia[] = [];
  distritos: UbigeoDistrito[] = [];

  buscandoPersona = false;
  private dniConsultado = '';

  buscandoEmpresa = false;
  private rucConsultado = '';

  avisoEmail = '';
  avisoEmailError = false;
  sugerenciasEmail: string[] = [];
  /** Vista con comas de miles; el modelo `MontoMensual` sigue siendo número. */
  montoMensualVista = '';
  /** Mensajes bajo cada caja al validar obligatoriedad. */
  errorCampo: Record<string, string> = {};
  /** Chips fijos bajo el campo, al estilo del teclado móvil. */
  readonly chipsDominioEmail = [
    '@anin.gob.pe',
    '@gmail.com',
    '@outlook.com',
    '@hotmail.com',
    '@icloud.com',
    '@yahoo.com'
  ] as const;
  private readonly dominiosEmail = [
    'anin.gob.pe', 'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'
  ];

  constructor(
    private maestraService: MaestraService,
    private funciones: Funciones,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.aplicarPedidoPorDefecto();
    this.cargarDepartamentos();
    this.sincronizarMontoMensualVista();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pedidos']) {
      queueMicrotask(() => this.aplicarPedidoPorDefecto());
    }
    if (changes['proveedor']) {
      this.sincronizarMontoMensualVista();
    }
  }

  get prefijo(): string {
    return `proveedor-${this.indice}`;
  }

  get montoTotal(): number {
    return montoTotalProveedor(this.proveedor);
  }

  /**
   * Aviso flotante bajo Monto Mensual: el total (mensual × entregables, o la
   * suma de locadores) supera las ocho UIT. Solo si hay cifras que calcular.
   */
  get avisoTopeUit(): string | null {
    if (this.avisoMontoExterno) {
      return this.avisoMontoExterno;
    }
    if (this.montoTope == null || !(this.montoTotalLocacion > this.montoTope)) {
      return null;
    }
    if (!(this.montoTotal > 0)) {
      return null;
    }
    const monto = this.formatearMonto(this.montoTotalLocacion);
    const tope = this.formatearMonto(this.montoTope);
    return `El cálculo monto mensual por entregables (S/ ${monto}) supera el tope de ocho UIT (S/ ${tope}). Una contratación mayor no se tramita por esta vía.`;
  }

  onMontoOEntregablesChange(): void {
    this.limpiarError('entregables');
    this.limpiarError('montoMensual');
    this.montoCambiado.emit();
    this.cdr.detectChanges();
  }

  alCambiarMontoMensual(texto: string): void {
    this.montoMensualVista = texto;
    this.proveedor.MontoMensual = this.parsearMontoVista(texto);
    this.limpiarError('montoMensual');
    this.onMontoOEntregablesChange();
  }

  /** Marca todos los faltantes y devuelve true si el formulario está completo. */
  marcarErroresObligatorios(): boolean {
    this.errorCampo = this.calcularErroresObligatorios();
    if (this.errorCampo['email']) {
      this.avisoEmail = this.errorCampo['email'];
      this.avisoEmailError = true;
    }
    this.cdr.detectChanges();
    return Object.keys(this.errorCampo).length === 0;
  }

  limpiarErrores(): void {
    this.errorCampo = {};
    this.cdr.detectChanges();
  }

  limpiarError(clave: string): void {
    if (!this.errorCampo[clave]) {
      return;
    }
    const siguiente = { ...this.errorCampo };
    delete siguiente[clave];
    this.errorCampo = siguiente;
  }

  private calcularErroresObligatorios(): Record<string, string> {
    const e: Record<string, string> = {};
    const obligatorio = 'Campo obligatorio.';

    if (!(this.proveedor.TipoDocumento || '').trim()) {
      e['tipoDocumento'] = obligatorio;
    }

    const doc = (this.proveedor.Dni || '').trim();
    if (!doc) {
      e['dni'] = obligatorio;
    } else if (this.proveedor.TipoDocumento === 'DNI' && doc.length !== 8) {
      e['dni'] = 'Debe tener 8 dígitos.';
    }

    const ruc = String(this.proveedor.Ruc || '').replace(/\D/g, '');
    if (!ruc) {
      e['ruc'] = obligatorio;
    } else if (ruc.length !== 11) {
      e['ruc'] = 'Debe tener 11 dígitos.';
    }

    if (!(this.proveedor.TipoRegistro || '').trim()) {
      e['tipoRegistro'] = obligatorio;
    }

    if (this.modoRazonSocial) {
      if (!(this.proveedor.RazonSocial || '').trim()) {
        e['razonSocial'] = obligatorio;
      }
    } else {
      if (!(this.proveedor.Nombres || '').trim()) {
        e['nombres'] = obligatorio;
      }
      if (!(this.proveedor.ApellidoPaterno || '').trim()) {
        e['apellidoPaterno'] = obligatorio;
      }
      if (!(this.proveedor.ApellidoMaterno || '').trim()) {
        e['apellidoMaterno'] = obligatorio;
      }
    }

    if (!(this.proveedor.Direccion || '').trim()) {
      e['direccion'] = obligatorio;
    }
    if (!(this.proveedor.CodDepartamento || '').trim()) {
      e['departamento'] = obligatorio;
    }
    if (!(this.proveedor.CodProvincia || '').trim()) {
      e['provincia'] = obligatorio;
    }
    if (!(this.proveedor.CodDistrito || '').trim()) {
      e['distrito'] = obligatorio;
    }
    if (!(this.proveedor.Celular || '').trim()) {
      e['celular'] = obligatorio;
    }
    if (!(Number(this.proveedor.CantidadEntregables) > 0)) {
      e['entregables'] = obligatorio;
    }
    if (!(Number(this.proveedor.MontoMensual) > 0)) {
      e['montoMensual'] = obligatorio;
    }
    if (!(this.proveedor.NumeroPedido || '').trim()) {
      e['pedido'] = obligatorio;
    }

    const email = (this.proveedor.Email || '').trim();
    if (!email) {
      e['email'] = obligatorio;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
      e['email'] = 'Revise la sintaxis del correo (ej. nombre@anin.gob.pe).';
    }

    return e;
  }

  alSalirMontoMensual(): void {
    this.sincronizarMontoMensualVista();
  }

  private sincronizarMontoMensualVista(): void {
    const v = this.proveedor?.MontoMensual;
    if (v == null || !Number.isFinite(Number(v))) {
      this.montoMensualVista = '';
      return;
    }
    this.montoMensualVista = Number(v).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  /** Quita comas de miles; el punto es decimal. Devuelve null si está vacío. */
  private parsearMontoVista(texto: string): number | null {
    const t = (texto || '').trim();
    if (!t) {
      return null;
    }
    const limpio = t.replace(/,/g, '').replace(/[^\d.]/g, '');
    if (!limpio) {
      return null;
    }
    const partes = limpio.split('.');
    const normalizado = partes.length > 2
      ? `${partes[0]}.${partes.slice(1).join('')}`
      : limpio;
    const n = Number(normalizado);
    return Number.isFinite(n) ? n : null;
  }

  private formatearMonto(valor: number): string {
    return (Number(valor) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  get pedidosConNumero(): PedidoFormularioRequerimiento[] {
    return (this.pedidos || []).filter(p => !!(p.NumeroPedido || '').trim());
  }

  private aplicarPedidoPorDefecto(): void {
    const numeros = this.pedidosConNumero.map(p => p.NumeroPedido.trim());
    if (numeros.length === 1) {
      this.proveedor.NumeroPedido = numeros[0];
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Documento de identidad                                                 */
  /* ---------------------------------------------------------------------- */

  get esCarneExtranjeria(): boolean {
    return this.proveedor.TipoDocumento === 'CE';
  }

  get etiquetaDocumento(): string {
    return this.esCarneExtranjeria ? 'Carné de extranjería' : 'DNI';
  }

  get longitudDocumento(): number {
    return this.LONGITUD_DOCUMENTO[this.proveedor.TipoDocumento] || 12;
  }

  /**
   * Si la pantalla muestra la razón social en vez de nombres y apellidos.
   *
   * Lo manda el DATO, no una bandera de sesión: en cuanto hay razón social el
   * proveedor está identificado como contribuyente y los tres campos de persona
   * natural sobran. Así también se resuelve la edición de un requerimiento ya
   * guardado, que entra por `@Input` y nunca pasó por la consulta.
   *
   * Se vacía en `onRucChange` cuando se borra el RUC, que es la única forma de
   * volver atrás sin que el campo desaparezca mientras se escribe en él.
   */
  get modoRazonSocial(): boolean {
    return !!String(this.proveedor.RazonSocial || '').trim();
  }

  /**
   * Cambiar de DNI a carné —o al revés— invalida lo consultado.
   *
   * El número anterior deja de corresponder al tipo nuevo, así que se limpia
   * junto con la marca de «ya consultado»; si no, un DNI de 8 dígitos quedaba
   * como carné y RENIEC no se volvía a llamar.
   */
  onTipoDocumentoChange(): void {
    this.dniConsultado = '';
    this.proveedor.Dni = '';
    this.limpiarError('tipoDocumento');
    this.limpiarError('dni');
  }

  onDniChange(): void {
    const soloDigitos = !this.esCarneExtranjeria;
    const limpio = (this.proveedor.Dni || '')
      .replace(soloDigitos ? /\D/g : /[^A-Za-z0-9]/g, '')
      .slice(0, this.longitudDocumento);
    this.proveedor.Dni = limpio;
    this.limpiarError('dni');

    /* El carné no tiene servicio de consulta ni longitud fija: no se dispara. */
    if (this.esCarneExtranjeria) {
      return;
    }
    if (limpio.length === this.longitudDocumento && limpio !== this.dniConsultado) {
      this.buscarPersonaReniec();
    }
  }

  onRucChange(): void {
    const ruc = String(this.proveedor.Ruc || '').replace(/\D/g, '').slice(0, 11);
    this.proveedor.Ruc = ruc;
    this.limpiarError('ruc');

    /* Sin RUC no hay contribuyente que mostrar: se vuelve a los campos de
       persona natural. Es la salida del modo razón social. */
    if (!ruc) {
      this.proveedor.RazonSocial = '';
      this.rucConsultado = '';
      return;
    }

    if (ruc.length === 11 && ruc !== this.rucConsultado) {
      this.buscarEmpresaSunat();
    }
  }

  buscarPersonaReniec(): void {
    if (this.proveedor.TipoDocumento !== 'DNI') {
      return;
    }

    const dni = (this.proveedor.Dni || '').replace(/\D/g, '');
    if (dni.length !== 8) {
      this.funciones.mensaje('info', 'Ingrese un DNI de 8 dígitos para consultar RENIEC.');
      return;
    }
    if (this.buscandoPersona) {
      return;
    }

    this.buscandoPersona = true;
    this.maestraService.consultarInformacionReniec(dni).subscribe({
      next: (rpta: any) => {
        this.buscandoPersona = false;
        const datos = datosReniec(rpta);
        const nombres = (datos.strnombres || '').trim();
        const apellidoPaterno = (datos.strapellidopaterno || '').trim();
        const apellidoMaterno = (datos.strapellidomaterno || '').trim();
        const direccion = (datos.strdireccion || '').trim();
        const ok = datos.strcodigo === '0000' || !!nombres || !!apellidoPaterno;

        if (!ok) {
          this.funciones.mensaje('info', datos.strresultado || 'No se encontró a la persona en RENIEC.');
          this.cdr.detectChanges();
          return;
        }

        this.dniConsultado = dni;
        this.proveedor.Nombres = nombres;
        this.proveedor.ApellidoPaterno = apellidoPaterno;
        this.proveedor.ApellidoMaterno = apellidoMaterno;
        this.proveedor.Direccion = direccion;
        this.cdr.detectChanges();
      },
      error: () => {
        this.buscandoPersona = false;
        this.funciones.mensaje('error', 'No fue posible consultar RENIEC.');
        this.cdr.detectChanges();
      }
    });
  }

  /* ---------------------------------------------------------------------- */
  /* RUC por SUNAT                                                          */
  /* ---------------------------------------------------------------------- */

  /**
   * Trae la razón social del contribuyente y la deja en el formulario.
   *
   * Lo que SUNAT devuelve en `strnombres` va tal cual a `RazonSocial`, sin
   * intentar separarlo en apellidos y nombres. En un RUC 20 eso sería absurdo
   * —«CONSTRUCTORA» de apellido paterno—, y en un RUC 10 tampoco hace falta: la
   * razón social de una persona natural con negocio ES su nombre completo, y así
   * es como figura en la orden de servicio.
   */
  buscarEmpresaSunat(): void {
    const ruc = String(this.proveedor.Ruc || '').replace(/\D/g, '');
    this.proveedor.Ruc = ruc;
    if (ruc.length !== 11) {
      this.funciones.mensaje('info', 'Ingrese un RUC de 11 dígitos para consultar SUNAT.');
      return;
    }
    if (this.buscandoEmpresa) {
      return;
    }

    this.buscandoEmpresa = true;
    this.maestraService.consultarInformacionSunat(ruc).subscribe({
      next: (rpta: any) => {
        this.buscandoEmpresa = false;
        const datos = datosSunat(rpta);
        const razonSocial = String(datos.strnombres || '').trim();
        const direccion = String(datos.strdireccion || '').trim();
        const codigo = String(datos.strcodigo || '').trim();

        if (!razonSocial) {
          /* strcodigo "0" = el bus respondio y el RUC no existe.
             strcodigo "-1" o respuesta vacia = fallo de red/config (antes se
             confundia con "no encontrado" porque UT_Sunat devolvia {}). */
          if (codigo === '0') {
            this.funciones.mensaje('info', 'No se encontró el contribuyente en SUNAT.');
          } else if (codigo === '-1' || !codigo) {
            this.funciones.mensaje('error', this.mensajeErrorSunat(datos.strresultado));
          } else {
            this.funciones.mensaje('info',
              datos.strresultado || 'No se encontró el contribuyente en SUNAT.');
          }
          this.cdr.detectChanges();
          return;
        }

        this.rucConsultado = ruc;
        this.proveedor.RazonSocial = razonSocial;

        /* RUC 10 de persona natural: el DNI va embebido (quita prefijo 10 y
           el dígito verificador). Solo si SUNAT trajo contribuyente; si no
           hubo respuesta no se inventa el documento. */
        const dniDesdeRuc = dniDesdeRucSunat(ruc);
        if (dniDesdeRuc) {
          this.proveedor.TipoDocumento = 'DNI';
          this.proveedor.Dni = dniDesdeRuc;
          this.dniConsultado = dniDesdeRuc;
        }

        if (direccion) {
          this.proveedor.Direccion = direccion;
        }

        /* El ubigeo viene en la misma respuesta. Se aprovecha porque los combos
           de departamento/provincia/distrito son tres pasos encadenados que el
           usuario ya no tiene que dar, y los códigos son los mismos del INEI que
           usan esos combos. */
        this.aplicarUbigeoSunat(datos);

        /* Que esté activo y habido no se pinta bajo el campo: sería texto
           informativo permanente. Solo se avisa cuando NO lo está, que es lo que
           el usuario necesita saber antes de contratar. */
        if (!banderaSunat(datos.stractivo) || !banderaSunat(datos.strhabido)) {
          this.funciones.mensaje('info',
            'El contribuyente no figura activo y habido en SUNAT. Verifique antes de continuar.');
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.buscandoEmpresa = false;
        this.funciones.mensaje('error',
          'SUNAT no respondió a tiempo. Intente nuevamente en unos momentos.');
        this.cdr.detectChanges();
      }
    });
  }

  /** Evita mostrar el texto técnico de cancelación/timeout del HttpClient. */
  private mensajeErrorSunat(detalle: unknown): string {
    const texto = String(detalle || '').trim();
    if (!texto
      || /E\/S|I\/O|anul|cancel|timeout|tiempo de espera/i.test(texto)) {
      return 'SUNAT no respondió a tiempo. Intente nuevamente en unos momentos.';
    }
    return texto;
  }

  onDepartamentoChange(): void {
    const elegido = this.departamentos.find(d => d.iddpto === this.proveedor.CodDepartamento);
    this.proveedor.Departamento = elegido?.departamento || '';
    this.proveedor.CodProvincia = '';
    this.proveedor.Provincia = '';
    this.proveedor.CodDistrito = '';
    this.proveedor.Distrito = '';
    this.provincias = [];
    this.distritos = [];
    if (this.proveedor.CodDepartamento) {
      this.cargarProvincias(this.proveedor.CodDepartamento);
    }
  }

  onProvinciaChange(): void {
    const elegido = this.provincias.find(p => p.idprov === this.proveedor.CodProvincia);
    this.proveedor.Provincia = elegido?.provincia || '';
    this.proveedor.CodDistrito = '';
    this.proveedor.Distrito = '';
    this.distritos = [];
    if (this.proveedor.CodProvincia) {
      this.cargarDistritos(this.proveedor.CodProvincia);
    }
  }

  onDistritoChange(): void {
    const elegido = this.distritos.find(d => d.iddist === this.proveedor.CodDistrito);
    this.proveedor.Distrito = elegido?.distrito || '';
  }

  /**
   * Deja el ubigeo que vino con el RUC y encadena la carga de los combos.
   *
   * `cargarProvincias(dep, true)` con `restaurar` en verdadero es el mismo
   * camino que usa la edición de un requerimiento ya guardado: carga las
   * provincias y, como el código de provincia ya está puesto, sigue con los
   * distritos. Sin ese encadenado los dos combos quedarían vacíos aunque el
   * valor estuviera seleccionado.
   */
  private aplicarUbigeoSunat(datos: {
    strcoddepa?: string; strcodprov?: string; strcoddist?: string;
    strdepartamento?: string; strprovincia?: string; strdistrito?: string;
  }): void {
    const codDepartamento = (datos.strcoddepa || '').trim();
    if (!codDepartamento) {
      return;
    }

    this.proveedor.CodDepartamento = codDepartamento;
    this.proveedor.Departamento = (datos.strdepartamento || '').trim();
    this.proveedor.CodProvincia = (datos.strcodprov || '').trim();
    this.proveedor.Provincia = (datos.strprovincia || '').trim();
    this.proveedor.CodDistrito = (datos.strcoddist || '').trim();
    this.proveedor.Distrito = (datos.strdistrito || '').trim();

    this.provincias = [];
    this.distritos = [];
    this.cargarProvincias(codDepartamento, true);
  }

  private cargarDepartamentos(): void {
    this.maestraService.listarDepartamento().subscribe({
      next: (lista) => {
        this.departamentos = lista;
        if (this.proveedor.CodDepartamento) {
          this.cargarProvincias(this.proveedor.CodDepartamento, true);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.funciones.mensaje('error', 'No fue posible listar los departamentos.');
      }
    });
  }

  private cargarProvincias(iddpto: string, restaurar = false): void {
    this.maestraService.listarProvincia(iddpto).subscribe({
      next: (lista) => {
        this.provincias = lista;
        if (restaurar && this.proveedor.CodProvincia) {
          this.cargarDistritos(this.proveedor.CodProvincia);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.funciones.mensaje('error', 'No fue posible listar las provincias.');
      }
    });
  }

  private cargarDistritos(idprov: string): void {
    this.maestraService.listarDistrito(idprov).subscribe({
      next: (lista) => {
        this.distritos = lista;
        this.cdr.detectChanges();
      },
      error: () => {
        this.funciones.mensaje('error', 'No fue posible listar los distritos.');
      }
    });
  }

  sugerirDominioEmail(): void {
    const valor = (this.proveedor?.Email || '').trim().toLowerCase();
    const at = valor.indexOf('@');
    if (at < 0) {
      this.sugerenciasEmail = [];
      return;
    }
    const local = valor.slice(0, at);
    const parcial = valor.slice(at + 1);
    this.sugerenciasEmail = this.dominiosEmail
      .filter(d => !parcial || d.startsWith(parcial))
      .map(d => `${local}@${d}`);
  }

  /**
   * Concatena el dominio del chip al correo, como en teclados móviles:
   * - «juan» + @gmail.com → juan@gmail.com
   * - «juan@hot» + @gmail.com → juan@gmail.com (reemplaza lo que haya tras @)
   */
  aplicarDominioEmail(sufijo: string): void {
    const valor = String(this.proveedor?.Email || '').trim();
    const dominio = sufijo.startsWith('@') ? sufijo : `@${sufijo}`;
    const at = valor.indexOf('@');
    const local = (at >= 0 ? valor.slice(0, at) : valor).replace(/\s+/g, '');
    this.proveedor.Email = `${local}${dominio}`;
    this.sugerirDominioEmail();
    this.validarEmail();
    this.cdr.detectChanges();
  }

  validarEmail(): void {
    const valor = (this.proveedor?.Email || '').trim();
    this.avisoEmail = '';
    this.avisoEmailError = false;
    if (!valor) {
      this.errorCampo = { ...this.errorCampo, email: 'Campo obligatorio.' };
      this.avisoEmail = 'Campo obligatorio.';
      this.avisoEmailError = true;
      return;
    }
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(valor);
    if (!ok) {
      this.errorCampo = {
        ...this.errorCampo,
        email: 'Revise la sintaxis del correo (ej. nombre@anin.gob.pe).'
      };
      this.avisoEmail = 'Revise la sintaxis del correo (ej. nombre@anin.gob.pe).';
      this.avisoEmailError = true;
      return;
    }
    this.limpiarError('email');
    const dominio = valor.split('@')[1]?.toLowerCase() || '';
    if (this.dominiosEmail.includes(dominio)) {
      this.avisoEmail = '';
      return;
    }
    this.avisoEmail = 'Correo válido. Si es institucional, verifique el dominio.';
  }
}

/**
 * Normaliza la respuesta de SUNAT. Mismo problema que RENIEC: el bus devuelve a
 * veces objeto y a veces el JSON como texto.
 *
 * El contrato real, comprobado contra wssg con el RUC 10429102036, es:
 *
 *   strcodigo, strruc, strnombres, strdireccion, strcoddepa, strcodprov,
 *   strcoddist, strdepartamento, strprovincia, strdistrito,
 *   stractivo ("True"/"False"), strhabido ("True"/"False")
 *
 * La razón social viene en `strnombres` —el mismo nombre de campo que RENIEC usa
 * para el nombre de pila—, y el estado no es un texto sino dos banderas. Se deja
 * escrito porque no es lo que el nombre de los campos hace suponer.
 */
function datosSunat(rpta: any): {
  strnombres?: string;
  strruc?: string;
  strdireccion?: string;
  strcoddepa?: string;
  strcodprov?: string;
  strcoddist?: string;
  strdepartamento?: string;
  strprovincia?: string;
  strdistrito?: string;
  stractivo?: string;
  strhabido?: string;
  strcodigo?: string;
  strresultado?: string;
} {
  if (rpta == null || rpta === '') {
    return {};
  }
  if (typeof rpta === 'string') {
    try {
      return datosSunat(JSON.parse(rpta));
    } catch {
      return {};
    }
  }
  if (typeof rpta !== 'object') {
    return {};
  }
  if ('strnombres' in rpta || 'strruc' in rpta || 'strcodigo' in rpta) {
    return rpta;
  }
  /* Sobre accidental (RootElement / datos / data) si el backend re-serializa. */
  for (const clave of ['RootElement', 'datos', 'data', 'resultado', 'mensaje']) {
    if (rpta[clave] != null && typeof rpta[clave] === 'object') {
      const anidado = datosSunat(rpta[clave]);
      if (anidado.strnombres || anidado.strcodigo || anidado.strruc) {
        return anidado;
      }
    }
  }
  return {};
}

/** "True"/"False" como los manda el bus, no booleanos JSON. */
function banderaSunat(valor: string | undefined): boolean {
  return String(valor || '').trim().toLowerCase() === 'true';
}

/**
 * DNI contenido en un RUC de persona natural (tipo 10): sin los 2 primeros
 * dígitos ni el verificador final. Devuelve null si el RUC no es ese caso.
 */
function dniDesdeRucSunat(ruc: string): string | null {
  const limpio = String(ruc || '').replace(/\D/g, '');
  if (limpio.length !== 11 || !limpio.startsWith('10')) {
    return null;
  }
  return limpio.slice(2, 10);
}

function datosReniec(rpta: any): {
  strnombres?: string;
  strapellidopaterno?: string;
  strapellidomaterno?: string;
  strdireccion?: string;
  strcodigo?: string;
  strresultado?: string;
} {
  if (rpta == null || rpta === '') {
    return {};
  }
  if (typeof rpta === 'string') {
    try {
      return datosReniec(JSON.parse(rpta));
    } catch {
      return {};
    }
  }
  if (typeof rpta !== 'object') {
    return {};
  }
  if ('strnombres' in rpta || 'strapellidopaterno' in rpta || 'strcodigo' in rpta) {
    return rpta;
  }
  return {};
}
