import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.scss']
})
export class ProductosComponent implements OnInit {
  botonSeleccionado = 1;

  constructor() { }

  ngOnInit(): void {
  }

  procesarEvento(id: number) {
    this.botonSeleccionado = id;
  }

}
