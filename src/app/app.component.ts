import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(private auth: AuthService){}
  title = 'abarrotes-app';

  mostrarNavbar() {
    this.auth.leerToken();
    return this.auth.estaAutenticado() ? true : false;  
  }
}
