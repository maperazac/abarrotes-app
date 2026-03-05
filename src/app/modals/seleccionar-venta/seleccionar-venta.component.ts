import { Component, OnInit, HostListener } from '@angular/core';
import { TeclasService } from 'src/app/services/teclas.service';
import { VentasdbService } from 'src/app/services/ventasdb.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-seleccionar-venta',
  templateUrl: './seleccionar-venta.component.html',
  styleUrls: ['./seleccionar-venta.component.scss']
})
export class SeleccionarVentaComponent implements OnInit {

  @HostListener('keydown', ['$event'])

  async handleKeyboardEvent(event: KeyboardEvent) {
    // ***** TODO ESTE BLOQUE TIENE QUE IR EN LOS COMPONENTES DE TODOS LOS CUADROS DE DIALOGO *****
    // Bloquear combinaciones como Control+O
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
      event.preventDefault();
      return;
    }    
    // Si no es una tecla permitida, prevenimos su acción predeterminada
    if (!this.teclas.esTeclaPermitida(event)) {
      event.preventDefault();
    } 
    // **********************************************************************************************

    if((event.code == 'ArrowUp' || event.code == 'ArrowDown')) {  // Flecha arriba para navegacion en la tabla de productos en venta actual
      // event.preventDefault();
      this.navegacionConFlechas(event.code); 
    }

    if((event.code == 'Enter')) {  // Flecha arriba para navegacion en la tabla de productos en venta actual
      // event.preventDefault();
      this.cargando = true;
      let sec = 0;
      let timer = setInterval(() => {
        this.duracionEnSegundos = this.contador(++sec%60);
      }, 1000);
      await this.ventasdbService.setVentaActiva(this.ventaSeleccionadaInterno);
      this.cargando = false;
      clearInterval(timer);
      this.duracionEnSegundos = 0;
      Swal.close();
    }

    if((event.code == 'F5')) {  // Si ya esta abierta esta venta, al presionar F5 se debe prevenir que se recargue la pagina
      event.preventDefault(); 
    }
  }

  cargando = false;
  duracionEnSegundos = 0;

  constructor(private ventasdbService: VentasdbService,
              private teclas: TeclasService
  ) { }

  ventaSeleccionada: number = 0;
  ventaSeleccionadaInterno;
  ventasActuales:  any[] = [];

  ngOnInit(): void {
    this.ventasdbService.$ventasActuales.subscribe(ventas => {
      this.ventasActuales = ventas;
    })

    this.ventasdbService.$idVentaActiva.subscribe((id) => {
      this.ventaSeleccionada = id;
    })  

    this.ventasdbService.$idVentaActivaInterno.subscribe((idInterno) => {
      this.ventaSeleccionadaInterno = idInterno;
    })  

    this.seleccionarVenta(this.ventaSeleccionadaInterno);
  }

  seleccionarVenta(id: number) {
    this.ventaSeleccionadaInterno = id;
  }
  
  // document.getElementById(this.ventaSeleccionada.toString()).click();
  navegacionConFlechas(codigo: string) {
    let actualizado = false;
    let elemento = (<HTMLInputElement>document.querySelector('input[name=ventasRadioSelect]:checked'));
   
    if(elemento){
      this.ventasActuales.forEach((venta, index) => {
        if( venta.id == this.ventaSeleccionadaInterno && !actualizado) {
          if(codigo == 'ArrowDown') {
            if(this.ventasActuales.length > index + 1) {
              let elem = document.getElementById(this.ventasActuales[index + 1].id);
              elem.click();
            } else {
              let elem = document.getElementById(this.ventasActuales[0].id);
              elem.click();
            }
          } else {
            if(index > 0) {
              let elem = document.getElementById(this.ventasActuales[index - 1].id);
              elem.click();
            } else {
              let elem = document.getElementById(this.ventasActuales[this.ventasActuales.length - 1].id);
              elem.click();
            }
          }
          
          actualizado = true;
        }
      });
      // elemento.focus() 
    } else {
      let elemento = (<HTMLInputElement>document.querySelector('input[name=ventasRadioSelect]'))
      if(elemento){
        if(codigo == 'ArrowDown') {
          elemento.click()
        } else {
          let elem = document.getElementById(this.ventasActuales[this.ventasActuales.length - 1].id);
          elem.click();
        }
      }
    }
  }

  contador(valor) {
    return valor > 9 ? valor : '0' + valor;
  }
}
