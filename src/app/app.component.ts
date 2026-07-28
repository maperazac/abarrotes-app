import { Component, HostListener } from '@angular/core';
import { AuthService } from './services/auth.service';
import { TeclasService } from './services/teclas.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(private authService: AuthService,
              private teclas: TeclasService
  ){}
  title = 'abarrotes-app';

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // ***** TODO ESTE BLOQUE TIENE QUE IR EN LOS COMPONENTES DE TODOS LOS CUADROS DE DIALOGO *****
    // Bloquear combinaciones como Control+O
    if (event.ctrlKey || event.altKey || event.metaKey) {
      event.preventDefault();
      return;
    }    
    // Si no es una tecla permitida, prevenimos su acción predeterminada
    if (!this.teclas.esTeclaPermitida(event)) {
      event.preventDefault();
    } 
    // **********************************************************************************************
  }

  ngOnInit(): void {
    // Iniciar el monitoreo de la sesión
    this.authService.startSessionCheck();

    // Reiniciar la verificación de sesión al detectar actividad
    document.addEventListener('mousemove', () => this.authService.startSessionCheck());
    document.addEventListener('keydown', () => this.authService.startSessionCheck());

    // Opcional: Suscribirse a la expiración de sesión (para mostrar mensajes u otros eventos)
    this.authService.onSessionExpired().subscribe(expired => {
      if (expired) {
        console.log('Sesión expirada. Redirigiendo al login...');
      }
    });
  }

  mostrarNavbar() {
    this.authService.leerToken();
    return this.authService.estaAutenticado() ? true : false;  
  }
}
