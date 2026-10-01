import { ArchivoMaximoDirective } from '../../../../shared/directives/archivo-maximo.directive';
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { RequerimientoService } from '../../services/requerimiento.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { MaestraService } from '../../../../shared/services/maestra.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../../../shared/funciones/archivo';
import { RequerimientoBandeja } from '../../models/requerimiento.model';
import { CARPETA_ANEXO_6, TIPO_ANEXO_6 } from '../../documentos/anexo6.pdfmake';
import { CARPETA_ANEXO_7, TIPO_ANEXO_7 } from '../../documentos/anexo7.pdfmake';

export const TIPO_CV_LOCADOR = 'REQ_CV_LOCADOR';
export const CARPETA_CV_LOCADOR = 'requerimiento';

interface ArchivoCargado {
  documentoSistema: string;
  nombreOriginal: string;
}

@Component({
  selector: 'app-modal-respuesta-locador',
  standalone: true,
  imports: [CommonModule, FormsModule, ArchivoMaximoDirective],
  templateUrl: './modal-respuesta-locador.component.html',
  styleUrl: './modal-respuesta-locador.component.scss'
})
export class ModalRespuestaLocadorComponent {

  @Output() completado = new EventEmitter<RequerimientoBandeja>();
  @Output() reinvitar = new EventEmitter<{ requerimiento: RequerimientoBandeja; observacion: string }>();

  abierto = false;
  procesando = false;
  vistaReenvio = false;
  observacionReenvio = '';
  subiendo: 'anexo6' | 'anexo7' | 'cv' | null = null;
  arrastrando: 'anexo6' | 'anexo7' | 'cv' | null = null;
  paso = '';
  fila: RequerimientoBandeja | null = null;
  archivo6: ArchivoCargado | null = null;
  archivo7: ArchivoCargado | null = null;
  archivoCv: ArchivoCargado | null = null;

  constructor(
    private requerimientoService: RequerimientoService,
    private documentoService: DocumentoService,
    private maestraService: MaestraService,
    private funciones: Funciones
  ) { }

  abrir(fila: RequerimientoBandeja): void {
    this.fila = fila;
    this.archivo6 = null;
    this.archivo7 = null;
    this.archivoCv = null;
    this.paso = '';
    this.vistaReenvio = false;
    this.observacionReenvio = '';
    this.abierto = true;
  }

  cerrar(): void {
    if (this.procesando) {
      return;
    }
    this.vistaReenvio = false;
    this.observacionReenvio = '';
    this.abierto = false;
  }

  urlDescarga(archivo: ArchivoCargado): string {
    const carpeta = archivo === this.archivoCv
      ? CARPETA_CV_LOCADOR
      : archivo === this.archivo7 ? CARPETA_ANEXO_7 : CARPETA_ANEXO_6;
    return this.maestraService.urlDescarga(archivo.documentoSistema, carpeta);
  }

  examinar(zona: 'anexo6' | 'anexo7' | 'cv', input: HTMLInputElement): void {
    input.click();
  }

  onSeleccionado(zona: 'anexo6' | 'anexo7' | 'cv', event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (archivo) {
      this.subir(zona, archivo);
    }
  }

  onDragOver(zona: 'anexo6' | 'anexo7' | 'cv', event: DragEvent): void {
    event.preventDefault();
    this.arrastrando = zona;
  }

  onDragLeave(zona: 'anexo6' | 'anexo7' | 'cv', event: DragEvent): void {
    event.preventDefault();
    if (this.arrastrando === zona) {
      this.arrastrando = null;
    }
  }

  onDrop(zona: 'anexo6' | 'anexo7' | 'cv', event: DragEvent): void {
    event.preventDefault();
    this.arrastrando = null;
    const archivo = event.dataTransfer?.files?.[0];
    if (archivo) {
      this.subir(zona, archivo);
    }
  }

  quitar(zona: 'anexo6' | 'anexo7' | 'cv'): void {
    if (this.procesando) {
      return;
    }
    if (zona === 'anexo6') {
      this.archivo6 = null;
    } else if (zona === 'anexo7') {
      this.archivo7 = null;
    } else {
      this.archivoCv = null;
    }
  }

  solicitarReenvio(): void {
    if (!this.fila || this.procesando) {
      return;
    }
    this.vistaReenvio = true;
    this.observacionReenvio = '';
  }

