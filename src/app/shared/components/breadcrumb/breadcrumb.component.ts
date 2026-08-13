import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="app-breadcrumb" aria-label="Breadcrumb" *ngIf="items?.length">
      <ol class="app-breadcrumb__list">
        <li
          class="app-breadcrumb__item"
          *ngFor="let item of items; let last = last"
          [class.app-breadcrumb__item--current]="last"
        >
          <span>{{ item }}</span>
          <span class="app-breadcrumb__sep" *ngIf="!last" aria-hidden="true">{{ separator }}</span>
        </li>
      </ol>
    </nav>
  `,
})
export class BreadcrumbComponent {
  /** Segmentos del breadcrumb, ej: ['Área Usuaria', 'Especialista'] */
  @Input() items: string[] = [];
  /** Separador visual entre segmentos */
  @Input() separator = '-';
}
