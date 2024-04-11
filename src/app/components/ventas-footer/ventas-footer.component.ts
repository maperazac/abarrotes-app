import { Component, Input, OnInit } from '@angular/core';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import VentaInterface from 'src/app/interfaces/ventas.interface';
import { VentasService } from 'src/app/services/ventas.service';

@Component({
  selector: 'app-ventas-footer',
  templateUrl: './ventas-footer.component.html',
  styleUrls: ['./ventas-footer.component.scss']
})
export class VentasFooterComponent implements OnInit {

  productosVentaActual: ProductoInterface[];
  cantidadArticulos = 0;
  ventaTotalPesos = 0;

  constructor(private ventasService: VentasService) { 
  }

  ngOnInit(): void {
    this.ventasService.$productosVentaActual.subscribe((valor) => {
      this.productosVentaActual = valor;
      this.cantidadArticulos = 0;
      this.ventaTotalPesos = 0;
      this.productosVentaActual.map(item => {
        this.cantidadArticulos += item.seVende == 2 ? 1 : item.cantidad;
        this.ventaTotalPesos += item.cantidad * item.precioVenta;
      })
    })

  }
}