  cancelarReenvio(): void {
    if (this.procesando) {
      return;
    }
    this.vistaReenvio = false;
    this.observacionReenvio = '';
  }

  confirmarReenvio(): void {
    if (!this.fila || this.procesando) {
      return;
    }
    const fila = this.fila;
    const observacion = (this.observacionReenvio || '').trim();
    this.vistaReenvio = false;
    this.observacionReenvio = '';
    this.abierto = false;
    this.reinvitar.emit({ requerimiento: fila, observacion });
  }

  registrar(): void {
    if (!this.fila || this.procesando) {
      return;
    }
    if (!this.archivo6 || !this.archivo7 || !this.archivoCv) {
      this.funciones.mensaje('info', 'Cargue el Anexo 6, el Anexo 7 y el CV del locador.');
      return;
    }

    this.procesando = true;
    this.paso = 'Registrando la cotización, la declaración jurada y el CV…';

    forkJoin({
      a6: this.requerimientoService.registrarDocumento(
        this.fila.IdExpediente,
        TIPO_ANEXO_6,
        this.archivo6.documentoSistema,
        this.archivo6.nombreOriginal,
        { Origen: 'RESPUESTA_LOCADOR' }
      ),
      a7: this.requerimientoService.registrarDocumento(
        this.fila.IdExpediente,
        TIPO_ANEXO_7,
        this.archivo7.documentoSistema,
        this.archivo7.nombreOriginal,
        { Origen: 'RESPUESTA_LOCADOR' }
      ),
      cv: this.requerimientoService.registrarDocumento(
        this.fila.IdExpediente,
        TIPO_CV_LOCADOR,
        this.archivoCv.documentoSistema,
        this.archivoCv.nombreOriginal,
        { Origen: 'RESPUESTA_LOCADOR' }
      )
    }).subscribe({
      next: (alta) => {
        this.procesando = false;
        this.paso = '';
        if (alta?.a6?.estado !== 1) {
          this.funciones.mensaje('error', alta?.a6?.mensaje || 'No se registró el Anexo 6.');
          return;
        }
        if (alta?.a7?.estado !== 1) {
          this.funciones.mensaje('error', alta?.a7?.mensaje || 'No se registró el Anexo 7.');
          return;
        }
        if (alta?.cv?.estado !== 1) {
          this.funciones.mensaje('error', alta?.cv?.mensaje || 'No se registró el CV del locador.');
          return;
        }
        this.funciones.mensaje(
          'success',
          'Se registró la respuesta del locador (Anexos 6 y 7 y CV). Ya puede iniciar los filtros de idoneidad.'
        );
        this.abierto = false;
        this.completado.emit(this.fila!);
      },
      error: () => {
        this.procesando = false;
        this.paso = '';
        this.funciones.mensaje('error', 'No fue posible registrar los anexos firmados.');
      }
    });
  }

  private subir(zona: 'anexo6' | 'anexo7' | 'cv', archivo: File): void {
    const nombre = archivo.name.toLowerCase();
    const esCv = zona === 'cv';
    const admitido = esCv
      ? /\.(pdf|doc|docx)$/.test(nombre)
      : nombre.endsWith('.pdf');
    if (!admitido) {
      this.funciones.mensaje('info', esCv ? 'El CV debe ser PDF o Word.' : 'Solo se admite PDF.');
      return;
    }
    this.subiendo = zona;
    const carpeta = zona === 'anexo6' ? CARPETA_ANEXO_6
      : zona === 'anexo7' ? CARPETA_ANEXO_7 : CARPETA_CV_LOCADOR;
    this.documentoService.subirArchivo(archivo, carpeta).subscribe({
      next: (respuesta: any) => {
        this.subiendo = null;
        const id = idDocumentoSistema(respuesta?.documento_sistema);
        if (respuesta?.estado !== 1 || !id) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No se pudo subir el PDF.');
          return;
        }
        const item: ArchivoCargado = {
          documentoSistema: id,
          nombreOriginal: respuesta.documento_original || archivo.name
        };
        if (zona === 'anexo6') {
          this.archivo6 = item;
        } else if (zona === 'anexo7') {
          this.archivo7 = item;
        } else {
          this.archivoCv = item;
        }
      },
      error: () => {
        this.subiendo = null;
        this.funciones.mensaje('error', 'No se pudo subir el archivo.');
      }
    });
  }
}
