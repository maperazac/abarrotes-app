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
    if(event.code == 'F10') {  // F10  para abrir popup de busqueda de productos
      event.preventDefault();
      if (this.idVentaActiva) this.procesarEvento(3);
    }

    if(event.code == 'F6') {  // F6 para iniciar una nueva venta
      event.preventDefault();
      this.crearNuevaVenta();
    }

    if(event.code == 'Delete') {  // DEL para borrar elemento seleccionado de la venta actual
      event.preventDefault();
      if (this.idVentaActiva) this.procesarEvento(7); 
    }

    if((event.code == 'ArrowUp' || event.code == 'ArrowDown') && this.idVentaActiva) {  // Flecha arriba para navegacion en la tabla de productos en venta actual
      // event.preventDefault();
      this.navegacionConFlechas(event.code); 
    }

    if(event.code == 'NumpadAdd') {  // + Para aumentar la cantidad de un producto en 1
      event.preventDefault();
      if (this.idVentaActiva) this.agregarCantidad(this.rowSelected); 
    }

    if(event.code == 'NumpadSubtract') {  // - Para disminuir la cantidad de un producto en 1
      event.preventDefault();
      if (this.idVentaActiva) this.restarCantidad(this.rowSelected); 
    }

    if((event.code == 'Numpad0' || event.code == 'Numpad1' || event.code == 'Numpad2' || event.code == 'Numpad3'
        || event.code == 'Numpad4' || event.code == 'Numpad5' || event.code == 'Numpad6' || event.code == 'Numpad7'
        || event.code == 'Numpad8' || event.code == 'Numpad9')  && this.idVentaActiva) {  // Al presionar numeros, poner focus en el cuadro de codigo de barras
      
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
        if (this.idVentaActiva) this.procesarEvento(2);
      }
  }

  @Input() modalCerrado;
  @ViewChild('modalBusquedaProductos') modalBusquedaProductos: ElementRef;
  @ViewChild('modalCobrarVenta') modalCobrarVenta: ElementRef;
  modalBusquedaProductosAbierto = false;
  buscarProducto = new BuscarProductoModel();
  productosVentaActual: ProductoInterface[] = [];
  productosEnVentaActiva: ProductoInterface[] = []; 
  botonSeleccionado = 0;
  busquedaInput: HTMLInputElement  
  inputProductoSeleccionado: HTMLInputElement 
  ventas: VentaInterface[] = [];
  idVentaActiva: number;

  constructor(private auth: AuthService,
              private el: ElementRef,
              private router: Router,
              private productosService: ProductosService,
              private ventasService: VentasService) { }

  rowSelected: string = '0';
  efectivoInicialEnCaja: string = localStorage.getItem('efectivoInicialEnCaja');

  ngOnInit() {
    this.efectivoInicialRegistrado();
    this.obtenerVentasActivas();
    this.obtenerProductosEnVentasActuales();
    
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

    this.ventasService.$idVentaActiva.subscribe((id) => {
      this.idVentaActiva = id;
      // console.log("Venta activa:" ,this.idVentaActiva)
    })    
  }

  ngAfterViewInit() {
      const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeProducto");
      inputPalabraClave.focus();
  }

  async obtenerVentasActivas() {  // Revisa en localstorage si hay ventas pendientes y abiertas, en caso de que no exista, se crea una nueva.
    const ventas: VentaInterface[] = JSON.parse(localStorage.getItem("ventasLS"))
    if(ventas == null || ventas.length == 0) { // Si no existen ventas en el localstorage, se inserta una nueva
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
      this.ventasService.agregarVentaLocalstorage(nuevaVenta) // Y esa nueva creada, se agrega al localstorage
      this.ventas.push(nuevaVenta); // Y tambien se agrega a "ventas" para que se muestre en las pestañas de ventas
      // this.idVentaActiva = nuevaVenta.idTemp;
      localStorage.setItem("productosEnVentasLS", JSON.stringify([]));
      this.seleccionarComoVentaActiva(nuevaVenta.idTemp) // Como no habia ninguna, esta nueva creada se marca como la venta activa (pestaña abierta)
    } else { // En caso contrario, que ya existan ventas pendientes en el localstorage, solo se obtienen y se asignan a la variable "ventas" para mostrar las pestañas
      this.ventas = ventas;
      this.ventas.forEach(el => {
        if (el.seleccionada) this.seleccionarComoVentaActiva(el.idTemp) // Aqui se revisa cual de las ventas en el localstorage viene con "seleccionada" = 1 para seguir dejando esta activa
      })
    }
  }

  async obtenerProductosEnVentasActuales() {
    const productosEnVentasActuales: ProductoInterface[] = JSON.parse(localStorage.getItem("productosEnVentasLS")) // Se obtiene el localstorage con los productos que se han agregado a ventas actuales
    if(productosEnVentasActuales != null && productosEnVentasActuales.length > 0) { // Se revisa si el localstorage trae algo, en ese caso, se asigna a productosVentaActual
      this.productosVentaActual = productosEnVentasActuales;
      this.ventasService.$productosVentaActual.emit(this.productosVentaActual); // Y se emite el array para tenerlo disponible en otros componentes de la aplicacion, en este caso el footer para mostrar los totales.
    } else {
      localStorage.setItem("productosEnVentasLS", JSON.stringify([]));
    }
  }

  selectRow(id: string) {
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

    if(id == 2) {  // Producto común
      let descripcionProducto: HTMLInputElement; 
      let cantidadProducto: HTMLInputElement; 
      let precioProducto: HTMLInputElement; 

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
          Precio unitario: <br/>
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
        didOpen: () => {
          const popup = Swal.getPopup()!
          descripcionProducto = popup.querySelector('#descripcionProductoComun') as HTMLInputElement
          cantidadProducto = popup.querySelector('#cantidadProductoComun') as HTMLInputElement
          precioProducto = popup.querySelector('#precioProductoComun') as HTMLInputElement

          (descripcionProducto).onkeyup = (event) => {
            if (event.key === 'Enter') {
              if(descripcionProducto.value == '' || cantidadProducto.value == '' || precioProducto.value == '') {
                Swal.showValidationMessage(`Es necesario llenar todos los campos`);
              } else {
                Swal.clickConfirm();
              }
            }
          }

          (cantidadProducto).onkeyup = (event) => {
            if (event.key === 'Enter') {
              if(descripcionProducto.value == '' || cantidadProducto.value == '' || precioProducto.value == '') {
                Swal.showValidationMessage(`Es necesario llenar todos los campos`);
              } else {
                Swal.clickConfirm();
              }
            }
          }

          (precioProducto).onkeyup = (event) => {
            if (event.key === 'Enter') {
              if(descripcionProducto.value == '' || cantidadProducto.value == '' || precioProducto.value == '') {
                Swal.showValidationMessage(`Es necesario llenar todos los campos`);
              } else {
                Swal.clickConfirm();
              }
            }
          }


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
          cantidad: parseFloat(formValues[1]),
          ventaId: this.idVentaActiva
        }
        this.productosVentaActual.push(nuevoProductoComun);
        localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
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
          html: this.modalBusquedaProductos.nativeElement,
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
      let elemento = (<HTMLInputElement>document.querySelector('input[name=productosRadioSelect]:checked'))
      
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

  navegacionConFlechas(codigo: string) {
    let actualizado = false;
    let elemento = <HTMLInputElement>document.querySelector('input[name=productosRadioSelect]:checked')
    let prodVentaActiva = this.productosVentaActual.filter(p => p.ventaId == this.idVentaActiva);
    if(elemento){
      prodVentaActiva.forEach((prod, index) => {
        if( prod.id == this.rowSelected && !actualizado) {
          if(codigo == 'ArrowDown') {
            if(prodVentaActiva.length > index + 1) {
              let elem = document.getElementById(prodVentaActiva[index + 1].id);
              elem.click();
            } else {
              let elem = document.getElementById(prodVentaActiva[0].id);
              elem.click();
            }
          } else {
            if(index > 0) {
              let elem = document.getElementById(prodVentaActiva[index - 1].id);
              elem.click();
            } else {
              let elem = document.getElementById(prodVentaActiva[prodVentaActiva.length - 1].id);
              elem.click();
            }
          }
          
          actualizado = true;
        } 
      });
    } else {
      let elemento = (<HTMLInputElement>document.querySelector('input[name=productosRadioSelect]'))
      if(elemento){
        if(codigo == 'ArrowDown') {
          elemento.click()
        } else {
          let elem = document.getElementById(prodVentaActiva[prodVentaActiva.length - 1].id);
          elem.click();
        }
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
          ventaId: this.idVentaActiva,
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

          this.beep();
          this.productosVentaActual = JSON.parse(localStorage.getItem("productosEnVentasLS"));
          
          if (this.productosVentaActual.filter(p => p.ventaId == this.idVentaActiva).length !== 0) {  // Si ya existen articulos en la venta activa actual
            this.productosVentaActual.forEach(prod => {
              if (prod.id == productos[0].id && prod.ventaId == this.idVentaActiva) {
                item = this.productosVentaActual.findIndex(i => i.id === productos[0].id && i.ventaId == this.idVentaActiva)
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
              importeInput.value = '$0.00'
              cantidadProductoInput = popup.querySelector('#cantidad') as HTMLInputElement
              cantidadProductoInput.onkeyup = (event) => {
                if (event.key === 'Enter') {
                  Swal.clickConfirm() 
                } else {
                  if (cantidadProductoInput.value != '') {
                    importeInput.value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((parseFloat(cantidadProductoInput.value) * productos[0].precioVenta)).toString()
                  } else importeInput.value = '$0.00'
                }
              }
              cantidadProductoInput.focus();
            },
            preConfirm: () => {
              const cantidad = cantidadProductoInput.value
              if (cantidad == '' || parseFloat(cantidad) <= 0) {
                Swal.showValidationMessage(`Introduce una cantidad válida`)
              } else {
                if (this.productosVentaActual.length !== 0) {
                  this.productosVentaActual.forEach((prod, index) => {
                    if (prod.id == productos[0].id && prod.ventaId == this.idVentaActiva) {
                      // item = this.productosVentaActual.findIndex(i => i.id === productos[0].id && prod.ventaId == this.idVentaActiva)
                      item = index;
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
              localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
              this.ventasService.$productosVentaActual.emit(this.productosVentaActual)
            }
          })
        }

        if (productos[0].seVende == 3) { // Productos que se venden como paquete (kit)

        }

        this.selectRow(productos[0].id)
      }
      localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
      this.ventasService.$productosVentaActual.emit(this.productosVentaActual)
    }).catch( e => console.log('error: ', e))
  }

  borrarProductoVentaActual(codigo) {
    this.productosVentaActual.forEach((item, index) => {
      if (item.id === codigo && item.ventaId === this.idVentaActiva) this.productosVentaActual.splice(index, 1);
    })
    localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
    this.ventasService.$productosVentaActual.emit(this.productosVentaActual);
  }

  restarCantidad(id) {
    let item = this.productosVentaActual.findIndex(i => i.id === id && i.ventaId == this.idVentaActiva);

    if(item>-1) {
      if(this.productosVentaActual[item].seVende != 2) {  // Permitir decrementar solo cuando NO ES VENTA A GRANEL
        if(this.productosVentaActual[item].cantidad <= 1) {
          this.productosVentaActual.splice(item, 1)
          this.rowSelected = '0'
        } else {
          this.productosVentaActual[item].cantidad -= 1;
        }
        localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
        this.ventasService.$productosVentaActual.emit(this.productosVentaActual)
      }
    }
  }

  agregarCantidad(id) {
    console.log(id)
    let item = this.productosVentaActual.findIndex(i => i.id === id && i.ventaId == this.idVentaActiva);
    if(item>-1) {
      if(this.productosVentaActual[item].seVende != 2) {  // Permitir incrementar solo cuando NO ES VENTA A GRANEL
        this.productosVentaActual[item].cantidad += 1;
        localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
        this.ventasService.$productosVentaActual.emit(this.productosVentaActual)
      }
    }    
  }

  seleccionarComoVentaActiva(idTemp: number) {
    this.ventasService.setVentaActiva(idTemp);
    this.idVentaActiva = idTemp;

    // CUANDO SE CAMBIA LA PESTAÑA A OTRA VENTA, TENGO QUE SELECCIONAR MARCAR COMO SELECCIONADO EL PRIMER PRODUCTO DE LA VENTA QUE SE ABRE.
    let prodVentaActual = this.productosVentaActual.filter(v => v.ventaId == idTemp)
    if(prodVentaActual.length > 0) {
      this.selectRow(prodVentaActual[0].id)
    }
    // this.ventasService.$productosVentaActual.emit(this.productosVentaActual)
  }

  // editarProducto(codigoDeBarras: string) {
  //   // this.router.navigate(['/productos', {id:codigoDeBarras} ]);
  //   this.router.navigateByUrl('/productos/' + codigoDeBarras)
  // }

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

  beep() {
    var snd = new  Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
    snd.play();
  }
}
