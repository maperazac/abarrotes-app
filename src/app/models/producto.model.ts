

export class ProductoModel {
    sku: string;
    codigoDeBarras: string;
    descripcion: string;
    seVende: number;
    precioCosto: number;
    ganancia: number;
    precioVenta: number;
    precioMayoreo: number;
    departamento: string;

    constructor () {
        this.departamento = "0";
        this.seVende = 1;
    }
}