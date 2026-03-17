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
    private departamentosService: DepartamentosService
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

    // Calcular el monto a devolver
    const montoADevolver = cantidadADevolver * precioUnitario;

    // Mostrar confirmación con el monto a devolver
    const confirmacion = await Swal.fire({
      title: 'Devolución de artículo',
      html: `
        <div style="text-align: left; margin: 20px;">
          <p><strong>${articulo.descripcion}</strong></p>
          <p>Cantidad a devolver: <strong>${cantidadADevolver}</strong></p>
          <p>Precio unitario: <strong>${this.formatearMoneda(precioUnitario.toString())}</strong></p>
          <hr style="margin: 15px 0;">
          <p style="font-size: 1.3em; color: #d33;">
            Monto a regresar al cliente: 
            <strong>${this.formatearMoneda(montoADevolver.toString())}</strong>
          </p>
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
      
      Swal.fire({
        icon: 'success',
        title: 'Devolución exitosa',
        html: `
          <p>Se ha procesado la devolución</p>
          <p><strong>Monto devuelto: ${this.formatearMoneda(montoADevolver.toString())}</strong></p>
        `,
        confirmButtonColor: '#3085d6',
        timer: 3000,
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

    // Crear una copia del array de productos
    const productosActualizados = [...this.ventaSeleccionada.detalleProductos!];

    // Si la cantidad restante es 0, eliminar el artículo
    if (cantidadRestante <= 0) {
      productosActualizados.splice(this.articuloSeleccionado, 1);
    } else {
      // Actualizar la cantidad y el importe del artículo
      const nuevoImporte = cantidadRestante * parseFloat(articulo.precioVenta);
      productosActualizados[this.articuloSeleccionado] = {
        ...articulo,
        cantidad: cantidadRestante.toString(),
        importe: nuevoImporte.toString()
      };
    }

    // Recalcular el total de la venta
    const nuevoTotal = productosActualizados.reduce((sum, prod) => sum + parseFloat(prod.importe), 0);
    
    // Recalcular el total de artículos (productos por unidad suman cantidad, productos por kilo cuentan como 1)
    const nuevoTotalArticulos = productosActualizados.reduce((sum, prod) => {
      const cantidad = parseFloat(prod.cantidad);
      let seVende = prod.seVende;
      
      // Si seVende no existe (ventas antiguas), inferir del tipo de cantidad
      if (!seVende) {
        if (cantidad < 1 || (cantidad % 1 !== 0 && cantidad < 10)) {
          seVende = 2; // Por peso/kilo
        } else {
          seVende = 1; // Por unidad
        }
      }
      
      return sum + (seVende == 2 ? 1 : cantidad);
    }, 0);

    // Actualizar la venta en Firestore
    await this.ventasService.actualizarVentaDespuesDevolucion(
      this.ventaSeleccionada.id!,
      productosActualizados,
      nuevoTotal.toString(),
      nuevoTotalArticulos.toString()
    );

    // Registrar la salida de efectivo por la devolución (ligado al cajero en turno)
    const salida: SalidaDineroInterface = {
      fecha: Timestamp.fromDate(new Date()),
      cantidad: montoADevolver,
      detalle: `Devolución - Folio: ${this.ventaSeleccionada.idTemp} - ${articulo.descripcion} (${cantidadADevolver})`,
      idCajero: localStorage.getItem('userId') || '0'
    };

    await this.salidasService.registrarSalida(salida);

    // Devolver inventario si está habilitado
    await this.devolverInventarioParcial(articulo.id, cantidadADevolver);

    // Resetear la selección de artículo
    this.articuloSeleccionado = -1;
  }

  cancelarVenta() {
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

    Swal.fire({
      title: '¿Cancelar esta venta?',
      html: `<p>Folio: <strong>${this.ventaSeleccionada.idTemp}</strong></p>
             <p>Total: <strong>${this.formatearMoneda(this.ventaSeleccionada.total)}</strong></p>
             <p class="text-danger mt-3">Esta acción marcará la venta como cancelada.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, cancelar venta',
      cancelButtonText: 'No',
      customClass: {
        container: 'swal-high-zindex'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await this.ventasService.cancelarVenta(this.ventaSeleccionada!.id!);
          
          // Devolver inventario si está habilitado
          await this.devolverInventarioCompleto();
          
          Swal.fire({
            icon: 'success',
            title: 'Venta cancelada',
            text: 'La venta ha sido cancelada exitosamente',
            confirmButtonColor: '#3085d6',
            timer: 2000,
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
    });
  }

  reimprimirTicket() {
    Swal.fire({
      icon: 'info',
      title: 'Funcionalidad pendiente',
      text: 'Esta función se implementará próximamente',
      confirmButtonColor: '#3085d6',
      customClass: {
        container: 'swal-high-zindex'
      }
    });
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
}
