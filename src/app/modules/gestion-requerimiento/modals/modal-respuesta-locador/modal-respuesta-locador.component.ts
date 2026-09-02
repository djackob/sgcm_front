import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { RequerimientoService } from '../../services/requerimiento.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { MaestraService } from '../../../../shared/services/maestra.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../../../shared/funciones/archivo';
import { RequerimientoBandeja } from '../../models/requerimiento.model';
import { CARPETA_ANEXO_6, TIPO_ANEXO_6 } from '../../documentos/anexo6.pdfmake';
import { CARPETA_ANEXO_7, TIPO_ANEXO_7 } from '../../documentos/anexo7.pdfmake';

interface ArchivoCargado {
  documentoSistema: string;
  nombreOriginal: string;
}

@Component({
  selector: 'app-modal-respuesta-locador',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-respuesta-locador.component.html',
  styleUrl: './modal-respuesta-locador.component.scss'
})
export class ModalRespuestaLocadorComponent {

  @Output() completado = new EventEmitter<RequerimientoBandeja>();
  @Output() reinvitar = new EventEmitter<RequerimientoBandeja>();

  abierto = false;
  procesando = false;
  subiendo: 'anexo6' | 'anexo7' | null = null;
  arrastrando: 'anexo6' | 'anexo7' | null = null;
  paso = '';
  fila: RequerimientoBandeja | null = null;
  archivo6: ArchivoCargado | null = null;
  archivo7: ArchivoCargado | null = null;

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
    this.paso = '';
    this.abierto = true;
  }

  cerrar(): void {
    if (this.procesando) {
      return;
    }
    this.abierto = false;
  }

  urlDescarga(archivo: ArchivoCargado): string {
    return this.maestraService.urlDescarga(archivo.documentoSistema, CARPETA_ANEXO_6);
  }

  examinar(zona: 'anexo6' | 'anexo7', input: HTMLInputElement): void {
    input.click();
  }

  onSeleccionado(zona: 'anexo6' | 'anexo7', event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (archivo) {
      this.subir(zona, archivo);
    }
  }

  onDragOver(zona: 'anexo6' | 'anexo7', event: DragEvent): void {
    event.preventDefault();
    this.arrastrando = zona;
  }

  onDragLeave(zona: 'anexo6' | 'anexo7', event: DragEvent): void {
    event.preventDefault();
    if (this.arrastrando === zona) {
      this.arrastrando = null;
    }
  }

  onDrop(zona: 'anexo6' | 'anexo7', event: DragEvent): void {
    event.preventDefault();
    this.arrastrando = null;
    const archivo = event.dataTransfer?.files?.[0];
    if (archivo) {
      this.subir(zona, archivo);
    }
  }

  quitar(zona: 'anexo6' | 'anexo7'): void {
    if (this.procesando) {
      return;
    }
    if (zona === 'anexo6') {
      this.archivo6 = null;
    } else {
      this.archivo7 = null;
    }
  }

  solicitarReenvio(): void {
    if (!this.fila || this.procesando) {
      return;
    }
    const fila = this.fila;
    this.abierto = false;
    this.reinvitar.emit(fila);
  }

  registrar(): void {
    if (!this.fila || this.procesando) {
      return;
    }
    if (!this.archivo6 || !this.archivo7) {
      this.funciones.mensaje('info', 'Cargue el Anexo 6 y el Anexo 7 firmados por el locador.');
      return;
    }

    this.procesando = true;
    this.paso = 'Registrando la cotización y la declaración jurada…';

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
        this.funciones.mensaje(
          'success',
          'Se registró la respuesta del locador (Anexos 6 y 7). Ya puede iniciar los filtros de idoneidad.'
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

  private subir(zona: 'anexo6' | 'anexo7', archivo: File): void {
    if (!archivo.name.toLowerCase().endsWith('.pdf')) {
      this.funciones.mensaje('info', 'Solo se admite PDF.');
      return;
    }
    this.subiendo = zona;
    const carpeta = zona === 'anexo6' ? CARPETA_ANEXO_6 : CARPETA_ANEXO_7;
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
        } else {
          this.archivo7 = item;
        }
      },
      error: () => {
        this.subiendo = null;
        this.funciones.mensaje('error', 'No se pudo subir el archivo.');
      }
    });
  }
}
