import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { ConfiguracionService, OpcionesHabilitadas } from 'src/app/services/configuracion.service';

interface ConfigModule {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  color: string;
  submodulos: ConfigSubmodulo[];
}

interface ConfigSubmodulo {
  id: string;
  titulo: string;
  icono: string;
  descripcion: string;
  ruta?: string;
}

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent implements OnInit {

  modulos: ConfigModule[] = [
    {
      id: 'general',
      titulo: 'General',
      descripcion: 'Configuraciones generales del sistema',
      icono: 'fa-cog',
      color: '#3b82f6',
      submodulos: [
        { id: 'opciones', titulo: 'Opciones habilitadas', icono: 'fa-check-square-o', descripcion: 'Activar o desactivar funcionalidades' },
        { id: 'cajeros', titulo: 'Cajeros', icono: 'fa-users', descripcion: 'Administrar usuarios cajeros' },
        { id: 'base-datos', titulo: 'Base de Datos', icono: 'fa-database', descripcion: 'Configuración de base de datos' },
        { id: 'articulos-precargados', titulo: 'Artículos precargados', icono: 'fa-cubes', descripcion: 'Productos por defecto en el sistema' },
        { id: 'facturacion', titulo: 'Facturación', icono: 'fa-file-text-o', descripcion: 'Configurar datos de facturación' },
        { id: 'folios', titulo: 'Modificar folios', icono: 'fa-hashtag', descripcion: 'Cambiar numeración de tickets' },
        { id: 'cajas', titulo: 'Administrar cajas', icono: 'fa-cash-register', descripcion: 'Gestionar cajas registradoras' }
      ]
    },
    {
      id: 'personalizacion',
      titulo: 'Personalización',
      descripcion: 'Personaliza la apariencia del sistema',
      icono: 'fa-paint-brush',
      color: '#8b5cf6',
      submodulos: [
        { id: 'logotipo', titulo: 'Logotipo del programa', icono: 'fa-picture-o', descripcion: 'Cambiar logo de la aplicación' },
        { id: 'ticket', titulo: 'Ticket', icono: 'fa-ticket', descripcion: 'Personalizar diseño de tickets' },
        { id: 'formas-pago', titulo: 'Formas de pago', icono: 'fa-credit-card', descripcion: 'Configurar métodos de pago' },
        { id: 'impuestos', titulo: 'Impuestos', icono: 'fa-percent', descripcion: 'Gestionar impuestos y tasas' },
        { id: 'corte', titulo: 'Corte', icono: 'fa-calculator', descripcion: 'Personalizar reporte de corte' },
        { id: 'moneda', titulo: 'Símbolo de moneda', icono: 'fa-dollar', descripcion: 'Cambiar moneda del sistema' },
        { id: 'unidades', titulo: 'Unidades de medida', icono: 'fa-balance-scale', descripcion: 'Configurar unidades (kg, pz, etc.)' }
      ]
    },
    {
      id: 'dispositivos',
      titulo: 'Dispositivos',
      descripcion: 'Conecta y configura dispositivos externos',
      icono: 'fa-plug',
      color: '#10b981',
      submodulos: [
        { id: 'impresora', titulo: 'Impresora de tickets', icono: 'fa-print', descripcion: 'Configurar impresora térmica' },
        { id: 'lector', titulo: 'Lector de códigos', icono: 'fa-barcode', descripcion: 'Conectar lector de códigos de barras' },
        { id: 'cajon', titulo: 'Cajón de dinero', icono: 'fa-inbox', descripcion: 'Configurar apertura de cajón' },
        { id: 'bascula', titulo: 'Báscula', icono: 'fa-balance-scale', descripcion: 'Conectar báscula electrónica' }
      ]
    },
    {
      id: 'servicios',
      titulo: 'Servicios',
      descripcion: 'Servicios adicionales y notificaciones',
      icono: 'fa-server',
      color: '#f59e0b',
      submodulos: [
        { id: 'recargas', titulo: 'Recargas electrónicas', icono: 'fa-mobile', descripcion: 'Activar venta de recargas' },
        { id: 'pago-servicios', titulo: 'Pago de servicios', icono: 'fa-money', descripcion: 'Habilitar pago de servicios' },
        { id: 'notificaciones', titulo: 'Notificaciones por correo', icono: 'fa-envelope', descripcion: 'Configurar envío de emails' }
      ]
    },
    {
      id: 'mantenimiento',
      titulo: 'Mantenimiento',
      descripcion: 'Respaldos y actualizaciones del sistema',
      icono: 'fa-wrench',
      color: '#ef4444',
      submodulos: [
        { id: 'respaldo', titulo: 'Respaldo automático', icono: 'fa-cloud-upload', descripcion: 'Configurar copias de seguridad' },
        { id: 'actualizaciones', titulo: 'Actualizaciones automáticas', icono: 'fa-refresh', descripcion: 'Gestionar actualizaciones del sistema' }
      ]
    }
  ];

  moduloSeleccionado: ConfigModule | null = null;
  vistaActual: 'principal' | 'opciones-habilitadas' = 'principal';
  
  // Configuración de opciones habilitadas
  opcionesHabilitadas: OpcionesHabilitadas = {
    usarInventarios: true,
    creditoClientes: true,
    productoComun: true,
    calcularPrecioAutomatico: true,
    margenGanancia: 20,
    redondearCentavos: false,
    redondeoDecimales: 'A décimas (Ej: 45.52 -> 45.60, 35.18 -> 35.20)'
  };
  cargandoConfiguracion = false;

  constructor(private configuracionService: ConfiguracionService) { }

  async ngOnInit(): Promise<void> {
    await this.cargarConfiguracion();
  }

  async cargarConfiguracion(): Promise<void> {
    try {
      this.cargandoConfiguracion = true;
      const config = await this.configuracionService.obtenerOpcionesHabilitadas();
      if (config) {
        this.opcionesHabilitadas = config;
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar la configuración',
        confirmButtonText: 'Aceptar'
      });
    } finally {
      this.cargandoConfiguracion = false;
    }
  }

  seleccionarModulo(modulo: ConfigModule) {
    if (this.moduloSeleccionado?.id === modulo.id) {
      this.moduloSeleccionado = null;
    } else {
      this.moduloSeleccionado = modulo;
    }
  }

  navegarSubmodulo(submodulo: ConfigSubmodulo) {
    console.log('Navegar a:', submodulo.id);
    
    // Manejar navegación a pantallas específicas
    if (submodulo.id === 'opciones') {
      this.vistaActual = 'opciones-habilitadas';
    }
    // TODO: Agregar más navegaciones según se implementen las pantallas
  }

  volverAPrincipal() {
    this.vistaActual = 'principal';
    this.moduloSeleccionado = null;
  }

  async guardarOpcionesHabilitadas(): Promise<void> {
    try {
      // Mostrar loading
      Swal.fire({
        title: 'Guardando...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Guardar configuración en Firestore
      await this.configuracionService.guardarOpcionesHabilitadas(this.opcionesHabilitadas);
      console.log('Guardando opciones:', this.opcionesHabilitadas);
      
      Swal.fire({
        icon: 'success',
        title: 'Configuración guardada',
        text: 'Los cambios se han guardado exitosamente y están disponibles en todas las cajas',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar la configuración. Intenta de nuevo.',
        confirmButtonText: 'Aceptar'
      });
    }
  }

}
