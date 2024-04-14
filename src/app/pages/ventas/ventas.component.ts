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
import VentaInterface from 'src/app/interfaces/ventas.interface';

@Component({
  selector: 'app-ventas',
  templateUrl: './ventas.component.html',
  styleUrls: ['./ventas.component.scss']
})
export class VentasComponent implements OnInit {

  @HostListener('document:keydown', ['$event'])

  handleKeyDown(event: KeyboardEvent) {
    console.log(event.code)
    if(event.code == 'F10') {  // F10  para abrir popup de busqueda de productos
      event.preventDefault();
      this.procesarEvento(3);
    }

    if(event.code == 'Delete') {  // DEL para borrar elemento seleccionado de la venta actual
      event.preventDefault();
      this.procesarEvento(7); 
    }

    if(event.code == 'ArrowUp' || event.code == 'ArrowDown') {  // Flecha arriba para navegacion en la tabla de productos en venta actual
      // event.preventDefault();
      this.navegacionConFlechas(); 
    }

    if(event.code == 'NumpadAdd') {  // + Para aumentar la cantidad de un producto en 1
      event.preventDefault();
      console.log(this.rowSelected)
      this.agregarCantidad(this.rowSelected); 
    }

    if(event.code == 'NumpadSubtract') {  // - Para disminuir la cantidad de un producto en 1
      event.preventDefault();
      this.restarCantidad(this.rowSelected); 
    }

    if(event.code == 'Numpad0' || event.code == 'Numpad1' || event.code == 'Numpad2' || event.code == 'Numpad3'
        || event.code == 'Numpad4' || event.code == 'Numpad5' || event.code == 'Numpad6' || event.code == 'Numpad7'
        || event.code == 'Numpad8' || event.code == 'Numpad9') {  // Al presionar numeros, poner focus en el cuadro de codigo de barras
      
      // this.restarCantidad(this.rowSelected);
      const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeProducto");
      inputPalabraClave.focus(); 
    }

    // Usar para prevenir acciones combinadas como CTRL+P y poder usar comandos para controlar el sistema
    const {key, keyCode, metaKey, shiftKey, altKey, ctrlKey} = event; 
      if(key === "c" && (ctrlKey || metaKey)){  // EJEMPLO
        event.preventDefault();
        console.log("copy prevented");
      }

      if((key === "P" || key === "p") && (ctrlKey || metaKey)){ // CTRL+P  Para abrir popup de producto común
        event.preventDefault();
        this.procesarEvento(2);
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
  ventas: VentaInterface[] = [];

  constructor(private auth: AuthService,
              private el: ElementRef,
              private router: Router,
              private productosService: ProductosService,
              private ventasService: VentasService) { }

  rowSelected: string = '0';
  efectivoInicialEnCaja: string = localStorage.getItem('efectivoInicialEnCaja');

  ngOnInit() {
    this.efectivoInicialRegistrado();
    this.obtenerVentasActivas()
    
    this.ventasService.$ventasActuales.subscribe((valor) => {
      this.ventas = valor;
      // this.productosVentaActual = valor;
      // this.cantidadArticulos = 0;
      // this.ventaTotalPesos = 0;
      // this.productosVentaActual.map(item => {
      //   this.cantidadArticulos += item.seVende == 2 ? 1 : item.cantidad;
      //   this.ventaTotalPesos += item.cantidad * item.precioVenta;
      // })
    })
    
  }

  ngAfterViewInit() {
      const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeProducto");
      inputPalabraClave.focus();
  }

  async obtenerVentasActivas() {
    const ventas: VentaInterface[] = JSON.parse(localStorage.getItem("ventasLS"))
    //  await this.ventasService.obtenerVentas().then(docRef => {
    //   docRef.forEach ( venta => {
    //     if(venta.data()['status'] == 0) {
    //       ventas.push({
    //         id: venta.id,
    //         ...venta.data()
    //       })
    //     }
    //   })
    // })
    debugger;
    if(ventas == null || ventas.length == 0) {
      let nuevaVenta = {
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
      this.ventasService.agregarVentaLocalstorage(nuevaVenta)
      this.ventas.push(nuevaVenta);
    } else {
      this.ventas = ventas;
    }
  }

  selectRow(id: string) {
    console.log(id)
    this.rowSelected = id;
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
        } else {
          localStorage.setItem('efectivoInicialEnCaja', efectivoInicial);
        }
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

    // -----------------------------------------------------------------

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
          <input type="number" min="0" step="1" id="cantidadProductoComun" class="swal2-input" style="margin: 4px; padding: 10px; width: 95%; height: auto;">
        </div>
        <div style="width: 3%; display: flex; align-items: center; margin-top: 20px; margin-right: 2px;"><i class="fa fa-times"></i></div>
        
        <div style="width: 50%;">
          Precio: <br/>
          <input type="number" id="precioProductoComun" class="swal2-input" style="margin: 4px; padding: 10px; width: 95%; height: auto;">
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
      if (formValues && formValues[0] != '' && formValues[1] != '' && formValues[2] != '') {
        const nuevoProductoComun: ProductoInterface = {
          id: this.getRandomInt(1000000, 9999999).toString(),
          codigoDeBarras: '0',
          descripcion: formValues[0],
          seVende: 1,
          precioCosto: 0,
          ganancia: 0,
          precioVenta: formValues[2],
          precioMayoreo: formValues[2],
          departamento: "0",
          cantidad: parseFloat(formValues[1])
        }
        this.productosVentaActual.push(nuevoProductoComun);
        this.ventasService.$productosVentaActual.emit(this.productosVentaActual)
        this.selectRow(nuevoProductoComun.id)
      } else {
        // console.log("llene todos los campos")
      }
    }

    // -----------------------------------------------------------------

    if(id == 3) { // Abrir modal de busqueda de productos
      Swal.fire({
          allowOutsideClick: false,
          html: this.myAlert.nativeElement,
          focusConfirm: false,
          allowEscapeKey: false,
          width: '1000px',
          showConfirmButton: false,
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
            this.agregarProductoVentaActual(this.inputProductoSeleccionado.value)
          } else {
            // console.log("nada que agregar")
          }
        })
    }

    // -----------------------------------------------------------------

    if (id == 7) {  // Eliminar producto seleccionado de la venta actual
      let elemento = (<HTMLInputElement>document.querySelector('input[name=exampleRadios]:checked'))
      
      if(elemento) {
        Swal.fire({
          title: "¿Borrar producto seleccionado?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Borrar producto",
          cancelButtonText: "Cancelar",
          didClose: () => {
            const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeProducto");
            inputPalabraClave.focus();
          }
        }).then((result) => {
          if (result.isConfirmed) {
            this.borrarProductoVentaActual(elemento.id)
          }
        });
      } 
    }
  }

