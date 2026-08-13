import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalModule } from 'ngx-bootstrap/modal';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { OnlyNumberDirective } from './directives/only-number.directive';
import { CountCharactersDirective } from './directives/count-characters';
import { FormMensajePipe } from './pipes/form-mensaje.pipe';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { ReactiveFormsModule } from '@angular/forms';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { btnWavesDirective } from './directives/btn-waves.directive';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';

@NgModule({
  declarations: [
    FormMensajePipe,
    OnlyNumberDirective,
    CountCharactersDirective,
    btnWavesDirective,
  ],
  imports: [
    CommonModule,
    ModalModule.forRoot(),
    TooltipModule.forRoot(),
    AccordionModule.forRoot(),
    ReactiveFormsModule,
    TabsModule.forRoot(),
    PaginationModule,
    BsDatepickerModule,
  ],
  exports: [
    TooltipModule,
    FormMensajePipe,
    OnlyNumberDirective,
    CountCharactersDirective,
    AccordionModule,
    ReactiveFormsModule,
    btnWavesDirective,
    ModalModule,
    TabsModule,
    PaginationModule,
    BsDatepickerModule,
  ]
})
export class SharedModule { }
