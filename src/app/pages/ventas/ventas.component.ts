import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Router } from '../../../../node_modules/@angular/router';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { ProductosService } from 'src/app/services/productos.service';
import { BuscarProductoModel } from 'src/app/models/buscarProducto.model';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import { BuscarProductosComponent } from '../../components/buscar-productos/buscar-productos.component';

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

  botonSeleccionado = 0;
  @ViewChild('myAlert') myAlert: ElementRef;
  modalBusquedaProductosAbierto = false;
  buscarProducto = new BuscarProductoModel();
  productosVentaActual: ProductoInterface[] = [];

  constructor(private auth: AuthService,
              private el: ElementRef,
              private router: Router,
              private productosService: ProductosService) { }

  rowSelected: string = '0';
  efectivoInicialEnCaja: string = localStorage.getItem('efectivoInicialEnCaja');

  ngOnInit() {
    this.efectivoInicialRegistrado();
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

  procesarEvento(id: number) {
    if(id != 3) {
      this.botonSeleccionado = id;
    }

    if(id == 3) { // Abrir modal de busqueda de productos
      Swal.fire({
        allowOutsideClick: false,
        html: this.myAlert.nativeElement,
        focusConfirm: false,
        allowEscapeKey: true,
        width: '1000px',
        confirmButtonText: `Cerrar`,
        // showConfirmButton: false,
        didOpen:() => {
        },
        didClose: () => {
          setTimeout(() => {
            const inputCodigoDeProducto = this.el.nativeElement.querySelector("#codigoDeProducto");
            inputCodigoDeProducto.focus();
          }, 500);
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
  }

  agregarCantidad(id) {
    let item = this.productosVentaActual.findIndex(i => i.id === id);
    this.productosVentaActual[item].cantidad += 1
  }
}
