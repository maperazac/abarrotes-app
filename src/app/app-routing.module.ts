import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VentasComponent } from './pages/ventas/ventas.component';
import { RegistroComponent } from './pages/registro/registro.component';
import { LoginComponent } from './pages/login/login.component';
import { AuthGuard } from './guards/auth.guard';
import { ProductosComponent } from './pages/productos/productos.component';

const routes: Routes = [
  { path: 'ventas'    , component: VentasComponent, canActivate: [AuthGuard] },
  { path: 'productos'    , component: ProductosComponent, canActivate: [AuthGuard] },
  { path: 'registro'  , component: RegistroComponent },
  { path: 'login'     , component: LoginComponent },
  { path: '**'  , redirectTo: 'ventas' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
