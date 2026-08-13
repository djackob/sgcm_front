import { Pipe, PipeTransform } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Pipe({
  name: 'formmensaje'
})
export class FormMensajePipe implements PipeTransform {

  transform(valor_del_campo:any, campo:any,err_:any=[],pre:string=''): string {

    let mensaje:string='';
    if(
      campo?.invalid &&
      campo?.errors 
   
      && campo?.touched
    // (campo?.dirty || campo?.touched)      
    ){
      let err=[
        {error:"required",msg:(pre != '')?pre + " es obligatorio":"Dato obligatorio"},
        {error:"pattern",msg:"Formato no válido"},
        {error:"email",msg:"Correo no válido"},
        // {error:"menor_edad",msg:"Persona menor de edad"},
        // {error:"chibolo",msg:"Está chibol@"},
        // {error:"tio",msg:"Está ti@"},
      ];
      err=err.concat(err_);
      let error_econtrado:any=err.find((x:any)=>x.error==Object.keys(campo?.errors)[0]);
      return (error_econtrado!=undefined)?error_econtrado.msg:'Falta establecer mensaje para la validación';
    }
    return mensaje;
  }


}
