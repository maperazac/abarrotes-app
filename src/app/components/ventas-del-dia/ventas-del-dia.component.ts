import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import VentaInterface from 'src/app/interfaces/ventas.interface';
import SalidaDineroInterface from 'src/app/interfaces/salida-dinero.interface';
import MovimientoInventarioInterface from 'src/app/interfaces/movimiento-inventario.interface';
import { VentasdbService } from 'src/app/services/ventasdb.service';
import { SalidasDineroService } from 'src/app/services/salidas-dinero.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { ProductosService } from 'src/app/services/productos.service';
import { MovimientosInventarioService } from 'src/app/services/movimientos-inventario.service';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import { ClientesService } from 'src/app/services/clientes.service';
import { VentaCreditoInterface, AbonoInterface } from 'src/app/interfaces/cliente.interface';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ventas-del-dia',
  templateUrl: './ventas-del-dia.component.html',
  styleUrls: ['./ventas-del-dia.component.scss']
})
export class VentasDelDiaComponent implements OnInit {
  @ViewChild('modalVentasDelDia') modalVentasDelDia!: ElementRef;
  @ViewChild('inputBuscar') inputBuscar!: ElementRef;
  @ViewChild('inputFecha') inputFecha!: ElementRef;

  ventasDelDia: VentaInterface[] = [];
  ventasFiltradas: VentaInterface[] = [];
  ventaSeleccionada: VentaInterface | null = null;
  indiceSeleccionado: number = -1;
  articuloSeleccionado: number = -1;

  // Filtros
  textoBusqueda: string = '';
  fechaSeleccionada: string = '';
  cajeroSeleccionado: string = '';
  cajaSeleccionada: string = '';

  constructor(
    private ventasService: VentasdbService,
    private salidasService: SalidasDineroService,
    private configuracionService: ConfiguracionService,
    private productosService: ProductosService,
    private movimientosService: MovimientosInventarioService,
    private departamentosService: DepartamentosService,
    private clientesService: ClientesService
  ) { }

  ngOnInit(): void {
  }

  async abrir() {
    this.modalVentasDelDia.nativeElement.style.display = 'flex';
    this.fechaSeleccionada = this.obtenerFechaHoy();
    await this.cargarVentasDelDia();
    
    setTimeout(() => {
      this.inputBuscar.nativeElement.focus();
    }, 100);

    document.addEventListener('keydown', this.handleKeyDown);
  }

  cerrar() {
    this.modalVentasDelDia.nativeElement.style.display = 'none';
    this.limpiarDatos();
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  limpiarDatos() {
    this.ventasDelDia = [];
    this.ventasFiltradas = [];
    this.ventaSeleccionada = null;
    this.indiceSeleccionado = -1;
    this.articuloSeleccionado = -1;
    this.textoBusqueda = '';
    this.cajeroSeleccionado = '';
    this.cajaSeleccionada = '';
  }

  obtenerFechaHoy(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async cargarVentasDelDia() {
    try {
      // Parsear la fecha manualmente para evitar problemas de zona horaria UTC
      const [year, month, day] = this.fechaSeleccionada.split('-').map(Number);
      const fechaInicio = new Date(year, month - 1, day, 0, 0, 0, 0);
      const fechaFin = new Date(year, month - 1, day, 23, 59, 59, 999);

      console.log('Buscando ventas del:', this.fechaSeleccionada);
      console.log('Rango:', fechaInicio, 'hasta', fechaFin);

      this.ventasDelDia = [];

      // Obtener ventas completadas (status 1)
      const ventasCompletadasSnapshot = await this.ventasService.obtenerVentasPorStatusYPeriodo(
        '1',
        fechaInicio,
        fechaFin
      );

      ventasCompletadasSnapshot.forEach((doc) => {
        const venta = { id: doc.id, ...doc.data() } as VentaInterface;
        this.ventasDelDia.push(venta);
      });

      // Obtener ventas canceladas (status 2)
      const ventasCanceladasSnapshot = await this.ventasService.obtenerVentasPorStatusYPeriodo(
        '2',
        fechaInicio,
        fechaFin
      );

      ventasCanceladasSnapshot.forEach((doc) => {
        const venta = { id: doc.id, ...doc.data() } as VentaInterface;
        this.ventasDelDia.push(venta);
      });

      // Ordenar por fecha descendente (más reciente primero)
      this.ventasDelDia.sort((a, b) => {
        const fechaA = a.fechaVentaFinalizada?.toMillis() || 0;
        const fechaB = b.fechaVentaFinalizada?.toMillis() || 0;
        return fechaB - fechaA;
      });

      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las ventas',
        confirmButtonColor: '#3085d6',
        customClass: {
          container: 'swal-high-zindex'
        }
      });
    }
  }

  aplicarFiltros() {
    this.ventasFiltradas = this.ventasDelDia.filter(venta => {
      const busqueda = this.textoBusqueda.toLowerCase();
      const coincideBusqueda = !busqueda || 
        (venta.nombre && venta.nombre.toLowerCase().includes(busqueda)) ||
        (venta.idTemp && venta.idTemp.toString().includes(busqueda));

      return coincideBusqueda;
    });

    // Si había una venta seleccionada, mantener la selección
    if (this.indiceSeleccionado >= this.ventasFiltradas.length) {
      this.indiceSeleccionado = this.ventasFiltradas.length - 1;
    }

    if (this.indiceSeleccionado >= 0 && this.ventasFiltradas[this.indiceSeleccionado]) {
      this.seleccionarVenta(this.indiceSeleccionado);
    } else if (this.ventasFiltradas.length > 0) {
      this.seleccionarVenta(0);
    } else {
      this.ventaSeleccionada = null;
      this.indiceSeleccionado = -1;
    }
  }

  onBusquedaChange() {
    this.aplicarFiltros();
  }

  async onFechaChange() {
    await this.cargarVentasDelDia();
  }

  seleccionarHoy() {
    this.fechaSeleccionada = this.obtenerFechaHoy();
    this.cargarVentasDelDia();
  }

  seleccionarVenta(indice: number) {
    if (indice >= 0 && indice < this.ventasFiltradas.length) {
      this.indiceSeleccionado = indice;
      this.ventaSeleccionada = this.ventasFiltradas[indice];
      this.articuloSeleccionado = -1;
    }
  }

