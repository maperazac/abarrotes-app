import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Router } from '../../../../node_modules/@angular/router';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { ProductosService } from 'src/app/services/productos.service';
import { BuscarProductoModel } from 'src/app/models/buscarProducto.model';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import { BuscarProductosComponent } from '../../components/buscar-productos/buscar-productos.component';
import { Input } from '@angular/core';
import VentaInterface from 'src/app/interfaces/ventas.interface';
import { VentasdbService } from 'src/app/services/ventasdb.service';
import { DocumentReference, Timestamp } from '@angular/fire/firestore';
import { TeclasService } from 'src/app/services/teclas.service';

@Component({
  selector: 'app-ventas',
  templateUrl: './ventas.component.html',
  styleUrls: ['./ventas.component.scss']
})
export class VentasComponent implements OnInit {

  @HostListener('document:keydown', ['$event'])

  handleKeyDown(event: KeyboardEvent) {
    // Si no es una tecla permitida, prevenimos su acción predeterminada
    if (!this.teclas.esTeclaPermitida(event)) {
      event.preventDefault();
      console.log(`Tecla bloqueada: ${event.key} (${event.code})`);
    } 

    if(event.code == 'F10') {  // F10  para abrir popup de busqueda de productos
      event.preventDefault();
      if (this.idVentaActivaInterno) this.procesarEvento(3);
    }

    if(event.code == 'F6') {  // F6 para iniciar una nueva venta
      event.preventDefault();
      if(!this.cambiandoDeVenta) this.crearNuevaVenta();
    }

    if(event.code == 'F7') {  // F7 para abrir el modal de entrada de dinero
      event.preventDefault();
      this.procesarEvento(5);
    }

    if(event.code == 'F8') {  // F8 para abrir el modal de salida de dinero
      event.preventDefault();
      this.procesarEvento(6);
    }

    if(event.code == 'Delete') {  // DEL para borrar elemento seleccionado de la venta actual
      event.preventDefault();
      if (this.idVentaActivaInterno) this.procesarEvento(7); 
    }

    if((event.code == 'ArrowUp' || event.code == 'ArrowDown') && this.idVentaActivaInterno) {  // Flecha arriba para navegacion en la tabla de productos en venta actual
      // event.preventDefault();
      this.navegacionConFlechas(event.code); 
    }

    if(event.code == 'NumpadAdd') {  // + Para aumentar la cantidad de un producto en 1
      event.preventDefault();
      if (this.idVentaActivaInterno) this.agregarCantidad(this.rowSelected); 
    }

    if(event.code == 'NumpadSubtract') {  // - Para disminuir la cantidad de un producto en 1
      event.preventDefault();
      if (this.idVentaActivaInterno) this.restarCantidad(this.rowSelected); 
    }

    if((event.code == 'Numpad0' || event.code == 'Numpad1' || event.code == 'Numpad2' || event.code == 'Numpad3'
        || event.code == 'Numpad4' || event.code == 'Numpad5' || event.code == 'Numpad6' || event.code == 'Numpad7'
        || event.code == 'Numpad8' || event.code == 'Numpad9')  && this.idVentaActivaInterno) {  // Al presionar numeros, poner focus en el cuadro de codigo de barras
      
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
        if (this.idVentaActivaInterno) this.procesarEvento(2);
      }
  }

  @Input() modalCerrado;
  @ViewChild('modalBusquedaProductos') modalBusquedaProductos: ElementRef;
  // @ViewChild('modalCobrarVenta') modalCobrarVenta: ElementRef;
  @ViewChild('modalProductoComun') modalProductoComun: ElementRef;
  @ViewChild('modalEntradaDinero') modalEntradaDinero: ElementRef;
  @ViewChild('modalSalidaDinero') modalSalidaDinero: ElementRef;
  modalBusquedaProductosAbierto = false;
  buscarProducto = new BuscarProductoModel();
  productosVentaActual: ProductoInterface[] = [];
  productosEnVentaActiva: ProductoInterface[] = []; 
  botonSeleccionado = 0;
  busquedaInput: HTMLInputElement  
  inputProductoSeleccionado: HTMLInputElement 
  ventas: VentaInterface[] = [];
  idVentaActiva: number;
  idVentaActivaInterno; // Es el id interno de la venta activa, el que registra firestore automaticamente. Se usa para guardar los productos de la venta en detalleVentas
  cargandoVentas = true;
  cambiandoDeVenta = false;
  duracionEnSegundos = 0;

