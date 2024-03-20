import { Component, OnInit, Output } from '@angular/core';
import { EventEmitter } from '@angular/core';

@Component({
  selector: 'app-ventas-navbar',
  templateUrl: './ventas-navbar.component.html',
  styleUrls: ['./ventas-navbar.component.scss']
})
export class VentasNavbarComponent implements OnInit {

  @Output()
  evento = new EventEmitter<number>();
  botonSeleccionado = 0;

  constructor() { }

  ngOnInit(): void {
  }

  emitirEvento(evento: number) {
    this.botonSeleccionado = evento;
    this.evento.emit(this.botonSeleccionado)
  }

}
