import { Component, OnInit } from '@angular/core';
import { ProductosService } from 'src/app/services/productos.service';
import { MovimientosInventarioService } from 'src/app/services/movimientos-inventario.service';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import MovimientoInventarioInterface from 'src/app/interfaces/movimiento-inventario.interface';
import { Timestamp } from '@angular/fire/firestore';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.scss']
})
export class InventarioComponent implements OnInit {

  vistaActual: 'agregar' | 'ajustes' | 'bajos' | 'reporte' | 'movimientos' = 'agregar';
  
  // Datos para agregar inventario
  codigoProducto: string = '';
  productoEncontrado: any = null;
  cantidadAgregar: number = 0;
  buscandoProducto: boolean = false;

  // Datos para ajustes de inventario
  codigoProductoAjuste: string = '';
  productoEncontradoAjuste: any = null;
  nuevaCantidadAjuste: number = 0;
  buscandoProductoAjuste: boolean = false;

  // Datos para reporte de movimientos
  movimientos: MovimientoInventarioInterface[] = [];
  movimientosFiltrados: MovimientoInventarioInterface[] = [];
  fechaSeleccionada: string = this.obtenerFechaHoy();
  textoBusqueda: string = '';
  tipoMovimientoFiltro: string = 'todos';
  cargandoMovimientos: boolean = false;

  // Datos para reporte de inventario
  productosReporte: any[] = [];
  productosReporteFiltrados: any[] = [];
  departamentosReporte: any[] = [];
  departamentoFiltroReporte: string = 'todos';
  cargandoReporte: boolean = false;
  productoSeleccionadoReporte: any = null;

  constructor(
    private productosService: ProductosService,
    private movimientosService: MovimientosInventarioService,
    private departamentosService: DepartamentosService
  ) { }

  ngOnInit(): void {
  }

