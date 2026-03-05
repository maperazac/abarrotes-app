import { Component, OnInit } from '@angular/core';
import { VentasdbService } from 'src/app/services/ventasdb.service';
import VentaInterface from 'src/app/interfaces/ventas.interface';

@Component({
  selector: 'app-barra-estado',
  templateUrl: './barra-estado.component.html',
  styleUrls: ['./barra-estado.component.scss']
})
export class BarraEstadoComponent implements OnInit {
  ultimaVenta: VentaInterface | null = null;
  total: string = '0';
  pagoCon: string = '0';
  cambio: string = '0';

  constructor(private ventasdbService: VentasdbService) { }

  async ngOnInit(): Promise<void> {
    // Cargar última venta del localStorage
    await this.cargarUltimaVenta();

    // Escuchar nuevas ventas finalizadas
    this.ventasdbService.$ultimaVentaFinalizada.subscribe((venta) => {
      if (venta) {
        this.actualizarUltimaVenta(venta);
        // Guardar en localStorage con fecha
        localStorage.setItem('ultimaVenta', JSON.stringify({
          venta: venta,
          fecha: new Date().toISOString()
        }));
      }
    });
  }

  async cargarUltimaVenta() {
    const ultimaVentaLS = localStorage.getItem('ultimaVenta');
    
    if (ultimaVentaLS) {
      const { venta, fecha } = JSON.parse(ultimaVentaLS);
      const fechaGuardada = new Date(fecha);
      const hoy = new Date();
      
      // Verificar si es del mismo día
      if (this.esMismoDia(fechaGuardada, hoy)) {
        this.actualizarUltimaVenta(venta);
        return;
      }
    }

    // Si no hay en localStorage o no es del día actual, buscar en Firestore
    const ultimaVentaDB = await this.ventasdbService.obtenerUltimaVentaDelDia();
    if (ultimaVentaDB) {
      this.actualizarUltimaVenta(ultimaVentaDB);
      // Guardar en localStorage
      localStorage.setItem('ultimaVenta', JSON.stringify({
        venta: ultimaVentaDB,
        fecha: new Date().toISOString()
      }));
    }
  }

  esMismoDia(fecha1: Date, fecha2: Date): boolean {
    return fecha1.getFullYear() === fecha2.getFullYear() &&
           fecha1.getMonth() === fecha2.getMonth() &&
           fecha1.getDate() === fecha2.getDate();
  }

  actualizarUltimaVenta(venta: VentaInterface) {
    this.ultimaVenta = venta;
    this.total = venta.total || '0';
    this.pagoCon = venta.pagoCon || '0';
    this.cambio = venta.cambio || '0';
  }

  reimprimirTicket() {
    // Funcionalidad pendiente
    console.log('Reimprimir ticket de la última venta');
  }

  verVentasDelDia() {
    // Funcionalidad pendiente
    console.log('Ver ventas del día y devoluciones');
  }
}
