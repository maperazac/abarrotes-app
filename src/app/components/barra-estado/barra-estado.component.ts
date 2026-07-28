import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { VentasdbService } from 'src/app/services/ventasdb.service';
import { ClientesService } from 'src/app/services/clientes.service';
import VentaInterface from 'src/app/interfaces/ventas.interface';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-barra-estado',
  templateUrl: './barra-estado.component.html',
  styleUrls: ['./barra-estado.component.scss']
})
export class BarraEstadoComponent implements OnInit {
  @Output() abrirVentasDelDia = new EventEmitter<void>();
  ultimaVenta: VentaInterface | null = null;
  total: string = '0';
  pagoCon: string = '0';
  cambio: string = '0';

  constructor(
    private ventasdbService: VentasdbService,
    private clientesService: ClientesService
  ) { }

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

  async reimprimirTicket() {
    if (!this.ultimaVenta) {
      Swal.fire({
        icon: 'info',
        title: 'No hay venta',
        text: 'No hay una venta reciente para reimprimir',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Reimprimir ticket?',
      html: `
        <p>¿Deseas reimprimir el ticket de la última venta?</p>
        <p><strong>Folio:</strong> #${this.ultimaVenta.idTemp}</p>
        <p><strong>Total:</strong> $${parseFloat(this.ultimaVenta.total).toFixed(2)}</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reimprimir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d'
    });

    if (result.isConfirmed) {
      try {
        // Obtener la venta completa desde Firestore para asegurar que tenemos todos los datos
        const ventaCompleta = await this.ventasdbService.obtenerVentaPorId(this.ultimaVenta.id!);
        
        if (!ventaCompleta) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo obtener la información de la venta',
            confirmButtonText: 'Aceptar'
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
          confirmButtonText: 'Aceptar'
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
        confirmButtonText: 'Aceptar'
      });
    }
  }

  verVentasDelDia() {
    this.abrirVentasDelDia.emit();
  }
}