  obtenerFechaHoy(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  cambiarVista(vista: 'agregar' | 'ajustes' | 'bajos' | 'reporte' | 'movimientos'): void {
    this.vistaActual = vista;
    
    // No limpiar formulario de ajustes si estamos navegando desde reporte con producto seleccionado
    if (!(vista === 'ajustes' && this.productoSeleccionadoReporte)) {
      this.limpiarFormulario();
    }
    
    // Si se selecciona movimientos, cargar los datos
    if (vista === 'movimientos') {
      this.cargarMovimientos();
    }
    
    // Si se selecciona reporte, cargar los datos
    if (vista === 'reporte') {
      this.cargarReporteInventario();
    }
    
    // Si se selecciona ajustes y hay un producto seleccionado del reporte, cargarlo
    if (vista === 'ajustes' && this.productoSeleccionadoReporte) {
      this.cargarProductoEnAjustes(this.productoSeleccionadoReporte);
    }
  }

  async buscarProducto(): Promise<void> {
    if (!this.codigoProducto || this.codigoProducto.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Código requerido',
        text: 'Por favor ingresa un código de producto',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    try {
      this.buscandoProducto = true;
      
      const resultado = await this.productosService.obtenerProductoPorCodigoDeBarras(this.codigoProducto);
      
      if (resultado.empty) {
        Swal.fire({
          icon: 'error',
          title: 'Producto no encontrado',
          text: `No se encontró ningún producto con el código: ${this.codigoProducto}`,
          confirmButtonText: 'Aceptar'
        });
        this.productoEncontrado = null;
      } else {
        // Obtener el primer producto encontrado
        const productos: any[] = [];
        resultado.forEach(doc => {
          productos.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        this.productoEncontrado = productos[0];
        this.cantidadAgregar = 0;
      }
    } catch (error) {
      console.error('Error al buscar producto:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al buscar el producto',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      this.buscandoProducto = false;
    }
  }

  async agregarInventario(): Promise<void> {
    if (!this.productoEncontrado) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin producto',
        text: 'Primero debes buscar un producto',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    if (!this.cantidadAgregar || this.cantidadAgregar <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Cantidad inválida',
        text: 'La cantidad debe ser mayor a 0',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    try {
      // Mostrar loading
      Swal.fire({
        title: 'Agregando inventario...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Calcular nueva cantidad
      const cantidadActual = this.productoEncontrado.inventario || 0;
      const nuevaCantidad = cantidadActual + this.cantidadAgregar;

      // Actualizar inventario usando el método correcto
      await this.productosService.actualizarInventario(
        this.productoEncontrado.id,
        nuevaCantidad
      );

      // Obtener el nombre del departamento
      let nombreDepartamento = 'Sin Departamento';
      if (this.productoEncontrado.departamento && this.productoEncontrado.departamento !== '0') {
        const deptoDoc = await this.departamentosService.obtenerDepartamentosPorId(this.productoEncontrado.departamento);
        if (deptoDoc.exists()) {
          const deptoData: any = deptoDoc.data();
          nombreDepartamento = deptoData.nombre || 'Sin Departamento';
        }
      }

      // Registrar movimiento de inventario
      const movimiento: MovimientoInventarioInterface = {
        fecha: Timestamp.fromDate(new Date()),
        idProducto: this.productoEncontrado.id,
        descripcionProducto: this.productoEncontrado.descripcion,
        cantidadAnterior: cantidadActual,
        cantidadMovimiento: this.cantidadAgregar,
        cantidadNueva: nuevaCantidad,
        tipo: 'ENTRADA',
        idCajero: localStorage.getItem('userId') || '0',
        nombreCajero: localStorage.getItem('nombreUsuario') || 'Desconocido',
        departamento: this.productoEncontrado.departamento || '0',
        nombreDepartamento: nombreDepartamento,
        observaciones: 'Entrada manual de inventario'
      };

      await this.movimientosService.registrarMovimiento(movimiento);

      Swal.fire({
        icon: 'success',
        title: 'Inventario actualizado',
        html: `
          <p><strong>${this.productoEncontrado.descripcion}</strong></p>
          <p>Cantidad anterior: ${cantidadActual}</p>
          <p>Cantidad agregada: +${this.cantidadAgregar}</p>
          <p>Cantidad actual: <strong>${nuevaCantidad}</strong></p>
        `,
        confirmButtonText: 'Aceptar'
      });

      // Limpiar formulario
      this.limpiarFormulario();

    } catch (error) {
      console.error('Error al agregar inventario:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el inventario',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  limpiarFormulario(): void {
    this.codigoProducto = '';
    this.productoEncontrado = null;
    this.cantidadAgregar = 0;
  }

  // Método para manejar Enter en el input de código
  onEnterCodigoProducto(event: Event): void {
    event.preventDefault();
    this.buscarProducto();
  }

  // ==================== MÉTODOS PARA AJUSTES DE INVENTARIO ====================

  async buscarProductoAjuste(): Promise<void> {
    if (!this.codigoProductoAjuste || this.codigoProductoAjuste.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Código requerido',
        text: 'Por favor ingresa un código de producto',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    try {
      this.buscandoProductoAjuste = true;
      const resultado = await this.productosService.obtenerProductoPorCodigoDeBarras(this.codigoProductoAjuste);
      
      if (!resultado.empty) {
        const productoData: any[] = [];
        resultado.forEach(doc => {
          productoData.push({
            id: doc.id,
            ...doc.data()
          });
        });

        if (productoData.length > 0) {
          this.productoEncontradoAjuste = productoData[0];
          this.nuevaCantidadAjuste = this.productoEncontradoAjuste.inventario || 0;
        }
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Producto no encontrado',
          text: 'No se encontró un producto con ese código',
          confirmButtonText: 'Aceptar'
        });
        this.productoEncontradoAjuste = null;
      }
    } catch (error) {
      console.error('Error al buscar producto:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo buscar el producto',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      this.buscandoProductoAjuste = false;
    }
  }

  calcularDiferencia(): number {
    if (!this.productoEncontradoAjuste) return 0;
    const cantidadActual = this.productoEncontradoAjuste.inventario || 0;
    return this.nuevaCantidadAjuste - cantidadActual;
  }

  async realizarAjuste(): Promise<void> {
    if (!this.productoEncontradoAjuste) {
      Swal.fire({
        icon: 'warning',
        title: 'Producto no seleccionado',
        text: 'Primero debes buscar un producto',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    if (this.nuevaCantidadAjuste < 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Cantidad inválida',
        text: 'La cantidad no puede ser negativa',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const cantidadActual = this.productoEncontradoAjuste.inventario || 0;
    const diferencia = this.calcularDiferencia();

    if (diferencia === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin cambios',
        text: 'La nueva cantidad es igual a la cantidad actual',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    try {
      // Mostrar loading
      Swal.fire({
        title: 'Realizando ajuste...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Actualizar inventario
      await this.productosService.actualizarInventario(
        this.productoEncontradoAjuste.id,
        this.nuevaCantidadAjuste
      );

      // Obtener el nombre del departamento
      let nombreDepartamento = 'Sin Departamento';
      if (this.productoEncontradoAjuste.departamento && this.productoEncontradoAjuste.departamento !== '0') {
        const deptoDoc = await this.departamentosService.obtenerDepartamentosPorId(this.productoEncontradoAjuste.departamento);
        if (deptoDoc.exists()) {
          const deptoData: any = deptoDoc.data();
          nombreDepartamento = deptoData.nombre || 'Sin Departamento';
        }
      }

      // Registrar movimiento de inventario
      const movimiento: MovimientoInventarioInterface = {
        fecha: Timestamp.fromDate(new Date()),
        idProducto: this.productoEncontradoAjuste.id,
        descripcionProducto: this.productoEncontradoAjuste.descripcion,
        cantidadAnterior: cantidadActual,
        cantidadMovimiento: Math.abs(diferencia),
        cantidadNueva: this.nuevaCantidadAjuste,
        tipo: 'AJUSTE',
        idCajero: localStorage.getItem('userId') || '0',
        nombreCajero: localStorage.getItem('nombreUsuario') || 'Desconocido',
        departamento: this.productoEncontradoAjuste.departamento || '0',
        nombreDepartamento: nombreDepartamento,
        observaciones: `Ajuste de inventario. Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia}`
      };

      await this.movimientosService.registrarMovimiento(movimiento);

      Swal.fire({
        icon: 'success',
        title: 'Ajuste realizado',
        html: `
          <p><strong>${this.productoEncontradoAjuste.descripcion}</strong></p>
          <p>Cantidad anterior: ${cantidadActual}</p>
          <p>Diferencia: <strong>${diferencia > 0 ? '+' : ''}${diferencia}</strong></p>
          <p>Nueva cantidad: <strong>${this.nuevaCantidadAjuste}</strong></p>
        `,
        confirmButtonText: 'Aceptar'
      });

      // Limpiar formulario
      this.limpiarFormularioAjuste();

    } catch (error) {
      console.error('Error al realizar ajuste:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo realizar el ajuste',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  limpiarFormularioAjuste(): void {
    this.codigoProductoAjuste = '';
    this.productoEncontradoAjuste = null;
    this.nuevaCantidadAjuste = 0;
  }

  onEnterCodigoProductoAjuste(event: Event): void {
    event.preventDefault();
    this.buscarProductoAjuste();
  }

  cargarProductoEnAjustes(producto: any): void {
    this.productoEncontradoAjuste = producto;
    this.codigoProductoAjuste = producto.codigoDeBarras || '';
    this.nuevaCantidadAjuste = producto.inventario || 0;
    // Limpiar la selección después de cargar
    this.productoSeleccionadoReporte = null;
  }

  // ==================== MÉTODOS PARA REPORTE DE MOVIMIENTOS ====================

  async cargarMovimientos(): Promise<void> {
    try {
      this.cargandoMovimientos = true;
      
      // Cargar movimientos del día seleccionado
      this.movimientos = await this.movimientosService.obtenerMovimientosPorFecha(this.fechaSeleccionada);
      this.movimientosFiltrados = this.movimientos;
      
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los movimientos',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      this.cargandoMovimientos = false;
    }
  }

  async onFechaChange(): Promise<void> {
    await this.cargarMovimientos();
  }

  onBusquedaChange(): void {
    this.aplicarFiltros();
  }

  onTipoMovimientoChange(): void {
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    let resultado = [...this.movimientos];

    // Filtrar por texto de búsqueda
    if (this.textoBusqueda && this.textoBusqueda.trim() !== '') {
      const busqueda = this.textoBusqueda.toLowerCase().trim();
      resultado = resultado.filter(mov => 
        mov.descripcionProducto.toLowerCase().includes(busqueda) ||
        (mov.nombreCajero && mov.nombreCajero.toLowerCase().includes(busqueda)) ||
        (mov.nombreDepartamento && mov.nombreDepartamento.toLowerCase().includes(busqueda))
      );
    }

    // Filtrar por tipo de movimiento
    if (this.tipoMovimientoFiltro !== 'todos') {
      resultado = resultado.filter(mov => mov.tipo === this.tipoMovimientoFiltro.toUpperCase());
    }

    this.movimientosFiltrados = resultado;
  }

  formatearHora(timestamp: Timestamp): string {
    const fecha = timestamp.toDate();
    return fecha.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  obtenerClaseTipo(tipo: string): string {
    const clases: { [key: string]: string } = {
      'ENTRADA': 'tipo-entrada',
      'SALIDA': 'tipo-salida',
      'VENTA': 'tipo-venta',
      'DEVOLUCION': 'tipo-devolucion',
      'AJUSTE': 'tipo-ajuste'
    };
    return clases[tipo] || '';
  }

  obtenerIconoTipo(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'ENTRADA': 'fa-arrow-left',
      'SALIDA': 'fa-arrow-right',
      'VENTA': 'fa-arrow-right',
      'DEVOLUCION': 'fa-arrow-left',
      'AJUSTE': 'fa-arrows-h'
    };
    return iconos[tipo] || '';
  }

  // ==================== MÉTODOS PARA REPORTE DE INVENTARIO ====================

  async cargarReporteInventario(): Promise<void> {
    try {
      this.cargandoReporte = true;

      // Cargar departamentos
      const deptosSnapshot = await this.departamentosService.obtenerDepartamentos();
      this.departamentosReporte = [];
      deptosSnapshot.forEach(doc => {
        this.departamentosReporte.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Cargar productos
      const productosSnapshot = await this.productosService.obtenerProductos();
      this.productosReporte = [];
      productosSnapshot.forEach(doc => {
        const productoData: any = doc.data();
        this.productosReporte.push({
          id: doc.id,
          ...productoData
        });
      });

      // Aplicar filtros
      this.aplicarFiltrosReporte();

    } catch (error) {
      console.error('Error al cargar reporte de inventario:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar el reporte de inventario',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      this.cargandoReporte = false;
    }
  }

  aplicarFiltrosReporte(): void {
    if (this.departamentoFiltroReporte === 'todos') {
      this.productosReporteFiltrados = [...this.productosReporte];
    } else {
      this.productosReporteFiltrados = this.productosReporte.filter(
        producto => producto.departamento === this.departamentoFiltroReporte
      );
    }
  }

  onDepartamentoChange(): void {
    this.aplicarFiltrosReporte();
  }

  calcularCostoInventario(): number {
    return this.productosReporteFiltrados.reduce((total, producto) => {
      const costo = parseFloat(producto.precioCosto) || 0;
      const inventario = parseFloat(producto.inventario) || 0;
      return total + (costo * inventario);
    }, 0);
  }

  calcularCantidadProductos(): number {
    return this.productosReporteFiltrados.reduce((total, producto) => {
      const inventario = parseFloat(producto.inventario) || 0;
      return total + inventario;
    }, 0);
  }

  obtenerNombreDepartamento(idDepartamento: string): string {
    if (!idDepartamento || idDepartamento === '0') {
      return 'Sin Departamento';
    }
    const depto = this.departamentosReporte.find(d => d.id === idDepartamento);
    return depto ? depto.nombre : 'Sin Departamento';
  }

  seleccionarProductoReporte(producto: any): void {
    this.productoSeleccionadoReporte = producto;
  }

  modificarProductoSeleccionado(): void {
    if (this.productoSeleccionadoReporte) {
      this.cambiarVista('ajustes');
    }
  }

}
