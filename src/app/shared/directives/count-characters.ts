import { Directive, Input, HostListener, ElementRef, OnInit, SimpleChanges } from '@angular/core';

@Directive({
    selector: '[CountCharacters]'
})
export class CountCharactersDirective implements OnInit {


    // @Input('Ruta') Ruta:string=''; 
    ripple: HTMLElement | undefined;
    cantidad_actual: number = 0;
    cantidad_total: number = 0;
    newDiv: any = null;


    constructor(public el: ElementRef) {
        this.ripple = el.nativeElement as HTMLElement;
        let padre = this.ripple.parentNode;
        this.newDiv = document.createElement("div");
        this.newDiv.classList.add("count-characters")
        this.newDiv.innerHTML = "0/0";
        padre?.appendChild(this.newDiv);
    }
    ngOnInit(): void {
        this.cantidad_total = Number(this.ripple?.getAttribute("maxlength"));
        this.cantidad_actual = Number(this.ripple?.nodeValue),
            this.newDiv.innerHTML = this.cantidad_actual + "/" + this.cantidad_total;
    }

    @HostListener('input', ['$event']) onInput(e: any) {
        this.cantidad_actual = Number(e.target.value.length);
        this.newDiv.innerHTML = this.cantidad_actual + "/" + this.cantidad_total;
    }

    @HostListener('change', ['$event'])
    onChange(e: any) {
        this.cantidad_actual = Number(e.target.value.length);
        this.newDiv.innerHTML = this.cantidad_actual + "/" + this.cantidad_total;
    }

    @HostListener("ngModelChange", ["$event"]) onNgModelChange(valor: any) {
        valor=(valor==null)?'':valor;
        this.cantidad_actual = Number(valor.length);
        this.newDiv.innerHTML = this.cantidad_actual + "/" + this.cantidad_total;

    }
}