  constructor(private auth: AuthService,
              private el: ElementRef,
              private router: Router,
              private productosService: ProductosService,
              private ventasdbService: VentasdbService,
              private teclas: TeclasService) { }

  rowSelected: string = '0';
  efectivoInicialEnCaja: string = localStorage.getItem('efectivoInicialEnCaja');

  ngOnInit() {    
    this.efectivoInicialRegistrado();
    this.obtenerVentasActivas();
    this.obtenerProductosEnVentasActuales();
    
    this.ventasdbService.$ventasActuales.subscribe((valor) => {
      this.ventas = valor;
    })

    this.ventasdbService.$idVentaActiva.subscribe((id) => {
      this.idVentaActiva = id;
    })   

    this.ventasdbService.$idVentaActivaInterno.subscribe((idInterno) => {
      this.idVentaActivaInterno = idInterno;
    })
    
    this.ventasdbService.$cambiandoDeVenta.subscribe((estado) => {
      this.cambiandoDeVenta = estado;
    })
  }

  ngAfterViewInit() {
      const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeProducto");
      inputPalabraClave.focus();
  }

  async ventasPorStatus(status: string){
    const ventas: any[] = [];

    try {
      await this.ventasdbService.obtenerVentasPorStatus(status).then(docRef => {
        docRef.forEach ( venta => {
          ventas.push({
            id: venta.id,
            ...venta.data()
          })
        })
      })
      
      // Ordenar manualmente en el cliente
      if (status === "0") {
        // Para ventas en curso, ordenar por fechaVentaIniciada
        ventas.sort((a, b) => {
          const fechaA = a.fechaVentaIniciada?.toDate?.() || new Date(0);
          const fechaB = b.fechaVentaIniciada?.toDate?.() || new Date(0);
          return fechaA.getTime() - fechaB.getTime();
        });
      } else {
        // Para ventas finalizadas, ordenar por fechaVentaFinalizada
        ventas.sort((a, b) => {
          const fechaA = a.fechaVentaFinalizada?.toDate?.() || new Date(0);
          const fechaB = b.fechaVentaFinalizada?.toDate?.() || new Date(0);
          return fechaA.getTime() - fechaB.getTime();
        });
      }
      
    } catch (error: any) {
      console.error('Error al obtener ventas por status:', error);
      console.error('Código de error:', error.code);
      console.error('Mensaje de error:', error.message);
      
      let errorMessage = 'No se pudo conectar a Firebase.';
      let errorDetails = '';
      
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        errorMessage = 'Falta crear un índice en Firestore';
        errorDetails = 'Ve a la consola de Firebase (Firestore Database → Indexes) y crea el índice necesario. El enlace para crearlo aparece en la consola del navegador (F12).';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Permisos denegados en Firestore';
        errorDetails = 'Las reglas de seguridad de Firestore están bloqueando el acceso. Ve a Firestore Database → Rules en la consola de Firebase.';
      } else if (error.message?.includes('network') || error.message?.includes('offline')) {
        errorMessage = 'Sin conexión a internet';
        errorDetails = 'Verifica tu conexión a internet y que Firebase esté accesible.';
      }
      
      Swal.fire({
        icon: 'error',
        title: errorMessage,
        text: errorDetails,
        footer: `<small>Error técnico: ${error.code || error.message}</small>`
      });
    }

