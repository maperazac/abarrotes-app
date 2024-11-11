import { Component, Input, OnInit, Output } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-productos-navbar',
  templateUrl: './productos-navbar.component.html',
  styleUrls: ['./productos-navbar.component.scss']
})
export class ProductosNavbarComponent implements OnInit {
  @Input() botonSeleccionado
  @Output()
  evento = new EventEmitter<number>();
  // botonSeleccionado = 1;

  constructor(private router: Router) { }

  ngOnInit(): void {
    // console.log("boton seleccionado en productos-navbar: ", this.botonSeleccionado)
  }

  emitirEvento(evento: number) {
    this.botonSeleccionado = evento;
    this.evento.emit(this.botonSeleccionado)
  }

  navegarProductos(elem) {
    this.router.navigateByUrl("/productos")
    // setTimeout(() => {
      if(this.botonSeleccionado != elem) {
        this.botonSeleccionado = elem;
        this.evento.emit(this.botonSeleccionado)
      }
    // }, 500);
  }
}
