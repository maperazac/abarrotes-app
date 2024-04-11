export default interface VentaInterface {
    id?: string;
    fecha: Date;
    totalVenta: string;
    totalArticulos: string;
    tipoPago: number; // 1 = efectivo, 2 = credito(fiado) Crear una tabla con los tipos de pago aceptados (efectivo, credito(fiado), tarjeta, etc)
    totalPagadoEfectivo: string;
    totalPagadoCredito: string; // cuando es fiado
    cambio: string; // El dinero que se le dio de cambio al cliente, se calcula restando el pagoCon - totalVenta
    idCliente: string; // solo se registra si fue venta a crédito(fiado)
    pagoCon: string; // Cantidad en efectivo que el cliente entrega al pagar, puede ser mayor que el total de la venta, por ejemplo si fueron 167 y paga con un billete de 200
    idCajero: string; // registrar el id del cajero que estaba logueado cuando se registró esta venta
    status: string; // el id de status de la venta (1 = en curso, 2 = completada, 3 = cancelada) Crear una tabla con los status de las ventas.
    seleccionada: number; // indica con el 1 la venta que esta en pantalla al momento de cambiarse de pestañas, al volver a "ventas" se va a mostrar la venta que estaba.
}