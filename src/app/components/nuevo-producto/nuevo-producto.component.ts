import { Component, ElementRef, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, NgForm, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import { BuscarProductoModel } from 'src/app/models/buscarProducto.model';
import { ProductoModel } from 'src/app/models/producto.model';
import { ProductosService } from 'src/app/services/productos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nuevo-producto',
  templateUrl: './nuevo-producto.component.html',
  styleUrls: ['./nuevo-producto.component.scss']
})
export class NuevoProductoComponent implements OnInit {

  // producto = new ProductoModel();
  @Input() esModificacion:boolean;
  buscarProducto = new BuscarProductoModel();

  formulario: FormGroup;

  constructor( private productosService: ProductosService, private el: ElementRef) {
    this.formulario = new FormGroup({
      // id: new FormControl(),
      codigoDeBarras: new FormControl(),
      descripcion: new FormControl(),
      seVende: new FormControl(),
      precioCosto:new FormControl(),
      ganancia: new FormControl(),
      precioVenta: new FormControl(),
      precioMayoreo: new FormControl(),
      departamento: new FormControl()
    })
   }

  ngOnInit() {    
  }

  ngAfterViewInit() {
    if(this.esModificacion) {
      const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeProducto");
      inputPalabraClave.focus();
    } else {
      const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeBarras");
      inputPalabraClave.focus();
    }
  }

  async guardar() {
    if(this.formulario.invalid) {
      console.log("Formulario no valido");
      console.log(this.formulario.value)
      return;
    }

    Swal.fire({
      title: 'Espere',
      text: 'Guardando producto',
      icon: 'info',
      allowOutsideClick: false
    });
    Swal.showLoading();

    let esRepetido = false;

    await this.validarProductoRepetido(this.formulario.controls['codigoDeBarras'].value).then(resp => {
      esRepetido = resp;
    });

    if(!this.esModificacion) {
      if(esRepetido) {
        if (esRepetido) {
          Swal.fire({
            title: 'Código repetido',
            text: 'Ya existe un producto registrado con este código de barras. Por favor verifique.',
            icon: 'warning'
          })
         }
      } else {
        await this.productosService.crearProducto(this.formulario.value).then( docRef => {
          console.log(docRef)
          Swal.fire({
            title: this.formulario.controls['descripcion'].value,
            text: 'Se agregó correctamente',
            icon: 'success'
          })
      
          this.formulario.reset();
        })
        .catch(e => console.log('Error: ', e));
      }
    }

    if(this.esModificacion) {
      let inputIdProducto = document.getElementById("idProducto");
      await this.productosService.modificarProducto(this.formulario.value, inputIdProducto.innerHTML).then( () => {
        Swal.fire({
          title: this.formulario.controls['descripcion'].value,
          text: 'Se actualizó correctamente',
          icon: 'success'
        })
      })
      .catch(e => console.log('Error: ', e));
    }
  }

  async validarProductoRepetido(codigo: string) {
    let esRepetido = false;
    await this.productosService.obtenerProductoPorCodigoDeBarras(codigo).then(docRef => {  
      const productos: any[] = [];
 
       docRef.forEach ( producto => {
         productos.push({
           id: producto.id,
           ...producto.data()
         })
       })
 
       esRepetido = productos.length != 0 ? true : false; 
     })
     .catch( e => console.log('error: ', e))

     return esRepetido;
  }

  setSeVende (tipo: number) {
    this.formulario.patchValue({seVende: tipo});
  }

  setDepartamento(departamento: string) {
    this.formulario.patchValue({departamento: departamento});
  }

  validarCosto(event: any) {
    if(event.target.value== '') {
      // this.producto.precioMayoreo = 0;
      // this.producto.precioVenta = 0;
      // this.producto.ganancia = 0;

      this.formulario.patchValue({precioMayoreo: 0});
      this.formulario.patchValue({precioVenta: 0});
      this.formulario.patchValue({ganancia: 0});
      return;
    }
  }

  calcularPrecioVenta(event: any) {
    if (!this.formulario.controls['precioCosto'].value) {
      this.formulario.patchValue({precioMayoreo: 0});
      this.formulario.patchValue({precioVenta: 0});
      this.formulario.patchValue({ganancia: 0});
      return;
    } 
    // this.producto.precioMayoreo = this.producto.precioVenta = this.producto.precioCosto * (1 + ( event.target.value / 100)) < 0 ? 0 : parseFloat((Math.round((this.producto.precioCosto * (1 + ( event.target.value / 100))) * 10) / 10).toString());

    const nuevoPrecio = this.formulario.controls['precioCosto'].value * (1 + ( event.target.value / 100)) < 0 ? 0 : parseFloat((Math.round((this.formulario.controls['precioCosto'].value * (1 + ( event.target.value / 100))) * 10) / 10).toString())
    
    this.formulario.patchValue({precioMayoreo: nuevoPrecio});
    this.formulario.patchValue({precioVenta: nuevoPrecio});
  }

  calcularGanancia(event: any) {
    if (!this.formulario.controls['precioCosto'].value) {
      this.formulario.patchValue({precioMayoreo: 0});
      this.formulario.patchValue({precioVenta: 0});
      this.formulario.patchValue({ganancia: 0});
      return;
    } 

    const nuevaGanancia = Math.round(((event.target.value * 100) / this.formulario.controls['precioCosto'].value) - 100) < 0 ? 0 : Math.round(((event.target.value * 100) / this.formulario.controls['precioCosto'].value) - 100);

    this.formulario.patchValue({ganancia: nuevaGanancia});
  }

  async buscarProductoPorCodigoDeBaras() {
    Swal.fire({
      title: 'Buscando producto',
      text: 'Espere...',
      icon: 'info',
      allowOutsideClick: false
    });
    Swal.showLoading();

    await this.productosService.obtenerProductoPorCodigoDeBarras(this.buscarProducto.palabraClave).then(docRef => {  
     const productos: any[] = [];

      docRef.forEach ( producto => {
        productos.push({
          id: producto.id,
          ...producto.data()
        })
      })

      if (productos.length == 0) {
        this.formulario.reset();
        Swal.fire({
          title: 'Producto no encontrado',
          text: 'No existe ningún producto con este código de barras.',
          icon: 'warning'
        })
      } else {
        let inputIdProducto = document.getElementById("idProducto");
        inputIdProducto.innerHTML = productos[0].id
        this.formulario.setValue({
          codigoDeBarras: productos[0].codigoDeBarras,
          descripcion: productos[0].descripcion,
          seVende: productos[0].seVende,
          precioCosto: productos[0].precioCosto,
          ganancia: productos[0].ganancia,
          precioVenta: productos[0].precioVenta,
          precioMayoreo: productos[0].precioMayoreo,
          departamento: productos[0].departamento
        })
        Swal.close();
      }
    })
    .catch( e => console.log('error: ', e))
  }

}
