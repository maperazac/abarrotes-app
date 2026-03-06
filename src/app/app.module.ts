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
import { SeleccionarVentaComponent } from './modals/seleccionar-venta/seleccionar-venta.component';
import { ConfiguracionComponent } from './pages/configuracion/configuracion.component';
import { CobrarVentaComponent } from './components/cobrar-venta/cobrar-venta.component';
import { VentasPorPeriodoComponent } from './components/ventas-por-periodo/ventas-por-periodo.component';
import { ProductoComunComponent } from './modals/producto-comun/producto-comun.component';
import { EntradaDineroComponent } from './modals/entrada-dinero/entrada-dinero.component';
import { SalidaDineroComponent } from './modals/salida-dinero/salida-dinero.component';
import { BarraEstadoComponent } from './components/barra-estado/barra-estado.component';
import { VentasDelDiaComponent } from './components/ventas-del-dia/ventas-del-dia.component';
import { CorteCajaComponent } from './pages/corte-caja/corte-caja.component';

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
    SeleccionarVentaComponent,
    ConfiguracionComponent,
    CobrarVentaComponent,
    VentasPorPeriodoComponent,
    ProductoComunComponent,
    EntradaDineroComponent,
    SalidaDineroComponent,
    BarraEstadoComponent,
    VentasDelDiaComponent,
    CorteCajaComponent,
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
