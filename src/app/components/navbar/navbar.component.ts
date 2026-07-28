import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '../../../../node_modules/@angular/router';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {

  inventarioHabilitado: boolean = false;
  creditoClientesHabilitado: boolean = false;
  private configSubscription: Subscription;

  constructor(
    private auth: AuthService, 
    private router: Router,
    private configuracionService: ConfiguracionService
  ) { }

  async ngOnInit(): Promise<void> {
    await this.cargarConfiguracion();
    
    // Suscribirse a cambios de configuración
    this.configSubscription = this.configuracionService.configuracionCambiada$.subscribe(
      config => {
        if (config) {
          this.inventarioHabilitado = config.usarInventarios || false;
          this.creditoClientesHabilitado = config.creditoClientes || false;
        }
      }
    );
  }

  ngOnDestroy(): void {
    // Limpiar suscripción para evitar memory leaks
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
    }
  }

  async cargarConfiguracion(): Promise<void> {
    try {
      const config = await this.configuracionService.obtenerOpcionesHabilitadas();
      if (config) {
        this.inventarioHabilitado = config.usarInventarios || false;
        this.creditoClientesHabilitado = config.creditoClientes || false;
      }
    } catch (error) {
      console.error('Error al cargar configuración del navbar:', error);
    }
  }

  salir(){
    this.auth.logout();
    this.router.navigateByUrl("/login");
  }

}
