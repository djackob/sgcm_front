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

  @Output() quitar = new EventEmitter<void>();

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

  constructor(
    private maestraService: MaestraService,
    private funciones: Funciones,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.aplicarPedidoPorDefecto();
    this.cargarDepartamentos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pedidos']) {
      queueMicrotask(() => this.aplicarPedidoPorDefecto());
    }
  }

  get prefijo(): string {
    return `proveedor-${this.indice}`;
  }

  get montoTotal(): number {
    return montoTotalProveedor(this.proveedor);
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
  }

  onDniChange(): void {
    const soloDigitos = !this.esCarneExtranjeria;
    const limpio = (this.proveedor.Dni || '')
      .replace(soloDigitos ? /\D/g : /[^A-Za-z0-9]/g, '')
      .slice(0, this.longitudDocumento);
    this.proveedor.Dni = limpio;

    /* El carné no tiene servicio de consulta ni longitud fija: no se dispara. */
    if (this.esCarneExtranjeria) {
      return;
    }
    if (limpio.length === this.longitudDocumento && limpio !== this.dniConsultado) {
      this.buscarPersonaReniec();
    }
  }

  onRucChange(): void {
    const ruc = (this.proveedor.Ruc || '').replace(/\D/g, '').slice(0, 11);
    this.proveedor.Ruc = ruc;

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
    const ruc = (this.proveedor.Ruc || '').replace(/\D/g, '');
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
        const razonSocial = (datos.strnombres || '').trim();
        const direccion = (datos.strdireccion || '').trim();

        if (!razonSocial) {
          this.funciones.mensaje('info',
            datos.strresultado || 'No se encontró el contribuyente en SUNAT.');
          this.cdr.detectChanges();
          return;
        }

        this.rucConsultado = ruc;
        this.proveedor.RazonSocial = razonSocial;

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
        this.funciones.mensaje('error', 'No fue posible consultar SUNAT.');
        this.cdr.detectChanges();
      }
    });
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
  return {};
}

/** "True"/"False" como los manda el bus, no booleanos JSON. */
function banderaSunat(valor: string | undefined): boolean {
  return String(valor || '').trim().toLowerCase() === 'true';
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
