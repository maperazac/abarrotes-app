import { Component, Input, OnInit, HostListener, Output, EventEmitter } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { FormControl, FormGroup } from '@angular/forms';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import VentaInterface from 'src/app/interfaces/ventas.interface';
import MovimientoInventarioInterface from 'src/app/interfaces/movimiento-inventario.interface';
import ClienteInterface, { VentaCreditoInterface, ProductoVentaCredito } from 'src/app/interfaces/cliente.interface';
import { TeclasService } from 'src/app/services/teclas.service';
import { VentasdbService } from 'src/app/services/ventasdb.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { ProductosService } from 'src/app/services/productos.service';
import { MovimientosInventarioService } from 'src/app/services/movimientos-inventario.service';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import { ClientesService } from 'src/app/services/clientes.service';
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

  // Variables para búsqueda de clientes (crédito)
  textoBusquedaCliente: string = '';
  clientesEncontrados: ClienteInterface[] = [];
  clienteSeleccionado: ClienteInterface | null = null;
  buscandoClientes: boolean = false;

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
              private teclas: TeclasService,
              private configuracionService: ConfiguracionService,
              private productosService: ProductosService,
              private movimientosService: MovimientosInventarioService,
              private departamentosService: DepartamentosService,
              private clientesService: ClientesService
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
    
    // Si cambia a efectivo, activar botón si el pago es suficiente
    if (tipo === 1) {
      const pagoCon = this.formularioPago.get('pagoCon')?.value || 0;
      this.activarBotonAceptar = pagoCon >= this.ventaTotalPesos;
    }
    
    // Si cambia a crédito, activar botón solo si hay un cliente seleccionado
    if (tipo === 2) {
      this.activarBotonAceptar = this.clienteSeleccionado !== null;
    }
    
    // Mixto aún no está implementado
    if (tipo === 3) {
      this.activarBotonAceptar = false;
    }
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
    this.formaPago = 1;
    this.clienteSeleccionado = null;
    this.clientesEncontrados = [];
    this.textoBusquedaCliente = '';
    this.formularioPago.reset();
    setTimeout(() => {
      Swal.close();
    }, 50);
  }

  // ==================== BÚSQUEDA Y SELECCIÓN DE CLIENTES ====================

  async buscarClientes(): Promise<void> {
    if (!this.textoBusquedaCliente || this.textoBusquedaCliente.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Búsqueda vacía',
        text: 'Por favor ingresa un nombre o número de cliente',
        confirmButtonText: 'Aceptar',
        timer: 2000
      });
      return;
    }

    try {
      this.buscandoClientes = true;
      this.clientesEncontrados = await this.clientesService.buscarClientes(this.textoBusquedaCliente);
      
      if (this.clientesEncontrados.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin resultados',
          text: 'No se encontraron clientes con ese criterio de búsqueda',
          confirmButtonText: 'Aceptar',
          timer: 2000
        });
      }
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron buscar los clientes',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      this.buscandoClientes = false;
    }
  }

  seleccionarCliente(cliente: ClienteInterface): void {
    this.clienteSeleccionado = cliente;
    this.clientesEncontrados = [];
    this.textoBusquedaCliente = '';
    this.activarBotonAceptar = true;

    // Verificar límite de crédito
    if (cliente.limiteCredito && cliente.limiteCredito > 0) {
      const nuevoSaldo = cliente.saldoActual + this.ventaTotalPesos;
      if (nuevoSaldo > cliente.limiteCredito) {
        Swal.fire({
          icon: 'warning',
          title: 'Límite de crédito',
          html: `
            <p>El cliente <strong>${cliente.nombre}</strong> excederá su límite de crédito:</p>
            <p>Saldo actual: <strong>$${cliente.saldoActual.toFixed(2)}</strong></p>
            <p>Nuevo saldo: <strong>$${nuevoSaldo.toFixed(2)}</strong></p>
            <p>Límite: <strong>$${cliente.limiteCredito.toFixed(2)}</strong></p>
            <p style="color: red;">Exceso: <strong>$${(nuevoSaldo - cliente.limiteCredito).toFixed(2)}</strong></p>
          `,
          showCancelButton: true,
          confirmButtonText: 'Continuar de todas formas',
          cancelButtonText: 'Cancelar venta'
        }).then((result) => {
          if (!result.isConfirmed) {
            this.clienteSeleccionado = null;
            this.activarBotonAceptar = false;
          }
        });
      }
    }
  }

  removerClienteSeleccionado(): void {
    this.clienteSeleccionado = null;
    this.activarBotonAceptar = false;
  }

  async cobrarEImprimirTicket() {
    // Validaciones según forma de pago
    if (this.formaPago === 2 && !this.clienteSeleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Cliente no seleccionado',
        text: 'Por favor selecciona un cliente para la venta a crédito',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    if (this.activarBotonAceptar) {
      this.activarBotonAceptar = false;
      this.finalizandoVenta = true;
    
      let ventaAFinalizar: VentaInterface = this.ventasActuales.find(i => i.id === this.idVentaActivaInterno) // Obtiene la venta que se va a finalizar (la que está activa)

      const pagoCon = this.formularioPago.get('pagoCon')?.value || this.ventaTotalPesos;
      
      // Configurar valores según forma de pago
      if (this.formaPago === 1) {
        // Pago en efectivo
        ventaAFinalizar.cambio = (parseFloat(pagoCon) - this.ventaTotalPesos).toString();
        ventaAFinalizar.idCliente = "0";
        ventaAFinalizar.pagoCon = pagoCon.toString();
        ventaAFinalizar.totalPagadoCredito = "0";
        ventaAFinalizar.totalPagadoEfectivo = this.ventaTotalPesos.toString();
      } else if (this.formaPago === 2) {
        // Pago a crédito
        ventaAFinalizar.cambio = "0";
        ventaAFinalizar.idCliente = this.clienteSeleccionado!.id!;
        ventaAFinalizar.nombreCliente = this.clienteSeleccionado!.nombre;
        ventaAFinalizar.pagoCon = "0";
        ventaAFinalizar.totalPagadoCredito = this.ventaTotalPesos.toString();
        ventaAFinalizar.totalPagadoEfectivo = "0";
      }

      ventaAFinalizar.fechaVentaFinalizada = Timestamp.fromDate(new Date());
      ventaAFinalizar.formaDePago = this.formaPago;
      ventaAFinalizar.total = this.ventaTotalPesos.toString();
      ventaAFinalizar.totalArticulos = this.cantidadArticulos.toString();
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

      // Si es venta a crédito, registrar en ventasCredito y actualizar saldo del cliente
      if (this.formaPago === 2 && this.clienteSeleccionado) {
        await this.registrarVentaCredito(ventaAFinalizar);
      }

      // Descontar inventario si está habilitado
      await this.descontarInventario();

      // Emitir la última venta finalizada para la barra de estado
      this.ventasdbService.$ultimaVentaFinalizada.emit(ventaAFinalizar);

      this.ventasdbService.guardarDetalleVentaProductos(this.productosVentaActual);
      
      // Guardar forma de pago antes de resetear
      const esVentaCredito = this.formaPago === 2;
      
      // Calcular el saldo total del cliente ANTES de resetear variables
      const saldoTotalCliente = esVentaCredito && this.clienteSeleccionado 
        ? this.clienteSeleccionado.saldoActual + parseFloat(ventaAFinalizar.total)
        : 0;
      
      // Preguntar si desea imprimir ticket
      Swal.fire({
        title: '¿Desea imprimir el ticket?',
        text: esVentaCredito ? 'Venta a crédito registrada correctamente' : 'Venta completada correctamente',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, imprimir',
        cancelButtonText: 'No imprimir',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6c757d'
      }).then((result) => {
        if (result.isConfirmed) {
          this.imprimirTicketVenta(ventaAFinalizar, saldoTotalCliente);
        }
      });
      
      this.borrarProductosDeVentaFinalizada();
      this.obtenerVentasActivas.emit({esFinalizada: true});
      this.finalizandoVenta = false;
      this.formaPago = 1;
      this.cambio = 0;
      this.clienteSeleccionado = null;
      this.formularioPago.reset();

      // Swal.close();
      // Mensaje ya se mostró en la confirmación de impresión
      /*Swal.fire({
        title: '',
        text: esVentaCredito ? 'Venta a crédito registrada correctamente' : 'Venta completada correctamente',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        didClose: () => {
          // this.formulario.reset();     
          // const codigoDeBarras= this.el.nativeElement.querySelector("#codigoDeBarras");
          // codigoDeBarras.focus();
        }
      });*/
    }
  }

  async registrarVentaCredito(venta: VentaInterface): Promise<void> {
    try {
      // Preparar productos para la venta a crédito
      const productosCredito: ProductoVentaCredito[] = this.productosVentaActual.map(prod => ({
        descripcion: prod.descripcion,
        precioVenta: parseFloat(prod.precioVenta.toString()),
        cantidad: parseFloat(prod.cantidad?.toString() || '0'),
        importe: parseFloat(prod.importe?.toString() || '0')
      }));

      // Crear registro de venta a crédito
      const ventaCredito: VentaCreditoInterface = {
        idVenta: venta.id!,
        idTempVenta: venta.idTemp || 0, // Guardar el ID temporal de la venta
        idCliente: this.clienteSeleccionado!.id!,
        fechaVenta: venta.fechaVentaFinalizada!,
        total: parseFloat(this.ventaTotalPesos.toString()),
        saldoPendiente: parseFloat(this.ventaTotalPesos.toString()),
        productos: productosCredito,
        liquidada: false
      };

      // Registrar venta a crédito
      await this.clientesService.registrarVentaCredito(ventaCredito);

      // Actualizar saldo del cliente
      const nuevoSaldo = this.clienteSeleccionado!.saldoActual + parseFloat(this.ventaTotalPesos.toString());
      await this.clientesService.actualizarSaldoCliente(this.clienteSeleccionado!.id!, nuevoSaldo);

      console.log('Venta a crédito registrada correctamente');
    } catch (error) {
      console.error('Error al registrar venta a crédito:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'La venta se completó pero hubo un error al registrar el crédito. Contacta al administrador.',
        confirmButtonText: 'Aceptar'
      });
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

  async descontarInventario(): Promise<void> {
    try {
      // Verificar si el control de inventario está habilitado
      const config = await this.configuracionService.obtenerOpcionesHabilitadas();
      
      if (config && config.usarInventarios) {
        // Descontar inventario de cada producto vendido
        for (const producto of this.productosVentaActual) {
          // Obtener el producto actualizado de la base de datos
          const productoActualizado = await this.productosService.obtenerProductoPorCodigoDeBarras(producto.codigoDeBarras);
          
          if (!productoActualizado.empty) {
            const productoData: any[] = [];
            productoActualizado.forEach(doc => {
              productoData.push({
                id: doc.id,
                ...doc.data()
              });
            });

            if (productoData.length > 0) {
              const productoActual = productoData[0];
              const inventarioActual = productoActual.inventario || 0;
              const cantidadVendida = producto.cantidad || 0;
              const nuevoInventario = Math.max(0, inventarioActual - cantidadVendida);

              // Actualizar el inventario en la base de datos
              await this.productosService.modificarProducto(
                { ...productoActual, inventario: nuevoInventario },
                productoActual.id
              );

              // Obtener el nombre del departamento
              let nombreDepartamento = 'Sin Departamento';
              if (productoActual.departamento && productoActual.departamento !== '0') {
                const deptoDoc = await this.departamentosService.obtenerDepartamentosPorId(productoActual.departamento);
                if (deptoDoc.exists()) {
                  const deptoData: any = deptoDoc.data();
                  nombreDepartamento = deptoData.nombre || 'Sin Departamento';
                }
              }

              // Registrar movimiento de inventario
              const movimiento: MovimientoInventarioInterface = {
                fecha: Timestamp.fromDate(new Date()),
                idProducto: productoActual.id,
                descripcionProducto: producto.descripcion,
                cantidadAnterior: inventarioActual,
                cantidadMovimiento: cantidadVendida,
                cantidadNueva: nuevoInventario,
                tipo: 'VENTA',
                idCajero: localStorage.getItem('userId') || '0',
                nombreCajero: localStorage.getItem('nombreUsuario') || 'Desconocido',
                departamento: productoActual.departamento || '0',
                nombreDepartamento: nombreDepartamento,
                observaciones: `Venta - Folio: ${this.idVentaActiva}`
              };

              await this.movimientosService.registrarMovimiento(movimiento);

              console.log(`Inventario actualizado: ${producto.descripcion} - Anterior: ${inventarioActual}, Vendido: ${cantidadVendida}, Nuevo: ${nuevoInventario}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error al descontar inventario:', error);
      // No mostramos error al usuario para no interrumpir el flujo de la venta
      // La venta ya se completó, el error de inventario es secundario
    }
  }

  /**
   * Genera e imprime el ticket de venta
   * @param venta - Datos de la venta
   * @param saldoTotalCliente - Saldo total del cliente (para ventas a crédito)
   */
  imprimirTicketVenta(venta: VentaInterface, saldoTotalCliente: number = 0): void {
    const fechaVenta = venta.fechaVentaFinalizada?.toDate() || new Date();
    const fechaFormateada = fechaVenta.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    const horaFormateada = fechaVenta.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    // Generar filas de productos
    let productosHTML = '';
    venta.detalleProductos?.forEach(prod => {
      const cantidad = parseFloat(prod.cantidad);
      const precio = parseFloat(prod.precioVenta);
      const importe = parseFloat(prod.importe);
      
      productosHTML += `
        <tr>
          <td style="padding: 2px 0; font-size: 10px;">${cantidad}</td>
          <td style="padding: 2px 5px; font-size: 10px;">${prod.descripcion}</td>
          <td style="padding: 2px 0; text-align: right; font-size: 10px;">$${precio.toFixed(2)}</td>
          <td style="padding: 2px 0; text-align: right; font-size: 10px;">$${importe.toFixed(2)}</td>
        </tr>
      `;
    });

    const total = parseFloat(venta.total);
    const esCredito = venta.formaDePago === 2;
    const esEfectivo = venta.formaDePago === 1;
    
    // Verificar si hay devoluciones
    const hayDevoluciones = venta.totalDevoluciones && parseFloat(venta.totalDevoluciones) > 0;
    const totalOriginal = hayDevoluciones ? parseFloat(venta.totalOriginal || venta.total) : total;
    const totalDevoluciones = hayDevoluciones ? parseFloat(venta.totalDevoluciones!) : 0;

    // Sección de totales (puede incluir desglose de devoluciones)
    let seccionTotalesHTML = '';
    
    if (hayDevoluciones) {
      // Mostrar desglose cuando hay devoluciones
      seccionTotalesHTML = `
        <div style="margin-top: 10px; padding: 10px; background-color: #fff3cd; border: 1px dashed #856404; border-radius: 3px;">
          <div style="text-align: center; font-size: 10px; font-weight: bold; color: #856404; margin-bottom: 5px;">
            ⚠ ESTA VENTA TUVO DEVOLUCIONES
          </div>
        </div>
        
        <div style="margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 3px 0;">
            <span>Total original:</span>
            <span>$${totalOriginal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 3px 0; color: #d33;">
            <span>Devoluciones:</span>
            <span><strong>-$${totalDevoluciones.toFixed(2)}</strong></span>
          </div>
          <div style="border-top: 1px solid #000; margin: 5px 0;"></div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px;">
            <span style="font-size: 14px;"><strong>TOTAL ACTUAL:</strong></span>
            <span style="font-size: 16px; font-weight: bold;">$${total.toFixed(2)}</span>
          </div>
        </div>
      `;
    } else {
      // Mostrar total normal sin devoluciones
      seccionTotalesHTML = `
        <div style="margin-top: 10px; padding-top: 5px; border-top: 2px solid #000;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px;"><strong>TOTAL:</strong></span>
            <span style="font-size: 16px; font-weight: bold;">$${total.toFixed(2)}</span>
          </div>
        </div>
      `;
    }

    // Información de pago
    let infoPagoHTML = '';
    if (esEfectivo) {
      const pagoCon = parseFloat(venta.pagoCon || '0');
      const cambio = parseFloat(venta.cambio || '0');
      infoPagoHTML = `
        <div style="margin-top: 10px; padding: 5px 0; border-top: 1px dashed #000;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0;">
            <span><strong>PAGO CON:</strong></span>
            <span><strong>$${pagoCon.toFixed(2)}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0;">
            <span><strong>CAMBIO:</strong></span>
            <span><strong>$${cambio.toFixed(2)}</strong></span>
          </div>
        </div>
      `;
    } else if (esCredito) {
      infoPagoHTML = `
        <div style="margin-top: 10px; padding: 5px 0; border-top: 1px dashed #000;">
          <div style="text-align: center; font-size: 11px; margin: 5px 0; font-weight: bold;">
            VENTA A CREDITO (FIADO)
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 5px 0;">
            <span><strong>Saldo pendiente total:</strong></span>
            <span><strong>$${saldoTotalCliente.toFixed(2)}</strong></span>
          </div>
        </div>
      `;
    }

    const ticketHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket de Venta #${venta.idTemp}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          
          body {
            font-family: 'Courier New', monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 5mm;
            font-size: 11px;
            color: #000;
          }
          
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          
          .header h1 {
            margin: 0;
            font-size: 16px;
            font-weight: bold;
          }
          
          .header p {
            margin: 2px 0;
            font-size: 10px;
          }
          
          .divider {
            border-bottom: 1px dashed #000;
            margin: 8px 0;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin: 2px 0;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
          }
          
          th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding: 3px 0;
            font-size: 10px;
          }
          
          .total-row {
            margin-top: 10px;
            padding-top: 5px;
            border-top: 2px solid #000;
          }
          
          .total-amount {
            font-size: 16px;
            font-weight: bold;
          }
          
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <!-- Encabezado -->
        <div class="header">
          <h1>ABARROTES</h1>
          <p>RFC: XXXXXXXXXXX</p>
          <p>Dirección del Negocio</p>
          <p>Tel: (XXX) XXX-XXXX</p>
        </div>
        
        <div class="divider"></div>
        
        <!-- Información de la venta -->
        <div class="info-row">
          <span>Folio:</span>
          <span><strong>#${venta.idTemp}</strong></span>
        </div>
        <div class="info-row">
          <span>Fecha:</span>
          <span>${fechaFormateada}</span>
        </div>
        <div class="info-row">
          <span>Hora:</span>
          <span>${horaFormateada}</span>
        </div>
        <div class="info-row">
          <span>Cajero:</span>
          <span>${venta.nombreCajero || 'Cajero'}</span>
        </div>
        
        <div class="divider"></div>
        
        <!-- Productos -->
        ${hayDevoluciones ? '<div style="text-align: center; font-size: 11px; font-weight: bold; margin: 8px 0;">PRODUCTOS ACTUALES:</div>' : ''}
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Cant.</th>
              <th style="width: 40%;">Descripción</th>
              <th style="width: 22%; text-align: right;">Precio</th>
              <th style="width: 23%; text-align: right;">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${productosHTML}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <!-- Total (con o sin desglose de devoluciones) -->
        ${seccionTotalesHTML}
        
        <!-- Información de pago -->
        ${infoPagoHTML}
        
        <div class="divider" style="margin-top: 15px;"></div>
        
        <!-- Código de barras -->
        <div style="text-align: center; margin: 10px 0;">
          <svg id="barcode"></svg>
        </div>
        
        <!-- Pie de página -->
        <div class="footer">
          <p><strong>¡Gracias por su compra!</strong></p>
          <p>Conserve su ticket</p>
        </div>
        
        <script>
          // Generar código de barras con el folio de la venta
          window.onload = function() {
            JsBarcode("#barcode", "${venta.idTemp}", {
              format: "CODE128",
              width: 2,
              height: 50,
              displayValue: true,
              fontSize: 12,
              margin: 5
            });
          };
        </script>
      </body>
      </html>
    `;

    // Abrir ventana de impresión
    const ventanaImpresion = window.open('', '_blank', 'width=300,height=600');
    
    if (ventanaImpresion) {
      ventanaImpresion.document.write(ticketHTML);
      ventanaImpresion.document.close();
      
      // Esperar a que cargue y luego imprimir
      ventanaImpresion.onload = () => {
        ventanaImpresion.focus();
        ventanaImpresion.print();
        // Opcional: cerrar la ventana después de imprimir
        // ventanaImpresion.onafterprint = () => ventanaImpresion.close();
      };
    } else {
      console.error('No se pudo abrir la ventana de impresión');
      Swal.fire({
        icon: 'error',
        title: 'Error de impresión',
        text: 'No se pudo abrir la ventana de impresión. Verifica que los pop-ups no estén bloqueados.',
        confirmButtonText: 'Aceptar'
      });
    }
  }

}
