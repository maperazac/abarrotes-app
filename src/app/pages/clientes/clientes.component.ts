import { Component, OnInit } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import ClienteInterface, { VentaCreditoInterface } from 'src/app/interfaces/cliente.interface';
import { ClientesService } from 'src/app/services/clientes.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.scss']
})
export class ClientesComponent implements OnInit {

  vistaActual: 'estado-cuenta' | 'nuevo' | 'modificar' | 'eliminar' = 'estado-cuenta';
  
  // Búsqueda de cliente
  mostrarModalBusqueda: boolean = false;
  textoBusquedaCliente: string = '';
  clientesEncontrados: ClienteInterface[] = [];
  clienteSeleccionado: ClienteInterface | null = null;
  buscandoClientes: boolean = false;

  // Estado de cuenta
  ventasCredito: VentaCreditoInterface[] = [];
  ventasCreditoFiltradas: VentaCreditoInterface[] = [];
  mostrarSoloNoLiquidadas: boolean = true;
  cargandoVentas: boolean = false;
  ventaSeleccionadaEstado: VentaCreditoInterface | null = null;

  // Nuevo cliente
  nuevoCliente = {
    nombre: '',
    direccion: '',
    telefono: '',
    limiteCredito: 0
  };
  guardandoCliente: boolean = false;

  constructor(
    private clientesService: ClientesService
  ) { }

  ngOnInit(): void {
    // Mostrar modal de búsqueda al iniciar
    this.mostrarModalBusqueda = true;
  }

  cambiarVista(vista: 'estado-cuenta' | 'nuevo' | 'modificar' | 'eliminar'): void {
    this.vistaActual = vista;
    
    // Si cambia a estado de cuenta, mostrar modal de búsqueda
    if (vista === 'estado-cuenta') {
      this.abrirModalBusqueda();
    }
  }

  // ==================== BÚSQUEDA DE CLIENTE ====================

  abrirModalBusqueda(): void {
    this.mostrarModalBusqueda = true;
    this.textoBusquedaCliente = '';
    this.clientesEncontrados = [];
  }

  cerrarModalBusqueda(): void {
    this.mostrarModalBusqueda = false;
  }

  async buscarClientes(): Promise<void> {
    if (!this.textoBusquedaCliente || this.textoBusquedaCliente.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Búsqueda vacía',
        text: 'Por favor ingresa un nombre o número de cliente',
        confirmButtonText: 'Aceptar'
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
          confirmButtonText: 'Aceptar'
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

  seleccionarClienteBusqueda(cliente: ClienteInterface): void {
    this.clienteSeleccionado = cliente;
  }

  async aceptarSeleccionCliente(): Promise<void> {
    if (!this.clienteSeleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Cliente no seleccionado',
        text: 'Por favor selecciona un cliente de la lista',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    this.cerrarModalBusqueda();
    await this.cargarEstadoCuenta();
  }

  // ==================== ESTADO DE CUENTA ====================

  async cargarEstadoCuenta(): Promise<void> {
    if (!this.clienteSeleccionado) return;

    try {
      this.cargandoVentas = true;
      this.ventasCredito = await this.clientesService.obtenerVentasCreditoCliente(
        this.clienteSeleccionado.id!,
        this.mostrarSoloNoLiquidadas
      );
      this.ventasCreditoFiltradas = this.ventasCredito;
    } catch (error) {
      console.error('Error al cargar estado de cuenta:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar el estado de cuenta del cliente',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      this.cargandoVentas = false;
    }
  }

  cambiarFiltroLiquidadas(event: any): void {
    this.mostrarSoloNoLiquidadas = event.target.value === 'no-liquidadas';
    this.cargarEstadoCuenta();
  }

  seleccionarVentaEstado(venta: VentaCreditoInterface): void {
    this.ventaSeleccionadaEstado = venta;
  }

  formatearFecha(timestamp: Timestamp): string {
    const fecha = timestamp.toDate();
    const opciones: Intl.DateTimeFormatOptions = { 
      weekday: 'long',
      day: 'numeric'
    };
    const dia = fecha.toLocaleDateString('es-MX', opciones);
    return `${fecha.getDate()} - ${dia.split(',')[0]}`;
  }

  obtenerMesVenta(timestamp: Timestamp): string {
    const fecha = timestamp.toDate();
    return fecha.toLocaleDateString('es-MX', { month: 'long' });
  }

  calcularImpuestos(): number {
    // Por ahora retornamos 0, se puede implementar cálculo de impuestos después
    return 0;
  }

  calcularTotalGeneral(): number {
    return this.ventasCreditoFiltradas.reduce((total, venta) => {
      return total + (venta.saldoPendiente || 0);
    }, 0);
  }

  getLimiteCreditoTexto(): string {
    if (!this.clienteSeleccionado) return '';
    if (!this.clienteSeleccionado.limiteCredito || this.clienteSeleccionado.limiteCredito === 0) {
      return '(Sin Límite)';
    }
    return `$${this.clienteSeleccionado.limiteCredito.toFixed(2)}`;
  }

  // ==================== NUEVO CLIENTE ====================

  inicializarNuevoCliente(): void {
    this.nuevoCliente = {
      nombre: '',
      direccion: '',
      telefono: '',
      limiteCredito: 0
    };
  }

  async guardarNuevoCliente(): Promise<void> {
    // Validar campos
    if (!this.nuevoCliente.nombre || this.nuevoCliente.nombre.trim() === '') {
      await Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El nombre del cliente es obligatorio'
      });
      return;
    }

    // Generar número de cliente único (timestamp)
    const numeroCliente = Date.now().toString();

    const nuevoClienteData: ClienteInterface = {
      numero: numeroCliente,
      nombre: this.nuevoCliente.nombre.trim(),
      direccion: this.nuevoCliente.direccion?.trim() || '',
      telefono: this.nuevoCliente.telefono?.trim() || '',
      limiteCredito: this.nuevoCliente.limiteCredito || 0,
      saldoActual: 0,
      fechaRegistro: Timestamp.now(),
      activo: true
    };

    this.guardandoCliente = true;

    try {
      await this.clientesService.crearCliente(nuevoClienteData);
      
      await Swal.fire({
        icon: 'success',
        title: '¡Cliente guardado!',
        text: `Cliente ${nuevoClienteData.nombre} registrado correctamente`,
        timer: 2000,
        showConfirmButton: false
      });

      // Limpiar formulario
      this.inicializarNuevoCliente();

    } catch (error) {
      console.error('Error al guardar cliente:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar el cliente. Intente nuevamente.'
      });
    } finally {
      this.guardandoCliente = false;
    }
  }

  cancelarNuevoCliente(): void {
    this.inicializarNuevoCliente();
  }

}
