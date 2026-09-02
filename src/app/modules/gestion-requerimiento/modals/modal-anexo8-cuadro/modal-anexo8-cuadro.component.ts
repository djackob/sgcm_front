import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs/operators';

import { RequerimientoService } from '../../services/requerimiento.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../../../shared/funciones/archivo';
import { RequerimientoBandeja, RequerimientoDetalle } from '../../models/requerimiento.model';
import {
  BorradorAnexo8,
  CARPETA_ANEXO_8,
  ItemAnexo8,
  PostorAnexo8,
  TIPO_ANEXO_8,
  claveBorradorAnexo8,
  etiquetaDec,
  itemsAnexo8,
  nombreArchivoAnexo8,
  postorVacio,
  postoresIniciales,
  totalItemPostor,
  totalPostor,
  validarAnexo8
} from '../../documentos/anexo8.util';
import { construirAnexo8 } from '../../documentos/anexo8.pdfmake';

@Component({
  selector: 'app-modal-anexo8-cuadro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-anexo8-cuadro.component.html',
  styleUrl: './modal-anexo8-cuadro.component.scss'
})
export class ModalAnexo8CuadroComponent {

  @Output() completado = new EventEmitter<void>();

  abierto = false;
  cargando = false;
  procesando = false;
  paso = '';

  fila: RequerimientoBandeja | null = null;
  detalle: RequerimientoDetalle | null = null;
  items: ItemAnexo8[] = [];
  postores: PostorAnexo8[] = [];
  idAdjudicado = '';
  criterio = '';
  observaciones = '';
  fechaGeneracion = '';

  constructor(
    private requerimientoService: RequerimientoService,
    private documentoService: DocumentoService,
    private funciones: Funciones
  ) { }

  abrir(fila: RequerimientoBandeja): void {
    this.fila = fila;
    this.detalle = null;
    this.items = [];
    this.postores = [];
    this.idAdjudicado = '';
    this.criterio = '';
    this.observaciones = '';
    this.fechaGeneracion = new Date().toISOString().substring(0, 10);
    this.paso = '';
    this.abierto = true;
    this.cargando = true;

    this.requerimientoService.obtenerRequerimiento(fila.IdRequerimiento).subscribe({
      next: (detalle: any) => {
        this.cargando = false;
        if (detalle?.estado === 0) {
          this.abierto = false;
          this.funciones.mensaje('error', detalle?.mensaje || 'No fue posible cargar el expediente.');
          return;
        }
        this.detalle = detalle;
        this.items = itemsAnexo8(detalle);
        this.restaurarBorrador(detalle);
      },
      error: () => {
        this.cargando = false;
        this.abierto = false;
        this.funciones.mensaje('error', 'No fue posible abrir el cuadro de cotizaciones.');
      }
    });
  }

  cerrar(): void {
    if (this.procesando) {
      return;
    }
    this.abierto = false;
  }

  get etiquetaDecTexto(): string {
    return etiquetaDec(this.detalle?.CodigoDec);
  }

  get postorAdjudicado(): PostorAnexo8 | undefined {
    return this.postores.find(p => p.Id === this.idAdjudicado);
  }

  get montoAdjudicado(): number {
    if (!this.postorAdjudicado) {
      return 0;
    }
    return totalPostor(this.items, this.postorAdjudicado);
  }

  totalDe(postor: PostorAnexo8): number {
    return totalPostor(this.items, postor);
  }

  totalCelda(item: ItemAnexo8, postor: PostorAnexo8): number {
    return totalItemPostor(item, postor);
  }

  agregarPostor(): void {
    this.postores = [...this.postores, postorVacio(this.items)];
  }

  quitarPostor(postor: PostorAnexo8): void {
    if (this.postores.length <= 2) {
      this.funciones.mensaje('info', 'El cuadro exige al menos dos postores.');
      return;
    }
    this.postores = this.postores.filter(p => p.Id !== postor.Id);
    if (this.idAdjudicado === postor.Id) {
      this.idAdjudicado = '';
    }
  }

