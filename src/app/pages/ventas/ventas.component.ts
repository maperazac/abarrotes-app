import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Router } from '../../../../node_modules/@angular/router';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { ProductosService } from 'src/app/services/productos.service';
import { BuscarProductoModel } from 'src/app/models/buscarProducto.model';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import { BuscarProductosComponent } from '../../components/buscar-productos/buscar-productos.component';
import { Input } from '@angular/core';
import { VentasService } from 'src/app/services/ventas.service';

@Component({
  selector: 'app-ventas',
  templateUrl: './ventas.component.html',
  styleUrls: ['./ventas.component.scss']
})
export class VentasComponent implements OnInit {

  @HostListener('document:keydown', ['$event'])

  handleKeyDown(event: KeyboardEvent) {
    if(event.code == 'F10') {
      event.preventDefault();
      this.procesarEvento(3);
    }
  }

  @Input() modalCerrado;
  @ViewChild('myAlert') myAlert: ElementRef;
  modalBusquedaProductosAbierto = false;
  buscarProducto = new BuscarProductoModel();
  productosVentaActual: ProductoInterface[] = [];
  botonSeleccionado = 0;
  busquedaInput: HTMLInputElement  
  inputProductoSeleccionado: HTMLInputElement 

  constructor(private auth: AuthService,
              private el: ElementRef,
              private router: Router,
              private productosService: ProductosService,
              private ventasService: VentasService) { }

  rowSelected: string = '0';
  efectivoInicialEnCaja: string = localStorage.getItem('efectivoInicialEnCaja');

  ngOnInit() {
    this.efectivoInicialRegistrado();
    // console.log(this.modalRef)
  }

  ngAfterViewInit() {
      const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeProducto");
      inputPalabraClave.focus();
  }

  selectRow(codigo: string) {
    this.rowSelected = codigo;
  }

  efectivoInicialRegistrado() {
    if (this.efectivoInicialEnCaja != null) {
      return;
    }

    let efectivoInicialInput: HTMLInputElement    

    Swal.fire({
      allowOutsideClick: false,
      icon: 'question',
      title: 'Efectivo inicial en caja',
      html: `<input type="number" id="efectivoInicial" class="swal2-input" placeholder="Cantidad">`,
      confirmButtonText: 'Registrar efectivo inicial en caja',
      focusConfirm: false,
      allowEscapeKey: false,
      didOpen: () => {
        const popup = Swal.getPopup()!
        efectivoInicialInput = popup.querySelector('#efectivoInicial') as HTMLInputElement
        efectivoInicialInput.onkeyup = (event) => event.key === 'Enter' && Swal.clickConfirm()
        efectivoInicialInput.focus();
      },
      preConfirm: () => {
        const efectivoInicial = efectivoInicialInput.value
        if (efectivoInicial == '') {
          Swal.showValidationMessage(`Introduce la cantidad de efectivo inicial`)
        }
        localStorage.setItem('efectivoInicialEnCaja', efectivoInicial);
      },
      didClose: () => {
        const inputCodigoDeProducto = this.el.nativeElement.querySelector("#codigoDeProducto");
        inputCodigoDeProducto.focus();
      }
    })
  }

