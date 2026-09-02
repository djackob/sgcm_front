import { Component } from '@angular/core';
import { GestionPagoComponent } from '../gestion-pago/gestion-pago.component';

@Component({
  selector: 'app-bandeja-externo',
  standalone: true,
  imports: [GestionPagoComponent],
  template: '<app-gestion-pago />'
})
export class BandejaExternoComponent { }
