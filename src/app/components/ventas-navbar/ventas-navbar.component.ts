import { Component, OnInit, Output } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { VentasService } from 'src/app/services/ventas.service';

@Component({
  selector: 'app-ventas-navbar',
  templateUrl: './ventas-navbar.component.html',
  styleUrls: ['./ventas-navbar.component.scss']
})
export class VentasNavbarComponent implements OnInit {

  @Output()
  evento = new EventEmitter<number>();
  botonSeleccionado = 0;
  idVentaActiva;

  constructor(private ventasService: VentasService) { }

  ngOnInit() {
    this.ventasService.$idVentaActiva.subscribe((id) => {
      this.idVentaActiva = id;
      // console.log("Venta activa:" ,this.idVentaActiva)
    })  
  }

  emitirEvento(evento: number) {
    this.botonSeleccionado = evento;
    this.evento.emit(this.botonSeleccionado)
  }
}
