import { Component, OnInit } from '@angular/core';
import { NgForm } from '../../../../node_modules/@angular/forms';
import { usuarioModel } from '../../models/usuario.model';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  usuario: usuarioModel = new usuarioModel();
  recordarme = false;

  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit() {
    if(localStorage.getItem('email')){
      this.usuario.email = localStorage.getItem('email');
      this.recordarme = true;
    }

    if (this.auth.estaAutenticado()) {
      this.router.navigateByUrl('/ventas');
    }
  }

  login(form: NgForm){
    if(form.invalid){
      return;
    }

    Swal.fire({
      allowOutsideClick: false,
      icon: 'info',
      text: 'Espere por favor...'
    }); 
    Swal.showLoading();
    
    
    this.auth.login(this.usuario).subscribe(resp => {
      Swal.close();
      if(this.recordarme){
        localStorage.setItem('email', this.usuario.email);
      }
      this.router.navigateByUrl('/ventas');
    },(err) => {
      Swal.fire({
        icon: 'error',
        title: 'Error al autenticar',
        text: 'Verifique que su correo y contraseña sean correctos.'
      }); 
    });
  }

}
