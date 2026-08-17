import {
  Component,
  OnInit,
  Input,
  EventEmitter,
  Output,
  SimpleChanges,
  OnChanges,
} from '@angular/core';
import { Funciones } from '../../funciones/funciones';
import { ConfigService } from '../../../core/services/config.service';
import { CommonModule } from '@angular/common';
import { MaestraService } from '../../services/maestra.service';
import { idDocumentoSistema } from '../../funciones/archivo';

@Component({
  selector: 'app-input-archivos',
  templateUrl: './input-archivos.component.html',
  standalone: false,
  styleUrls: ['./input-archivos.component.scss'],
})
export class InputArchivosComponent implements OnInit, OnChanges {
  @Input() idComp: string = '';
  @Input() Value?: string;
  @Input() CodigoArchivo?: string; // Código del archivo para descargar (cuando ya existe) - DEPRECATED: usar ArchivoData
  @Input() ArchivoData?: any; // Objeto que puede contener: GeneradoDocumento, nombre_archivo_generado, codigo_archivo, etc.
  @Input() MensajeMaxSize?: string;
  @Input() Extensiones?: string;
  @Input() IdTipoArchivo: string = '';
  @Output() onChange = new EventEmitter();
  @Input() Descargable: boolean = false;
  @Input() RutaDescarga?: any = null;
  sePuedeDescargar: boolean = false;

  // Para archivo subido
  codigoArchivoSubido: string = '';
  nombreArchivoSubido: string = '';
  mostrarDescargaSubido: boolean = false;

  mosrarMensaje: boolean = false;

  constructor(
    private maestraService: MaestraService,
    private funciones: Funciones
  ) {}

  ngOnInit(): void {
    this.MensajeMaxSize =
      'Máx. ' +
      (ConfigService.settings.MAX_SIZE_UPLOAD / 1024 / 1024).toString() +
      ' MB';
    this.sePuedeDescargar =
      this.RutaDescarga == null ||
      this.RutaDescarga == '' ||
      this.RutaDescarga == undefined
        ? false
        : true;

    // Detectar código de archivo existente de manera genérica
    this.detectarCodigoArchivo();
  }

  /**
   * Detecta el código del archivo de manera genérica desde diferentes fuentes posibles
   * Busca cualquier propiedad que contenga "GeneradoDocumento" como palabra completa
   * (al inicio o al final del nombre del campo)
   */
  private detectarCodigoArchivo(): void {
    if (!this.Descargable) {
      return;
    }

    let codigoEncontrado: string = '';
    let nombreArchivoEncontrado: string = '';

    // 1. Si se pasa ArchivoData (objeto genérico), buscar de manera genérica
    if (this.ArchivoData) {
      // Buscar cualquier propiedad que contenga "GeneradoDocumento" como palabra completa
      // (al inicio: GeneradoDocumento*, al final: *GeneradoDocumento, o exacto: GeneradoDocumento)
      for (const key in this.ArchivoData) {
        if (this.ArchivoData.hasOwnProperty(key)) {
          const keyLower = key.toLowerCase();
          const value = this.ArchivoData[key];

          // Verificar que tenga un valor válido
          if (!value || typeof value !== 'string' || value.trim() === '') {
            continue;
          }

          // Buscar campo que contenga "generadodocumento" como palabra completa
          // Caso 1: Empieza con "generadodocumento" (ej: GeneradoDocumento, GeneradoDocumentoAprobacion)
          // Caso 2: Termina con "generadodocumento" (ej: MiGeneradoDocumento)
          // Caso 3: Es exactamente "generadodocumento"
          const startsWithGenerado = keyLower.startsWith('generadodocumento');
          const endsWithGenerado = keyLower.endsWith('generadodocumento');
          const isExactlyGenerado = keyLower === 'generadodocumento';

          if (startsWithGenerado || endsWithGenerado || isExactlyGenerado) {
            codigoEncontrado = idDocumentoSistema(value);
            break; // Tomar el primero que encuentre
          }
        }
      }

      // Si no se encontró, buscar campos alternativos comunes
      if (!codigoEncontrado) {
        codigoEncontrado = idDocumentoSistema(
          this.ArchivoData.GeneradoDocumento ||
          this.ArchivoData.generado_documento ||
          this.ArchivoData.nombre_archivo_generado ||
          this.ArchivoData.codigo_archivo ||
          this.ArchivoData.codigoArchivo ||
          this.ArchivoData.documento_sistema ||
          ''
        );
      }

      // Buscar nombre del archivo de manera genérica
      // Buscar campos que contengan "NombreDocumento" como palabra completa
      for (const key in this.ArchivoData) {
        if (this.ArchivoData.hasOwnProperty(key)) {
          const keyLower = key.toLowerCase();
          const value = this.ArchivoData[key];

          // Verificar que tenga un valor válido
          if (!value || typeof value !== 'string' || value.trim() === '') {
            continue;
          }

          // Buscar campo que contenga "nombredocumento" como palabra completa
          const startsWithNombre = keyLower.startsWith('nombredocumento');
          const endsWithNombre = keyLower.endsWith('nombredocumento');
          const isExactlyNombre = keyLower === 'nombredocumento';

          // También buscar "nombre_archivo" como alternativa
          const hasNombreArchivo = keyLower.includes('nombre_archivo');

          if (
            startsWithNombre ||
            endsWithNombre ||
            isExactlyNombre ||
            hasNombreArchivo
          ) {
            nombreArchivoEncontrado = value;
            break; // Tomar el primero que encuentre
          }
        }
      }

      // Si no se encontró nombre, buscar campos alternativos comunes
      if (!nombreArchivoEncontrado) {
        nombreArchivoEncontrado =
          this.ArchivoData.NombreDocumento ||
          this.ArchivoData.nombre_archivo ||
          this.ArchivoData.nombreArchivo ||
          '';
      }
    }

    // 2. Si no se encontró y hay CodigoArchivo directo (compatibilidad hacia atrás)
    if (!codigoEncontrado && this.CodigoArchivo) {
      codigoEncontrado = idDocumentoSistema(this.CodigoArchivo);
    }

    // 3. Si se encontró código, configurar para descarga
    if (codigoEncontrado) {
      this.codigoArchivoSubido = codigoEncontrado;
      // Priorizar: Value > nombreArchivoEncontrado > nombre genérico
      this.nombreArchivoSubido = this.Value || nombreArchivoEncontrado || '';
      this.mostrarDescargaSubido = true;
    } else {
      // Si no hay código, limpiar
      this.codigoArchivoSubido = '';
      this.nombreArchivoSubido = '';
      this.mostrarDescargaSubido = false;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['Value'] && this.Value) {
      // Si hay un valor, puede ser un archivo ya subido
      this.nombreArchivoSubido = this.Value;
    }

    // Si cambia ArchivoData o CodigoArchivo, volver a detectar
    if (
      changes['ArchivoData'] ||
      changes['CodigoArchivo'] ||
      changes['Value']
    ) {
      this.detectarCodigoArchivo();
    }
  }

