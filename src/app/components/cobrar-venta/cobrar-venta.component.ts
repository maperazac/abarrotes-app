import { Component, Input, OnInit, HostListener, Output, EventEmitter } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { FormControl, FormGroup } from '@angular/forms';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import VentaInterface from 'src/app/interfaces/ventas.interface';
import { TeclasService } from 'src/app/services/teclas.service';
import { VentasdbService } from 'src/app/services/ventasdb.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cobrar-venta',
  templateUrl: './cobrar-venta.component.html',
  styleUrls: ['./cobrar-venta.component.scss']
})
export class CobrarVentaComponent implements OnInit {
  formularioPago: FormGroup;
  @Input() ventaTotalPesos;
  @Input() cantidadArticulos;
  @Input() idVentaActiva;
  @Input() idVentaActivaInterno;
  @Input() productosVentaActual;

  @Output() obtenerVentasActivas = new EventEmitter();

  formaPago = 1;
  cambio = 0;
  activarBotonAceptar=false;
  finalizandoVenta = false;
  ventasActuales;

  @HostListener('document:keydown', ['$event'])
  @HostListener('keydown', ['$event'])

  handleKeyboardEvent(event: KeyboardEvent) {
    // ***** TODO ESTE BLOQUE TIENE QUE IR EN LOS COMPONENTES DE TODOS LOS CUADROS DE DIALOGO *****
    // Bloquear combinaciones como Control+O
    if (event.ctrlKey || event.altKey || event.metaKey) {
      event.preventDefault();
      return;
    }    
    // Si no es una tecla permitida, prevenimos su acción predeterminada
    if (!this.teclas.esTeclaPermitida(event)) {
      event.preventDefault();
    } 
    // **********************************************************************************************
    
    if(event.code == 'Escape') {
      event.preventDefault();
      // event.target.value = '';
      this.cerrarModalCobro();
    }

    if(event.code == 'F1') {  // F1 Para cobrar la venta e imprimir el ticket
      event.preventDefault();
      this.cobrarEImprimirTicket(); 
    }

    if(event.code == 'Tab') { // Con Tab van a poder navegar por las diferentes formas de pago (1 = Efectivo, 2 = Credito (fiado), 3 = Mixto)
      event.preventDefault();
      if(this.formaPago < 3) {
        this.formaPago += 1;
      } else if (this.formaPago == 3) {
        this.formaPago -= 2; 
      }
      this.cambiarFormaPago(this.formaPago);
    }
  }

  constructor(private ventasdbService: VentasdbService,
              private teclas: TeclasService
  ) {
    this.formularioPago =  new FormGroup({
      pagoCon: new FormControl('')
    })
   }

  ngOnInit(): void {
    this.ventasdbService.$ventasActuales.subscribe(ventas => {
      this.ventasActuales = ventas;
    })
    
    // Inicializar el formulario con el total de la venta
    this.formularioPago.patchValue({
      pagoCon: this.ventaTotalPesos
    });
    
    // Activar el botón si el pago es exacto (cambio = 0)
    this.activarBotonAceptar = true;
    this.cambio = 0;
  }

  cambiarFormaPago(tipo: number) {
    this.formaPago = tipo;
  }

  calcularCambio(event: any) {
    const cambio = event.target.value - this.ventaTotalPesos;
    this.cambio = cambio > 0 ? cambio : 0;
    this.activarBotonAceptar = event.target.value >= this.ventaTotalPesos ? true : false;
  }

  cerrarModalCobro() {
    // this.productosTemp = this.productos;
    // this.ProductoSeleccionado = <ProductoInterface>{}
    this.activarBotonAceptar = false;
    this.finalizandoVenta = false;
    this.cambio = 0;
    this.formularioPago.reset();
    setTimeout(() => {
      Swal.close();
    }, 50);
  }

