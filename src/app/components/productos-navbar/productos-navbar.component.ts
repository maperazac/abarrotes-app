import { Component, OnInit, Output } from '@angular/core';
import { EventEmitter } from '@angular/core';

@Component({
  selector: 'app-productos-navbar',
  templateUrl: './productos-navbar.component.html',
  styleUrls: ['./productos-navbar.component.scss']
})
export class ProductosNavbarComponent implements OnInit {

  @Output()
  evento = new EventEmitter<number>();
  botonSeleccionado = 1;

  constructor() { }

  ngOnInit(): void {
  }

  emitirEvento(evento: number) {
    this.botonSeleccionado = evento;
    this.evento.emit(this.botonSeleccionado)
  }

}
