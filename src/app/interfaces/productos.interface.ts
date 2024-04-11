export default interface ProductoInterface {
    id?: string;
    codigoDeBarras: string;
    descripcion: string;
    seVende: number;
    precioCosto: number;
    ganancia: number;
    precioVenta: number;
    precioMayoreo: number;
    departamento: string;
    cantidad?: number;
    departamentoNombre?: string;
}