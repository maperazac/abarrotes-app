import { Component, OnInit, HostListener } from '@angular/core';
import VentaInterface from 'src/app/interfaces/ventas.interface';
import { VentasService } from 'src/app/services/ventas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-seleccionar-venta',
  templateUrl: './seleccionar-venta.component.html',
  styleUrls: ['./seleccionar-venta.component.scss']
})
export class SeleccionarVentaComponent implements OnInit {

  @HostListener('keydown', ['$event'])

  handleKeyDown(event: KeyboardEvent) {
    if((event.code == 'ArrowUp' || event.code == 'ArrowDown')) {  // Flecha arriba para navegacion en la tabla de productos en venta actual
      // event.preventDefault();
      this.navegacionConFlechas(event.code); 
    }

    if((event.code == 'Enter')) {  // Flecha arriba para navegacion en la tabla de productos en venta actual
      // event.preventDefault();
      this.ventasService.setVentaActiva(this.ventaSeleccionada);
      Swal.close();
    }

    if((event.code == 'F5')) {  // Si ya esta abierta esta venta, al presionar F5 se debe prevenir que se recargue la pagina
      event.preventDefault(); 
    }
  }

  constructor(private ventasService: VentasService) { }

  ventaSeleccionada: number = 0;
  ventasActuales: VentaInterface[] = [];

  ngOnInit(): void {
    this.ventasService.$ventasActuales.subscribe(ventas => {
      this.ventasActuales = ventas;
    })

    this.ventasService.$idVentaActiva.subscribe((id) => {
      this.ventaSeleccionada = id;
      // const productosEnVentasActuales: ProductoInterface[] = JSON.parse(localStorage.getItem("productosEnVentasLS"));
      // this.productosVentaActual = productosEnVentasActuales.filter(v => v.ventaId == id);
      
      // this.cantidadArticulos = 0;
      // this.ventaTotalPesos = 0;
      // this.productosVentaActual.map(item => {
      //   this.cantidadArticulos += item.seVende == 2 ? 1 : item.cantidad;
      //   this.ventaTotalPesos += item.cantidad * item.precioVenta;
      // })
    })  


    this.ventasActuales = this.ventasService.obtenerTodasLasVentasActuales();
    this.ventaSeleccionada = this.ventasService.obtenerVentaActivaLocalStorage();

    this.seleccionarVenta(this.ventaSeleccionada);
  }

  seleccionarVenta(id: number) {
    this.ventaSeleccionada = id;
  }
  
  // document.getElementById(this.ventaSeleccionada.toString()).click();
  navegacionConFlechas(codigo: string) {
    let actualizado = false;
    let elemento = (<HTMLInputElement>document.querySelector('input[name=ventasRadioSelect]:checked'));
   
    if(elemento){
      this.ventasActuales.forEach((venta, index) => {
        if( venta.idTemp == this.ventaSeleccionada && !actualizado) {
          if(codigo == 'ArrowDown') {
            if(this.ventasActuales.length > index + 1) {
              let elem = document.getElementById(this.ventasActuales[index + 1].idTemp.toString());
              elem.click();
            } else {
              let elem = document.getElementById(this.ventasActuales[0].idTemp.toString());
              elem.click();
            }
          } else {
            if(index > 0) {
              let elem = document.getElementById(this.ventasActuales[index - 1].idTemp.toString());
              elem.click();
            } else {
              let elem = document.getElementById(this.ventasActuales[this.ventasActuales.length - 1].idTemp.toString());
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
          let elem = document.getElementById(this.ventasActuales[this.ventasActuales.length - 1].idTemp.toString());
          elem.click();
        }
      }
    }
  }
}
