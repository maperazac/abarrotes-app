import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { VentasdbService } from 'src/app/services/ventasdb.service';
import VentaInterface from '../../interfaces/ventas.interface';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import DepartamentoInterface from 'src/app/interfaces/deparamentos.interface';

@Component({
  selector: 'app-ventas-por-periodo',
  templateUrl: './ventas-por-periodo.component.html',
  styleUrls: ['./ventas-por-periodo.component.scss']
})
export class VentasPorPeriodoComponent implements OnInit {
  selectPeriodo: FormGroup;
  

  constructor(private ventasdbService: VentasdbService,
              private departamentosService: DepartamentosService
  ) { 
    this.selectPeriodo = new FormGroup({
      periodo: new FormControl('1')
    });
  }

  ventasDelPeriodo;
  departamentos: DepartamentoInterface[] = [];
  cargandoResultados = false;
  rangoUsuario = {
    fechainicio: '', // Fecha inicio seleccionada por el usuario (ISO string)
    fechafin: '', // Fecha fin seleccionada por el usuario (ISO string)
  };
  errorFechas: string = ''; // Mensaje de error al validar fechas
  mostrarRangoFechas = false;
  ordenAsc = true; // Revisa si el ordenamiento del reporte es ascendente, independientemente del campo por el que esté ordenado
  ordenadoPor = 0; // El id por el que esta ordenado el reporte (codigo de barras, descripcion, cantidad, etc, cada uno tiene asignado un id dentro del switch de orden)

  ngOnInit(): void {    
    this.actualizarReporte("1");
    this.obtenerDepartamentos();
  }
 
  validarFechas() {
    const { fechainicio, fechafin } = this.rangoUsuario;

    if (fechainicio && fechafin) {
      const inicio = new Date(fechainicio);
      const fin = new Date(fechafin);

      if (inicio > fin) {
        this.errorFechas = 'La fecha de inicio no puede ser mayor que la fecha de fin.';
      } else {
        this.errorFechas = ''; // No hay errores
        this.actualizarReporte("6");
      }
    }
  }

  async actualizarReporte(periodo) {    
    const { fechainicio, fechafin } = this.rangoUsuario;
    this.ventasDelPeriodo = [];
    this.errorFechas = '';
    this.cargandoResultados = true;
    let fechaInicio: Date;
    let fechaFin: Date;
    this.mostrarRangoFechas = false;
    this.ordenadoPor = 0;

    const now = new Date();
    const inicioDia = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const inicioSemana = new Date(inicioDia);
    inicioSemana.setDate(inicioDia.getDate() - inicioDia.getDay() + 1); // Lunes de la semana actual
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (periodo) {
      case "1": // Hoy (inicio del día hasta ahora)
        fechaInicio = inicioDia;
        fechaFin = now;
        break;
  
      case "2": // Ayer (inicio y fin del día anterior)
        fechaInicio = new Date(inicioDia);
        fechaInicio.setDate(inicioDia.getDate() - 1);
        fechaFin = new Date(fechaInicio);
        fechaFin.setHours(23, 59, 59, 999);
        break;
  
      case "3": // Esta semana (de lunes a ahora)
        fechaInicio = inicioSemana;
        fechaFin = now;
        break;
  
      case "4": // Semana pasada (de lunes a domingo)
        fechaInicio = new Date(inicioSemana);
        fechaInicio.setDate(inicioSemana.getDate() - 7);
        fechaFin = new Date(inicioSemana);
        fechaFin.setDate(fechaInicio.getDate() + 6);
        fechaFin.setHours(23, 59, 59, 999);
        break;
  
      case "5": // Este mes (del 1ro del mes hasta ahora)
        fechaInicio = inicioMes;
        fechaFin = now;
        break;
  
      case "6": // Rango definido por el usuario
        this.mostrarRangoFechas = true;
        if (fechainicio && fechafin) {
          const [yearInicio, monthInicio, dayInicio] = fechainicio.split('-').map(Number);
          const fechaInicioDate = new Date(yearInicio, monthInicio - 1, dayInicio);
          fechaInicioDate.setHours(0, 0, 0, 0); // 00:00:00 del día seleccionado

          const [yearFin, monthFin, dayFin] = fechafin.split('-').map(Number);
          const fechaFinDate = new Date(yearFin, monthFin - 1, dayFin);
          fechaFinDate.setHours(23, 59, 59, 999); // 23:59:59 del día seleccionado

          fechaInicio = fechaInicioDate; // Convertir a timestamp
          fechaFin = fechaFinDate; // Convertir a timestamp
        } else {
          // throw new Error('Debe proporcionar un rango de fechas para el período.');
          // this.errorFechas = 'Debe proporcionar un rango de fechas para el período.';
        }
        break;
  
      default:
        throw new Error('Período no válido.');
    }

    // Convertir fechas a Timestamp si necesitas usarlas con Firestore
    // const fechainicioTimestamp = fechaInicio.getTime();
    // const fechafinTimestamp = fechaFin.getTime();

    if ((fechainicio && fechafin) || periodo !== "6") {
      const ventas = await this.ventasPorStatusYPeriodo("1", fechaInicio, fechaFin); // Se obtienen todas las ventas completadas (status = 1) de la base de datos. En un futuro, cuando haya muchos usuarios, las ventas se van a filtrar por idNegocio para que se obtengan solo las de ese negocio
      this.ventasDelPeriodo = this.conteoProductos(ventas);
    }    
    this.cargandoResultados = false;
  }