  guardarBorrador(): void {
    if (!this.fila) {
      return;
    }
    const borrador: BorradorAnexo8 = {
      Postores: this.postores,
      IdAdjudicado: this.idAdjudicado,
      Criterio: this.criterio,
      Observaciones: this.observaciones
    };
    localStorage.setItem(claveBorradorAnexo8(this.fila.IdRequerimiento), JSON.stringify(borrador));
    this.funciones.mensaje('success', 'Borrador guardado. El expediente no cambia de estado.');
  }

  generarYFirmar(): void {
    if (!this.detalle || !this.fila || this.procesando) {
      return;
    }
    const error = validarAnexo8(this.items, this.postores, this.idAdjudicado, this.criterio);
    if (error) {
      this.funciones.mensaje('info', error);
      return;
    }

    this.procesando = true;
    this.paso = 'Generando el Anexo 8…';
    const definicion = construirAnexo8(
      this.detalle,
      this.items,
      this.postores,
      this.idAdjudicado,
      this.criterio,
      this.observaciones
    );
    const nombre = nombreArchivoAnexo8(this.detalle);

    this.documentoService.generarYSubir(definicion, nombre, CARPETA_ANEXO_8).pipe(
      switchMap((archivo: any) => {
        const documentoSistema = idDocumentoSistema(archivo?.documento_sistema);
        if (archivo?.estado !== 1 || !documentoSistema) {
          throw new Error(archivo?.mensaje || 'No se pudo subir el Anexo 8.');
        }
        this.paso = 'Registrando el Anexo 8 en el expediente…';
        return this.requerimientoService.registrarDocumento(
          this.fila!.IdExpediente,
          TIPO_ANEXO_8,
          documentoSistema,
          archivo.documento_original || nombre,
          {
            Postores: this.postores,
            IdAdjudicado: this.idAdjudicado,
            Criterio: this.criterio,
            Observaciones: this.observaciones
          }
        );
      }),
      switchMap((alta: any) => {
        if (alta?.estado !== 1) {
          throw new Error(alta?.mensaje || 'No se registró el Anexo 8.');
        }
        if (this.detalle?.CodigoEstado !== 'REQ_CCP_CARGADA') {
          return this.requerimientoService.obtenerRequerimiento(this.fila!.IdRequerimiento);
        }
        this.paso = 'Generando el cuadro de adquisición en SIGA…';
        return this.requerimientoService.ejecutarTransicion(
          this.fila!.IdExpediente,
          'REQ_GENERAR_CUADRO',
          this.detalle.Version ?? this.fila!.Version
        );
      })
    ).subscribe({
      next: (respuesta: any) => {
        this.procesando = false;
        this.paso = '';
        if (respuesta?.estado === 0) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible completar el cuadro.');
          return;
        }
        localStorage.removeItem(claveBorradorAnexo8(this.fila!.IdRequerimiento));
        this.funciones.mensaje(
          'success',
          'Anexo 8 generado. Si el expediente tenía CCP cargada, el cuadro de adquisición quedó encolado hacia SIGA.'
        );
        this.abierto = false;
        this.completado.emit();
      },
      error: (err) => {
        this.procesando = false;
        this.paso = '';
        this.funciones.mensaje('error', err?.message || 'No fue posible generar el Anexo 8.');
      }
    });
  }

  private restaurarBorrador(detalle: RequerimientoDetalle): void {
    const clave = claveBorradorAnexo8(detalle.IdRequerimiento);
    const crudo = localStorage.getItem(clave);
    if (crudo) {
      try {
        const borrador: BorradorAnexo8 = JSON.parse(crudo);
        if (Array.isArray(borrador.Postores) && borrador.Postores.length >= 2) {
          this.postores = borrador.Postores;
          this.idAdjudicado = borrador.IdAdjudicado || '';
          this.criterio = borrador.Criterio || '';
          this.observaciones = borrador.Observaciones || '';
          return;
        }
      } catch {
        /* se arma desde cero */
      }
    }
    this.postores = postoresIniciales(detalle, this.items);
  }
}