  navegacionConFlechas() {
    let elemento = (<HTMLInputElement>document.querySelector('input[name=exampleRadios]:checked'))
    if(elemento){
      elemento.focus() 
    } else {
      let elemento = (<HTMLInputElement>document.querySelector('input[name=exampleRadios]'))
      if(elemento){
        elemento.click()
      }
    }
  }

  getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
  }

  async agregarProductoVentaActual(codigo) {
    this.buscarProducto.palabraClave = '';

    let cantidad = 1;

    if (codigo.includes("*")) {
      const words = codigo.split('*');
      if(words[0] != '' && words[1] != ''){
        codigo = words[1]
        cantidad = parseInt(words[0]);
      }
    } 
    await this.productosService.obtenerProductoPorCodigoDeBarras(codigo).then(async docRef => {
      const productos: any[] = [];

      docRef.forEach ( producto => {
        productos.push({
          id: producto.id,
          cantidad: cantidad,
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
        if(productos[0].seVende == 1) { // Productos que se venden por pieza
          if (this.productosVentaActual.length !== 0) {
            this.productosVentaActual.forEach(prod => {
              if (prod.id == productos[0].id) {
                item = this.productosVentaActual.findIndex(i => i.id === productos[0].id)
                productoRepetido = true;
                return;
              } 
            })
  
            productoRepetido ? this.productosVentaActual[item].cantidad = this.productosVentaActual[item].cantidad + cantidad : this.productosVentaActual.push(...productos);
            
          } else {
            this.productosVentaActual.push(...productos)
          }
        }

        if (productos[0].seVende == 2) { // Productos que se venden a granel


          // if (this.productosVentaActual.length !== 0) {
          //   this.productosVentaActual.forEach(prod => {
          //     if (prod.id == productos[0].id) {
          //       item = this.productosVentaActual.findIndex(i => i.id === productos[0].id)
          //       productoRepetido = true;
          //       return;
          //     } 
          //   })
  
          //   productoRepetido ? this.productosVentaActual[item].cantidad = this.productosVentaActual[item].cantidad + cantidad : this.productosVentaActual.push(...productos);
            
          // } else {
          //   this.productosVentaActual.push(...productos)
          // }



          let cantidadProductoInput: HTMLInputElement; 
          let importeInput: HTMLInputElement;

          Swal.fire({
            allowOutsideClick: false,
            title: productos[0].descripcion,
            html: `<div class="container ">
                <div class="row">
                  <div class="col-sm-6">
                    Cantidad del producto: <br/>
                    <input type="number" id="cantidad" class="swal2-input w-100" style="margin: 5px 0 !important">
                  </div>
                  <div class="col-sm-6">
                    Importe actual: <br/>
                    <input type="text" id="importe" disabled class="swal2-input w-100" style="margin: 5px 0 !important">
                  </div>
                  <div class="col-sm-12">
                    <h3>Precio unitario: ` + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(productos[0].precioVenta) + `</h3>
                  </div>
                </div>
              </div>
            `,
            focusConfirm: false,
            allowEscapeKey: true,
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            showCancelButton: true,
            didOpen: () => {
              const popup = Swal.getPopup()!
              importeInput = popup.querySelector('#importe') as HTMLInputElement
              importeInput.value = '$'
              cantidadProductoInput = popup.querySelector('#cantidad') as HTMLInputElement
              cantidadProductoInput.onkeyup = (event) => {
                if (event.key === 'Enter') {
                  Swal.clickConfirm() 
                } else {
                  if (cantidadProductoInput.value != '') {
                    importeInput.value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((parseFloat(cantidadProductoInput.value) * productos[0].precioVenta)).toString()
                  } else importeInput.value = '$'
                }
              }
              cantidadProductoInput.focus();
            },
            preConfirm: () => {
              const cantidad = cantidadProductoInput.value
              if (cantidad == '') {
                Swal.showValidationMessage(`Introduce la cantidad de producto`)
              } else {
                if (this.productosVentaActual.length !== 0) {
                  this.productosVentaActual.forEach(prod => {
                    if (prod.id == productos[0].id) {
                      item = this.productosVentaActual.findIndex(i => i.id === productos[0].id)
                      productoRepetido = true;
                      return;
                    } 
                  })
        
                  if (productoRepetido) {
                    this.productosVentaActual[item].cantidad = this.productosVentaActual[item].cantidad + parseFloat(cantidad)
                  } else {
                    productos[0].cantidad = parseFloat(cantidadProductoInput.value);
                    this.productosVentaActual.push(...productos);  
                  }
                  
                } else {
                  productos[0].cantidad = parseFloat(cantidadProductoInput.value);
                  this.productosVentaActual.push(...productos);
                }

                // productos[0].cantidad = parseFloat(cantidadProductoInput.value);
                // this.productosVentaActual.push(...productos);
              }
            },
            didClose: () => {
              const inputCodigoDeProducto = this.el.nativeElement.querySelector("#codigoDeProducto");
              inputCodigoDeProducto.focus();
              this.ventasService.$productosVentaActual.emit(this.productosVentaActual)
            }
          })
        }

        if (productos[0].seVende == 3) { // Productos que se venden como paquete (kit)

        }

        this.selectRow(productos[0].id)
      }
      this.ventasService.$productosVentaActual.emit(this.productosVentaActual)

    }).catch( e => console.log('error: ', e))
  }

  borrarProductoVentaActual(codigo) {
    this.productosVentaActual.forEach((item, index) => {
      if (item.id === codigo) this.productosVentaActual.splice(index, 1);
    })
    this.ventasService.$productosVentaActual.emit(this.productosVentaActual);
  }

  restarCantidad(id) {
    let item = this.productosVentaActual.findIndex(i => i.id === id);

    if(item>-1) {
      if(this.productosVentaActual[item].seVende != 2) {  // Permitir decrementar solo cuando NO ES VENTA A GRANEL
        if(this.productosVentaActual[item].cantidad <= 1) {
          this.productosVentaActual.splice(item, 1)
          this.rowSelected = '0'
        } else {
          this.productosVentaActual[item].cantidad -= 1;
        }
        this.ventasService.$productosVentaActual.emit(this.productosVentaActual)
      }
    }
  }

  agregarCantidad(id) {
    console.log(id)
    let item = this.productosVentaActual.findIndex(i => i.id === id);
    if(item>-1) {
      if(this.productosVentaActual[item].seVende != 2) {  // Permitir incrementar solo cuando NO ES VENTA A GRANEL
        this.productosVentaActual[item].cantidad += 1;
        this.ventasService.$productosVentaActual.emit(this.productosVentaActual)
      }
    }    
  }

  // editarProducto(codigoDeBarras: string) {
  //   // this.router.navigate(['/productos', {id:codigoDeBarras} ]);
  //   this.router.navigateByUrl('/productos/' + codigoDeBarras)
  // }
}
