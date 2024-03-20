import { Component, OnInit } from '@angular/core';
import { usuarioModel } from '../../models/usuario.model';
import { NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss']
})
export class RegistroComponent implements OnInit {
  usuario: usuarioModel;
  recordarme = false;

  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit() {
    this.usuario = new usuarioModel();

    if (this.auth.estaAutenticado()) {
      this.router.navigateByUrl('/ventas');
    }
   }

  onSubmit(form: NgForm){
    if(form.invalid){
      return;
    }
    Swal.fire({
      allowOutsideClick: false,
      icon: 'info',
      text: 'Espere por favor...'
    }); 
    Swal.showLoading();

    this.auth.nuevoUsuario(this.usuario).subscribe(resp=>{
      Swal.close();
      if(this.recordarme){
      localStorage.setItem('email', this.usuario.email);
    }
      this.router.navigateByUrl('/login');
    }, (err) =>{
      console.log(err.error.error.message)
      Swal.fire({
        icon: 'error',
        title: 'Correo inválido',
        text: err.error.error.message=='EMAIL_EXISTS' ? 'Este correo ya está asociado a una cuenta. Intenta reestablecer tu contraseña.' : 'Usuario o contraseña no encontrado'
      }); 
    }
  );
  }
}