  validarExtensionArchivo(FileEntrada: any): boolean {
    if (!this.Extensiones) return true;
    let extension = FileEntrada.name
      .substring(FileEntrada.name.lastIndexOf('.'))
      .toLowerCase();
    // let extensionesPermitidas = this.Extensiones.split(',');
    const extensionesPermitidas = this.Extensiones.split(',').map(x => x.trim().toLowerCase());
    let existe = extensionesPermitidas.find((x) => x == extension);
    return !!existe;
  }

  validarTamanioArchivo(FileEntrada: any): boolean {
    return FileEntrada.size <= ConfigService.settings.MAX_SIZE_UPLOAD;
  }
  
  pdfSrc: any;
  arrBytes: any;
  lanzarOnChange(event: any) {
    this.mosrarMensaje = true;
    event.sizeOK = true;
    event.extensionOK = true;

    let FileEntrada = event.target.files[0];
    if (FileEntrada) {
      let esArchivoValido = this.validarExtensionArchivo(FileEntrada);

      if (!esArchivoValido) {
        event.extensionOK = false;
        event.uploaded = null;
        event.target.value = '';
        this.mosrarMensaje = false;
        this.funciones.mensaje(
          'warning',
          'Adjuntar tipo de archivo(s) permitido: ' + this.Extensiones
        );
        this.onChange.emit(event);
        return;
      }

      esArchivoValido = this.validarTamanioArchivo(FileEntrada);

      if (!esArchivoValido) {
        event.sizeOK = false;
        event.uploaded = null;
        event.target.value = '';
        this.mosrarMensaje = false;
        this.funciones.mensaje(
          'warning',
          'Por favor verifique el tamaño de su archivo. El máximo es: ' +
            this.funciones.formatBytes(
              ConfigService.settings.MAX_SIZE_UPLOAD,
              0
            )
        );
        this.onChange.emit(event);
        return;
      }

      let InputSalida: HTMLInputElement = document.getElementsByName(
        this.idComp
      )[0] as HTMLInputElement;
      InputSalida.value = FileEntrada.name;

      this.maestraService
        .subirArchivo(FileEntrada, this.IdTipoArchivo)
        .subscribe(
          (response: any) => {
            if (response.estado > 0) {
              event.uploaded = response;
              event.nombre_original_documento = response.documento_original;
              event.generado_nombre_documento = idDocumentoSistema(response.documento_sistema);
              event.nombreArchivo = InputSalida.value;

              // Guardar información para descarga
              this.codigoArchivoSubido = event.generado_nombre_documento;
              this.nombreArchivoSubido =
                response.documento_original || FileEntrada.name;
              this.mostrarDescargaSubido =
                this.Descargable && this.codigoArchivoSubido ? true : false;

              this.onChange.emit(event);
              this.mosrarMensaje = false;
            } else {
              this.funciones.mensaje('warning', response.mensaje);
              event.uploaded = null;
              event.nombreArchivo = null;
              this.codigoArchivoSubido = '';
              this.nombreArchivoSubido = '';
              this.mostrarDescargaSubido = false;
              this.mosrarMensaje = false;
              this.onChange.emit(event);
            }
          },
          () => {
            this.funciones.mensaje(
              'warning',
              'Problemas con el servidor, por favor intente subir su archivo más tarde.'
            );
            event.uploaded = null;
            event.nombreArchivo = null;
            this.codigoArchivoSubido = '';
            this.nombreArchivoSubido = '';
            this.mostrarDescargaSubido = false;
            this.mosrarMensaje = false;
            this.onChange.emit(event);
          }
        );
    }
  }

  descargando: boolean = false;

  descargarArchivoSubido(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.descargando || !this.codigoArchivoSubido) {
      return;
    }

    this.descargando = true;
    this.maestraService.abrirArchivo(
      this.codigoArchivoSubido,
      this.nombreArchivoSubido || 'archivo'
    ).subscribe({
      next: () => {
        this.descargando = false;
      },
      error: () => {
        this.descargando = false;
        this.funciones.mensaje('error', 'Error al momento de descargar el archivo');
      }
    });
  }
}