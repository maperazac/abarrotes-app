import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule  } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { initializeApp,provideFirebaseApp } from '@angular/fire/app';
import { environment } from '../environments/environment';
import { provideAuth,getAuth } from '@angular/fire/auth';
import { provideFirestore,getFirestore } from '@angular/fire/firestore';
import { VentasComponent } from './pages/ventas/ventas.component';
import { LoginComponent } from './pages/login/login.component';
import { RegistroComponent } from './pages/registro/registro.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ProductosComponent } from './pages/productos/productos.component';
import { VentasNavbarComponent } from './components/ventas-navbar/ventas-navbar.component';
import { BuscarProductosComponent } from './components/buscar-productos/buscar-productos.component';
import { ProductosNavbarComponent } from './components/productos-navbar/productos-navbar.component';
import { NuevoProductoComponent } from './components/nuevo-producto/nuevo-producto.component';
import { VentasFooterComponent } from './components/ventas-footer/ventas-footer.component';
import { DepartamentosComponent } from './components/departamentos/departamentos.component';

@NgModule({
  declarations: [
    AppComponent,
    VentasComponent,
    LoginComponent,
    RegistroComponent,
    NavbarComponent,
    ProductosComponent,
    VentasNavbarComponent,
    BuscarProductosComponent,
    ProductosNavbarComponent,
    NuevoProductoComponent,
    VentasFooterComponent,
    DepartamentosComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