  async cobrarEImprimirTicket() {
    if (this.activarBotonAceptar) {
      this.activarBotonAceptar = false;
      this.finalizandoVenta = true;
    
      let ventaAFinalizar: VentaInterface = this.ventasActuales.find(i => i.id === this.idVentaActivaInterno) // Obtiene la venta que se va a finalizar (la que está activa)

      const pagoCon = this.formularioPago.get('pagoCon')?.value || this.ventaTotalPesos;
      ventaAFinalizar.cambio = (parseFloat(pagoCon) - this.ventaTotalPesos).toString(); // Calcular
      ventaAFinalizar.fechaVentaFinalizada = Timestamp.fromDate(new Date());
      ventaAFinalizar.formaDePago = this.formaPago;
      ventaAFinalizar.idCliente = "0" // Cuando se haga el flujo de pagos a creditos y registro de clientes se va a actualizar aqui.
      ventaAFinalizar.pagoCon = pagoCon.toString();
      ventaAFinalizar.total = this.ventaTotalPesos;
      ventaAFinalizar.totalArticulos = this.cantidadArticulos;
      ventaAFinalizar.totalPagadoCredito = "0", // Cuando se haga el flujo de pagos a creditos y registro de clientes se va a actualizar aqui.
      ventaAFinalizar.totalPagadoEfectivo = this.ventaTotalPesos // Cuando se haga el flujo de pagos a creditos y registro de clientes se va a actualizar aqui.
      ventaAFinalizar.detalleProductos = this.productosVentaActual.map(prod => ({
        cantidad: prod.cantidad?.toString() || '0',
        descripcion: prod.descripcion,
        id: prod.id!,
        precioVenta: prod.precioVenta.toString(),
        codigoDeBarras: prod.codigoDeBarras,
        departamento: prod.departamento,
        importe: prod.importe?.toString() || '0',
        seVende: prod.seVende
      }))
      
      await this.ventasdbService.finalizarVenta(ventaAFinalizar, ventaAFinalizar.id);

      // Emitir la última venta finalizada para la barra de estado
      this.ventasdbService.$ultimaVentaFinalizada.emit(ventaAFinalizar);

      // await this.ventasdbService.$ventasActuales.emit(this.ventasActuales.filter(x => x.id !== ventaAFinalizar.id));
      // await this.ventasdbService.$productosVentaActual.emit(this.productosVentaActual.filter(x => x.ventaId !== ventaAFinalizar.id));

      // const ventas = await this.ventasPorStatus("0");

      // this.ventasdbService.$ventasActuales.emit(ventas);

      this.ventasdbService.guardarDetalleVentaProductos(this.productosVentaActual);
      
      this.borrarProductosDeVentaFinalizada();
      this.obtenerVentasActivas.emit({esFinalizada: true});
      this.finalizandoVenta = false;
      this.formaPago = 1;
      this.cambio = 0;
      this.formularioPago.reset();

      // Swal.close();
      Swal.fire({
        title: '',
        text: 'Venta completada correctamente',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        didClose: () => {
          // this.formulario.reset();     
          // const codigoDeBarras= this.el.nativeElement.querySelector("#codigoDeBarras");
          // codigoDeBarras.focus();
        }
      })
    }
  }

  borrarProductosDeVentaFinalizada() {
    this.productosVentaActual.forEach((item) => { // Recorre el arreglo de productos en la venta actual, en teoria todos deben venir con la misma ventaId. A la primera coincidencia que encuentra, remueve todos los productos con esa venta.
      if (item.ventaId === this.idVentaActivaInterno) {
        this.productosVentaActual = this.productosVentaActual.filter(x => (x.ventaId !== this.idVentaActivaInterno));
        
      }
    })

    const productosEnVentaLS: ProductoInterface[] = JSON.parse(localStorage.getItem("productosEnVentasLS"));
    localStorage.setItem("productosEnVentasLS", JSON.stringify(productosEnVentaLS.filter(producto => producto.ventaId != this.idVentaActivaInterno)));

    this.ventasdbService.$productosVentaActual.emit(this.productosVentaActual);
  }

  async ventasPorStatus(status: string){
    const ventas: any[] = [];

    await this.ventasdbService.obtenerVentasPorStatus(status).then(docRef => {
      docRef.forEach ( venta => {
        ventas.push({
          id: venta.id,
          ...venta.data()
        })
      })
    })

    return ventas;
  }

}
