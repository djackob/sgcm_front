import { Component } from '@angular/core';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [],
  template: `
    <div class="container-componentes p-3">
      <h2>Bienvenido</h2>
      <p>Sistema de Contrataciones — sesión iniciada correctamente.</p>
    </div>
  `,
})
export class InicioComponent { }
