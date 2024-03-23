import { Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { ProductosService } from '../../services/productos.service';
import { ProductoModel } from 'src/app/models/producto.model';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-buscar-productos',
  templateUrl: './buscar-productos.component.html',
  styleUrls: ['./buscar-productos.component.scss']
})
export class BuscarProductosComponent implements OnInit {

  @HostListener('keydown', ['$event'])

  handleKeyDown(event: any) {
    if(event.code == 'Escape') {
      event.preventDefault();
      event.target.value = '';
      // this.filtrarProductosDeLaBusqueda(event);
      this.cerrarBusqueda(event);
      // this.procesarEvento(3);
    }
  }

  productos: ProductoInterface[] = [];
  productosTemp = this.productos;
  @ViewChild('palabraClave') inputPalabraClave:ElementRef;
  ProductoSeleccionado: ProductoInterface;
  display = "none";
  activarBotonAceptar=false;

  constructor(private productosService: ProductosService, private el: ElementRef) { }

  ngOnInit() {
    const inputPalabraClave= this.el.nativeElement.querySelector("#palabraClave");
    inputPalabraClave.focus();
    // inputPalabraClave.value='';

    this.productosService.obtenerProductos().subscribe(productos => {
      this.productos = productos;
      this.productosTemp = productos;
    })

    // this.idProductoSeleccionado = '';
  }

  filtrarProductosDeLaBusqueda(event: any) {
    if (event.target.value.length >= 3) {
      this.productosTemp = this.productos.filter((obj) => {
        return obj.descripcion.toLowerCase().includes(event.target.value.toLowerCase())
      })
    } else {
      this.productosTemp = this.productos;
    }
  }


  eliminarProducto(producto: ProductoInterface) {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-secondary w-100",
        cancelButton: "btn btn-primary w-100 mb-3"
      },
      buttonsStyling: false
    });
    swalWithBootstrapButtons.fire({
      title: "¿Deseas eliminar este producto?",
      text: "Se eliminarán permanentemente todos los registros e inventarios asociados a este producto",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí",
      cancelButtonText: "No",
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.productosService.borrarProducto(producto),
        swalWithBootstrapButtons.fire({
          title: "Eliminado",
          text: "Se ha eliminado el producto",
          icon: "success"
        });
      } else 
      {
        // Swal.fire({
        //   html: "ok"
        // })
      }
    });
  }

  setProductoSeleccionado(producto: ProductoInterface) {
    // console.log(id)
    this.ProductoSeleccionado = producto;
    const inputPalabraClave= this.el.nativeElement.querySelector("#palabraClave");
    inputPalabraClave.focus();
    this.activarBotonAceptar = true;
  }

  cerrarBusqueda(event: any) {
    this.filtrarProductosDeLaBusqueda(event);
    this.ProductoSeleccionado = <ProductoInterface>{}
    console.log(this.ProductoSeleccionado)
    this.activarBotonAceptar = false;
    setTimeout(() => {
      Swal.close();
    }, 50);
  }

  agregarProductoALaVenta(event: any) {
    this.filtrarProductosDeLaBusqueda(event);
    this.ProductoSeleccionado = <ProductoInterface>{}
    this.activarBotonAceptar = false;
    Swal.close();
  }

  openModalConfirmarBorrar() {
    setTimeout(() => {
      console.log(this.ProductoSeleccionado)
      this.display = "block";
    }, 100);
  }

  onCancelBorrar() {
    this.display = "none";
  }
  onCloseHandledConfirmarBorrar() {
    this.productosService.borrarProducto(this.ProductoSeleccionado)
    this.display = "none";
  }
}
