import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { SessionService } from '../services/session.service';

@Directive({
  standalone: true,
  selector: '[hasClaim]',
})
export class HasClaimDirective {

  private camposComplementarios: { nombre_accion: string; perfiles: { perfil: string }[] }[] = [];

  constructor(
    private SessionService: SessionService,
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) { }

  private Mostrar(nombre_accion: string) {
    const existe = (this.camposComplementarios.filter(x => x.nombre_accion == nombre_accion && (this.buscar(x.perfiles) > 0)).length > 0);
    if (existe) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

  private buscar(lstResponsablexEstado: any[]): number {
    return lstResponsablexEstado.filter((x: any) => x.perfil === this.SessionService.getUsuario().detalle[0].perfil[0].cod_perfil).length;
  }

  @Input() set hasClaim(obj: any) {
    this.Mostrar(obj.nombre_accion);
  }
}