  async ventasPorStatusYPeriodo(status: string, fechaInicio: Date, fechaFin: Date) {
    const ventas: any[] = [];

    await this.ventasdbService.obtenerVentasPorStatusYPeriodo(status, fechaInicio, fechaFin).then(docRef => {
      docRef.forEach ( venta => {
        ventas.push({
          id: venta.id,
          ...venta.data()
        })
      })
    })

    return ventas;
  }

  conteoProductos(ventas: VentaInterface[]) {
    interface ProductoTotal {
      codigoDeBarras: string;
      descripcion: string;
      id: string;
      cantidad: number; // Total acumulado como número
      precioVenta: string;
      departamento: string;
    }
  
    const contador: { [key: string]: ProductoTotal } = {};
    const departamentoMap: { [key: string]: string } = {}; // Mapa para asociar productos con su último departamento válido
  
    // Construir el mapa de departamentos válidos
    this.departamentos.forEach((dep) => {
      departamentoMap[dep.id] = dep.nombre;
    });
  
    ventas.forEach((venta) => {
      if (venta.detalleProductos) {
        venta.detalleProductos.forEach((detalle) => {
          const { codigoDeBarras, id, descripcion, cantidad, precioVenta, departamento } = detalle;
          const cantidadNumerica = Number(cantidad);
  
          // Buscar el departamento más reciente y válido
          const departamentoNombre = departamentoMap[departamento] || '-Sin departamento-';
  
          // Verificar si el producto ya existe en el contador
          if (contador[id]) {
            // Si ya existe, acumular la cantidad y actualizar el departamento si es válido
            contador[id].cantidad += cantidadNumerica;
  
            // Si el departamento es válido, actualizar el nombre del departamento
            if (departamentoMap[departamento]) {
              contador[id].departamento = departamentoNombre;
            }
          } else {
            // Si no existe, inicializar el producto en el contador
            contador[id] = {
              codigoDeBarras,
              id,
              descripcion,
              cantidad: cantidadNumerica,
              precioVenta,
              departamento: departamentoNombre,
            };
          }
        });
      }
    });
  
    // Convertir el objeto contador a un arreglo
    return Object.values(contador);
  }

  obtenerDepartamentos() {
    this.departamentosService.obtenerDepartamentos().then(docRef => {
      const departamentos: any[] = [];

      docRef.forEach ( producto => {
        departamentos.push({
          id: producto.id,
          ...producto.data()
        })
      })

      this.departamentos = departamentos;
    })
  }

  ordenar(idOrden) {
    if(this.ordenadoPor == idOrden) {
      this.ordenAsc = !this.ordenAsc;
    } else {
      this.ordenadoPor = idOrden;
      this.ordenAsc = true;
    } 

    switch(idOrden) { // cada id orden ordena por diferente campo el reporte 
      case 1:
        this.ventasDelPeriodo.sort(this.ordenAsc ? (a, b) => parseFloat(a.codigoDeBarras) - parseFloat(b.codigoDeBarras) : (b, a) => parseFloat(a.codigoDeBarras) - parseFloat(b.codigoDeBarras));
        break;
      case 2:
        this.ventasDelPeriodo.sort(this.ordenAsc ? (a, b) => a.descripcion.localeCompare(b.descripcion) : (a, b) => b.descripcion.localeCompare(a.descripcion));
        break;
      case 3: // Cantidad
        this.ventasDelPeriodo.sort(this.ordenAsc ? (a, b) => a.cantidad - b.cantidad : (b, a) => a.cantidad - b.cantidad);
        break;
      case 4: // Precio venta
        this.ventasDelPeriodo.sort(this.ordenAsc ? (a, b) => parseFloat(a.precioVenta) - parseFloat(b.precioVenta) : (b, a) => parseFloat(a.precioVenta) - parseFloat(b.precioVenta));
        break;
      case 5:
        this.ventasDelPeriodo.sort(this.ordenAsc ? (a, b) => a.departamento.localeCompare(b.departamento) : (a, b) => b.departamento.localeCompare(a.departamento));
        break;
      case 6:
        this.ventasDelPeriodo.sort(this.ordenAsc ? (a, b) => parseFloat(a.precioVenta) * a.cantidad - parseFloat(b.precioVenta) * a.cantidad : (b, a) => parseFloat(a.precioVenta) * a.cantidad - parseFloat(b.precioVenta) * a.cantidad);
        break;
    }
  }

}
