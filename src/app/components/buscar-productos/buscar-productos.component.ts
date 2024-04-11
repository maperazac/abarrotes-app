import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ProductosService } from '../../services/productos.service';
import { ProductoModel } from 'src/app/models/producto.model';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { DepartamentosService } from 'src/app/services/departamentos.service';

@Component({
  selector: 'app-buscar-productos',
  templateUrl: './buscar-productos.component.html',
  styleUrls: ['./buscar-productos.component.scss']
})
export class BuscarProductosComponent implements OnInit {
  @Input() esVenta:boolean;
  @Output()
  // productoAEditar = new EventEmitter<string>();

  @HostListener('keydown', ['$event'])

  handleKeyDown(event: any) {
    if(event.code == 'Escape') {
      event.preventDefault();
      event.target.value = '';
      this.cerrarBusqueda();
    }

    if(event.code == 'ArrowUp' || event.code == 'ArrowDown') {  // Flecha arriba para navegacion en la tabla de productos en venta actual
      // event.preventDefault();
      this.navegacionConFlechas(event.code); 
    }
  }

  productos: ProductoInterface[] = [];
  productosTemp = this.productos;
  @ViewChild('palabraClave') inputPalabraClave:ElementRef;
  ProductoSeleccionado: ProductoInterface;
  display = "none";
  activarBotonAceptar=false;

  constructor(private productosService: ProductosService,
              private departamentosService: DepartamentosService,
              private el: ElementRef,
              private router: Router) { }

  ngOnInit() {
    const inputPalabraClave= this.el.nativeElement.querySelector("#palabraClave");
    inputPalabraClave.focus();

    // this.productosService.obtenerProductos().subscribe(productos => {
    //   this.productos = productos;
    //   this.productosTemp = productos;
    // })

    // this.productosService.obtenerProductos().then(docRef => {
    //   const productos: any[] = [];

    //   docRef.forEach ( producto => {
    //     productos.push({
    //       id: producto.id,
    //       ...producto.data()
    //     })
    //   })

    //   this.productos = productos;
    //   this.productosTemp = productos;
    // })
    this.actualizarProductos();

  }

  actualizarProductos () {
    this.productosService.obtenerProductos().then(docRef => {
      const productos: any[] = [];

      docRef.forEach ( producto => {
        this.departamentosService.obtenerDepartamentosPorId(producto.data()['departamento']).then (doc => {
          productos.push({
            id: producto.id,
            ...producto.data(),
            departamentoNombre: doc.data() != undefined ? doc.data()['nombre'] : '- Sin departamento -'
          })
        })
      })

      this.productos = productos;
      this.productosTemp = productos;

      this.filtrarProductosDeLaBusqueda(event);
      this.ProductoSeleccionado = <ProductoInterface>{}
      this.activarBotonAceptar = false;
      const inputPalabraClave= this.el.nativeElement.querySelector("#palabraClave");
      inputPalabraClave.value='';
      inputPalabraClave.focus();
    })
  }

  filtrarProductosDeLaBusqueda(event: any) {
    if (event) {
      if (event.key == 'Enter') {
        this.agregarProductoALaVenta();
      } else {
        if (event.target.value.length >= 3) {
          this.productosTemp = this.productos.filter((obj) => {
            return obj.descripcion.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(event.target.value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, ''))
          })
        } else {
          this.productosTemp = this.productos;
        }
      }
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
    let prodSel = Object.keys(this.ProductoSeleccionado).length != 0 ? true : false;
    this.ProductoSeleccionado = producto;
    const inputPalabraClave= this.el.nativeElement.querySelector("#palabraClave");
    inputPalabraClave.focus();
    this.activarBotonAceptar = true;
  }

  cerrarBusqueda() {
    // this.filtrarProductosDeLaBusqueda(event);
    this.productosTemp = this.productos;
    this.ProductoSeleccionado = <ProductoInterface>{}
    this.activarBotonAceptar = false;
    setTimeout(() => {
      Swal.close();
    }, 50);
  }

  agregarProductoALaVenta() {
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
    this.actualizarProductos();
  }

  navegacionConFlechas(codigo: string) {

    let prodSel = Object.keys(this.ProductoSeleccionado).length != 0 ? true : false;

    if(!prodSel) {
      this.ProductoSeleccionado = this.productosTemp[0]
    } else {
      let indexNuevo = 0;
      this.productosTemp.forEach((item, index) => {
         if(this.ProductoSeleccionado.codigoDeBarras == item.codigoDeBarras) {
          if ( codigo == "ArrowDown" ) {
            indexNuevo = index + 1;
          } else {
            indexNuevo = index - 1;
          }
        }
      })
      this.ProductoSeleccionado = {
        id: this.productosTemp[indexNuevo].id,
        codigoDeBarras: this.productosTemp[indexNuevo].codigoDeBarras,
        descripcion: this.productosTemp[indexNuevo].descripcion,
        seVende: this.productosTemp[indexNuevo].seVende,
        precioCosto: this.productosTemp[indexNuevo].precioCosto,
        ganancia: this.productosTemp[indexNuevo].ganancia,
        precioVenta: this.productosTemp[indexNuevo].precioVenta,
        precioMayoreo: this.productosTemp[indexNuevo].precioMayoreo,
        departamento: this.productosTemp[indexNuevo].departamento,
        cantidad: this.productosTemp[indexNuevo].cantidad
      }
      console.log("nuevo seleccionado: ", this.ProductoSeleccionado)
    }

    const inputPalabraClave= this.el.nativeElement.querySelector("#palabraClave");
    inputPalabraClave.focus();
    this.activarBotonAceptar = true;   
  }

  editarProducto() {
    
    setTimeout(() => {
      // this.productoAEditar.emit(this.ProductoSeleccionado.codigoDeBarras)
      let codigo = this.ProductoSeleccionado.codigoDeBarras;
      this.ProductoSeleccionado = <ProductoInterface>{}
      const prodSeleccionado= this.el.nativeElement.querySelector("#inputProductoSeleccionado");
      prodSeleccionado.value='';
      this.cerrarBusqueda();
      this.router.navigateByUrl('/productos/' + codigo)
    }, 100);
  }
}
