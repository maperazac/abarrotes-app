import { Component, ElementRef, Input, OnInit, ViewChild, HostListener } from '@angular/core';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import VentaInterface from 'src/app/interfaces/ventas.interface';
import { VentasService } from 'src/app/services/ventas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ventas-footer',
  templateUrl: './ventas-footer.component.html',
  styleUrls: ['./ventas-footer.component.scss']
})
export class VentasFooterComponent implements OnInit {

  @HostListener('document:keydown', ['$event'])

  handleKeyDown(event: KeyboardEvent) {
    if((event.code == 'F5')) {  // F5 para abrir el modal para moverse entre las ventas actuales
      event.preventDefault();
      if(this.ventasActuales.length > 1) {
        this.mostrarListaVentas(); 
      }
    }
    if((event.code == 'F12')) {  // F12 para abrir modal para cobrar la venta.
      event.preventDefault();
      this.cobrarVenta(); 
    }

    if((event.code == 'F1')) {  // F12 para abrir modal para cobrar la venta.
      event.preventDefault();
    }
  }

  @ViewChild('modalSeleccionVenta') modalSeleccionVenta: ElementRef;
  @ViewChild('modalCobrarVenta') modalCobrarVenta: ElementRef;
  productosVentaActual: ProductoInterface[];
  cantidadArticulos = 0;
  ventaTotalPesos = 0;
  idVentaActiva;
  ventasActuales;
  inputVentaActualModal: HTMLInputElement;
  pagoConInput: HTMLInputElement;

  constructor(private ventasService: VentasService,
              private el: ElementRef
  ) { 
  }

  ngOnInit() {
    this.ventasService.$productosVentaActual.subscribe((valor) => {
      this.idVentaActiva = this.ventasService.obtenerVentaActivaLocalStorage();
      this.productosVentaActual = valor.filter(p => p.ventaId == this.idVentaActiva);

      this.cantidadArticulos = 0;
      this.ventaTotalPesos = 0;
      this.productosVentaActual.map(item => {
        this.cantidadArticulos += item.seVende == 2 ? 1 : item.cantidad;
        this.ventaTotalPesos += item.cantidad * item.precioVenta;
      })
    })

    this.ventasService.$idVentaActiva.subscribe((id) => {
      this.idVentaActiva = id;
      const productosEnVentasActuales: ProductoInterface[] = JSON.parse(localStorage.getItem("productosEnVentasLS"));
      this.productosVentaActual = productosEnVentasActuales.filter(v => v.ventaId == id);
      
      this.cantidadArticulos = 0;
      this.ventaTotalPesos = 0;
      this.productosVentaActual.map(item => {
        this.cantidadArticulos += item.seVende == 2 ? 1 : item.cantidad;
        this.ventaTotalPesos += item.cantidad * item.precioVenta;
      })
    })  

    this.ventasService.$ventasActuales.subscribe(ventas => {
      this.ventasActuales = ventas;
    })

    this.ventasActuales = this.ventasService.obtenerTodasLasVentasActuales();
    
    this.cargarTotalesIniciales()
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

    await this.ventasService.eliminarVentaLocalStorage(this.idVentaActiva);  // Elimina la venta del localstorage

    // Aqui recorrer el array de productos en la venta actual y eliminar todos los productos ligados a esta venta que se acaba de eliminar
    const productosEnVentasActuales: ProductoInterface[] = JSON.parse(localStorage.getItem("productosEnVentasLS"));
    let productosActualizados = productosEnVentasActuales.filter(prod => prod.ventaId != this.idVentaActiva);
    localStorage.setItem("productosEnVentasLS", JSON.stringify(productosActualizados));
    this.ventasService.$productosVentaActual.emit(productosActualizados);

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

  cargarTotalesIniciales() {
    this.idVentaActiva = this.ventasService.obtenerVentaActivaLocalStorage();
      const productosEnVentasActuales: ProductoInterface[] = JSON.parse(localStorage.getItem("productosEnVentasLS"));
      this.productosVentaActual = productosEnVentasActuales.filter(v => v.ventaId == this.idVentaActiva);
      
      this.cantidadArticulos = 0;
      this.ventaTotalPesos = 0;
      this.productosVentaActual.map(item => {
        this.cantidadArticulos += item.seVende == 2 ? 1 : item.cantidad;
        this.ventaTotalPesos += item.cantidad * item.precioVenta;
      })
  }

  mostrarListaVentas() {
    Swal.fire({
      allowOutsideClick: false,
      html: this.modalSeleccionVenta.nativeElement,
      focusConfirm: false,
      allowEscapeKey: true,
      width: '500px',
      showConfirmButton: true,
      showCancelButton: false,
      allowEnterKey: true,
      confirmButtonText: '<i class="fa fa-check"></i> Enter - Seleccionar venta',
      didOpen:() => {
        const popup = Swal.getPopup()!
        this.inputVentaActualModal = popup.querySelector('#inputVentaActiva')
        // this.inputProductoSeleccionado = popup.querySelector('#inputProductoSeleccionado') as HTMLInputElement
        // this.inputProductoSeleccionado.value='';
        },
      didClose: () => {
        // setTimeout(() => {
        //     const inputCodigoDeProducto = this.el.nativeElement.querySelector("#codigoDeProducto");
        //     inputCodigoDeProducto.focus();
        //   }, 100);
        },
      preConfirm: () => {
        // console.log(inputProductoSeleccionado.value)
      }
    }).then(res=>{
      if(res.isConfirmed) {
        if(this.inputVentaActualModal.value != '') {
          this.ventasService.setVentaActiva(parseInt(this.inputVentaActualModal.value));
        } else {
        }
      } else {
        this.inputVentaActualModal.value = '';
      }    
    })
  }

  cobrarVenta() {
    if (this.ventaTotalPesos <= 0) {
      return;
    }
    Swal.fire({
      allowOutsideClick: false,
      html: this.modalCobrarVenta.nativeElement,
      focusConfirm: false,
      // allowEscapeKey: true,
      width: '700px',
      showConfirmButton: false,
      showCancelButton: false,
      didOpen:() => {
        const popup = Swal.getPopup()!
        this.pagoConInput = popup.querySelector('#pagoCon') as HTMLInputElement
        this.pagoConInput.value='';
        this.pagoConInput.focus();

        // this.inputProductoSeleccionado = popup.querySelector('#inputProductoSeleccionado') as HTMLInputElement
        // this.inputProductoSeleccionado.value='';
        },
      didClose: () => {
        // setTimeout(() => {
        //     const inputCodigoDeProducto = this.el.nativeElement.querySelector("#codigoDeProducto");
        //     inputCodigoDeProducto.focus();
        //   }, 100);
        },
      preConfirm: () => {
        // console.log(inputProductoSeleccionado.value)
      }
    }).then(res=>{
      // NO BORRAR!!!!!!!!!!!!!!!!!! USAR PARA AGREGAR EL PRODUCTO SELECCIONADO A LA LISTA DE ARTICULOS PARA VENTA
      // if(this.inputProductoSeleccionado.value != '') {
      //   this.agregarProductoVentaActual(this.inputProductoSeleccionado.value)
      // } else {
      //   // console.log("nada que agregar")
      // }
    })
  }
}
