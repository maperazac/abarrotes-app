import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
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

  productos: ProductoInterface[] = [];
  productosTemp = this.productos;
  @ViewChild('palabraClave') inputPalabraClave:ElementRef;

  constructor(private productosService: ProductosService, private el: ElementRef) { }

  ngOnInit() {
    const inputPalabraClave= this.el.nativeElement.querySelector("#palabraClave");
    inputPalabraClave.focus();
    inputPalabraClave.value='';

    this.productosService.obtenerProductos().subscribe(productos => {
      this.productos = productos;
    })
  }


  ngOnDestroy() {
    console.log("destoyu")
  }

  filtrarProductosDeLaBusqueda(event: any) {
    if (event.target.value.length >= 3) {
      // console.log(this.productos)
      this.productos = this.productos.filter((obj) => {
        return obj.descripcion.toLowerCase() == event.target.value.toLowerCase()
      })
      // console.log(this.productosTemp);
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
      } else if (
        /* Read more about handling dismissals below */
        result.dismiss === Swal.DismissReason.cancel
      ) {
        // swalWithBootstrapButtons.fire({
        //   title: "Cancelled",
        //   text: "Your imaginary file is safe :)",
        //   icon: "error"
        // });
      }
    });
  }
}
