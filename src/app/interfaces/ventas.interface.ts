import { Timestamp } from "@angular/fire/firestore";

export default interface VentaInterface {
    id?: string;
    idTemp?: number;
    nombre?: string; // Nombre temporal para identificar la venta en las pestañas (no se guarda en BD, solo para UI)
    fechaVentaIniciada: Timestamp;
    fechaVentaFinalizada?: Timestamp;
    total: string; // Es la cantidad total de la venta, el ingreso neto.
    totalArticulos: string; // Articulos vendidos en esta venta. En otra tabla (detalleVentas) se va a registrar producto por producto asociado a cada venta.
    formaDePago: number; // 1 = efectivo, 2 = credito(fiado) Crear una tabla con los tipos de pago aceptados (efectivo, credito(fiado), tarjeta, etc)
    totalPagadoEfectivo: string;
    totalPagadoCredito: string; // cuando es fiado
    cambio: string; // El dinero que se le dio de cambio al cliente, se calcula restando el pagoCon - totalVenta
    idCliente?: string; // solo se registra si fue venta a crédito(fiado), si no fue fiado se le pone en 0
    pagoCon?: string; // Cantidad en efectivo que el cliente entrega al pagar, puede ser mayor que el total de la venta, por ejemplo si fueron 167 y paga con un billete de 200. Si fue venta a credito (fiado) se manda en 0.
    idCajero: string; // registrar el id del cajero que estaba logueado cuando se registró esta venta
    status: string; // el id de status de la venta (0 = en curso, 1 = completada, 2 = cancelada)
    seleccionada?: number; // indica con el 1 la venta que esta en pantalla al momento de cambiarse de pestañas, al volver a "ventas" se va a mostrar la venta que estaba. Al guardar la venta, este campo no se manda
    posicion?: string; // Es el orden o posicion en que se muestra cada tab en la interfaz. Sirve para que cuando se elimine un tab, las demas conserven su nombre de tab, usando el orden en el que fueron creadas.
    detalleProductos?: DetalleProducto[];
}

export interface DetalleProducto {
    cantidad: string;
    descripcion: string; 
    id: string;
    precioVenta: string;
    codigoDeBarras: string;
    departamento: string;
    importe: string;
    seVende: number; // 1 = por unidad, 2 = por kilo/peso
}