    // this.ventasdbService.actualizarVentasActuales(ventas);

    return ventas;
  }

  async obtenerVentasActivas(event?: { esFinalizada: boolean }) {  // Revisa en localstorage si hay ventas pendientes y abiertas. El parametro esFinalizada solo se recibe cuando se acaba de finalizar una venta, en ese caso, si fue la ultima venta que estaba activa, si se tiene que abrir una venta nueva.
    // const ventas: VentaInterface[] = JSON.parse(localStorage.getItem("ventasLS"))
    this.cambiandoDeVenta = true;

    try {
      const ventas = await this.ventasPorStatus("0");

      this.ventasdbService.$ventasActuales.emit(ventas);

        // this.ventas = ventas;

        if(ventas == null || ventas.length == 0) { // Si no existen ventas en base de datos con status = 0 (en curso), se inserta una nueva
          if(event && event.esFinalizada) {
           this.crearNuevaVenta(); 
          } else {
            this.ventasdbService.$idVentaActiva.emit(0);
            this.ventasdbService.$idVentaActivaInterno.emit(0);
          }        
        } else { // En caso contrario, que ya existan ventas en curso en base de datos, solo se obtienen y se asignan a la variable "ventas" para mostrar las pestañas
          this.ventas = ventas;
          let existeSeleccionada = false;
          this.ventas.forEach(el => {
            if (el.seleccionada) {
              existeSeleccionada = true;
              this.seleccionarComoVentaActiva(el.idTemp, el.id) // Aqui se revisa cual de las ventas en el localstorage viene con "seleccionada" = 1 para seguir dejando esta activa
            }
          })
          if(!existeSeleccionada){
            this.seleccionarComoVentaActiva(this.ventas[this.ventas.length - 1].idTemp, this.ventas[this.ventas.length - 1].id); // Si ninguna venta de base de datos trae el status "seleccionada" en 1, entonces se selecciona la ultima venta creada
          }
        }
    } catch (error) {
      console.error('Error al obtener ventas activas:', error);
    } finally {
      this.cargandoVentas = false;
      this.cambiandoDeVenta = false;
    }
  }

  async obtenerProductosEnVentasActuales() {
    const productosEnVentasActuales: ProductoInterface[] = JSON.parse(localStorage.getItem("productosEnVentasLS")) // Se obtiene el localstorage con los productos que se han agregado a ventas actuales
    if(productosEnVentasActuales != null && productosEnVentasActuales.length > 0) { // Se revisa si el localstorage trae algo, en ese caso, se asigna a productosVentaActual
      this.productosVentaActual = productosEnVentasActuales;
      this.ventasdbService.$productosVentaActual.emit(this.productosVentaActual); // Y se emite el array para tenerlo disponible en otros componentes de la aplicacion, en este caso el footer para mostrar los totales.
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
        html: this.modalProductoComun.nativeElement,
        allowOutsideClick: false,
        focusConfirm: false,
        allowEscapeKey: true,
        width: '500px',
        showConfirmButton: false,
        showCancelButton: false,
        preConfirm: () => {
          // return [
          //   (<HTMLInputElement>document.getElementById("descripcionProductoComun")).value,
          //   (<HTMLInputElement>document.getElementById("cantidadProductoComun")).value,
          //   (<HTMLInputElement>document.getElementById("precioProductoComun")).value
          // ];
        },
        didOpen: () => {
          const popup = Swal.getPopup()!
          descripcionProducto = popup.querySelector('#descripcionProductoComun') as HTMLInputElement
          cantidadProducto = popup.querySelector('#cantidadProductoComun') as HTMLInputElement
          precioProducto = popup.querySelector('#precioProductoComun') as HTMLInputElement

          // (descripcionProducto).onkeyup = (event) => {
          //   if (event.key === 'Enter') {
          //     if(descripcionProducto.value == '' || cantidadProducto.value == '' || precioProducto.value == '') {
          //       Swal.showValidationMessage(`Es necesario llenar todos los campos`);
          //     } else {
          //       Swal.clickConfirm();
          //     }
          //   }
          // }

          // (cantidadProducto).onkeyup = (event) => {
          //   if (event.key === 'Enter') {
          //     if(descripcionProducto.value == '' || cantidadProducto.value == '' || precioProducto.value == '') {
          //       Swal.showValidationMessage(`Es necesario llenar todos los campos`);
          //     } else {
          //       Swal.clickConfirm();
          //     }
          //   }
          // }

          // (precioProducto).onkeyup = (event) => {
          //   if (event.key === 'Enter') {
          //     if(descripcionProducto.value == '' || cantidadProducto.value == '' || precioProducto.value == '') {
          //       Swal.showValidationMessage(`Es necesario llenar todos los campos`);
          //     } else {
          //       Swal.clickConfirm();
          //     }
          //   }
          // }


        },
        didClose: () => {
          // const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeProducto");
          // inputPalabraClave.focus();
        }
      });
      // if (formValues && formValues[0] != '' && formValues[1] != '' && formValues[2] != '') {
      //   const nuevoProductoComun: ProductoInterface = {
      //     id: this.getRandomInt(1000000, 9999999).toString(),
      //     codigoDeBarras: '0',
      //     descripcion: formValues[0],
      //     seVende: 0,
      //     precioCosto: 0,
      //     ganancia: 0,
      //     precioVenta: formValues[2],
      //     precioMayoreo: formValues[2],
      //     departamento: "0",
      //     cantidad: parseFloat(formValues[1]),
      //     ventaId: this.idVentaActivaInterno,
      //     importe: formValues[2] * parseFloat(formValues[1])
      //   }
      //   this.productosVentaActual.push(nuevoProductoComun);
      //   localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
      //   this.ventasdbService.$productosVentaActual.emit(this.productosVentaActual)
      //   this.selectRow(nuevoProductoComun.id)
      // } else {
      //   // console.log("llene todos los campos")
      // }
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
          if(this.inputProductoSeleccionado.value != '') {
            this.agregarProductoVentaActual(this.inputProductoSeleccionado.value)
          } else {
            // console.log("nada que agregar")
          }
        })
    }

    // -----------------------------------------------------------------

    if (id == 5) {  // Abrir modal de entrada de dinero
      Swal.fire({
        allowOutsideClick: false,
        html: this.modalEntradaDinero.nativeElement,
        focusConfirm: false,
        allowEscapeKey: true,
        width: '700px',
        showConfirmButton: false,
        showCancelButton: false,
        didOpen: () => {
          const popup = Swal.getPopup()!
          const cantidadInput = popup.querySelector('#cantidad') as HTMLInputElement
          cantidadInput.focus();
        },
        didClose: () => {
          setTimeout(() => {
            const inputCodigoDeProducto = this.el.nativeElement.querySelector("#codigoDeProducto");
            inputCodigoDeProducto.focus();
          }, 100);
        }
      })
    }

    // -----------------------------------------------------------------

    if (id == 6) {  // Abrir modal de salida de dinero
      Swal.fire({
        allowOutsideClick: false,
        html: this.modalSalidaDinero.nativeElement,
        focusConfirm: false,
        allowEscapeKey: true,
        width: '700px',
        showConfirmButton: false,
        showCancelButton: false,
        didOpen: () => {
          const popup = Swal.getPopup()!
          const cantidadInput = popup.querySelector('#cantidadSalida') as HTMLInputElement
          cantidadInput.focus();
        },
        didClose: () => {
          setTimeout(() => {
            const inputCodigoDeProducto = this.el.nativeElement.querySelector("#codigoDeProducto");
            inputCodigoDeProducto.focus();
          }, 100);
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

  insertarProductoComun(producto: any) {
    const nuevoProductoComun: ProductoInterface = {
      id: this.getRandomInt(1000000, 9999999).toString(),
      codigoDeBarras: '0',
      descripcion: producto.descripcionProductoComun,
      seVende: 0,
      precioCosto: 0,
      ganancia: 0,
      precioVenta: producto.precioProductoComun,
      precioMayoreo: producto.precioProductoComun,
      departamento: "0",
      cantidad: parseFloat(producto.cantidadProductoComun),
      ventaId: this.idVentaActivaInterno,
      importe: producto.precioProductoComun * parseFloat(producto.cantidadProductoComun)
    }
    this.productosVentaActual.push(nuevoProductoComun);
    localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
    this.ventasdbService.$productosVentaActual.emit(this.productosVentaActual)
    this.selectRow(nuevoProductoComun.id)

    Swal.close();
  }

  redondearImporte(precioVenta: number, cantidad: number) {
    let importe = (precioVenta * cantidad);
    let precioRedoneado = Math.ceil(importe * 2) / 2;
    return precioRedoneado;
  }

  navegacionConFlechas(codigo: string) {
    let actualizado = false;
    let elemento = <HTMLInputElement>document.querySelector('input[name=productosRadioSelect]:checked')
    let prodVentaActiva = this.productosVentaActual.filter(p => p.ventaId == this.idVentaActivaInterno);
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
          ventaId: this.idVentaActivaInterno,
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
          
          if (this.productosVentaActual.filter(p => p.ventaId == this.idVentaActivaInterno).length !== 0) {  // Si ya existen articulos en la venta activa actual
            this.productosVentaActual.forEach(prod => {
              if (prod.id == productos[0].id && prod.ventaId == this.idVentaActivaInterno) {
                item = this.productosVentaActual.findIndex(i => i.id === productos[0].id && i.ventaId == this.idVentaActivaInterno)
                productoRepetido = true;
                return;
              } 
            })
  
            if (productoRepetido) {
              this.productosVentaActual[item].cantidad = this.productosVentaActual[item].cantidad + cantidad;
              this.productosVentaActual[item].importe = this.productosVentaActual[item].importe + (this.productosVentaActual[item].precioVenta * cantidad);
            } else {
              this.productosVentaActual.push(...productos.map(producto =>({
                ...producto,
                importe: producto.precioVenta * cantidad
              })));
            }
            
          } else {
            this.productosVentaActual.push(...productos.map(producto => ({
              ...producto, 
              importe: producto.precioVenta * cantidad
            })))
          }
        }

        if (productos[0].seVende == 2) { // Productos que se venden a granel

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
                    let precioRedoneado = this.redondearImporte(productos[0].precioVenta, parseFloat(cantidadProductoInput.value));
                    
                    importeInput.value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(precioRedoneado).toString()
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
                    if (prod.id == productos[0].id && prod.ventaId == this.idVentaActivaInterno) {
                      // item = this.productosVentaActual.findIndex(i => i.id === productos[0].id && prod.ventaId == this.idVentaActiva)
                      item = index;
                      productoRepetido = true;
                      return;
                    } 
                  })
        
                  if (productoRepetido) {
                    this.productosVentaActual[item].cantidad = this.productosVentaActual[item].cantidad + parseFloat(cantidad);
                    this.productosVentaActual[item].importe = this.productosVentaActual[item].importe + this.redondearImporte(this.productosVentaActual[item].precioVenta, parseFloat(cantidad));
                  } else {
                    productos[0].cantidad = parseFloat(cantidadProductoInput.value);
                    // this.productosVentaActual.push(...productos);  
                    this.productosVentaActual.push(...productos.map(producto =>({
                      ...producto,
                      importe: this.redondearImporte(producto.precioVenta, parseFloat(cantidad))
                    })));
                  }
                  
                } else {
                  productos[0].cantidad = parseFloat(cantidadProductoInput.value);
                  // this.productosVentaActual.push(...productos);
                  this.productosVentaActual.push(...productos.map(producto => ({
                    ...producto, 
                    importe: this.redondearImporte(producto.precioVenta, parseFloat(cantidad))
                  })))
                }

                // productos[0].cantidad = parseFloat(cantidadProductoInput.value);
                // this.productosVentaActual.push(...productos);
              }
            },
            didClose: () => {
              const inputCodigoDeProducto = this.el.nativeElement.querySelector("#codigoDeProducto");
              inputCodigoDeProducto.focus();
              localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
              this.ventasdbService.$productosVentaActual.emit(this.productosVentaActual)
            }
          })
        }

        if (productos[0].seVende == 3) { // Productos que se venden como paquete (kit)

        }

        this.selectRow(productos[0].id)
      }
      localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
      this.ventasdbService.$productosVentaActual.emit(this.productosVentaActual)
    }).catch( e => console.log('error: ', e))
  }

  borrarProductoVentaActual(codigo) {
    this.productosVentaActual.forEach((item, index) => {
      if (item.id === codigo && item.ventaId === this.idVentaActivaInterno) this.productosVentaActual.splice(index, 1);
    })
    localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
    this.ventasdbService.$productosVentaActual.emit(this.productosVentaActual);
  }

  restarCantidad(id) {
    let item = this.productosVentaActual.findIndex(i => i.id === id && i.ventaId == this.idVentaActivaInterno);

    if(item>-1) {
      if(this.productosVentaActual[item].seVende == 1) {  // Permitir decrementar solo cuando es venta por pieza
        if(this.productosVentaActual[item].cantidad <= 1) {
          this.productosVentaActual.splice(item, 1)
          this.rowSelected = '0'
        } else {
          this.productosVentaActual[item].cantidad -= 1;
          this.productosVentaActual[item].importe = this.productosVentaActual[item].cantidad * this.productosVentaActual[item].precioVenta;
        }
        localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
        this.ventasdbService.$productosVentaActual.emit(this.productosVentaActual)
      }
    }
  }

  agregarCantidad(id) {
    console.log(id)
    let item = this.productosVentaActual.findIndex(i => i.id === id && i.ventaId == this.idVentaActivaInterno);
    if(item>-1) {
      if(this.productosVentaActual[item].seVende == 1) {  // Permitir incrementar solo cuando es venta por pieza
        this.productosVentaActual[item].cantidad += 1;
        this.productosVentaActual[item].importe = this.productosVentaActual[item].cantidad * this.productosVentaActual[item].precioVenta;
        localStorage.setItem("productosEnVentasLS", JSON.stringify(this.productosVentaActual));
        this.ventasdbService.$productosVentaActual.emit(this.productosVentaActual)
      }
    }    
  }

  async seleccionarComoVentaActiva(idTemp: number, idInterno: string) {
    
    if(this.idVentaActiva != idTemp) {
      this.idVentaActivaInterno = idInterno != '' ? idInterno : this.idVentaActivaInterno;
      let sec = 0;
      let timer = setInterval(() => {
        this.duracionEnSegundos = this.contador(++sec%60);
      }, 1000);
      this.cambiandoDeVenta = true;
      
      this.ventasdbService.actualizarVentasActuales(await this.ventasPorStatus("0"));

      this.ventasdbService.setVentaActiva(idInterno);
  
      // CUANDO SE CAMBIA LA PESTAÑA A OTRA VENTA, TENGO QUE SELECCIONAR MARCAR COMO SELECCIONADO EL PRIMER PRODUCTO DE LA VENTA QUE SE ABRE.
      // let prodVentaActual = this.productosVentaActual.filter(v => v.ventaId == idTemp)
      // if(prodVentaActual.length > 0) {
      //   this.selectRow(prodVentaActual[0].id)
      // }

      this.cambiandoDeVenta = false;
      clearInterval(timer);
      this.duracionEnSegundos = 0;
      // this.ventasdbService.$productosVentaActual.emit(this.productosVentaActual)
    }
  }

  contador(valor) {
    return valor > 9 ? valor : '0' + valor;
  }

  // editarProducto(codigoDeBarras: string) {
  //   // this.router.navigate(['/productos', {id:codigoDeBarras} ]);
  //   this.router.navigateByUrl('/productos/' + codigoDeBarras)
  // }

  async crearNuevaVenta() {
    // Si ya existe al menos una venta activa, verificar si tiene nombre
    if (this.ventas.length > 0 && this.idVentaActivaInterno) {
      const ventaActual = this.ventas.find(v => v.id === this.idVentaActivaInterno);
      
      // Solo pedir nombre si la venta actual NO tiene nombre asignado
      if (ventaActual && (!ventaActual.nombre || ventaActual.nombre.trim() === '')) {
        let nombreVentaInput: HTMLInputElement;
        
        const result = await Swal.fire({
          title: 'Asignar nombre a la venta actual',
          html: `<input type="text" id="nombreVenta" class="swal2-input" placeholder="Ej: Juan Pérez, Mesa 5, etc." maxlength="30">`,
          showCancelButton: true,
          confirmButtonText: 'Continuar',
          cancelButtonText: 'Cancelar',
          focusConfirm: false,
          didOpen: () => {
            const popup = Swal.getPopup()!;
            nombreVentaInput = popup.querySelector('#nombreVenta') as HTMLInputElement;
            nombreVentaInput.onkeyup = (event) => event.key === 'Enter' && Swal.clickConfirm();
            nombreVentaInput.focus();
          },
          preConfirm: () => {
            const nombre = nombreVentaInput.value.trim();
            return nombre || null; // Retorna null si está vacío
          },
          didClose: () => {
            // Devolver el foco al input de código de producto
            const inputCodigoDeProducto = this.el.nativeElement.querySelector("#codigoDeProducto");
            inputCodigoDeProducto.focus();
          }
        });

        // Si el usuario canceló, no crear la nueva venta
        if (result.isDismissed) {
          return;
        }

        // Asignar el nombre a la venta actual y guardarlo en Firestore
        const nombreAsignado = result.value;
        if (nombreAsignado) {
          ventaActual.nombre = nombreAsignado;
          // Guardar el nombre en Firestore
          await this.ventasdbService.actualizarNombreVenta(this.idVentaActivaInterno, nombreAsignado);
        }
      }
    }

    this.cargandoVentas = true;
    let nuevaVenta = {
      idTemp: this.getRandomInt(1000000, 9999999),
      fechaVentaIniciada: Timestamp.fromDate(new Date()),
      fechaVentaFinalizada: Timestamp.fromDate(new Date()),
      total: '0',
      totalArticulos: '0',
      formaDePago: 0,
      totalPagadoEfectivo: '0',
      totalPagadoCredito: '0',
      cambio: '0',
      pagoCon: '0',
      idCajero: '0',
      status: '0',
      seleccionada: 1,
      idCliente: '0',
      nombre: '' // Inicializar con nombre vacío
    }

    await this.ventasdbService.registrarNuevaVenta(nuevaVenta).then((documentRef: DocumentReference) =>{  // Y esa nueva creada, se agrega a la base de datos
      this.idVentaActivaInterno = documentRef.id;  // El id interno de la nueva venta se regresa y se asigna al idVentaActivaInterno
    }) 

    this.ventas.push({...nuevaVenta, id: this.idVentaActivaInterno}); // Y tambien se agrega a "ventas" para que se muestre en las pestañas de ventas

    this.seleccionarComoVentaActiva(nuevaVenta.idTemp, this.idVentaActivaInterno) // Como no habia ninguna, esta nueva creada se marca como la venta activa (pestaña abierta)
    // this.ventasdbService.$idVentaActiva.emit(nuevaVenta.idTemp);
    this.cargandoVentas = false;
  }

  beep() {
    var snd = new  Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
    snd.play();
  }
}
