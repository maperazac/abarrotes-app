import { Component, OnInit } from '@angular/core';
import { VentasdbService } from 'src/app/services/ventasdb.service';
import { AuthService } from 'src/app/services/auth.service';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import { EntradasDineroService } from 'src/app/services/entradas-dinero.service';
import { SalidasDineroService } from 'src/app/services/salidas-dinero.service';
import VentaInterface from 'src/app/interfaces/ventas.interface';
import EntradaDineroInterface from 'src/app/interfaces/entrada-dinero.interface';
import SalidaDineroInterface from 'src/app/interfaces/salida-dinero.interface';
import Swal from 'sweetalert2';

interface ResumenVentas {
  totalVentas: number;
  totalVentasEfectivo: number;
  totalVentasCredito: number;
  cantidadVentas: number;
  ticketPromedio: number;
  articulosVendidos: number;
}

interface VentaPorDepartamento {
  nombre: string;
  cantidadArticulos: number;
  totalVendido: number;
  porcentaje: number;
}

interface Devolucion {
  folio: string;
  fecha: Date;
  monto: number;
  articulos: string;
}

@Component({
  selector: 'app-corte-caja',
  templateUrl: './corte-caja.component.html',
  styleUrls: ['./corte-caja.component.scss']
})
export class CorteCajaComponent implements OnInit {
  // Control de vista
  mostrarReporte: boolean = false;
  tipoCorte: 'cajero' | 'dia' | null = null;
  cargando: boolean = false;

  // Información del corte
  fechaInicio: Date;
  fechaFin: Date;
  nombreCajero: string = '';
  idCajero: string = '';
  efectivoInicial: number = 0;

  // Datos del reporte
  ventas: VentaInterface[] = [];
  resumenVentas: ResumenVentas = {
    totalVentas: 0,
    totalVentasEfectivo: 0,
    totalVentasCredito: 0,
    cantidadVentas: 0,
    ticketPromedio: 0,
    articulosVendidos: 0
  };
  ventasPorDepartamento: VentaPorDepartamento[] = [];
  devoluciones: Devolucion[] = [];
  totalDevoluciones: number = 0;
  dineroEnCaja: number = 0;
  ganancia: number = 0;
  fechaGeneracion: Date = new Date();
  
  // Mapa de departamentos: ID -> Nombre
  mapaDepartamentos: Map<string, string> = new Map();
  
  // Entradas y salidas de efectivo
  entradas: EntradaDineroInterface[] = [];
  salidas: SalidaDineroInterface[] = [];
  totalEntradas: number = 0;
  totalSalidas: number = 0;
  
  // Control de secciones colapsables
  mostrarVentasPorDepartamento: boolean = false;

  constructor(
    private ventasService: VentasdbService,
    private authService: AuthService,
    private departamentosService: DepartamentosService,
    private entradasService: EntradasDineroService,
    private salidasService: SalidasDineroService
  ) { }

  ngOnInit(): void {
    // Obtener información del cajero actual
    this.nombreCajero = localStorage.getItem('nombreUsuario') || 'Cajero';
    this.idCajero = localStorage.getItem('userId') || '';
    const efectivoInicialStr = localStorage.getItem('efectivoInicialEnCaja');
    this.efectivoInicial = efectivoInicialStr ? parseFloat(efectivoInicialStr) : 0;
    
    // Cargar departamentos
    this.cargarDepartamentos();
  }

  async cargarDepartamentos() {
    try {
      const departamentos = await this.departamentosService.obtenerDepartamentos();
      departamentos.forEach((doc) => {
        const data = doc.data();
        this.mapaDepartamentos.set(doc.id, data['nombre']);
      });
    } catch (error) {
      console.error('Error al cargar departamentos:', error);
    }
  }

  async hacerCorteCajero() {
    this.tipoCorte = 'cajero';
    this.cargando = true;
    this.fechaGeneracion = new Date();

    // Obtener fecha de inicio de sesión del cajero (guardarla al hacer login)
    const fechaInicioSesion = localStorage.getItem('fechaInicioSesion');
    if (fechaInicioSesion) {
      this.fechaInicio = new Date(fechaInicioSesion);
    } else {
      // Si no hay fecha de inicio, usar el inicio del día actual
      this.fechaInicio = new Date();
      this.fechaInicio.setHours(0, 0, 0, 0);
    }
    
    this.fechaFin = new Date();

    await this.cargarDatosCorte();
    this.mostrarReporte = true;
    this.cargando = false;
  }

  async hacerCorteDia() {
    this.tipoCorte = 'dia';
    this.cargando = true;
    this.fechaGeneracion = new Date();

    // Rango de todo el día actual
    this.fechaInicio = new Date();
    this.fechaInicio.setHours(0, 0, 0, 0);
    
    this.fechaFin = new Date();
    this.fechaFin.setHours(23, 59, 59, 999);

    await this.cargarDatosCorte();
    this.mostrarReporte = true;
    this.cargando = false;
  }