  seleccionarArticulo(indice: number) {
    this.articuloSeleccionado = indice;
  }

  handleKeyDown = (event: KeyboardEvent) => {
    // Si está escribiendo en el input de búsqueda o fecha, permitir navegación normal
    const inputActivo = document.activeElement as HTMLElement;
    const esInputBusqueda = inputActivo === this.inputBuscar?.nativeElement;
    const esInputFecha = inputActivo === this.inputFecha?.nativeElement;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cerrar();
      return;
    }

    // Solo manejar flechas si no está en los inputs
    if (!esInputBusqueda && !esInputFecha) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.navegarVentas(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.navegarVentas(-1);
      }
    }
  }

  navegarVentas(direccion: number) {
    if (this.ventasFiltradas.length === 0) return;

    let nuevoIndice = this.indiceSeleccionado + direccion;

    if (nuevoIndice < 0) {
      nuevoIndice = 0;
    } else if (nuevoIndice >= this.ventasFiltradas.length) {
      nuevoIndice = this.ventasFiltradas.length - 1;
    }

    this.seleccionarVenta(nuevoIndice);

    // Scroll automático
    const elemento = document.querySelector(`.venta-item-${nuevoIndice}`) as HTMLElement;
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  formatearFecha(timestamp: Timestamp | undefined): string {
    if (!timestamp) return 'N/A';
    const fecha = timestamp.toDate();
    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearMoneda(valor: string | undefined): string {
    if (!valor || valor === '' || valor === '0') return '$0.00';
    const numero = parseFloat(valor);
    if (isNaN(numero)) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(numero);
  }

  // Hacer parseFloat disponible en el template
  parseFloat(valor: string | undefined): number {
    if (!valor) return 0;
    return parseFloat(valor);
  }

  // Redondear importe para productos a granel (mismo comportamiento que en ventas)
  redondearImporte(precioVenta: number, cantidad: number): number {
    let importe = (precioVenta * cantidad);
    let precioRedoneado = Math.ceil(importe); // Redondea siempre hacia arriba al siguiente entero
    return precioRedoneado;
  }

  // Métodos sin funcionalidad (para implementar después)
  async devolverArticulo() {
    if (!this.ventaSeleccionada || this.articuloSeleccionado === -1) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin selección',
        text: 'Por favor selecciona un artículo para devolver',
        confirmButtonColor: '#3085d6',
        customClass: {
          container: 'swal-high-zindex'
        }
      });
      return;
    }

    const articulo = this.ventaSeleccionada.detalleProductos![this.articuloSeleccionado];
    const cantidadArticulo = parseFloat(articulo.cantidad);
    const precioUnitario = parseFloat(articulo.precioVenta);
    let cantidadADevolver = cantidadArticulo;

    // Si la cantidad es mayor a 1, preguntar cuántos devolver
    if (cantidadArticulo > 1) {
      const resultado = await Swal.fire({
        title: 'Cantidad a devolver',
        html: `
          <p><strong>${articulo.descripcion}</strong></p>
          <p>Cantidad en venta: ${cantidadArticulo}</p>
          <input id="cantidadDevolver" type="number" class="swal2-input" 
                 value="${cantidadArticulo}" min="0.01" max="${cantidadArticulo}" step="0.01"
                 style="width: 80%; margin-top: 10px;">
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        customClass: {
          container: 'swal-high-zindex'
        },
        didOpen: () => {
          const input = document.getElementById('cantidadDevolver') as HTMLInputElement;
          input.select();
          input.focus();
        },
        preConfirm: () => {
          const input = document.getElementById('cantidadDevolver') as HTMLInputElement;
          const valor = parseFloat(input.value);
          
          if (isNaN(valor) || valor <= 0) {
            Swal.showValidationMessage('Ingresa una cantidad válida mayor a 0');
            return false;
          }
          
          if (valor > cantidadArticulo) {
            Swal.showValidationMessage(`La cantidad no puede ser mayor a ${cantidadArticulo}`);
            return false;
          }
          
          return valor;
        }
      });

      if (!resultado.isConfirmed) {
        return;
      }

      cantidadADevolver = resultado.value;
    }

    // Calcular el monto a devolver (con redondeo para productos a granel)
    let montoADevolver: number;
    if (articulo.seVende === 2) {
      // Producto a granel - aplicar redondeo hacia arriba
      montoADevolver = this.redondearImporte(precioUnitario, cantidadADevolver);
    } else {
      // Producto por unidad - cálculo normal
      montoADevolver = cantidadADevolver * precioUnitario;
    }

    // Verificar si es venta a crédito y calcular distribución
    const esVentaCredito = this.ventaSeleccionada.formaDePago === 2;
    let mensajeDistribucion = '';
    let montoRegresarCliente = montoADevolver;
    let montoAbonarDeuda = 0;

    if (esVentaCredito) {
      // Obtener la venta a crédito
      const ventaCredito = await this.obtenerVentaCredito(this.ventaSeleccionada.id!);
      
      if (ventaCredito) {
        // Calcular total de abonos en esta venta
        const totalAbonos = await this.calcularTotalAbonos(ventaCredito.id!);
        
        // Calcular deuda total del cliente
        const deudaTotalCliente = await this.calcularDeudaTotalCliente(ventaCredito.idCliente);
        
        // Calcular la proporción de abonos que corresponde a esta devolución
        const proporcionDevolucion = montoADevolver / ventaCredito.total;
        const abonosADevolver = totalAbonos * proporcionDevolucion;
        
        // Deuda del cliente sin esta venta
        const deudaSinEstaVenta = deudaTotalCliente - ventaCredito.saldoPendiente;
        
        if (abonosADevolver > 0) {
          if (deudaSinEstaVenta >= abonosADevolver) {
            // No se regresa dinero, todo se abona a la deuda
            montoRegresarCliente = 0;
            montoAbonarDeuda = abonosADevolver;
            mensajeDistribucion = `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 15px 0;">
                <p style="margin: 0 0 10px 0; font-weight: 600; color: #856404;">
                  <i class="fa fa-info-circle"></i> Esta venta es a crédito
                </p>
                <p style="margin: 0 0 5px 0; color: #856404;">
                  El cliente tiene una deuda pendiente de <strong>${this.formatearMoneda(deudaSinEstaVenta.toString())}</strong>
                </p>
                <p style="margin: 0; color: #856404;">
                  Los abonos correspondientes (<strong>${this.formatearMoneda(abonosADevolver.toString())}</strong>) se aplicarán a su deuda.
                </p>
                <hr style="margin: 10px 0; border-color: #ffc107;">
                <p style="margin: 0; font-weight: 700; color: #856404; font-size: 1.1em;">
                  <i class="fa fa-money"></i> Monto a regresar al cliente: <strong>$0.00</strong>
                </p>
                <p style="margin: 5px 0 0 0; color: #856404;">
                  <i class="fa fa-credit-card"></i> Monto a abonar a deuda: <strong>${this.formatearMoneda(abonosADevolver.toString())}</strong>
                </p>
              </div>
            `;
          } else if (deudaSinEstaVenta > 0) {
            // Se abona parte a la deuda y se regresa el excedente
            montoAbonarDeuda = deudaSinEstaVenta;
            montoRegresarCliente = abonosADevolver - deudaSinEstaVenta;
            mensajeDistribucion = `
              <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8; margin: 15px 0;">
                <p style="margin: 0 0 10px 0; font-weight: 600; color: #0c5460;">
                  <i class="fa fa-info-circle"></i> Esta venta es a crédito
                </p>
                <p style="margin: 0 0 5px 0; color: #0c5460;">
                  El cliente tiene una deuda pendiente de <strong>${this.formatearMoneda(deudaSinEstaVenta.toString())}</strong>
                </p>
                <p style="margin: 0 0 10px 0; color: #0c5460;">
                  Los abonos correspondientes (<strong>${this.formatearMoneda(abonosADevolver.toString())}</strong>) se distribuirán:
                </p>
                <hr style="margin: 10px 0; border-color: #17a2b8;">
                <p style="margin: 0; color: #0c5460;">
                  <i class="fa fa-credit-card"></i> Monto a abonar a deuda: <strong>${this.formatearMoneda(montoAbonarDeuda.toString())}</strong>
                </p>
                <p style="margin: 5px 0 0 0; font-weight: 700; color: #0c5460; font-size: 1.1em;">
                  <i class="fa fa-money"></i> Monto a regresar al cliente: <strong>${this.formatearMoneda(montoRegresarCliente.toString())}</strong>
                </p>
              </div>
            `;
          } else {
            // No hay otras deudas, se regresa todo
            montoRegresarCliente = abonosADevolver;
            montoAbonarDeuda = 0;
            mensajeDistribucion = `
              <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin: 15px 0;">
                <p style="margin: 0 0 10px 0; font-weight: 600; color: #155724;">
                  <i class="fa fa-info-circle"></i> Esta venta es a crédito
                </p>
                <p style="margin: 0 0 10px 0; color: #155724;">
                  El cliente no tiene otras deudas pendientes.
                </p>
                <hr style="margin: 10px 0; border-color: #28a745;">
                <p style="margin: 0; font-weight: 700; color: #155724; font-size: 1.1em;">
                  <i class="fa fa-money"></i> Monto a regresar al cliente: <strong>${this.formatearMoneda(montoRegresarCliente.toString())}</strong>
                </p>
              </div>
            `;
          }
        } else {
          // No hay abonos, solo ajustar la deuda
          montoRegresarCliente = 0;
          montoAbonarDeuda = 0;
          mensajeDistribucion = `
            <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin: 15px 0;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #155724;">
                <i class="fa fa-info-circle"></i> Esta venta es a crédito
              </p>
              <p style="margin: 0 0 10px 0; color: #155724;">
                No se han realizado abonos a esta venta. Solo se ajustará la deuda.
              </p>
              <hr style="margin: 10px 0; border-color: #28a745;">
              <p style="margin: 0; font-weight: 700; color: #155724; font-size: 1.1em;">
                <i class="fa fa-money"></i> Monto a regresar al cliente: <strong>$0.00</strong>
              </p>
              <p style="margin: 5px 0 0 0; color: #155724;">
                La deuda del cliente se reducirá en <strong>${this.formatearMoneda(montoADevolver.toString())}</strong>
              </p>
            </div>
          `;
        }
      }
    } else {
      // Venta en efectivo (lógica normal)
      mensajeDistribucion = `
        <hr style="margin: 15px 0;">
        <p style="font-size: 1.3em; color: #d33;">
          Monto a regresar al cliente: 
          <strong>${this.formatearMoneda(montoADevolver.toString())}</strong>
        </p>
      `;
    }

    // Mostrar confirmación con el monto a devolver
    const confirmacion = await Swal.fire({
      title: 'Devolución de artículo',
      html: `
        <div style="text-align: left; margin: 20px;">
          <p><strong>${articulo.descripcion}</strong></p>
          <p>Cantidad a devolver: <strong>${cantidadADevolver}</strong></p>
          <p>Precio unitario: <strong>${this.formatearMoneda(precioUnitario.toString())}</strong></p>
          ${mensajeDistribucion}
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Confirmar devolución',
      cancelButtonText: 'Cancelar',
      customClass: {
        container: 'swal-high-zindex'
      }
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    // Procesar la devolución
    try {
      await this.procesarDevolución(cantidadADevolver, montoADevolver);
      
      // Construir mensaje de éxito según el tipo de venta
      let mensajeExito = '<p>Se ha procesado la devolución</p>';
      
      if (esVentaCredito) {
        if (montoRegresarCliente > 0 && montoAbonarDeuda > 0) {
          mensajeExito += `
            <hr style="margin: 10px 0;">
            <p><i class="fa fa-credit-card"></i> <strong>Abonado a deuda:</strong> ${this.formatearMoneda(montoAbonarDeuda.toString())}</p>
            <p><i class="fa fa-money"></i> <strong>Devuelto al cliente:</strong> ${this.formatearMoneda(montoRegresarCliente.toString())}</p>
          `;
        } else if (montoAbonarDeuda > 0) {
          mensajeExito += `
            <hr style="margin: 10px 0;">
            <p><i class="fa fa-credit-card"></i> <strong>Abonado a deuda:</strong> ${this.formatearMoneda(montoAbonarDeuda.toString())}</p>
            <p style="color: #28a745;"><i class="fa fa-check-circle"></i> No se regresó efectivo al cliente</p>
          `;
        } else if (montoRegresarCliente > 0) {
          mensajeExito += `
            <hr style="margin: 10px 0;">
            <p><i class="fa fa-money"></i> <strong>Devuelto al cliente:</strong> ${this.formatearMoneda(montoRegresarCliente.toString())}</p>
          `;
        } else {
          mensajeExito += `
            <hr style="margin: 10px 0;">
            <p style="color: #28a745;"><i class="fa fa-check-circle"></i> Deuda del cliente ajustada</p>
            <p>No se regresó efectivo al cliente</p>
          `;
        }
      } else {
        mensajeExito += `<p><strong>Monto devuelto: ${this.formatearMoneda(montoADevolver.toString())}</strong></p>`;
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Devolución exitosa',
        html: mensajeExito,
        confirmButtonColor: '#3085d6',
        timer: 4000,
        customClass: {
          container: 'swal-high-zindex'
        }
      });

      // Recargar las ventas
      await this.cargarVentasDelDia();
      
    } catch (error) {
      console.error('Error al procesar devolución:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo procesar la devolución',
        confirmButtonColor: '#3085d6',
        customClass: {
          container: 'swal-high-zindex'
        }
      });
    }
  }

  async procesarDevolución(cantidadADevolver: number, montoADevolver: number) {
    if (!this.ventaSeleccionada || this.articuloSeleccionado === -1) return;

    const articulo = this.ventaSeleccionada.detalleProductos![this.articuloSeleccionado];
    const cantidadArticulo = parseFloat(articulo.cantidad);
    const cantidadRestante = cantidadArticulo - cantidadADevolver;

    // Calcular productos actualizados primero (necesarios para venta a crédito)
    const productosActualizados = [...this.ventaSeleccionada.detalleProductos!];

    if (cantidadRestante <= 0) {
      productosActualizados.splice(this.articuloSeleccionado, 1);
    } else {
      const nuevoImporte = cantidadRestante * parseFloat(articulo.precioVenta);
      productosActualizados[this.articuloSeleccionado] = {
        ...articulo,
        cantidad: cantidadRestante.toString(),
        importe: nuevoImporte.toString()
      };
    }

    const nuevoTotal = productosActualizados.reduce((sum, prod) => sum + parseFloat(prod.importe), 0);

    // Determinar si es devolución total de productos
    const esDevolucionTotal = productosActualizados.length === 0;

    // Detectar si es venta a crédito
    const esVentaCredito = this.ventaSeleccionada.formaDePago === 2;

    if (esVentaCredito) {
      // Obtener la venta a crédito asociada
      const ventaCredito = await this.obtenerVentaCredito(this.ventaSeleccionada.id!);
      
      if (ventaCredito) {
        // Procesar como devolución de venta a crédito
        await this.procesarDevolucionCredito(
          ventaCredito,
          montoADevolver,
          cantidadADevolver,
          articulo,
          esDevolucionTotal,
          productosActualizados,
          nuevoTotal
        );
      }
    } else {
      // Procesar como devolución de venta en efectivo (lógica original)
      const salida: SalidaDineroInterface = {
        fecha: Timestamp.fromDate(new Date()),
        cantidad: montoADevolver,
        detalle: `Devolución - Folio: ${this.ventaSeleccionada.idTemp} - ${articulo.descripcion} (${cantidadADevolver})`,
        idCajero: localStorage.getItem('userId') || '0'
      };

      await this.salidasService.registrarSalida(salida);
      await this.devolverInventarioParcial(articulo.id, cantidadADevolver);
    }

    // Actualizar la venta en la tabla de ventas (común para ambos casos)
    const nuevoTotalArticulos = productosActualizados.reduce((sum, prod) => {
      const cantidad = parseFloat(prod.cantidad);
      let seVende = prod.seVende;
      
      if (!seVende) {
        if (cantidad < 1 || (cantidad % 1 !== 0 && cantidad < 10)) {
          seVende = 2;
        } else {
          seVende = 1;
        }
      }
      
      return sum + (seVende == 2 ? 1 : cantidad);
    }, 0);

    await this.ventasService.actualizarVentaDespuesDevolucion(
      this.ventaSeleccionada.id!,
      productosActualizados,
      nuevoTotal.toString(),
      nuevoTotalArticulos.toString()
    );

    // Resetear la selección de artículo
    this.articuloSeleccionado = -1;
  }

  async cancelarVenta() {
    if (!this.ventaSeleccionada || !this.ventaSeleccionada.id) return;

    // Si ya está cancelada, no hacer nada
    if (this.ventaSeleccionada.status === '2') {
      Swal.fire({
        icon: 'info',
        title: 'Venta ya cancelada',
        text: 'Esta venta ya fue cancelada previamente',
        confirmButtonColor: '#3085d6',
        customClass: {
          container: 'swal-high-zindex'
        }
      });
      return;
    }

    const esVentaCredito = this.ventaSeleccionada.formaDePago === 2;
    const totalVenta = parseFloat(this.ventaSeleccionada.total);
    
    let mensajeDistribucion = '';
    let montoRegresarCliente = totalVenta;
    let montoAbonarDeuda = 0;

    // Calcular distribución si es venta a crédito
    if (esVentaCredito) {
      const ventaCredito = await this.obtenerVentaCredito(this.ventaSeleccionada.id!);
      
      if (ventaCredito) {
        // Calcular total de abonos en esta venta
        const totalAbonos = await this.calcularTotalAbonos(ventaCredito.id!);
        
        // Calcular deuda total del cliente
        const deudaTotalCliente = await this.calcularDeudaTotalCliente(ventaCredito.idCliente);
        
        // Deuda del cliente sin esta venta
        const deudaSinEstaVenta = deudaTotalCliente - ventaCredito.saldoPendiente;
        
        if (totalAbonos > 0) {
          if (deudaSinEstaVenta >= totalAbonos) {
            // No se regresa dinero, todo se abona a la deuda
            montoRegresarCliente = 0;
            montoAbonarDeuda = totalAbonos;
            mensajeDistribucion = `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 15px 0;">
                <p style="margin: 0 0 10px 0; font-weight: 600; color: #856404;">
                  <i class="fa fa-info-circle"></i> Esta venta es a crédito
                </p>
                <p style="margin: 0 0 5px 0; color: #856404;">
                  El cliente tiene una deuda pendiente de <strong>${this.formatearMoneda(deudaSinEstaVenta.toString())}</strong>
                </p>
                <p style="margin: 0; color: #856404;">
                  Los abonos realizados (<strong>${this.formatearMoneda(totalAbonos.toString())}</strong>) se aplicarán a su deuda.
                </p>
                <hr style="margin: 10px 0; border-color: #ffc107;">
                <p style="margin: 0; font-weight: 700; color: #856404; font-size: 1.1em;">
                  <i class="fa fa-money"></i> Monto a regresar al cliente: <strong>$0.00</strong>
                </p>
                <p style="margin: 5px 0 0 0; color: #856404;">
                  <i class="fa fa-credit-card"></i> Monto a abonar a deuda: <strong>${this.formatearMoneda(totalAbonos.toString())}</strong>
                </p>
              </div>
            `;
          } else if (deudaSinEstaVenta > 0) {
            // Se abona parte a la deuda y se regresa el excedente
            montoAbonarDeuda = deudaSinEstaVenta;
            montoRegresarCliente = totalAbonos - deudaSinEstaVenta;
            mensajeDistribucion = `
              <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8; margin: 15px 0;">
                <p style="margin: 0 0 10px 0; font-weight: 600; color: #0c5460;">
                  <i class="fa fa-info-circle"></i> Esta venta es a crédito
                </p>
                <p style="margin: 0 0 5px 0; color: #0c5460;">
                  El cliente tiene una deuda pendiente de <strong>${this.formatearMoneda(deudaSinEstaVenta.toString())}</strong>
                </p>
                <p style="margin: 0 0 10px 0; color: #0c5460;">
                  Los abonos realizados (<strong>${this.formatearMoneda(totalAbonos.toString())}</strong>) se distribuirán:
                </p>
                <hr style="margin: 10px 0; border-color: #17a2b8;">
                <p style="margin: 0; color: #0c5460;">
                  <i class="fa fa-credit-card"></i> Monto a abonar a deuda: <strong>${this.formatearMoneda(montoAbonarDeuda.toString())}</strong>
                </p>
                <p style="margin: 5px 0 0 0; font-weight: 700; color: #0c5460; font-size: 1.1em;">
                  <i class="fa fa-money"></i> Monto a regresar al cliente: <strong>${this.formatearMoneda(montoRegresarCliente.toString())}</strong>
                </p>
              </div>
            `;
          } else {
            // No hay otras deudas, se regresa todo
            montoRegresarCliente = totalAbonos;
            montoAbonarDeuda = 0;
            mensajeDistribucion = `
              <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin: 15px 0;">
                <p style="margin: 0 0 10px 0; font-weight: 600; color: #155724;">
                  <i class="fa fa-info-circle"></i> Esta venta es a crédito
                </p>
                <p style="margin: 0 0 10px 0; color: #155724;">
                  El cliente no tiene otras deudas pendientes.
                </p>
                <hr style="margin: 10px 0; border-color: #28a745;">
                <p style="margin: 0; font-weight: 700; color: #155724; font-size: 1.1em;">
                  <i class="fa fa-money"></i> Monto a regresar al cliente: <strong>${this.formatearMoneda(montoRegresarCliente.toString())}</strong>
                </p>
              </div>
            `;
          }
        } else {
          // No hay abonos, solo ajustar la deuda
          montoRegresarCliente = 0;
          montoAbonarDeuda = 0;
          mensajeDistribucion = `
            <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin: 15px 0;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #155724;">
                <i class="fa fa-info-circle"></i> Esta venta es a crédito
              </p>
              <p style="margin: 0 0 10px 0; color: #155724;">
                No se han realizado abonos a esta venta. Solo se eliminará la deuda.
              </p>
              <hr style="margin: 10px 0; border-color: #28a745;">
              <p style="margin: 0; font-weight: 700; color: #155724; font-size: 1.1em;">
                <i class="fa fa-money"></i> Monto a regresar al cliente: <strong>$0.00</strong>
              </p>
              <p style="margin: 5px 0 0 0; color: #155724;">
                La deuda del cliente se eliminará por completo (<strong>${this.formatearMoneda(totalVenta.toString())}</strong>)
              </p>
            </div>
          `;
        }
      }
    }

    const confirmacion = await Swal.fire({
      title: '¿Cancelar esta venta?',
      html: `
        <div style="text-align: left; margin: 20px;">
          <p>Folio: <strong>${this.ventaSeleccionada.idTemp}</strong></p>
          <p>Total: <strong>${this.formatearMoneda(this.ventaSeleccionada.total)}</strong></p>
          <p class="text-danger mt-3" style="margin-top: 10px;">Esta acción marcará la venta como cancelada.</p>
          ${mensajeDistribucion}
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, cancelar venta',
      cancelButtonText: 'No',
      customClass: {
        container: 'swal-high-zindex'
      }
    });

    if (confirmacion.isConfirmed) {
      try {
        // Si es venta a crédito, procesar cancelación con lógica de crédito
        if (esVentaCredito) {
          const ventaCredito = await this.obtenerVentaCredito(this.ventaSeleccionada!.id!);
          
          if (ventaCredito) {
            // Procesar como devolución total de venta a crédito
            // Usamos el primer artículo como referencia (para el log)
            const primerArticulo = this.ventaSeleccionada!.detalleProductos![0];
            await this.procesarDevolucionCredito(
              ventaCredito,
              parseFloat(this.ventaSeleccionada!.total),
              0, // No es importante la cantidad individual en cancelación total
              primerArticulo,
              true, // Es devolución total
              [], // Productos vacíos (cancelación total)
              0 // Nuevo total es 0 (cancelación total)
            );
            
            // Devolver inventario completo
            await this.devolverInventarioCompleto();
          }
        } else {
          // Venta en efectivo: registrar salida de dinero
          const salida: SalidaDineroInterface = {
            fecha: Timestamp.fromDate(new Date()),
            cantidad: parseFloat(this.ventaSeleccionada!.total),
            detalle: `Cancelación de venta - Folio: ${this.ventaSeleccionada!.idTemp}`,
            idCajero: localStorage.getItem('userId') || '0'
          };

          await this.salidasService.registrarSalida(salida);
          await this.devolverInventarioCompleto();
        }

        // Marcar la venta como cancelada en la tabla de ventas
        await this.ventasService.cancelarVenta(this.ventaSeleccionada!.id!);
        
        // Construir mensaje de éxito según el tipo de venta
        let mensajeExito = '<p>La venta ha sido cancelada exitosamente</p>';
        
        if (esVentaCredito) {
          if (montoRegresarCliente > 0 && montoAbonarDeuda > 0) {
            mensajeExito = `
              <p>La venta a crédito ha sido cancelada</p>
              <hr style="margin: 10px 0;">
              <p><i class="fa fa-credit-card"></i> <strong>Abonado a deuda:</strong> ${this.formatearMoneda(montoAbonarDeuda.toString())}</p>
              <p><i class="fa fa-money"></i> <strong>Devuelto al cliente:</strong> ${this.formatearMoneda(montoRegresarCliente.toString())}</p>
            `;
          } else if (montoAbonarDeuda > 0) {
            mensajeExito = `
              <p>La venta a crédito ha sido cancelada</p>
              <hr style="margin: 10px 0;">
              <p><i class="fa fa-credit-card"></i> <strong>Abonado a deuda:</strong> ${this.formatearMoneda(montoAbonarDeuda.toString())}</p>
              <p style="color: #28a745;"><i class="fa fa-check-circle"></i> No se regresó efectivo al cliente</p>
            `;
          } else if (montoRegresarCliente > 0) {
            mensajeExito = `
              <p>La venta a crédito ha sido cancelada</p>
              <hr style="margin: 10px 0;">
              <p><i class="fa fa-money"></i> <strong>Devuelto al cliente:</strong> ${this.formatearMoneda(montoRegresarCliente.toString())}</p>
            `;
          } else {
            mensajeExito = `
              <p>La venta a crédito ha sido cancelada</p>
              <hr style="margin: 10px 0;">
              <p style="color: #28a745;"><i class="fa fa-check-circle"></i> Deuda del cliente eliminada</p>
              <p>No se regresó efectivo al cliente</p>
            `;
          }
        }
        
        Swal.fire({
          icon: 'success',
          title: 'Venta cancelada',
          html: mensajeExito,
          confirmButtonColor: '#3085d6',
          timer: 4000,
          customClass: {
            container: 'swal-high-zindex'
          }
        });

        // Recargar las ventas para reflejar el cambio
        await this.cargarVentasDelDia();
      } catch (error) {
        console.error('Error al cancelar venta:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cancelar la venta',
          confirmButtonColor: '#3085d6',
          customClass: {
            container: 'swal-high-zindex'
          }
        });
      }
    }
  }

  async reimprimirTicket() {
    if (!this.ventaSeleccionada) {
      Swal.fire({
        icon: 'info',
        title: 'No hay venta seleccionada',
        text: 'Por favor selecciona una venta para reimprimir',
        confirmButtonText: 'Aceptar',
        customClass: {
          container: 'swal-high-zindex'
        }
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Reimprimir ticket?',
      html: `
        <p>¿Deseas reimprimir el ticket de esta venta?</p>
        <p><strong>Folio:</strong> #${this.ventaSeleccionada.idTemp}</p>
        <p><strong>Total:</strong> $${parseFloat(this.ventaSeleccionada.total).toFixed(2)}</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reimprimir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
      customClass: {
        container: 'swal-high-zindex'
      }
    });

    if (result.isConfirmed) {
      try {
        // Obtener la venta completa desde Firestore para asegurar que tenemos todos los datos
        const ventaCompleta = await this.ventasService.obtenerVentaPorId(this.ventaSeleccionada.id!);
        
        if (!ventaCompleta) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo obtener la información de la venta',
            confirmButtonText: 'Aceptar',
            customClass: {
              container: 'swal-high-zindex'
            }
          });
          return;
        }

        let saldoTotalCliente = 0;

        // Si es venta a crédito, obtener el saldo del cliente
        if (ventaCompleta.formaDePago === 2 && ventaCompleta.idCliente) {
          const cliente = await this.clientesService.obtenerClientePorId(ventaCompleta.idCliente);
          if (cliente) {
            saldoTotalCliente = cliente.saldoActual;
          }
        }

        this.imprimirTicketVenta(ventaCompleta, saldoTotalCliente);
      } catch (error) {
        console.error('Error al reimprimir ticket:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo reimprimir el ticket',
          confirmButtonText: 'Aceptar',
          customClass: {
            container: 'swal-high-zindex'
          }
        });
      }
    }
  }

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
      };
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error de impresión',
        text: 'No se pudo abrir la ventana de impresión. Verifica que los pop-ups no estén bloqueados.',
        confirmButtonText: 'Aceptar',
        customClass: {
          container: 'swal-high-zindex'
        }
      });
    }
  }

  /**
   * Devuelve todo el inventario de una venta cancelada
   */
  async devolverInventarioCompleto() {
    try {
      // Obtener configuración
      const config = await this.configuracionService.obtenerOpcionesHabilitadas();
      
      // Solo devolver inventario si la opción está activa
      if (!config || !config.usarInventarios) {
        return;
      }

      if (!this.ventaSeleccionada || !this.ventaSeleccionada.detalleProductos) {
        return;
      }

      // Recorrer todos los productos de la venta cancelada
      for (const producto of this.ventaSeleccionada.detalleProductos) {
        try {
          const productoDoc = await this.productosService.obtenerProductoPorId(producto.id);
          
          if (productoDoc) {
            const inventarioActual = productoDoc.inventario || 0;
            const cantidadDevuelta = parseFloat(producto.cantidad);
            const nuevoInventario = inventarioActual + cantidadDevuelta;

            // Actualizar inventario en Firestore
            await this.productosService.actualizarInventario(producto.id, nuevoInventario);

            // Obtener el nombre del departamento
            let nombreDepartamento = 'Sin Departamento';
            if (productoDoc.departamento && productoDoc.departamento !== '0') {
              const deptoDoc = await this.departamentosService.obtenerDepartamentosPorId(productoDoc.departamento);
              if (deptoDoc.exists()) {
                const deptoData: any = deptoDoc.data();
                nombreDepartamento = deptoData.nombre || 'Sin Departamento';
              }
            }

            // Registrar movimiento de inventario
            const movimiento: MovimientoInventarioInterface = {
              fecha: Timestamp.fromDate(new Date()),
              idProducto: producto.id,
              descripcionProducto: producto.descripcion,
              cantidadAnterior: inventarioActual,
              cantidadMovimiento: cantidadDevuelta,
              cantidadNueva: nuevoInventario,
              tipo: 'DEVOLUCION',
              idCajero: localStorage.getItem('userId') || '0',
              nombreCajero: localStorage.getItem('nombreUsuario') || 'Desconocido',
              departamento: productoDoc.departamento || '0',
              nombreDepartamento: nombreDepartamento,
              observaciones: `Cancelación de venta - Folio: ${this.ventaSeleccionada.idTemp}`
            };

            await this.movimientosService.registrarMovimiento(movimiento);
          }
        } catch (error) {
          console.error(`Error al devolver inventario del producto ${producto.id}:`, error);
          // Continuar con los demás productos aunque uno falle
        }
      }
    } catch (error) {
      console.error('Error al devolver inventario completo:', error);
      // No interrumpir el proceso de cancelación por errores de inventario
    }
  }

  /**
   * Devuelve inventario de una devolución parcial
   */
  async devolverInventarioParcial(idProducto: string, cantidadDevuelta: number) {
    try {
      // Obtener configuración
      const config = await this.configuracionService.obtenerOpcionesHabilitadas();
      
      // Solo devolver inventario si la opción está activa
      if (!config || !config.usarInventarios) {
        return;
      }

      const productoDoc = await this.productosService.obtenerProductoPorId(idProducto);
      
      if (productoDoc) {
        const inventarioActual = productoDoc.inventario || 0;
        const nuevoInventario = inventarioActual + cantidadDevuelta;

        // Actualizar inventario en Firestore
        await this.productosService.actualizarInventario(idProducto, nuevoInventario);

        // Obtener el nombre del departamento
        let nombreDepartamento = 'Sin Departamento';
        if (productoDoc.departamento && productoDoc.departamento !== '0') {
          const deptoDoc = await this.departamentosService.obtenerDepartamentosPorId(productoDoc.departamento);
          if (deptoDoc.exists()) {
            const deptoData: any = deptoDoc.data();
            nombreDepartamento = deptoData.nombre || 'Sin Departamento';
          }
        }

        // Registrar movimiento de inventario
        const movimiento: MovimientoInventarioInterface = {
          fecha: Timestamp.fromDate(new Date()),
          idProducto: idProducto,
          descripcionProducto: productoDoc.descripcion || 'Producto',
          cantidadAnterior: inventarioActual,
          cantidadMovimiento: cantidadDevuelta,
          cantidadNueva: nuevoInventario,
          tipo: 'DEVOLUCION',
          idCajero: localStorage.getItem('userId') || '0',
          nombreCajero: localStorage.getItem('nombreUsuario') || 'Desconocido',
          departamento: productoDoc.departamento || '0',
          nombreDepartamento: nombreDepartamento,
          observaciones: `Devolución parcial - Folio: ${this.ventaSeleccionada?.idTemp || 'N/A'}`
        };

        await this.movimientosService.registrarMovimiento(movimiento);
      }
    } catch (error) {
      console.error(`Error al devolver inventario del producto ${idProducto}:`, error);
      // No interrumpir el proceso de devolución por errores de inventario
    }
  }

  // ==================== MÉTODOS AUXILIARES PARA VENTAS A CRÉDITO ====================

  /**
   * Obtiene la venta a crédito asociada a una venta
   */
  async obtenerVentaCredito(idVenta: string): Promise<VentaCreditoInterface | null> {
    try {
      const ventasCredito = await this.clientesService.obtenerVentasCreditoPorIdVenta(idVenta);
      return ventasCredito.length > 0 ? ventasCredito[0] : null;
    } catch (error) {
      console.error('Error al obtener venta a crédito:', error);
      return null;
    }
  }

  /**
   * Calcula el total de abonos realizados a una venta a crédito
   */
  async calcularTotalAbonos(idVentaCredito: string): Promise<number> {
    try {
      const abonos = await this.clientesService.obtenerAbonosVentaCredito(idVentaCredito);
      return abonos.reduce((total, abono) => total + abono.monto, 0);
    } catch (error) {
      console.error('Error al calcular total de abonos:', error);
      return 0;
    }
  }

  /**
   * Calcula la deuda total del cliente (todas sus ventas a crédito no liquidadas)
   */
  async calcularDeudaTotalCliente(idCliente: string): Promise<number> {
    try {
      const ventasNoLiquidadas = await this.clientesService.obtenerVentasCreditoCliente(idCliente, true);
      return ventasNoLiquidadas.reduce((total, venta) => total + venta.saldoPendiente, 0);
    } catch (error) {
      console.error('Error al calcular deuda total:', error);
      return 0;
    }
  }

  /**
   * Distribuye un saldo a favor entre las ventas pendientes del cliente
   */
  async distribuirSaldoAFavor(idCliente: string, montoADistribuir: number): Promise<number> {
    try {
      // Obtener ventas no liquidadas ordenadas por fecha (más antiguas primero)
      const ventasNoLiquidadas = await this.clientesService.obtenerVentasCreditoCliente(idCliente, true);
      ventasNoLiquidadas.sort((a, b) => a.fechaVenta.toMillis() - b.fechaVenta.toMillis());

      let montoRestante = montoADistribuir;

      for (const venta of ventasNoLiquidadas) {
        if (montoRestante <= 0) break;

        const montoAbonar = Math.min(venta.saldoPendiente, montoRestante);
        const nuevoSaldo = venta.saldoPendiente - montoAbonar;

        // Registrar el abono
        const abono: AbonoInterface = {
          idVentaCredito: venta.id!,
          idCliente: idCliente,
          monto: montoAbonar,
          fecha: Timestamp.fromDate(new Date()),
          idCajero: localStorage.getItem('userId') || '0',
          nombreCajero: localStorage.getItem('nombreUsuario') || 'Desconocido',
          observaciones: `Abono automático por devolución - Folio ${this.ventaSeleccionada?.idTemp}`
        };

        await this.clientesService.registrarAbono(abono);
        await this.clientesService.actualizarSaldoVentaCredito(venta.id!, nuevoSaldo);

        montoRestante -= montoAbonar;
      }

      return montoRestante; // Retorna el excedente que no se pudo aplicar
    } catch (error) {
      console.error('Error al distribuir saldo a favor:', error);
      return montoADistribuir;
    }
  }

  /**
   * Procesa la devolución de una venta a crédito
   */
  async procesarDevolucionCredito(
    ventaCredito: VentaCreditoInterface,
    montoDevolucion: number,
    cantidadADevolver: number,
    articulo: any,
    esDevolucionTotal: boolean,
    productosActualizados: any[],
    nuevoTotal: number
  ): Promise<void> {
    const idCliente = ventaCredito.idCliente;

    // Calcular total de abonos que se han hecho a esta venta
    const totalAbonos = await this.calcularTotalAbonos(ventaCredito.id!);

    // Calcular deuda total del cliente (incluyendo esta venta)
    const deudaTotalCliente = await this.calcularDeudaTotalCliente(idCliente);

    // Calcular deuda del cliente sin esta venta
    const deudaSinEstaVenta = deudaTotalCliente - ventaCredito.saldoPendiente;

    let montoADevolver = 0;

    // Si es devolución total y hay abonos
    if (esDevolucionTotal && totalAbonos > 0) {
      // Si el cliente tiene más deudas
      if (deudaSinEstaVenta > 0) {
        // Comparar los abonos con la deuda restante
        if (totalAbonos <= deudaSinEstaVenta) {
          // No devolver efectivo, aplicar como saldo a favor
          await this.distribuirSaldoAFavor(idCliente, totalAbonos);
          montoADevolver = 0;
        } else {
          // Liquidar las otras deudas y devolver el excedente
          const excedente = await this.distribuirSaldoAFavor(idCliente, totalAbonos);
          montoADevolver = excedente;
        }
      } else {
        // Es la única deuda, devolver todo lo abonado
        montoADevolver = totalAbonos;
      }

      // Eliminar todos los abonos de esta venta
      const abonos = await this.clientesService.obtenerAbonosVentaCredito(ventaCredito.id!);
      for (const abono of abonos) {
        await this.clientesService.eliminarAbono(abono.id!);
      }

      // Marcar la venta a crédito como cancelada o eliminarla
      await this.clientesService.eliminarVentaCredito(ventaCredito.id!);

      // Actualizar saldo del cliente
      const cliente = await this.clientesService.obtenerClientePorId(idCliente);
      if (cliente) {
        const nuevoSaldo = cliente.saldoActual - ventaCredito.total;
        await this.clientesService.actualizarSaldoCliente(idCliente, Math.max(0, nuevoSaldo));
      }

    } else if (esDevolucionTotal && totalAbonos === 0) {
      // Devolución total sin abonos: solo actualizar saldos
      await this.clientesService.eliminarVentaCredito(ventaCredito.id!);
      
      const cliente = await this.clientesService.obtenerClientePorId(idCliente);
      if (cliente) {
        const nuevoSaldo = cliente.saldoActual - ventaCredito.total;
        await this.clientesService.actualizarSaldoCliente(idCliente, Math.max(0, nuevoSaldo));
      }

    } else {
      // Devolución parcial
      const proporcionDevolucion = montoDevolucion / ventaCredito.total;
      const abonosADevolver = totalAbonos * proporcionDevolucion;

      if (abonosADevolver > 0) {
        // Si el cliente tiene más deudas
        if (deudaSinEstaVenta > 0) {
          if (abonosADevolver <= deudaSinEstaVenta) {
            // No devolver efectivo, aplicar como saldo a favor
            await this.distribuirSaldoAFavor(idCliente, abonosADevolver);
            montoADevolver = 0;
          } else {
            // Liquidar otras deudas y devolver el excedente
            const excedente = await this.distribuirSaldoAFavor(idCliente, abonosADevolver);
            montoADevolver = excedente;
          }
        } else {
          // Es la única deuda, devolver la proporción de abonos
          montoADevolver = abonosADevolver;
        }
      }

      // Convertir productos actualizados al formato de VentaCredito
      const productosVentaCredito = productosActualizados.map(prod => ({
        descripcion: prod.descripcion,
        precioVenta: parseFloat(prod.precioVenta),
        cantidad: parseFloat(prod.cantidad),
        importe: parseFloat(prod.importe)
      }));

      // Actualizar la venta a crédito con productos, total y saldo actualizados
      const nuevoSaldoVenta = ventaCredito.saldoPendiente - montoDevolucion;
      await this.clientesService.actualizarVentaCreditoDespuesDevolucion(
        ventaCredito.id!,
        productosVentaCredito,
        nuevoTotal,
        Math.max(0, nuevoSaldoVenta)
      );

      // Actualizar saldo del cliente
      const cliente = await this.clientesService.obtenerClientePorId(idCliente);
      if (cliente) {
        const nuevoSaldoCliente = cliente.saldoActual - montoDevolucion;
        await this.clientesService.actualizarSaldoCliente(idCliente, Math.max(0, nuevoSaldoCliente));
      }
    }

    // Registrar salida de dinero solo si hay que devolver efectivo
    if (montoADevolver > 0) {
      const salida: SalidaDineroInterface = {
        fecha: Timestamp.fromDate(new Date()),
        cantidad: montoADevolver,
        detalle: `Devolución crédito - Folio: ${this.ventaSeleccionada!.idTemp} - ${articulo.descripcion} (${cantidadADevolver}) - Abonos devueltos`,
        idCajero: localStorage.getItem('userId') || '0'
      };

      await this.salidasService.registrarSalida(salida);
    }

    // Devolver inventario
    await this.devolverInventarioParcial(articulo.id, cantidadADevolver);
  }
}
