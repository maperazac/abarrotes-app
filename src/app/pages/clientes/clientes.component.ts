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

  vistaActual: 'estado-cuenta' | 'nuevo' | 'modificar' | 'reporte-saldos' = 'estado-cuenta';
  
  // Búsqueda de cliente
  mostrarModalBusqueda: boolean = false;
  textoBusquedaCliente: string = '';
  clientesEncontrados: ClienteInterface[] = [];
  clienteSeleccionado: ClienteInterface | null = null;
  buscandoClientes: boolean = false;

  // Estado de cuenta
  ventasCredito: VentaCreditoInterface[] = [];
  ventasCreditoFiltradas: VentaCreditoInterface[] = [];
  ventasPorDia: { fecha: string, timestamp: Timestamp, ventas: VentaCreditoInterface[] }[] = [];
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

  // Modificar/Eliminar cliente
  textoBusquedaModificar: string = '';
  clientesListaModificar: ClienteInterface[] = [];
  clientesListaModificarFiltrados: ClienteInterface[] = [];
  clienteEditando: ClienteInterface | null = null;
  cargandoClientesModificar: boolean = false;
  modificandoCliente: boolean = false;
  paginaActual: number = 1;
  clientesPorPagina: number = 10;

  // Reporte de saldos
  clientesReporte: ClienteInterface[] = [];
  clientesReporteFiltrados: ClienteInterface[] = [];
  cargandoReporte: boolean = false;
  filtroReporte: 'todos' | 'con-deuda' | 'sin-deuda' = 'con-deuda';
  ordenReporte: 'nombre-asc' | 'nombre-desc' | 'saldo-asc' | 'saldo-desc' = 'saldo-desc';
  textoBusquedaReporte: string = '';
  paginaActualReporte: number = 1;
  clientesPorPaginaReporte: number = 15;

  constructor(
    private clientesService: ClientesService
  ) { }

  ngOnInit(): void {
    // Mostrar modal de búsqueda al iniciar
    this.mostrarModalBusqueda = true;
  }

  cambiarVista(vista: 'estado-cuenta' | 'nuevo' | 'modificar' | 'reporte-saldos'): void {
    this.vistaActual = vista;
    
    // Si cambia a estado de cuenta, mostrar modal de búsqueda
    if (vista === 'estado-cuenta') {
      this.abrirModalBusqueda();
    }
    
    // Si cambia a modificar, cargar lista de clientes
    if (vista === 'modificar') {
      this.cargarClientesParaModificar();
    }

    // Si cambia a reporte de saldos, cargar datos
    if (vista === 'reporte-saldos') {
      this.cargarReporteSaldos();
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
      // Siempre cargar TODAS las ventas del cliente
      this.ventasCredito = await this.clientesService.obtenerVentasCreditoCliente(
        this.clienteSeleccionado.id!,
        false // false = traer todas las ventas (liquidadas y no liquidadas)
      );
      // Aplicar el filtro para determinar qué ventas mostrar
      this.aplicarFiltroVentas();
      this.agruparVentasPorDia();
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
    this.aplicarFiltroVentas();
    this.agruparVentasPorDia();
  }

  aplicarFiltroVentas(): void {
    if (this.mostrarSoloNoLiquidadas) {
      this.ventasCreditoFiltradas = this.ventasCredito.filter(v => !v.liquidada);
    } else {
      this.ventasCreditoFiltradas = this.ventasCredito;
    }
  }

  seleccionarVentaEstado(venta: VentaCreditoInterface): void {
    this.ventaSeleccionadaEstado = venta;
  }

  formatearFecha(timestamp: Timestamp): string {
    const fecha = timestamp.toDate();
    const opciones: Intl.DateTimeFormatOptions = { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return fecha.toLocaleDateString('es-MX', opciones);
  }

  formatearHora(timestamp: Timestamp): string {
    const fecha = timestamp.toDate();
    return fecha.toLocaleTimeString('es-MX', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  agruparVentasPorDia(): void {
    const grupos = new Map<string, VentaCreditoInterface[]>();
    
    // Agrupar ventas por día (ignorando hora)
    this.ventasCreditoFiltradas.forEach(venta => {
      const fecha = venta.fechaVenta.toDate();
      const fechaKey = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
      
      if (!grupos.has(fechaKey)) {
        grupos.set(fechaKey, []);
      }
      grupos.get(fechaKey)!.push(venta);
    });
    
    // Convertir a array y ordenar por fecha descendente
    this.ventasPorDia = Array.from(grupos.entries()).map(([key, ventas]) => {
      // Ordenar ventas dentro del día por hora descendente
      ventas.sort((a, b) => b.fechaVenta.toMillis() - a.fechaVenta.toMillis());
      
      return {
        fecha: this.formatearFecha(ventas[0].fechaVenta),
        timestamp: ventas[0].fechaVenta,
        ventas
      };
    }).sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
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

  getSaldoActualCliente(): number {
    // Calcula el saldo actual real del cliente sumando todas las ventas no liquidadas
    // Esto garantiza que siempre sea correcto, sin depender del campo almacenado en Firestore
    if (!this.ventasCredito || this.ventasCredito.length === 0) return 0;
    
    return this.ventasCredito
      .filter(venta => !venta.liquidada)
      .reduce((total, venta) => total + (venta.saldoPendiente || 0), 0);
  }

  getLimiteCreditoTexto(): string {
    if (!this.clienteSeleccionado) return '';
    if (!this.clienteSeleccionado.limiteCredito || this.clienteSeleccionado.limiteCredito === 0) {
      return '(Sin Límite)';
    }
    return `$${this.clienteSeleccionado.limiteCredito.toFixed(2)}`;
  }

  // ==================== ACCIONES DE ESTADO DE CUENTA ====================

  async abrirModalAbonar(): Promise<void> {
    if (!this.ventaSeleccionadaEstado) {
      Swal.fire({
        icon: 'warning',
        title: 'Venta no seleccionada',
        text: 'Por favor selecciona una venta de la lista para abonar',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    if (this.ventaSeleccionadaEstado.liquidada) {
      Swal.fire({
        icon: 'info',
        title: 'Venta ya liquidada',
        text: 'Esta venta ya está completamente pagada',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const { value: montoAbono } = await Swal.fire({
      title: 'Registrar Abono',
      html: `
        <p><strong>Cliente:</strong> ${this.clienteSeleccionado!.nombre}</p>
        <p><strong>Saldo pendiente:</strong> $${this.ventaSeleccionadaEstado.saldoPendiente.toFixed(2)}</p>
        <div style="margin-top: 1rem;">
          <label for="monto-abono" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Monto del abono:</label>
          <input type="number" id="monto-abono" class="swal2-input" placeholder="0.00" min="0" step="0.01" style="width: 80%; margin: 0 auto;">
        </div>
        <div style="margin-top: 1rem;">
          <label for="observaciones-abono" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Observaciones (opcional):</label>
          <textarea id="observaciones-abono" class="swal2-textarea" placeholder="Notas sobre el abono..." style="width: 80%; margin: 0 auto;"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Registrar Abono',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const monto = (document.getElementById('monto-abono') as HTMLInputElement).value;
        const observaciones = (document.getElementById('observaciones-abono') as HTMLTextAreaElement).value;
        
        if (!monto || parseFloat(monto) <= 0) {
          Swal.showValidationMessage('Por favor ingresa un monto válido');
          return false;
        }

        if (parseFloat(monto) > this.ventaSeleccionadaEstado!.saldoPendiente) {
          Swal.showValidationMessage('El monto del abono no puede ser mayor al saldo pendiente');
          return false;
        }

        return { monto: parseFloat(monto), observaciones };
      }
    });

    if (montoAbono) {
      await this.registrarAbono(montoAbono.monto, montoAbono.observaciones);
    }
  }

  async registrarAbono(monto: number, observaciones: string): Promise<void> {
    try {
      const abono: any = {
        idVentaCredito: this.ventaSeleccionadaEstado!.id!,
        idCliente: this.clienteSeleccionado!.id!,
        monto: monto,
        fecha: Timestamp.now(),
        idCajero: localStorage.getItem('userId') || '0',
        nombreCajero: localStorage.getItem('nombreUsuario') || 'Desconocido',
        observaciones: observaciones || ''
      };

      // Registrar el abono
      await this.clientesService.registrarAbono(abono);

      // Actualizar saldo de la venta a crédito
      const nuevoSaldoVenta = this.ventaSeleccionadaEstado!.saldoPendiente - monto;
      await this.clientesService.actualizarSaldoVentaCredito(
        this.ventaSeleccionadaEstado!.id!,
        nuevoSaldoVenta
      );

      // Actualizar saldo del cliente
      const saldoActualCliente = this.getSaldoActualCliente();
      const nuevoSaldoCliente = saldoActualCliente - monto;
      await this.clientesService.actualizarSaldoCliente(
        this.clienteSeleccionado!.id!,
        nuevoSaldoCliente
      );

      Swal.fire({
        icon: 'success',
        title: '¡Abono registrado!',
        html: `
          <p>Abono de <strong>$${monto.toFixed(2)}</strong> registrado correctamente</p>
          <p>Nuevo saldo de la venta: <strong>$${nuevoSaldoVenta.toFixed(2)}</strong></p>
          <p>Nuevo saldo del cliente: <strong>$${nuevoSaldoCliente.toFixed(2)}</strong></p>
        `,
        timer: 3000,
        showConfirmButton: false
      });

      // Guardar el ID de la venta seleccionada
      const idVentaSeleccionada = this.ventaSeleccionadaEstado!.id;

      // Recargar estado de cuenta
      await this.cargarEstadoCuenta();

      // Actualizar el cliente seleccionado
      const clienteActualizado = await this.clientesService.obtenerClientePorId(this.clienteSeleccionado!.id!);
      if (clienteActualizado) {
        this.clienteSeleccionado = clienteActualizado;
      }

      // Actualizar la venta seleccionada con los datos recargados
      const ventaActualizada = this.ventasCredito.find(v => v.id === idVentaSeleccionada);
      if (ventaActualizada) {
        this.ventaSeleccionadaEstado = ventaActualizada;
      }

    } catch (error) {
      console.error('Error al registrar abono:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo registrar el abono. Intente nuevamente.',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  async abonoGeneral(): Promise<void> {
    const saldoActual = this.getSaldoActualCliente();
    
    if (!this.clienteSeleccionado || saldoActual <= 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin adeudos',
        text: 'El cliente no tiene saldo pendiente',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: 'Abono General',
      html: `
        <p><strong>Cliente:</strong> ${this.clienteSeleccionado.nombre}</p>
        <p><strong>Saldo total:</strong> <span style="color: #dc2626; font-weight: 600;">$${saldoActual.toFixed(2)}</span></p>
        <div style="margin-top: 1rem;">
          <label for="monto-abono-general" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Monto del abono:</label>
          <input type="number" id="monto-abono-general" class="swal2-input" placeholder="0.00" min="0" step="0.01" style="width: 80%; margin: 0 auto;">
        </div>
        <div style="margin-top: 1rem;">
          <label for="observaciones-abono-general" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Observaciones (opcional):</label>
          <textarea id="observaciones-abono-general" class="swal2-textarea" placeholder="Notas sobre el abono..." style="width: 80%; margin: 0 auto;"></textarea>
        </div>
        <div style="margin-top: 1rem; padding: 0.75rem; background-color: #dbeafe; border-radius: 0.5rem; font-size: 0.85rem;">
          <i class="fa fa-info-circle" style="color: #2563eb;"></i>
          El abono se distribuirá automáticamente entre las deudas, empezando por la más antigua.
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Registrar Abono',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      preConfirm: () => {
        const monto = (document.getElementById('monto-abono-general') as HTMLInputElement).value;
        const observaciones = (document.getElementById('observaciones-abono-general') as HTMLTextAreaElement).value;
        
        if (!monto || parseFloat(monto) <= 0) {
          Swal.showValidationMessage('Por favor ingresa un monto válido mayor a 0');
          return false;
        }

        if (parseFloat(monto) > saldoActual) {
          Swal.showValidationMessage(`El monto no puede ser mayor al saldo total ($${saldoActual.toFixed(2)})`);
          return false;
        }

        return {
          monto: parseFloat(monto),
          observaciones: observaciones.trim()
        };
      }
    });

    if (!formValues) return;

    try {
      // Obtener todas las ventas no liquidadas ordenadas por fecha (más antigua primero)
      const ventasNoLiquidadas = await this.clientesService.obtenerVentasCreditoCliente(
        this.clienteSeleccionado.id!,
        true
      );

      if (ventasNoLiquidadas.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin ventas pendientes',
          text: 'No hay ventas pendientes para aplicar el abono',
          confirmButtonText: 'Aceptar'
        });
        return;
      }

      // Ordenar por fecha de venta (más antigua primero)
      ventasNoLiquidadas.sort((a, b) => {
        const fechaA = a.fechaVenta.toMillis();
        const fechaB = b.fechaVenta.toMillis();
        return fechaA - fechaB;
      });

      let montoRestante = formValues.monto;
      const ventasAfectadas: { venta: VentaCreditoInterface; montoAbonado: number }[] = [];

      // Distribuir el abono entre las ventas
      for (const venta of ventasNoLiquidadas) {
        if (montoRestante <= 0) break;

        let montoParaEstaVenta = 0;

        if (montoRestante >= venta.saldoPendiente) {
          // El abono cubre completamente esta deuda
          montoParaEstaVenta = venta.saldoPendiente;
          montoRestante -= venta.saldoPendiente;
        } else {
          // El abono solo cubre parcialmente esta deuda
          montoParaEstaVenta = montoRestante;
          montoRestante = 0;
        }

        ventasAfectadas.push({
          venta: venta,
          montoAbonado: montoParaEstaVenta
        });
      }

      // Mostrar confirmación con el desglose
      let desgloseHTML = '<div style="text-align: left; margin-top: 1rem;">';
      desgloseHTML += '<p style="font-weight: 600; margin-bottom: 0.5rem;">Desglose de distribución:</p>';
      desgloseHTML += '<ul style="list-style: none; padding: 0;">';
      
      for (const item of ventasAfectadas) {
        const fechaVenta = item.venta.fechaVenta.toDate().toLocaleDateString('es-MX');
        const saldoAnterior = item.venta.saldoPendiente;
        const nuevoSaldo = saldoAnterior - item.montoAbonado;
        const estado = nuevoSaldo === 0 ? '<span style="color: #10b981; font-weight: 600;">LIQUIDADA</span>' : `<span style="color: #f59e0b;">Pendiente: $${nuevoSaldo.toFixed(2)}</span>`;
        
        desgloseHTML += `
          <li style="padding: 0.5rem; margin-bottom: 0.5rem; background-color: #f9fafb; border-left: 3px solid #3b82f6; border-radius: 0.25rem;">
            <div style="font-size: 0.85rem;"><strong>Folio:</strong> #${item.venta.idTempVenta} | ${fechaVenta}</div>
            <div style="font-size: 0.85rem; margin-top: 0.25rem;">
              <strong>Abono:</strong> $${item.montoAbonado.toFixed(2)} 
              <span style="color: #6b7280;">($${saldoAnterior.toFixed(2)} → $${nuevoSaldo.toFixed(2)})</span>
            </div>
            <div style="font-size: 0.85rem; margin-top: 0.25rem;">${estado}</div>
          </li>
        `;
      }
      
      desgloseHTML += '</ul></div>';

      const confirmacion = await Swal.fire({
        title: '¿Confirmar abono general?',
        html: `
          <p><strong>Monto total a abonar:</strong> <span style="color: #10b981; font-size: 1.2rem; font-weight: 600;">$${formValues.monto.toFixed(2)}</span></p>
          ${desgloseHTML}
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, confirmar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        width: '600px'
      });

      if (!confirmacion.isConfirmed) return;

      // Registrar los abonos
      for (const item of ventasAfectadas) {
        const nuevoSaldo = item.venta.saldoPendiente - item.montoAbonado;
        
        const abono: any = {
          idVentaCredito: item.venta.id!,
          idCliente: this.clienteSeleccionado.id!,
          monto: item.montoAbonado,
          fecha: Timestamp.now(),
          idCajero: localStorage.getItem('userId') || '0',
          nombreCajero: localStorage.getItem('nombreUsuario') || 'Desconocido',
          observaciones: formValues.observaciones || 'Abono general'
        };

        await this.clientesService.registrarAbono(abono);
        await this.clientesService.actualizarSaldoVentaCredito(item.venta.id!, nuevoSaldo);
      }

      // Actualizar saldo del cliente
      const nuevoSaldoCliente = saldoActual - formValues.monto;
      await this.clientesService.actualizarSaldoCliente(this.clienteSeleccionado.id!, nuevoSaldoCliente);

      Swal.fire({
        icon: 'success',
        title: '¡Abono registrado!',
        html: `
          <p>Se ha registrado el abono general exitosamente</p>
          <p><strong>Monto:</strong> $${formValues.monto.toFixed(2)}</p>
          <p><strong>Nuevo saldo:</strong> $${nuevoSaldoCliente.toFixed(2)}</p>
        `,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#10b981'
      });

      // Recargar datos
      const clienteActualizado = await this.clientesService.obtenerClientePorId(this.clienteSeleccionado.id!);
      if (clienteActualizado) {
        this.clienteSeleccionado = clienteActualizado;
      }
      await this.cargarEstadoCuenta();

      // Actualizar la venta seleccionada si estaba seleccionada y fue afectada
      if (this.ventaSeleccionadaEstado) {
        const ventaAfectada = ventasAfectadas.find(item => item.venta.id === this.ventaSeleccionadaEstado!.id);
        if (ventaAfectada) {
          const ventaActualizada = await this.clientesService.obtenerVentasCreditoCliente(
            this.clienteSeleccionado.id!,
            false
          ).then(ventas => ventas.find(v => v.id === this.ventaSeleccionadaEstado!.id));

          if (ventaActualizada) {
            this.ventaSeleccionadaEstado = ventaActualizada;
          }
        }
      }

    } catch (error) {
      console.error('Error al registrar abono general:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo registrar el abono. Intente nuevamente.',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  async liquidarAdeudo(): Promise<void> {
    const saldoActual = this.getSaldoActualCliente();
    
    if (!this.clienteSeleccionado || saldoActual <= 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin adeudos',
        text: 'El cliente no tiene saldo pendiente',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Liquidar adeudo completo?',
      html: `
        <p>¿Estás seguro de liquidar todo el adeudo del cliente?</p>
        <p><strong>Cliente:</strong> ${this.clienteSeleccionado.nombre}</p>
        <p><strong>Saldo total:</strong> $${saldoActual.toFixed(2)}</p>
        <p style="color: #059669; font-weight: 600; margin-top: 1rem;">Se registrará un abono total para saldar todas las ventas pendientes</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, liquidar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      try {
        // Obtener todas las ventas no liquidadas
        const ventasNoLiquidadas = await this.clientesService.obtenerVentasCreditoCliente(
          this.clienteSeleccionado.id!,
          true
        );

        // Registrar abono para cada venta
        for (const venta of ventasNoLiquidadas) {
          const abono: any = {
            idVentaCredito: venta.id!,
            idCliente: this.clienteSeleccionado.id!,
            monto: venta.saldoPendiente,
            fecha: Timestamp.now(),
            idCajero: localStorage.getItem('userId') || '0',
            nombreCajero: localStorage.getItem('nombreUsuario') || 'Desconocido',
            observaciones: 'Liquidación total de adeudo'
          };

          await this.clientesService.registrarAbono(abono);
          await this.clientesService.actualizarSaldoVentaCredito(venta.id!, 0);
        }

        // Actualizar saldo del cliente a 0
        await this.clientesService.actualizarSaldoCliente(this.clienteSeleccionado.id!, 0);

        Swal.fire({
          icon: 'success',
          title: '¡Adeudo liquidado!',
          text: `El cliente ${this.clienteSeleccionado.nombre} ha liquidado todo su adeudo`,
          timer: 3000,
          showConfirmButton: false
        });

        // Guardar el ID de la venta seleccionada (si hay una)
        const idVentaSeleccionada = this.ventaSeleccionadaEstado?.id;

        // Recargar estado de cuenta
        await this.cargarEstadoCuenta();

        // Actualizar el cliente seleccionado
        const clienteActualizado = await this.clientesService.obtenerClientePorId(this.clienteSeleccionado.id!);
        if (clienteActualizado) {
          this.clienteSeleccionado = clienteActualizado;
        }

        // Actualizar la venta seleccionada con los datos recargados (si había una seleccionada)
        if (idVentaSeleccionada) {
          const ventaActualizada = this.ventasCredito.find(v => v.id === idVentaSeleccionada);
          if (ventaActualizada) {
            this.ventaSeleccionadaEstado = ventaActualizada;
          }
        }

      } catch (error) {
        console.error('Error al liquidar adeudo:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo liquidar el adeudo. Intente nuevamente.',
          confirmButtonText: 'Aceptar'
        });
      }
    }
  }

  async verDetalleAbonos(): Promise<void> {
    if (!this.ventaSeleccionadaEstado) {
      Swal.fire({
        icon: 'warning',
        title: 'Venta no seleccionada',
        text: 'Por favor selecciona una venta de la lista para ver sus abonos',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    try {
      const abonos = await this.clientesService.obtenerAbonosVentaCredito(this.ventaSeleccionadaEstado.id!);

      if (abonos.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin abonos',
          text: 'Esta venta no tiene abonos registrados',
          confirmButtonText: 'Aceptar'
        });
        return;
      }

      const tablaAbonos = abonos.map(abono => {
        const fecha = abono.fecha.toDate().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        return `
          <tr>
            <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb;">${fecha}</td>
            <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #059669;">$${abono.monto.toFixed(2)}</td>
            <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb;">${abono.nombreCajero}</td>
            <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; color: #6b7280;">${abono.observaciones || '-'}</td>
          </tr>
        `;
      }).join('');

      const totalAbonos = abonos.reduce((sum, abono) => sum + abono.monto, 0);

      Swal.fire({
        title: 'Detalle de Abonos',
        html: `
          <div style="text-align: left; margin-bottom: 1rem;">
            <p><strong>Folio de venta:</strong> #${this.ventaSeleccionadaEstado.idTempVenta}</p>
            <p><strong>Total de la venta:</strong> $${this.ventaSeleccionadaEstado.total.toFixed(2)}</p>
            <p><strong>Saldo pendiente:</strong> $${this.ventaSeleccionadaEstado.saldoPendiente.toFixed(2)}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 0.5rem; text-align: left; border-bottom: 2px solid #d1d5db;">Fecha</th>
                <th style="padding: 0.5rem; text-align: right; border-bottom: 2px solid #d1d5db;">Monto</th>
                <th style="padding: 0.5rem; text-align: left; border-bottom: 2px solid #d1d5db;">Cajero</th>
                <th style="padding: 0.5rem; text-align: left; border-bottom: 2px solid #d1d5db;">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${tablaAbonos}
            </tbody>
            <tfoot>
              <tr style="background-color: #f9fafb; font-weight: 700;">
                <td style="padding: 0.75rem; border-top: 2px solid #d1d5db;">Total abonado:</td>
                <td style="padding: 0.75rem; text-align: right; border-top: 2px solid #d1d5db; color: #059669;">$${totalAbonos.toFixed(2)}</td>
                <td colspan="2" style="border-top: 2px solid #d1d5db;"></td>
              </tr>
            </tfoot>
          </table>
        `,
        width: '800px',
        confirmButtonText: 'Cerrar'
      });

    } catch (error) {
      console.error('Error al obtener abonos:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los abonos. Intente nuevamente.',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  imprimirEstado(): void {
    if (!this.clienteSeleccionado || this.ventasCreditoFiltradas.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin ventas para imprimir',
        text: 'No hay ventas que mostrar en el estado de cuenta',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const fechaActual = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const saldoActual = this.getSaldoActualCliente();
    const totalFiltrado = this.calcularTotalGeneral();

    // Generar filas de la tabla de ventas
    const filasVentas = this.ventasCreditoFiltradas.map(venta => {
      const fechaVenta = venta.fechaVenta.toDate().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      const estadoHTML = venta.liquidada 
        ? '<span style="color: #059669; font-weight: 600;">✓ Liquidada</span>'
        : '<span style="color: #dc2626; font-weight: 600;">Pendiente</span>';

      return `
        <tr>
          <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; text-align: center;">#${venta.idTempVenta}</td>
          <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb;">${fechaVenta}</td>
          <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; text-align: right;">$${venta.total.toFixed(2)}</td>
          <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: ${venta.liquidada ? '#059669' : '#dc2626'};">
            $${venta.saldoPendiente.toFixed(2)}
          </td>
          <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; text-align: center;">${estadoHTML}</td>
        </tr>
      `;
    }).join('');

    const limiteCredito = this.clienteSeleccionado.limiteCredito && this.clienteSeleccionado.limiteCredito > 0
      ? `$${this.clienteSeleccionado.limiteCredito.toFixed(2)}`
      : 'Sin límite';

    const filtroTexto = this.mostrarSoloNoLiquidadas ? 'Ventas no liquidadas' : 'Todas las ventas';

    // Mostrar el estado de cuenta en un modal
    Swal.fire({
      title: 'Estado de Cuenta',
      html: `
        <div id="estado-cuenta" style="text-align: left; padding: 1rem; font-family: Arial, sans-serif;">
          
          <div style="text-align: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 3px solid #1e3c72;">
            <h2 style="color: #1e3c72; margin: 0;">ESTADO DE CUENTA</h2>
            <p style="color: #6b7280; margin: 0.5rem 0 0 0;">Ventas a Crédito</p>
          </div>

          <div style="margin-bottom: 1.5rem; padding: 1rem; background-color: #f9fafb; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span><strong>Cliente:</strong></span>
              <span style="font-size: 1.1rem; font-weight: 600;">${this.clienteSeleccionado.nombre}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span><strong>Límite de crédito:</strong></span>
              <span>${limiteCredito}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span><strong>Saldo actual:</strong></span>
              <span style="font-size: 1.1rem; font-weight: 700; color: ${saldoActual > 0 ? '#dc2626' : '#059669'};">
                $${saldoActual.toFixed(2)}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span><strong>Fecha de impresión:</strong></span>
              <span>${fechaActual}</span>
            </div>
          </div>

          <div style="margin-bottom: 1rem;">
            <span style="color: #6b7280; font-size: 0.9rem;"><strong>Filtro:</strong> ${filtroTexto}</span>
          </div>

          <h3 style="color: #1e3c72; margin-top: 1.5rem; margin-bottom: 1rem;">Ventas Registradas</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 0.5rem; text-align: center; border-bottom: 2px solid #d1d5db;">Folio</th>
                <th style="padding: 0.5rem; text-align: left; border-bottom: 2px solid #d1d5db;">Fecha</th>
                <th style="padding: 0.5rem; text-align: right; border-bottom: 2px solid #d1d5db;">Total</th>
                <th style="padding: 0.5rem; text-align: right; border-bottom: 2px solid #d1d5db;">Saldo Pend.</th>
                <th style="padding: 0.5rem; text-align: center; border-bottom: 2px solid #d1d5db;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${filasVentas}
            </tbody>
          </table>

          <div style="margin-top: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 1.3rem; font-weight: 700;">
              <span>TOTAL ADEUDO:</span>
              <span style="color: ${totalFiltrado > 0 ? '#dc2626' : '#059669'};">
                $${totalFiltrado.toFixed(2)}
              </span>
            </div>
          </div>

          ${totalFiltrado === 0 ? `
            <div style="margin-top: 1.5rem; padding: 1rem; background-color: #d1fae5; border: 2px solid #059669; border-radius: 8px; text-align: center;">
              <p style="color: #059669; font-weight: 700; margin: 0; font-size: 1.1rem;">
                ✓ SIN ADEUDOS PENDIENTES
              </p>
            </div>
          ` : ''}

          <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.9rem;">
            <p style="margin: 0;">Este documento es informativo y no representa un documento fiscal</p>
            <p style="margin: 0.5rem 0 0 0;">Total de ventas mostradas: ${this.ventasCreditoFiltradas.length}</p>
          </div>

        </div>
      `,
      width: '900px',
      showCancelButton: true,
      confirmButtonText: '<i class="fa fa-print"></i> Imprimir',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.isConfirmed) {
        const contenido = document.getElementById('estado-cuenta')?.innerHTML || '';
        const ventanaImpresion = window.open('', '', 'height=800,width=900');
        
        if (ventanaImpresion) {
          ventanaImpresion.document.write(`
            <html>
              <head>
                <title>Estado de Cuenta - ${this.clienteSeleccionado!.nombre}</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    padding: 2rem;
                    color: #1e3c72;
                  }
                  @media print {
                    body { padding: 1rem; }
                  }
                </style>
              </head>
              <body>
                ${contenido}
              </body>
            </html>
          `);
          ventanaImpresion.document.close();
          ventanaImpresion.focus();
          ventanaImpresion.print();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo abrir la ventana de impresión. Verifica que los pop-ups no estén bloqueados.',
            confirmButtonText: 'Aceptar'
          });
        }
      }
    });
  }

  async imprimirEstadoCompleto(): Promise<void> {
    if (!this.clienteSeleccionado) {
      Swal.fire({
        icon: 'info',
        title: 'Sin cliente seleccionado',
        text: 'Por favor selecciona un cliente primero',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    try {
      // Obtener TODAS las ventas del cliente sin importar el filtro
      const todasLasVentas = await this.clientesService.obtenerVentasCreditoCliente(this.clienteSeleccionado.id!, false);
      
      if (todasLasVentas.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin ventas para imprimir',
          text: 'No hay ventas registradas para este cliente',
          confirmButtonText: 'Aceptar'
        });
        return;
      }

      const fechaActual = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const saldoActual = this.getSaldoActualCliente();
      
      // Calcular totales de todas las ventas
      const totalGeneral = todasLasVentas.reduce((sum, v) => sum + v.total, 0);
      const totalPendiente = todasLasVentas
        .filter(v => !v.liquidada)
        .reduce((sum, v) => sum + v.saldoPendiente, 0);
      const ventasLiquidadas = todasLasVentas.filter(v => v.liquidada).length;
      const ventasPendientes = todasLasVentas.filter(v => !v.liquidada).length;

      // Cargar los abonos de cada venta
      const ventasConAbonos = await Promise.all(
        todasLasVentas.map(async (venta) => {
          const abonos = await this.clientesService.obtenerAbonosVentaCredito(venta.id!);
          return { ...venta, abonosDetalle: abonos };
        })
      );

      // Generar HTML detallado para cada venta
      const ventasHTML = ventasConAbonos.map((venta, index) => {
        const fechaVenta = venta.fechaVenta.toDate().toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const estadoBadge = venta.liquidada 
          ? '<span style="background-color: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600;">✓ Liquidada</span>'
          : '<span style="background-color: #fee2e2; color: #991b1b; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600;">● Pendiente</span>';

        // Generar tabla de productos
        const productosHTML = venta.productos.map(prod => `
          <tr>
            <td style="padding: 0.4rem; border-bottom: 1px solid #e5e7eb;">${prod.descripcion}</td>
            <td style="padding: 0.4rem; border-bottom: 1px solid #e5e7eb; text-align: center;">${prod.cantidad}</td>
            <td style="padding: 0.4rem; border-bottom: 1px solid #e5e7eb; text-align: right;">$${prod.precioVenta.toFixed(2)}</td>
            <td style="padding: 0.4rem; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${prod.importe.toFixed(2)}</td>
          </tr>
        `).join('');

        // Calcular total abonado
        const totalAbonado = venta.abonosDetalle.reduce((sum, abono) => sum + abono.monto, 0);

        // Generar tabla de abonos si existen
        let abonosHTML = '';
        if (venta.abonosDetalle.length > 0) {
          const abonosRows = venta.abonosDetalle.map(abono => {
            const fechaAbono = abono.fecha.toDate().toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            return `
              <tr>
                <td style="padding: 0.4rem; border-bottom: 1px solid #e5e7eb;">${fechaAbono}</td>
                <td style="padding: 0.4rem; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #059669;">$${abono.monto.toFixed(2)}</td>
                <td style="padding: 0.4rem; border-bottom: 1px solid #e5e7eb;">${abono.nombreCajero || 'N/A'}</td>
                <td style="padding: 0.4rem; border-bottom: 1px solid #e5e7eb; font-size: 0.85rem;">${abono.observaciones || '-'}</td>
              </tr>
            `;
          }).join('');

          abonosHTML = `
            <div style="margin-top: 1rem; padding: 0.75rem; background-color: #f0fdf4; border-left: 3px solid #10b981; border-radius: 4px;">
              <h5 style="margin: 0 0 0.5rem 0; color: #065f46; font-size: 0.9rem;">💰 Historial de Abonos (${venta.abonosDetalle.length})</h5>
              <table style="width: 100%; font-size: 0.875rem;">
                <thead>
                  <tr style="background-color: #dcfce7;">
                    <th style="padding: 0.4rem; text-align: left; border-bottom: 2px solid #bbf7d0;">Fecha</th>
                    <th style="padding: 0.4rem; text-align: right; border-bottom: 2px solid #bbf7d0;">Monto</th>
                    <th style="padding: 0.4rem; text-align: left; border-bottom: 2px solid #bbf7d0;">Cajero</th>
                    <th style="padding: 0.4rem; text-align: left; border-bottom: 2px solid #bbf7d0;">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${abonosRows}
                </tbody>
              </table>
            </div>
          `;
        }

        return `
          <div style="margin-bottom: 2rem; padding: 1.25rem; border: 2px solid ${venta.liquidada ? '#10b981' : '#f59e0b'}; border-radius: 8px; background-color: ${venta.liquidada ? '#f0fdf4' : '#fffbeb'}; page-break-inside: avoid;">
            
            <!-- Encabezado de la venta -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid ${venta.liquidada ? '#10b981' : '#f59e0b'};">
              <div>
                <h4 style="margin: 0; color: #1e3c72; font-size: 1.1rem;">
                  📄 Venta #${venta.idTempVenta}
                </h4>
                <p style="margin: 0.25rem 0 0 0; color: #6b7280; font-size: 0.875rem; text-transform: capitalize;">
                  ${fechaVenta}
                </p>
              </div>
              <div>
                ${estadoBadge}
              </div>
            </div>

            <!-- Productos -->
            <div style="margin-bottom: 1rem;">
              <h5 style="margin: 0 0 0.5rem 0; color: #1e3c72; font-size: 0.95rem;">🛒 Productos</h5>
              <table style="width: 100%; font-size: 0.875rem; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 0.4rem; text-align: left; border-bottom: 2px solid #d1d5db;">Descripción</th>
                    <th style="padding: 0.4rem; text-align: center; border-bottom: 2px solid #d1d5db; width: 80px;">Cant.</th>
                    <th style="padding: 0.4rem; text-align: right; border-bottom: 2px solid #d1d5db; width: 100px;">Precio Unit.</th>
                    <th style="padding: 0.4rem; text-align: right; border-bottom: 2px solid #d1d5db; width: 100px;">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  ${productosHTML}
                </tbody>
              </table>
            </div>

            ${abonosHTML}

            <!-- Resumen de la venta -->
            <div style="margin-top: 1rem; padding: 0.75rem; background-color: white; border-radius: 4px; border: 1px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                <span style="color: #6b7280;">Total de la venta:</span>
                <span style="font-weight: 600;">$${venta.total.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                <span style="color: #059669;">Total abonado:</span>
                <span style="font-weight: 600; color: #059669;">$${totalAbonado.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid #e5e7eb;">
                <span style="font-weight: 700; font-size: 1.05rem;">Saldo pendiente:</span>
                <span style="font-weight: 700; font-size: 1.05rem; color: ${venta.saldoPendiente > 0 ? '#dc2626' : '#059669'};">
                  $${venta.saldoPendiente.toFixed(2)}
                </span>
              </div>
            </div>

          </div>
        `;
      }).join('');

    const limiteCredito = this.clienteSeleccionado.limiteCredito && this.clienteSeleccionado.limiteCredito > 0
      ? `$${this.clienteSeleccionado.limiteCredito.toFixed(2)}`
      : 'Sin límite';

    // Mostrar el estado de cuenta completo en un modal
    Swal.fire({
      title: 'Estado de Cuenta Completo',
      html: `
        <div id="estado-cuenta-completo" style="text-align: left; padding: 1rem; font-family: Arial, sans-serif;">
          
          <div style="text-align: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 3px solid #1e3c72;">
            <h2 style="color: #1e3c72; margin: 0;">ESTADO DE CUENTA COMPLETO</h2>
            <p style="color: #6b7280; margin: 0.5rem 0 0 0;">Historial Completo de Ventas a Crédito</p>
          </div>

          <div style="margin-bottom: 1.5rem; padding: 1rem; background-color: #f9fafb; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span><strong>Cliente:</strong></span>
              <span style="font-size: 1.1rem; font-weight: 600;">${this.clienteSeleccionado.nombre}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span><strong>Límite de crédito:</strong></span>
              <span>${limiteCredito}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span><strong>Saldo actual:</strong></span>
              <span style="font-size: 1.1rem; font-weight: 700; color: ${saldoActual > 0 ? '#dc2626' : '#059669'};">
                $${saldoActual.toFixed(2)}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span><strong>Fecha de impresión:</strong></span>
              <span>${fechaActual}</span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div style="padding: 1rem; background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 4px;">
              <div style="color: #1e40af; font-size: 0.85rem; margin-bottom: 0.25rem;">Total de Ventas</div>
              <div style="font-size: 1.3rem; font-weight: 700; color: #1e3c72;">${todasLasVentas.length}</div>
            </div>
            <div style="padding: 1rem; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <div style="color: #92400e; font-size: 0.85rem; margin-bottom: 0.25rem;">Ventas Pendientes</div>
              <div style="font-size: 1.3rem; font-weight: 700; color: #dc2626;">${ventasPendientes}</div>
            </div>
            <div style="padding: 1rem; background-color: #d1fae5; border-left: 4px solid #10b981; border-radius: 4px;">
              <div style="color: #065f46; font-size: 0.85rem; margin-bottom: 0.25rem;">Ventas Liquidadas</div>
              <div style="font-size: 1.3rem; font-weight: 700; color: #059669;">${ventasLiquidadas}</div>
            </div>
            <div style="padding: 1rem; background-color: #f3e8ff; border-left: 4px solid #8b5cf6; border-radius: 4px;">
              <div style="color: #5b21b6; font-size: 0.85rem; margin-bottom: 0.25rem;">Crédito Total Otorgado</div>
              <div style="font-size: 1.3rem; font-weight: 700; color: #1e3c72;">$${totalGeneral.toFixed(2)}</div>
            </div>
          </div>

          <h3 style="color: #1e3c72; margin-top: 1.5rem; margin-bottom: 1rem;">📋 Detalle Completo de Ventas</h3>
          
          ${ventasHTML}

          <div style="margin-top: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="font-size: 1.1rem;"><strong>Total ventas:</strong></span>
              <span style="font-size: 1.1rem; font-weight: 600;">$${totalGeneral.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.3rem; font-weight: 700; padding-top: 0.75rem; border-top: 2px solid #d1d5db;">
              <span>SALDO PENDIENTE:</span>
              <span style="color: ${totalPendiente > 0 ? '#dc2626' : '#059669'};">
                $${totalPendiente.toFixed(2)}
              </span>
            </div>
          </div>

          ${totalPendiente === 0 ? `
            <div style="margin-top: 1.5rem; padding: 1rem; background-color: #d1fae5; border: 2px solid #059669; border-radius: 8px; text-align: center;">
              <p style="color: #059669; font-weight: 700; margin: 0; font-size: 1.1rem;">
                ✓ TODAS LAS VENTAS LIQUIDADAS
              </p>
            </div>
          ` : ''}

          <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.9rem;">
            <p style="margin: 0;">Este documento es informativo y no representa un documento fiscal</p>
            <p style="margin: 0.5rem 0 0 0;">Total de ventas registradas: ${todasLasVentas.length}</p>
          </div>

        </div>
      `,
      width: '95%',
      showCancelButton: true,
      confirmButtonText: '<i class="fa fa-print"></i> Imprimir',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'swal-wide'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const contenido = document.getElementById('estado-cuenta-completo')?.innerHTML || '';
        const ventanaImpresion = window.open('', '', 'height=800,width=1200');
        
        if (ventanaImpresion) {
          ventanaImpresion.document.write(`
            <html>
              <head>
                <title>Estado de Cuenta Completo - ${this.clienteSeleccionado!.nombre}</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    padding: 1.5rem;
                    color: #1e3c72;
                    max-width: 1200px;
                    margin: 0 auto;
                  }
                  @media print {
                    body { 
                      padding: 0.5rem; 
                    }
                    @page {
                      margin: 1cm;
                      size: letter;
                    }
                  }
                </style>
              </head>
              <body>
                ${contenido}
              </body>
            </html>
          `);
          ventanaImpresion.document.close();
          ventanaImpresion.focus();
          ventanaImpresion.print();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo abrir la ventana de impresión. Verifica que los pop-ups no estén bloqueados.',
            confirmButtonText: 'Aceptar'
          });
        }
      }
    });
    } catch (error) {
      console.error('Error al obtener todas las ventas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las ventas del cliente',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  async eliminarVentaCredito(): Promise<void> {
    if (!this.ventaSeleccionadaEstado) {
      Swal.fire({
        icon: 'warning',
        title: 'Venta no seleccionada',
        text: 'Por favor selecciona una venta de la lista para eliminar',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Obtener abonos de la venta
    const abonos = await this.clientesService.obtenerAbonosVentaCredito(this.ventaSeleccionadaEstado.id!);
    const totalAbonado = abonos.reduce((sum, abono) => sum + abono.monto, 0);

    const result = await Swal.fire({
      title: '¿Eliminar venta a crédito?',
      html: `
        <div style="text-align: left;">
          <p><strong>¡ATENCIÓN!</strong> Esta acción no se puede deshacer.</p>
          <hr style="margin: 1rem 0;">
          <p><strong>Folio de venta:</strong> #${this.ventaSeleccionadaEstado.idTempVenta}</p>
          <p><strong>Total de la venta:</strong> $${this.ventaSeleccionadaEstado.total.toFixed(2)}</p>
          <p><strong>Saldo pendiente:</strong> $${this.ventaSeleccionadaEstado.saldoPendiente.toFixed(2)}</p>
          ${abonos.length > 0 ? `
            <p><strong>Total abonado:</strong> $${totalAbonado.toFixed(2)}</p>
            <p style="color: #dc2626; font-weight: 600; margin-top: 1rem;">
              ⚠️ Se eliminarán ${abonos.length} abono${abonos.length > 1 ? 's' : ''} asociado${abonos.length > 1 ? 's' : ''} a esta venta
            </p>
          ` : ''}
          <p style="color: #059669; font-weight: 600; margin-top: 1rem;">
            ✓ Se revertirá el saldo del cliente (se descontará $${this.ventaSeleccionadaEstado.total.toFixed(2)})
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      try {
        // Eliminar todos los abonos asociados a esta venta
        for (const abono of abonos) {
          await this.clientesService.eliminarAbono(abono.id!);
        }

        // Eliminar la venta a crédito
        await this.clientesService.eliminarVentaCredito(this.ventaSeleccionadaEstado.id!);

        // Actualizar saldo del cliente (restar el total de la venta)
        const saldoActualCliente = this.getSaldoActualCliente();
        const nuevoSaldoCliente = saldoActualCliente - this.ventaSeleccionadaEstado.total;
        await this.clientesService.actualizarSaldoCliente(
          this.clienteSeleccionado!.id!,
          Math.max(0, nuevoSaldoCliente) // Asegurar que no sea negativo
        );

        Swal.fire({
          icon: 'success',
          title: '¡Venta eliminada!',
          html: `
            <p>La venta a crédito ha sido eliminada correctamente</p>
            ${abonos.length > 0 ? `<p>Se eliminaron ${abonos.length} abono${abonos.length > 1 ? 's' : ''}</p>` : ''}
            <p>Nuevo saldo del cliente: <strong>$${Math.max(0, nuevoSaldoCliente).toFixed(2)}</strong></p>
          `,
          timer: 3000,
          showConfirmButton: false
        });

        // Recargar estado de cuenta
        this.ventaSeleccionadaEstado = null;
        await this.cargarEstadoCuenta();

        // Actualizar el cliente seleccionado
        const clienteActualizado = await this.clientesService.obtenerClientePorId(this.clienteSeleccionado!.id!);
        if (clienteActualizado) {
          this.clienteSeleccionado = clienteActualizado;
        }

      } catch (error) {
        console.error('Error al eliminar venta a crédito:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo eliminar la venta. Intente nuevamente.',
          confirmButtonText: 'Aceptar'
        });
      }
    }
  }

  async imprimirComprobanteAdeudo(): Promise<void> {
    if (!this.ventaSeleccionadaEstado) {
      Swal.fire({
        icon: 'warning',
        title: 'Venta no seleccionada',
        text: 'Por favor selecciona una venta de la lista para imprimir',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    try {
      // Obtener abonos de la venta
      const abonos = await this.clientesService.obtenerAbonosVentaCredito(this.ventaSeleccionadaEstado.id!);
      const totalAbonado = abonos.reduce((sum, abono) => sum + abono.monto, 0);

      const fechaVenta = this.ventaSeleccionadaEstado.fechaVenta.toDate().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const fechaActual = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Generar tabla de productos
      const tablaProductos = this.ventaSeleccionadaEstado.productos.map(prod => `
        <tr>
          <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb;">${prod.descripcion}</td>
          <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; text-align: center;">${prod.cantidad}</td>
          <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; text-align: right;">$${prod.precioVenta.toFixed(2)}</td>
          <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${prod.importe.toFixed(2)}</td>
        </tr>
      `).join('');

      // Generar tabla de abonos si existen
      const tablaAbonos = abonos.length > 0 ? `
        <div style="margin-top: 2rem;">
          <h3 style="color: #1e3c72; margin-bottom: 1rem;">Historial de Abonos</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 0.5rem; text-align: left; border-bottom: 2px solid #d1d5db;">Fecha</th>
                <th style="padding: 0.5rem; text-align: right; border-bottom: 2px solid #d1d5db;">Monto</th>
                <th style="padding: 0.5rem; text-align: left; border-bottom: 2px solid #d1d5db;">Cajero</th>
              </tr>
            </thead>
            <tbody>
              ${abonos.map(abono => `
                <tr>
                  <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb;">
                    ${abono.fecha.toDate().toLocaleDateString('es-MX', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #059669;">
                    $${abono.monto.toFixed(2)}
                  </td>
                  <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb;">
                    ${abono.nombreCajero}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '';

      // Mostrar el comprobante en un modal con opción de imprimir
      const { isConfirmed } = await Swal.fire({
        title: 'Comprobante de Adeudo',
        html: `
          <div id="comprobante-adeudo" style="text-align: left; padding: 1rem; font-family: Arial, sans-serif;">
            
            <div style="text-align: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 3px solid #1e3c72;">
              <h2 style="color: #1e3c72; margin: 0;">COMPROBANTE DE ADEUDO</h2>
              <p style="color: #6b7280; margin: 0.5rem 0 0 0;">Venta a Crédito</p>
            </div>

            <div style="margin-bottom: 1.5rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span><strong>Folio:</strong></span>
                <span>#${this.ventaSeleccionadaEstado.idTempVenta}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span><strong>Fecha de venta:</strong></span>
                <span>${fechaVenta}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span><strong>Cliente:</strong></span>
                <span>${this.clienteSeleccionado!.nombre}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span><strong>Fecha de impresión:</strong></span>
                <span>${fechaActual}</span>
              </div>
            </div>

            <h3 style="color: #1e3c72; margin-top: 2rem; margin-bottom: 1rem;">Productos</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 0.5rem; text-align: left; border-bottom: 2px solid #d1d5db;">Descripción</th>
                  <th style="padding: 0.5rem; text-align: center; border-bottom: 2px solid #d1d5db;">Cant.</th>
                  <th style="padding: 0.5rem; text-align: right; border-bottom: 2px solid #d1d5db;">P. Unit.</th>
                  <th style="padding: 0.5rem; text-align: right; border-bottom: 2px solid #d1d5db;">Importe</th>
                </tr>
              </thead>
              <tbody>
                ${tablaProductos}
              </tbody>
            </table>

            ${tablaAbonos}

            <div style="margin-top: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; font-size: 1.1rem;">
                <span><strong>Total de la venta:</strong></span>
                <span style="font-weight: 700;">$${this.ventaSeleccionadaEstado.total.toFixed(2)}</span>
              </div>
              ${totalAbonado > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; color: #059669;">
                  <span><strong>Total abonado:</strong></span>
                  <span style="font-weight: 700;">- $${totalAbonado.toFixed(2)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; font-size: 1.3rem; padding-top: 0.75rem; border-top: 2px solid #d1d5db;">
                <span><strong>SALDO PENDIENTE:</strong></span>
                <span style="font-weight: 700; color: ${this.ventaSeleccionadaEstado.liquidada ? '#059669' : '#dc2626'};">
                  $${this.ventaSeleccionadaEstado.saldoPendiente.toFixed(2)}
                </span>
              </div>
            </div>

            ${this.ventaSeleccionadaEstado.liquidada ? `
              <div style="margin-top: 1.5rem; padding: 1rem; background-color: #d1fae5; border: 2px solid #059669; border-radius: 8px; text-align: center;">
                <p style="color: #059669; font-weight: 700; margin: 0; font-size: 1.1rem;">
                  ✓ PAGADO EN SU TOTALIDAD
                </p>
              </div>
            ` : ''}

            <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.9rem;">
              <p style="margin: 0;">Este comprobante es informativo y no representa un documento fiscal</p>
            </div>

          </div>
        `,
        width: '800px',
        showCancelButton: true,
        confirmButtonText: '<i class="fa fa-print"></i> Imprimir',
        cancelButtonText: 'Cerrar',
        customClass: {
          confirmButton: 'btn-imprimir-modal',
          cancelButton: 'btn-cancelar-modal'
        }
      });

      if (isConfirmed) {
        // Función para imprimir (abre ventana de impresión del navegador)
        const contenido = document.getElementById('comprobante-adeudo')?.innerHTML || '';
        const ventanaImpresion = window.open('', '', 'height=800,width=800');
        
        if (ventanaImpresion) {
          ventanaImpresion.document.write(`
            <html>
              <head>
                <title>Comprobante de Adeudo - ${this.ventaSeleccionadaEstado.idTempVenta}</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    padding: 2rem;
                    color: #1e3c72;
                  }
                  @media print {
                    body { padding: 1rem; }
                  }
                </style>
              </head>
              <body>
                ${contenido}
              </body>
            </html>
          `);
          ventanaImpresion.document.close();
          ventanaImpresion.focus();
          ventanaImpresion.print();
        }
      }

    } catch (error) {
      console.error('Error al generar comprobante:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo generar el comprobante. Intente nuevamente.',
        confirmButtonText: 'Aceptar'
      });
    }
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

  // ==================== MODIFICAR/ELIMINAR CLIENTE ====================

  async cargarClientesParaModificar(): Promise<void> {
    this.cargandoClientesModificar = true;
    this.clienteEditando = null;
    this.textoBusquedaModificar = '';
    this.paginaActual = 1;

    try {
      const snapshot = await this.clientesService.obtenerClientes();
      this.clientesListaModificar = [];
      
      snapshot.forEach(doc => {
        this.clientesListaModificar.push({ id: doc.id, ...doc.data() } as ClienteInterface);
      });

      this.clientesListaModificarFiltrados = [...this.clientesListaModificar];
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los clientes',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      this.cargandoClientesModificar = false;
    }
  }

  buscarClienteModificar(): void {
    const busqueda = this.textoBusquedaModificar.toLowerCase().trim();
    
    if (busqueda === '') {
      this.clientesListaModificarFiltrados = [...this.clientesListaModificar];
    } else {
      this.clientesListaModificarFiltrados = this.clientesListaModificar.filter(cliente => {
        const nombreMatch = (cliente.nombre || '').toLowerCase().includes(busqueda);
        const numeroMatch = (cliente.numero || '').toLowerCase().includes(busqueda);
        const telefonoMatch = (cliente.telefono || '').toLowerCase().includes(busqueda);
        return nombreMatch || numeroMatch || telefonoMatch;
      });
    }

    this.paginaActual = 1; // Resetear a primera página
  }

  get clientesPaginados(): ClienteInterface[] {
    const inicio = (this.paginaActual - 1) * this.clientesPorPagina;
    const fin = inicio + this.clientesPorPagina;
    return this.clientesListaModificarFiltrados.slice(inicio, fin);
  }

  get totalPaginas(): number {
    return Math.ceil(this.clientesListaModificarFiltrados.length / this.clientesPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  seleccionarClienteParaEditar(cliente: ClienteInterface): void {
    // Crear una copia del cliente para editar
    this.clienteEditando = {
      ...cliente,
      limiteCredito: cliente.limiteCredito || 0
    };
  }

  cancelarEdicion(): void {
    this.clienteEditando = null;
  }

  async guardarClienteModificado(): Promise<void> {
    if (!this.clienteEditando || !this.clienteEditando.id) return;

    // Validar campos
    if (!this.clienteEditando.nombre || this.clienteEditando.nombre.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El nombre del cliente es obligatorio',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    this.modificandoCliente = true;

    try {
      await this.clientesService.modificarCliente(this.clienteEditando, this.clienteEditando.id);
      
      Swal.fire({
        icon: 'success',
        title: '¡Cliente actualizado!',
        text: `Los datos de ${this.clienteEditando.nombre} han sido actualizados`,
        timer: 2000,
        showConfirmButton: false
      });

      // Actualizar la lista de clientes
      const index = this.clientesListaModificar.findIndex(c => c.id === this.clienteEditando!.id);
      if (index !== -1) {
        this.clientesListaModificar[index] = { ...this.clienteEditando };
      }

      this.buscarClienteModificar(); // Refiltrar
      this.clienteEditando = null;

    } catch (error) {
      console.error('Error al modificar cliente:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el cliente. Intente nuevamente.',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      this.modificandoCliente = false;
    }
  }

  async eliminarCliente(cliente: ClienteInterface): Promise<void> {
    if (!cliente.id) return;

    // Verificar si el cliente tiene saldo pendiente
    if (cliente.saldoActual > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No se puede eliminar',
        html: `
          <p>El cliente <strong>${cliente.nombre}</strong> tiene un saldo pendiente de <strong>$${cliente.saldoActual.toFixed(2)}</strong></p>
          <p style="margin-top: 1rem;">Debe liquidar su deuda antes de poder eliminarlo</p>
        `,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#6b7280'
      });
      return;
    }

    // Verificar si tiene ventas a crédito registradas
    try {
      const ventasCredito = await this.clientesService.obtenerVentasCreditoCliente(cliente.id);
      
      if (ventasCredito.length > 0) {
        const result = await Swal.fire({
          title: 'Cliente con historial',
          html: `
            <p>El cliente <strong>${cliente.nombre}</strong> tiene <strong>${ventasCredito.length}</strong> venta(s) registrada(s)</p>
            <p style="margin-top: 1rem; color: #dc2626;">¿Está seguro de eliminar este cliente?</p>
            <p style="color: #6b7280; font-size: 0.9rem;">Se eliminarán también todas sus ventas y abonos</p>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#6b7280'
        });

        if (!result.isConfirmed) return;
      } else {
        const result = await Swal.fire({
          title: '¿Eliminar cliente?',
          html: `<p>¿Está seguro de eliminar a <strong>${cliente.nombre}</strong>?</p>`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#6b7280'
        });

        if (!result.isConfirmed) return;
      }

      // Eliminar abonos primero
      for (const venta of ventasCredito) {
        const abonos = await this.clientesService.obtenerAbonosVentaCredito(venta.id!);
        for (const abono of abonos) {
          await this.clientesService.eliminarAbono(abono.id!);
        }
        
        // Eliminar venta a crédito
        await this.clientesService.eliminarVentaCredito(venta.id!);
      }

      // Eliminar cliente
      await this.clientesService.eliminarCliente(cliente.id);

      Swal.fire({
        icon: 'success',
        title: 'Cliente eliminado',
        text: `${cliente.nombre} ha sido eliminado del sistema`,
        timer: 2000,
        showConfirmButton: false
      });

      // Actualizar la lista
      this.clientesListaModificar = this.clientesListaModificar.filter(c => c.id !== cliente.id);
      this.buscarClienteModificar();

      // Si estaba editando este cliente, cancelar edición
      if (this.clienteEditando?.id === cliente.id) {
        this.clienteEditando = null;
      }

    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar el cliente. Intente nuevamente.',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  // ==================== REPORTE DE SALDOS ====================

  async cargarReporteSaldos(): Promise<void> {
    this.cargandoReporte = true;
    this.textoBusquedaReporte = '';
    this.paginaActualReporte = 1;

    try {
      const snapshot = await this.clientesService.obtenerClientes();
      this.clientesReporte = [];
      
      snapshot.forEach(doc => {
        this.clientesReporte.push({ id: doc.id, ...doc.data() } as ClienteInterface);
      });

      this.aplicarFiltrosReporte();
    } catch (error) {
      console.error('Error al cargar reporte:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar el reporte de saldos',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      this.cargandoReporte = false;
    }
  }

  aplicarFiltrosReporte(): void {
    let clientesFiltrados = [...this.clientesReporte];

    // Filtrar por búsqueda
    if (this.textoBusquedaReporte.trim() !== '') {
      const busqueda = this.textoBusquedaReporte.toLowerCase();
      clientesFiltrados = clientesFiltrados.filter(cliente => {
        const nombreMatch = (cliente.nombre || '').toLowerCase().includes(busqueda);
        const numeroMatch = (cliente.numero || '').toLowerCase().includes(busqueda);
        return nombreMatch || numeroMatch;
      });
    }

    // Filtrar por tipo
    if (this.filtroReporte === 'con-deuda') {
      clientesFiltrados = clientesFiltrados.filter(c => c.saldoActual > 0);
    } else if (this.filtroReporte === 'sin-deuda') {
      clientesFiltrados = clientesFiltrados.filter(c => c.saldoActual === 0);
    }

    // Ordenar
    clientesFiltrados.sort((a, b) => {
      switch (this.ordenReporte) {
        case 'nombre-asc':
          return (a.nombre || '').localeCompare(b.nombre || '');
        case 'nombre-desc':
          return (b.nombre || '').localeCompare(a.nombre || '');
        case 'saldo-asc':
          return a.saldoActual - b.saldoActual;
        case 'saldo-desc':
          return b.saldoActual - a.saldoActual;
        default:
          return 0;
      }
    });

    this.clientesReporteFiltrados = clientesFiltrados;
    this.paginaActualReporte = 1; // Resetear a primera página
  }

  cambiarFiltroReporte(filtro: 'todos' | 'con-deuda' | 'sin-deuda'): void {
    this.filtroReporte = filtro;
    this.aplicarFiltrosReporte();
  }

  cambiarOrdenReporte(orden: 'nombre-asc' | 'nombre-desc' | 'saldo-asc' | 'saldo-desc'): void {
    this.ordenReporte = orden;
    this.aplicarFiltrosReporte();
  }

  get clientesReportePaginados(): ClienteInterface[] {
    const inicio = (this.paginaActualReporte - 1) * this.clientesPorPaginaReporte;
    const fin = inicio + this.clientesPorPaginaReporte;
    return this.clientesReporteFiltrados.slice(inicio, fin);
  }

  get totalPaginasReporte(): number {
    return Math.ceil(this.clientesReporteFiltrados.length / this.clientesPorPaginaReporte);
  }

  cambiarPaginaReporte(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginasReporte) {
      this.paginaActualReporte = pagina;
    }
  }

  get totalSaldosReporte(): number {
    return this.clientesReporteFiltrados.reduce((sum, cliente) => sum + cliente.saldoActual, 0);
  }

  get totalClientesConDeuda(): number {
    return this.clientesReporteFiltrados.filter(c => c.saldoActual > 0).length;
  }

  imprimirReporteSaldos(): void {
    const fechaImpresion = new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const nombreNegocio = 'Mi Negocio'; // Puedes obtener esto de configuración
    
    // Determinar título según filtro
    let tituloFiltro = '';
    if (this.filtroReporte === 'con-deuda') {
      tituloFiltro = 'CLIENTES CON DEUDA';
    } else if (this.filtroReporte === 'sin-deuda') {
      tituloFiltro = 'CLIENTES SIN DEUDA';
    } else {
      tituloFiltro = 'TODOS LOS CLIENTES';
    }

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Saldos</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 3px solid #333;
            padding-bottom: 15px;
          }
          .header h1 {
            margin: 0 0 5px 0;
            font-size: 20px;
            color: #333;
          }
          .header h2 {
            margin: 5px 0;
            font-size: 16px;
            color: #666;
          }
          .fecha-impresion {
            text-align: right;
            color: #666;
            margin-bottom: 15px;
            font-size: 11px;
          }
          .resumen {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-around;
            text-align: center;
          }
          .resumen-item {
            flex: 1;
          }
          .resumen-label {
            font-size: 11px;
            color: #666;
            margin-bottom: 5px;
          }
          .resumen-valor {
            font-size: 18px;
            font-weight: bold;
            color: #333;
          }
          .resumen-total {
            color: #dc2626;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th {
            background: #333;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #ddd;
          }
          tr:hover {
            background: #f9f9f9;
          }
          .con-deuda {
            color: #dc2626;
            font-weight: bold;
          }
          .sin-deuda {
            color: #059669;
          }
          .numero-cliente {
            color: #666;
            font-size: 10px;
          }
          .limite-credito {
            color: #7c3aed;
            font-size: 11px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #333;
            text-align: right;
            font-weight: bold;
            font-size: 14px;
          }
          @media print {
            body {
              padding: 10px;
            }
            .no-imprimir {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${nombreNegocio}</h1>
          <h2>REPORTE DE SALDOS</h2>
          <h2>${tituloFiltro}</h2>
        </div>
        
        <div class="fecha-impresion">
          Fecha de impresión: ${fechaImpresion}
        </div>

        <div class="resumen">
          <div class="resumen-item">
            <div class="resumen-label">Total Clientes</div>
            <div class="resumen-valor">${this.clientesReporteFiltrados.length}</div>
          </div>
          <div class="resumen-item">
            <div class="resumen-label">Con Deuda</div>
            <div class="resumen-valor">${this.totalClientesConDeuda}</div>
          </div>
          <div class="resumen-item">
            <div class="resumen-label">Saldo Total</div>
            <div class="resumen-valor resumen-total">$${this.totalSaldosReporte.toFixed(2)}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 10%;">No. Cliente</th>
              <th style="width: 35%;">Nombre</th>
              <th style="width: 20%;">Teléfono</th>
              <th style="width: 15%;">Límite Crédito</th>
              <th style="width: 20%; text-align: right;">Saldo Actual</th>
            </tr>
          </thead>
          <tbody>
    `;

    this.clientesReporteFiltrados.forEach(cliente => {
      const saldoClass = cliente.saldoActual > 0 ? 'con-deuda' : 'sin-deuda';
      const limiteTexto = cliente.limiteCredito && cliente.limiteCredito > 0 
        ? `$${cliente.limiteCredito.toFixed(2)}` 
        : 'Sin límite';
      const telefono = cliente.telefono || 'N/A';

      html += `
        <tr>
          <td><span class="numero-cliente">${cliente.numero}</span></td>
          <td><strong>${cliente.nombre}</strong></td>
          <td>${telefono}</td>
          <td><span class="limite-credito">${limiteTexto}</span></td>
          <td style="text-align: right;" class="${saldoClass}">
            <strong>$${cliente.saldoActual.toFixed(2)}</strong>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        
        <div class="footer">
          Total General: $${this.totalSaldosReporte.toFixed(2)}
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    const ventanaImpresion = window.open('', '_blank');
    if (ventanaImpresion) {
      ventanaImpresion.document.write(html);
      ventanaImpresion.document.close();
    }
  }

}