  async cargarDatosCorte() {
    try {
      // Cargar ventas completadas
      const ventasCompletadas = await this.ventasService.obtenerVentasPorStatusYPeriodo(
        '1', 
        this.fechaInicio, 
        this.fechaFin
      );

      // Cargar ventas canceladas (devoluciones)
      const ventasCanceladas = await this.ventasService.obtenerVentasPorStatusYPeriodo(
        '2',
        this.fechaInicio,
        this.fechaFin
      );

      // Procesar ventas completadas
      this.ventas = [];
      ventasCompletadas.forEach((doc) => {
        const venta = { id: doc.id, ...doc.data() } as VentaInterface;
        
        // Filtrar por cajero si es corte de cajero
        if (this.tipoCorte === 'cajero' && venta.idCajero !== this.idCajero) {
          return;
        }
        
        this.ventas.push(venta);
      });

      // Procesar devoluciones
      this.devoluciones = [];
      ventasCanceladas.forEach((doc) => {
        const venta = { id: doc.id, ...doc.data() } as VentaInterface;
        
        // Filtrar por cajero si es corte de cajero
        if (this.tipoCorte === 'cajero' && venta.idCajero !== this.idCajero) {
          return;
        }

        this.devoluciones.push({
          folio: venta.idTemp?.toString() || 'N/A',
          fecha: venta.fechaVentaFinalizada?.toDate() || new Date(),
          monto: parseFloat(venta.total || '0'),
          articulos: venta.detalleProductos?.length.toString() || '0'
        });
      });

      // Cargar entradas y salidas de efectivo
      await this.cargarEntradasYSalidas();

      // Calcular totales y estadísticas
      this.calcularResumenVentas();
      this.calcularVentasPorDepartamento();
      this.calcularDineroEnCaja();

    } catch (error) {
      console.error('Error al cargar datos del corte:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los datos del corte'
      });
    }
  }

  calcularResumenVentas() {
    this.resumenVentas = {
      totalVentas: 0,
      totalVentasEfectivo: 0,
      totalVentasCredito: 0,
      cantidadVentas: this.ventas.length,
      ticketPromedio: 0,
      articulosVendidos: 0
    };

    this.ventas.forEach(venta => {
      const total = parseFloat(venta.total || '0');
      this.resumenVentas.totalVentas += total;

      if (venta.formaDePago === 1) {
        // Efectivo
        this.resumenVentas.totalVentasEfectivo += total;
      } else if (venta.formaDePago === 2) {
        // Crédito
        this.resumenVentas.totalVentasCredito += total;
      }

      // Contar artículos vendidos (productos por unidad suman cantidad, productos por kilo cuentan como 1)
      if (venta.detalleProductos) {
        venta.detalleProductos.forEach(producto => {
          const cantidad = parseFloat(producto.cantidad || '0');
          let seVende = producto.seVende;
          
          // Si seVende no existe (ventas antiguas), inferir del tipo de cantidad
          if (!seVende) {
            if (cantidad < 1 || (cantidad % 1 !== 0 && cantidad < 10)) {
              seVende = 2; // Por peso/kilo
            } else {
              seVende = 1; // Por unidad
            }
          }
          
          this.resumenVentas.articulosVendidos += seVende == 2 ? 1 : cantidad;
        });
      }
    });

    // Calcular ticket promedio
    if (this.resumenVentas.cantidadVentas > 0) {
      this.resumenVentas.ticketPromedio = this.resumenVentas.totalVentas / this.resumenVentas.cantidadVentas;
    }

    // Calcular total de devoluciones
    this.totalDevoluciones = this.devoluciones.reduce((sum, dev) => sum + dev.monto, 0);
  }

  calcularVentasPorDepartamento() {
    const departamentos = new Map<string, { cantidad: number, total: number }>();

    this.ventas.forEach(venta => {
      if (venta.detalleProductos) {
        venta.detalleProductos.forEach(producto => {
          const deptId = producto.departamento || '';
          const deptName = this.mapaDepartamentos.get(deptId) || 'Sin departamento';
          const total = parseFloat(producto.importe || '0');
          const cantidad = parseFloat(producto.cantidad || '0');
          let seVende = producto.seVende;
          
          // Si seVende no existe (ventas antiguas), inferir del tipo de cantidad
          if (!seVende) {
            if (cantidad < 1 || (cantidad % 1 !== 0 && cantidad < 10)) {
              seVende = 2; // Por peso/kilo
            } else {
              seVende = 1; // Por unidad
            }
          }
          
          const cantidadArticulos = seVende == 2 ? 1 : cantidad;

          if (departamentos.has(deptName)) {
            const dept = departamentos.get(deptName)!;
            dept.cantidad += cantidadArticulos;
            dept.total += total;
          } else {
            departamentos.set(deptName, { cantidad: cantidadArticulos, total });
          }
        });
      }
    });

    this.ventasPorDepartamento = [];
    departamentos.forEach((data, nombre) => {
      this.ventasPorDepartamento.push({
        nombre,
        cantidadArticulos: data.cantidad,
        totalVendido: data.total,
        porcentaje: (data.total / this.resumenVentas.totalVentas) * 100
      });
    });

    // Ordenar por total vendido descendente
    this.ventasPorDepartamento.sort((a, b) => b.totalVendido - a.totalVendido);
  }

  async cargarEntradasYSalidas() {
    try {
      // Cargar entradas de efectivo
      const entradasSnapshot = await this.entradasService.obtenerEntradasDelDia(this.fechaInicio);
      this.entradas = [];
      this.totalEntradas = 0;
      
      entradasSnapshot.forEach((doc) => {
        const entrada = { id: doc.id, ...doc.data() } as EntradaDineroInterface;
        const fechaEntrada = entrada.fecha.toDate();
        
        // Verificar que esté en el rango de fechas
        if (fechaEntrada >= this.fechaInicio && fechaEntrada <= this.fechaFin) {
          // Filtrar por cajero si es corte de cajero
          if (this.tipoCorte === 'cajero' && entrada.idCajero !== this.idCajero) {
            return;
          }
          
          this.entradas.push(entrada);
          this.totalEntradas += entrada.cantidad;
        }
      });

      // Cargar salidas de efectivo
      const salidasSnapshot = await this.salidasService.obtenerSalidasDelDia(this.fechaInicio);
      this.salidas = [];
      this.totalSalidas = 0;
      
      salidasSnapshot.forEach((doc) => {
        const salida = { id: doc.id, ...doc.data() } as SalidaDineroInterface;
        const fechaSalida = salida.fecha.toDate();
        
        // Verificar que esté en el rango de fechas
        if (fechaSalida >= this.fechaInicio && fechaSalida <= this.fechaFin) {
          // Filtrar por cajero si es corte de cajero
          if (this.tipoCorte === 'cajero' && salida.idCajero !== this.idCajero) {
            return;
          }
          
          this.salidas.push(salida);
          this.totalSalidas += salida.cantidad;
        }
      });
    } catch (error) {
      console.error('Error al cargar entradas y salidas:', error);
    }
  }

  calcularDineroEnCaja() {
    // Dinero en caja = Efectivo inicial + Ventas en efectivo + Entradas - Devoluciones - Salidas
    this.dineroEnCaja = this.efectivoInicial + this.resumenVentas.totalVentasEfectivo + this.totalEntradas - this.totalDevoluciones - this.totalSalidas;
    
    // Ganancia = Ventas totales + Entradas - Devoluciones - Salidas (gastos) 
    // (falta calcular costo de productos para ganancia real)
    this.ganancia = this.resumenVentas.totalVentas + this.totalEntradas - this.totalDevoluciones - this.totalSalidas;
  }

  volverAInicio() {
    this.mostrarReporte = false;
    this.tipoCorte = null;
    this.ventas = [];
    this.devoluciones = [];
    this.ventasPorDepartamento = [];
    this.entradas = [];
    this.salidas = [];
    this.totalEntradas = 0;
    this.totalSalidas = 0;
  }

  calcularArticulosVenta(venta: VentaInterface): number {
    // Calcular artículos desde detalleProductos para evitar inconsistencias con totalArticulos guardado
    if (!venta.detalleProductos || venta.detalleProductos.length === 0) {
      return 0;
    }
    
    return venta.detalleProductos.reduce((sum, prod) => {
      const cantidad = parseFloat(prod.cantidad || '0');
      let seVende = prod.seVende;
      
      // Si seVende no existe (ventas antiguas), inferir del tipo de cantidad
      if (!seVende) {
        // Si la cantidad es menor a 1 o tiene decimales significativos, probablemente es por peso
        if (cantidad < 1 || (cantidad % 1 !== 0 && cantidad < 10)) {
          seVende = 2; // Por peso/kilo
        } else {
          seVende = 1; // Por unidad
        }
      }
      
      return sum + (seVende == 2 ? 1 : cantidad);
    }, 0);
  }

  formatearMoneda(valor: number | string): string {
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (!numero || isNaN(numero)) return '$0.00';
    return '$' + numero.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  formatearFecha(fecha: Date): string {
    if (!fecha) return '';
    const opciones: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return fecha.toLocaleDateString('es-MX', opciones);
  }

  formatearFechaCorta(fecha: Date): string {
    if (!fecha) return '';
    const opciones: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return fecha.toLocaleDateString('es-MX', opciones);
  }

  exportarExcel() {
    Swal.fire({
      icon: 'info',
      title: 'Funcionalidad pendiente',
      text: 'La exportación a Excel se implementará próximamente'
    });
  }

  imprimir() {
    window.print();
  }

  enviarEmail() {
    Swal.fire({
      icon: 'info',
      title: 'Funcionalidad pendiente',
      text: 'El envío por email se implementará próximamente'
    });
  }
  
  toggleVentasPorDepartamento() {
    this.mostrarVentasPorDepartamento = !this.mostrarVentasPorDepartamento;
  }
}
