import { Component, ElementRef, Input, OnInit, ViewChild, HostListener, Output, EventEmitter } from '@angular/core';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import VentaInterface from 'src/app/interfaces/ventas.interface';
import { VentasdbService } from 'src/app/services/ventasdb.service';
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
      if(this.ventasActuales.length > 1 && !this.cambiandoDeVenta && !this.eliminandoVenta) {
        this.mostrarListaVentas(); 
      }
    }
    if((event.code == 'F12')) {  // F12 para abrir modal para cobrar la venta.
      event.preventDefault();
      if(!this.cambiandoDeVenta && !this.eliminandoVenta) this.cobrarVenta(); 
    }

    if((event.code == 'F1')) {  // Desactivar el F1 para que no se abra la ayuda
      event.preventDefault();
    }
  }

  @ViewChild('modalSeleccionVenta') modalSeleccionVenta: ElementRef;
  @ViewChild('modalCobrarVenta') modalCobrarVenta: ElementRef;
  productosVentaActual: ProductoInterface[];
  cantidadArticulos = 0;
  ventaTotalPesos = 0;
  idVentaActiva; // Este es el idTemp que es el numero de venta que se muestra en las pestañas de ventas
  idVentaActivaInterno; // Es el id interno de la venta activa, el que registra firestore automaticamente. Se usa para guardar los productos de la venta en detalleVentas
  ventasActuales: VentaInterface[] = [];
  inputVentaActualModal: HTMLInputElement;
  inputVentaActualModalInterno: HTMLInputElement;
  pagoConInput: HTMLInputElement;
  eliminandoVenta = false;
  
  @Input() cambiandoDeVenta;

  @Output() nuevaVenta = new EventEmitter();
  @Output() obtenerVentasActivas = new EventEmitter();
  

  constructor(private ventasdbService: VentasdbService,
              private el: ElementRef
  ) { 
  }

  ngOnInit() {
    this.ventasdbService.$productosVentaActual.subscribe((valor) => {
      // this.idVentaActiva = this.ventasService.obtenerVentaActivaLocalStorage();
      this.productosVentaActual = valor.filter(p => p.ventaId == this.idVentaActivaInterno);

      this.cantidadArticulos = 0;
      this.ventaTotalPesos = 0;
      this.productosVentaActual.map(item => {
        this.cantidadArticulos += item.seVende == 2 ? 1 : item.cantidad;
        this.ventaTotalPesos += item.importe;
      })
    })

    this.ventasdbService.$idVentaActiva.subscribe((id) => {
      this.idVentaActiva = id;
    })  

    this.ventasdbService.$idVentaActivaInterno.subscribe((idInterno) => {
      this.idVentaActivaInterno = idInterno;
      const productosEnVentasActuales: ProductoInterface[] = JSON.parse(localStorage.getItem("productosEnVentasLS"));
      this.productosVentaActual = productosEnVentasActuales.filter(v => v.ventaId == idInterno);
      
      this.cantidadArticulos = 0;
      this.ventaTotalPesos = 0;
      this.productosVentaActual.map(item => {
        this.cantidadArticulos += item.seVende == 2 ? 1 : item.cantidad;
        this.ventaTotalPesos += item.importe;
      })
    }) 

    this.ventasdbService.$ventasActuales.subscribe(ventas => {
      this.ventasActuales = ventas;
    })

    // this.ventasActuales = this.ventasService.obtenerTodasLasVentasActuales();
    
    // this.cargarTotalesIniciales()
  }

  crearNuevaVenta() {
    this.nuevaVenta.emit();
  }

  getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
  }

  async eliminarVentaActiva() {

    this.eliminandoVenta = true;
    // const ventasActuales = JSON.parse(localStorage.getItem("ventasLS")); // Obtiene el array con todas las ventas actuales en pantalla
    
    // this.idVentaActiva = this.ventasService.obtenerVentaActivaLocalStorage(); // Recorre el array de ventas y obtiene la que tenga la propiedad "seleccionada" = 1

    let item = this.ventasActuales.find(i => i.id === this.idVentaActivaInterno) // Obtiene la venta que se va a eliminar.

    // this.ventasService.eliminarVentaLocalStorage(this.idVentaActiva);  // Elimina la venta del localstorage
    await this.ventasdbService.eliminarVentaEnCurso(item);

    // Aqui recorrer el array de productos en la venta actual y eliminar todos los productos ligados a esta venta que se acaba de eliminar
    const productosEnVentasActuales: ProductoInterface[] = JSON.parse(localStorage.getItem("productosEnVentasLS"));
    let productosActualizados = productosEnVentasActuales.filter(prod => prod.ventaId != this.idVentaActivaInterno);
    localStorage.setItem("productosEnVentasLS", JSON.stringify(productosActualizados));
    this.ventasdbService.$productosVentaActual.emit(productosActualizados);

    // this.ventasdbService.actualizarVentasActuales(this.ventasActuales.filter(i => i.idTemp !== this.idVentaActiva));
    this.obtenerVentasActivas.emit();

    this.eliminandoVenta = false;
  }

  // cargarTotalesIniciales() {
  //   this.idVentaActiva = this.ventasService.obtenerVentaActivaLocalStorage();
  //     const productosEnVentasActuales: ProductoInterface[] = JSON.parse(localStorage.getItem("productosEnVentasLS"));
  //     this.productosVentaActual = productosEnVentasActuales.filter(v => v.ventaId == this.idVentaActiva);
      
  //     this.cantidadArticulos = 0;
  //     this.ventaTotalPesos = 0;
  //     this.productosVentaActual.map(item => {
  //       this.cantidadArticulos += item.seVende == 2 ? 1 : item.cantidad;
  //       this.ventaTotalPesos += item.importe;
  //     })
  // }

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
        this.inputVentaActualModalInterno = popup.querySelector('#inputVentaActivaInterno')
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
          this.ventasdbService.setVentaActiva(this.inputVentaActualModalInterno.value);
          // this.obtenerVentasActivas.emit();
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
        // Establecer el valor con el total de la venta
        this.pagoConInput.value = this.ventaTotalPesos.toString();
        this.pagoConInput.focus();
        // Seleccionar todo el texto para que se sobrescriba al teclear
        this.pagoConInput.select();

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
