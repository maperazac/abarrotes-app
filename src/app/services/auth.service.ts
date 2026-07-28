import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { usuarioModel } from '../models/usuario.model';

import { catchError, map, switchMap } from 'rxjs/operators';
import { BehaviorSubject, interval, of, from } from 'rxjs';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private url  = 'https://identitytoolkit.googleapis.com/v1/accounts:';
  private apikey = 'AIzaSyCQFg_zVkI7Co-b64pz1H7t7gj3_a9hGWg';

  private sessionExpired = new BehaviorSubject<boolean>(false); // Observable para detectar la expiración
  private checkInterval = 10000; // Intervalo de tiempo (10 segundos) para verificar la sesión

  // Método para verificar si la sesión sigue activa
  isSessionActive(): boolean {
    const token = localStorage.getItem('token'); // Obtén el token o indicador de sesión
    if (!token) return false; // Si no hay token, la sesión no está activa

    // Aquí podrías verificar la expiración del token (JWT, tiempo, etc.)
    const tokenExpiration = Number(localStorage.getItem('tokenExpiration'));
    if (!tokenExpiration || isNaN(tokenExpiration)) return false; // Si no hay expiración válida, la sesión no está activa

    return Date.now() < tokenExpiration; // Devuelve true si el token aún no ha expirado
  }

  // Configurar el chequeo automático de la sesión
  startSessionCheck(): void {
    interval(this.checkInterval)
      .pipe(
        switchMap(() => {
          // No verificar la sesión si estamos en el login
          if (this.router.url.includes('/login')) {
            return of(true); // La sesión no se chequea
          }
          return of(this.isSessionActive());
        }),
        catchError(() => of(false)) // En caso de error, asumir que la sesión no es válida
      )
      .subscribe(isActive => {
        if (!isActive) {
          this.sessionExpired.next(true); // Notificar la expiración
          this.logout(); // Realizar logout automáticamente
        }
      });
  }

  // Observable para detectar expiración de sesión
  onSessionExpired() {
    return this.sessionExpired.asObservable();
  }


  userToken: string;
  // Crear nuevo usuario
  // https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=[API_KEY]

  // Login
  // https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=[API_KEY]
  constructor(
    private http: HttpClient, 
    private router: Router,
    private auth: Auth
  ) { 
    this.leerToken();
  }
  

  logout(){
    // Cerrar sesión en Firebase Auth
    signOut(this.auth).then(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiration');
      localStorage.removeItem('efectivoInicialEnCaja');
      localStorage.removeItem('fechaInicioSesion');
      localStorage.removeItem('userId');
      localStorage.removeItem('nombreUsuario');
      this.router.navigate(['/login']);
    }).catch(error => {
      console.error('Error al cerrar sesión:', error);
      // Aún así limpiar localStorage y redirigir
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiration');
      localStorage.removeItem('efectivoInicialEnCaja');
      localStorage.removeItem('fechaInicioSesion');
      localStorage.removeItem('userId');
      localStorage.removeItem('nombreUsuario');
      this.router.navigate(['/login']);
    });
  }

  login(usuario: usuarioModel){
    // Usar el SDK de Firebase Auth en lugar de HTTP directo
    return from(signInWithEmailAndPassword(this.auth, usuario.email, usuario.password)).pipe(
      map(userCredential => {
        // El token se maneja automáticamente por Firebase
        const user = userCredential.user;
        
        // Obtener el token para guardarlo (opcional, pero mantenemos compatibilidad)
        return user.getIdToken().then(token => {
          this.guardarToken(token);
          localStorage.setItem('userId', user.uid);
          localStorage.setItem('nombreUsuario', user.email?.split('@')[0] || '');
          return userCredential;
        });
      }),
      switchMap(promise => from(promise))
    );
  }

  nuevoUsuario(usuario: usuarioModel){
    // Usar el SDK de Firebase Auth en lugar de HTTP directo
    return from(createUserWithEmailAndPassword(this.auth, usuario.email, usuario.password)).pipe(
      map(userCredential => {
        const user = userCredential.user;
        
        // Obtener el token para guardarlo
        return user.getIdToken().then(token => {
          this.guardarToken(token);
          localStorage.setItem('userId', user.uid);
          localStorage.setItem('nombreUsuario', user.email?.split('@')[0] || '');
          return userCredential;
        });
      }),
      switchMap(promise => from(promise))
    );
  }

  private guardarToken(idToken: string){
    this.userToken = idToken;
    localStorage.setItem('token', idToken);
    
    localStorage.setItem('tokenExpiration', (Date.now() + 72000000).toString()); // Expira en:1 minuto (60000), 1 hora (3600000), 20 horas (72000000)
    
    // Guardar fecha de inicio de sesión para corte de cajero
    localStorage.setItem('fechaInicioSesion', new Date().toISOString());
  }

  leerToken(){
    if(localStorage.getItem('token')){
      this.userToken = localStorage.getItem('token');
    } else {
      this.userToken = '';
    }

    return this.userToken;
  }

  estaAutenticado(): boolean{
    if(this.leerToken().length < 2){
      return false;
    }

    const expira = Number(localStorage.getItem('tokenExpiration'));
    const expiraDate = new Date();
    expiraDate.setTime(expira);

    if(expiraDate > new Date()){
      return true
    }else{
      return false
    }
  }
}
