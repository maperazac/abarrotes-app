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
    inventario?: number; // Cantidad disponible en inventario
    cantidad?: number;
    departamentoNombre?: string; 
    ventaId?: number; // Este se va a usar para guardar localmente los productos ligados a una venta local, antes de guardarse. Al guardar, este id se va a obtener una vez que se guarde la venta en base de datos y se regrese el id, se va a asignar a todos los productos que pertenecen a esa venta.
    importe?: number; // Se usa durante la venta activa, cuando se agrega un producto a la venta, aqui se guarda el importe de este producto en esa venta.
}