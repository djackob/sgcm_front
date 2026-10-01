import { Directive, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { Funciones } from '../funciones/funciones';
import {
  excedeMaximoSubida,
  mensajeExcedeMaximo,
  textoMaximoSubida
} from '../funciones/archivo';

/**
 * Muestra el tope de subida junto a cada input de archivo y descarta el archivo
 * que lo supera antes de que el (change) del componente lo reciba.
 */
@Directive({
  selector: 'input[type=file]:not([sinTopeVisible])',
  standalone: true
})
export class ArchivoMaximoDirective implements OnInit, OnDestroy {
  private aviso?: HTMLElement;
  private contenedor?: HTMLElement | null;
  private readonly alCambiar = (event: Event) => this.validar(event);

  constructor(
    private el: ElementRef<HTMLInputElement>,
    private funciones: Funciones
  ) {}

  ngOnInit(): void {
    const input = this.el.nativeElement;
    this.contenedor = input.parentElement;
    // Captura en el padre: corre antes que el (change) enlazado en el input.
    this.contenedor?.addEventListener('change', this.alCambiar, true);

    const ancla = (input.closest('label') as HTMLElement | null) || input;
    this.aviso = document.createElement('small');
    this.aviso.className = 'archivo-tope';
    this.aviso.textContent = textoMaximoSubida();
    (ancla.parentElement || ancla).appendChild(this.aviso);
  }

  ngOnDestroy(): void {
    this.contenedor?.removeEventListener('change', this.alCambiar, true);
    this.aviso?.remove();
  }

  private validar(event: Event): void {
    const input = this.el.nativeElement;
    if (event.target !== input) {
      return;
    }
    const pesado = Array.from(input.files || []).find(f => excedeMaximoSubida(f));
    if (!pesado) {
      return;
    }
    event.stopImmediatePropagation();
    event.stopPropagation();
    input.value = '';
    this.funciones.mensaje('warning', mensajeExcedeMaximo(pesado));
  }
}
