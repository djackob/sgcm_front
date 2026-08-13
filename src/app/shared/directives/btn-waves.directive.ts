import { Directive, Input, HostListener, ElementRef } from '@angular/core';

@Directive({
    selector: '[btnWaves]'
})
export class btnWavesDirective {

    @Input() btnWaves: string = '';//Aca va  ir el codigo del documentos ej: 32124143432 del box
   // @Input('Ruta') Ruta:string=''; 
    ripple:HTMLElement | undefined;

    constructor(public el: ElementRef) {


        this.ripple = el.nativeElement as HTMLElement;

        // document.querySelectorAll('.ripple').forEach(ripple => {
        //     ripple.addEventListener('mousedown', e => {
          

        //     });
        //   });
    }

    @HostListener('mousedown', ['$event']) onMouseDown(e: MouseEvent) {





        let posX = e.pageX - this.ripple!.getBoundingClientRect().left;
        let posY = e.pageY - this.ripple!.getBoundingClientRect().top;
        let buttonWidth = 1.5 * this.ripple!.offsetWidth;
    
        let divRippleEffect = document.createElement('div');
        divRippleEffect.className = 'ripple-effect';
        divRippleEffect.style.width = `${buttonWidth}px`;
        divRippleEffect.style.height = `${buttonWidth}px`;
        divRippleEffect.style.left = `${ posX - (buttonWidth / 2) }px`;
        divRippleEffect.style.top = `${ posY - (buttonWidth / 2) }px`;
    
        this.ripple!.appendChild(divRippleEffect);
    
        window.setTimeout(() => {
            this.ripple?.removeChild(divRippleEffect);
        }, 2000);


        // e.preventDefault();
        // if(this.ruta_real==''){
        //     this.servicio.rutaDocumento(this.LinkNube).subscribe((ruta: any) => {
        //         this.ruta_real=ruta;
        //         window.open(this.ruta_real, '_blank');
        //     });            
        // }
        // else{
        //     window.open(this.ruta_real, '_blank');
        // }
    }
}