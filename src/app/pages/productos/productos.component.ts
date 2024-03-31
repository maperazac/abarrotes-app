import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.scss']
})
export class ProductosComponent implements OnInit {
  botonSeleccionado = 1;
  id: number;
  private sub: any;

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.sub = this.route.params.subscribe(params => {
      // debugger;
      this.id = +params['id']; // (+) converts string 'id' to a number

      if(!Number.isNaN(this.id)) {
        this.botonSeleccionado = 2;
        setTimeout(() => {
          // this.botonSeleccionado.emit(2)
        }, 100);
      } else {
        // setTimeout(() => {
        //   this.botonSeleccionado.emit(1)
        // }, 100);
      }
   });
  }

  procesarEvento(id: number) {
    this.botonSeleccionado = id;
  }
}
