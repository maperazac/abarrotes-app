import { Component, Input, OnInit } from '@angular/core';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import VentaInterface from 'src/app/interfaces/ventas.interface';
import { VentasService } from 'src/app/services/ventas.service';

@Component({
  selector: 'app-ventas-footer',
  templateUrl: './ventas-footer.component.html',
  styleUrls: ['./ventas-footer.component.scss']
})
export class VentasFooterComponent implements OnInit {

  productosVentaActual: ProductoInterface[];
  cantidadArticulos = 0;
  ventaTotalPesos = 0;
  idVentaActiva;

  constructor(private ventasService: VentasService) { 
  }

  ngOnInit() {
    console.log("oninit del footer")
    this.ventasService.$productosVentaActual.subscribe((valor) => {
      this.productosVentaActual = valor;
      this.cantidadArticulos = 0;
      this.ventaTotalPesos = 0;
      this.productosVentaActual.map(item => {
        this.cantidadArticulos += item.seVende == 2 ? 1 : item.cantidad;
        this.ventaTotalPesos += item.cantidad * item.precioVenta;
      })
    })

    this.ventasService.$idVentaActiva.subscribe((id) => {
      this.idVentaActiva = id;
      // console.log("Venta activa:" ,this.idVentaActiva)
    })  
  }

  crearNuevaVenta() {
    let nuevaVenta = {
      idTemp: this.getRandomInt(1000000, 9999999),
      fecha: new Date(),
      totalVenta: '0',
      totalArticulos: '0',
      tipoPago: 1,
      totalPagadoEfectivo: '0',
      totalPagadoCredito: '0',
      cambio: '0',
      pagoCon: '0',
      idCajero: '0',
      status: '1',
      seleccionada: 1
    }
    this.ventasService.agregarVentaLocalstorage(nuevaVenta);
    this.ventasService.$idVentaActiva.emit(nuevaVenta.idTemp);
  }

  getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
  }

  async eliminarVentaActiva() {
    const ventasActuales = JSON.parse(localStorage.getItem("ventasLS")); // Obtiene el array con todas las ventas actuales en pantalla
    
    this.idVentaActiva = this.ventasService.obtenerVentaActivaLocalStorage(); // Recorre el array de ventas y obtiene la que tenga la propiedad "seleccionada" = 1

    let item = ventasActuales.findIndex(i => i.idTemp === this.idVentaActiva) // Obtiene la posicion en el array de la venta que se va a eliminar.

    await this.ventasService.eliminarVentaLocalStorage(this.idVentaActiva);

    if(item == 0 && ventasActuales.length != 1) { // Si el index que se quiere borrar es el 0 (o sea la primera pestaña) pero no es el unico, la venta activa pasa a el elemento de enseguida, no el anterior, como seria si se quiere eliminar una pestaña que no es la primera
      // this.ventasService.$idVentaActiva.emit(ventasActuales[item + 1].idTemp)
      // this.idVentaActiva = ventasActuales[item + 1].idTemp;
      // ventasActuales[item + 1].seleccionada = 1;
      ventasActuales.forEach((venta, index) => {
        if(index == item + 1) {
          venta.seleccionada = 1;
          this.ventasService.$idVentaActiva.emit(venta.idTemp)
          this.idVentaActiva = venta.idTemp;
          this.ventasService.setVentaActiva(venta.idTemp);
        }
      })
    } else if (ventasActuales.length == 1) { // Significa que era la unica venta en pantalla (la unica pestaña) por lo tanto al borrarla, idVentaActiva se pone en 0
      this.ventasService.$idVentaActiva.emit(0)
      this.idVentaActiva = 0;

    } else { // Si no, quiere decir que habia mas de una, entonces se elimina la activa y se pone como activa la venta que esta una posicion antes en el array
      ventasActuales.forEach((venta, index) => {
        if(index == item - 1) {
          venta.seleccionada = 1;
          this.ventasService.$idVentaActiva.emit(venta.idTemp)
          this.idVentaActiva = venta.idTemp;
        }
      })
    }
  }
}
