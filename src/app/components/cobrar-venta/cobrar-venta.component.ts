import { Component, Input, OnInit, HostListener } from '@angular/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cobrar-venta',
  templateUrl: './cobrar-venta.component.html',
  styleUrls: ['./cobrar-venta.component.scss']
})
export class CobrarVentaComponent implements OnInit {
  @Input() ventaTotalPesos;
  @Input() cantidadArticulos;
  @Input() idVentaActiva;
  @Input() productosVentaActual;

  formaPago = 1;
  cambio = 0;
  activarBotonAceptar=false;

  @HostListener('document:keydown', ['$event'])
  @HostListener('keydown', ['$event'])

  handleKeyDown(event: any) {
    if(event.code == 'Escape') {
      event.preventDefault();
      event.target.value = '';
      this.cerrarBusqueda();
    }

    if((event.code == 'F1')) {  // F1 Para cobrar la venta e imprimir el ticket
      event.preventDefault();
      this.cobrarEImprimirTicket(); 
    }
  }

  constructor() { }

  ngOnInit(): void {
  }

  cambiarFormaPago(tipo: number) {
    this.formaPago = tipo;
  }

  calcularCambio(event: any) {
    const cambio = event.target.value - this.ventaTotalPesos;
    this.cambio = cambio > 0 ? cambio : 0;
    this.activarBotonAceptar = event.target.value >= this.ventaTotalPesos ? true : false;
  }

  cerrarBusqueda() {
    // this.productosTemp = this.productos;
    // this.ProductoSeleccionado = <ProductoInterface>{}
    this.activarBotonAceptar = false;
    setTimeout(() => {
      Swal.close();
    }, 50);
  }

  cobrarEImprimirTicket() {
    if (this.activarBotonAceptar) {
      this.activarBotonAceptar = false;
      
    // AQUI METER LA LOGICA CUANDO SE COBRE Y SE IMPRIMA EL TICKET
    // GUARDAR EN LAS TABLAS CORRESPONDIENTES, CERRAR LA PESTAÑA DE LA VENTA, ETC
    // AL FINAL SI TODO SALIO CORRECTO MANDAR LLAMAR EL Swal.close() PARA QUE CIERRE EL MODAL

      Swal.close();
    }
  }

}