  async procesarEvento(id: number) {
    if(id != 3) {
      this.botonSeleccionado = id;
    } 

    if(id == 2) {  // Articulo común
      const { value: formValues } = await Swal.fire({
        title: 'Producto común',
        html: `
        <div style="text-align: left;">
          <div>
          Descripción del producto: <br/>
          <input type="text" id="descripcionProductoComun" class="swal2-input" style="margin: 4px; padding: 10px; width: 98%; height: auto;">
        </div> <br/>
        <div style="display: flex">
        <div style="width: 50%;">
          Cantidad: <br/>
          <input type="number" id="cantidadProductoComun" class="swal2-input" style="margin: 4px; padding: 10px; width: 95%; height: auto;">
        </div>
        
        <div style="width: 50%;">
          Precio: <br/>
          <input type="text" id="precioProductoComun" class="swal2-input" style="margin: 4px; padding: 10px; width: 95%; height: auto;">
        </div>
        `,
        allowOutsideClick: false,
        focusConfirm: false,
        allowEscapeKey: true,
        width: '500px',
        showConfirmButton: true,
        confirmButtonText: "Aceptar",
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        preConfirm: () => {
          return [
            (<HTMLInputElement>document.getElementById("descripcionProductoComun")).value,
            (<HTMLInputElement>document.getElementById("cantidadProductoComun")).value,
            (<HTMLInputElement>document.getElementById("precioProductoComun")).value
          ];
        },
        didClose: () => {
          const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeProducto");
          inputPalabraClave.focus();
        }
      });
      if (formValues) {
        // console.log(formValues)
        // Swal.fire(JSON.stringify(formValues));
        const nuevoProductoComun: ProductoInterface = {
          id: '',
          codigoDeBarras: 'Producto común (sin código)',
          descripcion: formValues[0],
          seVende: 1,
          precioCosto: 0,
          ganancia: 0,
          precioVenta: formValues[2],
          precioMayoreo: formValues[2],
          departamento: "0",
          cantidad: parseInt(formValues[1])
        }
        this.productosVentaActual.push(nuevoProductoComun);
        this.ventasService.$productosVentaActual.emit(this.productosVentaActual)
      }
    }

    if(id == 3) { // Abrir modal de busqueda de productos
      Swal.fire({
          allowOutsideClick: false,
          html: this.myAlert.nativeElement,
          focusConfirm: false,
          allowEscapeKey: false,
          width: '1000px',
          showConfirmButton: false,
          // confirmButtonText: `Cerrar`,
          // showConfirmButton: false,
          didOpen:() => {
            const popup = Swal.getPopup()!
            this.busquedaInput = popup.querySelector('#palabraClave') as HTMLInputElement
            this.busquedaInput.value='';
            this.busquedaInput.focus();

            this.inputProductoSeleccionado = popup.querySelector('#inputProductoSeleccionado') as HTMLInputElement
            this.inputProductoSeleccionado.value='';
            },
          didClose: () => {
            
            setTimeout(() => {
                const inputCodigoDeProducto = this.el.nativeElement.querySelector("#codigoDeProducto");
                inputCodigoDeProducto.focus();
              }, 100);
            },
            preConfirm: () => {
              // console.log(inputProductoSeleccionado.value)
            }
          }).then(res=>{
            // NO BORRAR!!!!!!!!!!!!!!!!!! USAR PARA AGREGAR EL PRODUCTO SELECCIONADO A LA LISTA DE ARTICULOS PARA VENTA
            if(this.inputProductoSeleccionado.value != '') {
              console.log("agregar a la venta: ", this.inputProductoSeleccionado.value)
              this.agregarProductoVentaActual(this.inputProductoSeleccionado.value)
            } else {
              console.log("nada que agregar")
            }
          })
    }
  }

  async agregarProductoVentaActual(codigo) {
    this.buscarProducto.palabraClave = '';
    await this.productosService.obtenerProductoPorCodigoDeBarras(codigo).then(docRef => {
      const productos: any[] = [];

      docRef.forEach ( producto => {
        productos.push({
          id: producto.id,
          cantidad: 1,
          ...producto.data()
        })
      })

      let productoRepetido = false;
      let item;

      if (productos.length == 0) {
        Swal.fire({
          title: 'Producto no encontrado',
          text: 'No existe ningún producto con este código de barras.',
          icon: 'warning',
          didClose: () => {
            const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeProducto");
            inputPalabraClave.focus();
          }
        })
      } else {
        if (this.productosVentaActual.length !== 0) {
          this.productosVentaActual.forEach(prod => {
            if (prod.id == productos[0].id) {
              item = this.productosVentaActual.findIndex(i => i.id === productos[0].id)
              productoRepetido = true;
              return;
            } 
          })

          productoRepetido ? this.productosVentaActual[item].cantidad = this.productosVentaActual[item].cantidad + 1 : this.productosVentaActual.push(...productos);
          
        } else {
          this.productosVentaActual.push(...productos)
        }
      }
      this.ventasService.$productosVentaActual.emit(this.productosVentaActual)

    }).catch( e => console.log('error: ', e))
  }

  restarCantidad(id) {
    let item = this.productosVentaActual.findIndex(i => i.id === id);

    if(this.productosVentaActual[item].cantidad === 1) {
      this.productosVentaActual.splice(item, 1)
      this.rowSelected = '0'
    } else {
      this.productosVentaActual[item].cantidad -= 1;
    }

    this.ventasService.$productosVentaActual.emit(this.productosVentaActual)
  }

  agregarCantidad(id) {
    let item = this.productosVentaActual.findIndex(i => i.id === id);
    this.productosVentaActual[item].cantidad += 1;
    this.ventasService.$productosVentaActual.emit(this.productosVentaActual)
  }
}
