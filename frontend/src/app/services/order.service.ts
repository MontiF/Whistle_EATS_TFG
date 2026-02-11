
import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { CartItem } from './cart.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private supabase: SupabaseClient;
    private http = inject(HttpClient);

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    }

    // Crea un nuevo pedido en la base de datos a partir de los items del carrito
    async createOrder(cartItems: CartItem[], userId: string): Promise<{ success: boolean; error?: any }> {
        if (!cartItems.length || !userId) {
            return { success: false, error: 'No items or user' };
        }


        // Agrupamos los items por ID de restaurante
        const orderGroups = new Map<string, CartItem[]>();
        cartItems.forEach(item => {
            const rid = item.restaurantId;
            if (!orderGroups.has(rid)) {
                orderGroups.set(rid, []);
            }
            orderGroups.get(rid)?.push(item);
        });

        try {

            for (const [restaurantId, items] of orderGroups) {
                const totalAmount = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
                const orderId = crypto.randomUUID();

                const codeVerificationlocal = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
                const codeVerificationClient = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;

                // En lugar de usar Supabase directo, usamos el API de CAP (backend)
                // para que el disparador 'after CREATE' se active.
                const orderPayload = {
                    ID: orderId,
                    clientId_ID: userId,
                    restaurantId_ID: restaurantId,
                    totalAmount: totalAmount,
                    status: 'pendiente_de_aceptacion_restaurante',
                    codeVerificationLocal: codeVerificationlocal,
                    codeVerificationClient: codeVerificationClient
                };

                console.log('Creando pedido vía CAP para activar notificaciones:', orderPayload);
                await this.http.post(`${environment.apiUrl}/Orders`, orderPayload).toPromise();

                const orderItemsData = items.map(item => ({
                    ID: crypto.randomUUID(),
                    orderId_ID: orderId,
                    productId_ID: item.product.id,
                    quantity: item.quantity,
                    unitPrice: item.product.price,
                    subtotal: item.product.price * item.quantity
                }));

                console.log('Creando items del pedido vía CAP:', orderItemsData);
                // Insertamos los items uno a uno o como array si el API lo permite
                for (const item of orderItemsData) {
                    await this.http.post(`${environment.apiUrl}/OrderItems`, item).toPromise();
                }
            }

            return { success: true };

        } catch (error) {
            console.error('Error creating order:', error);
            return { success: false, error };
        }
    }

    // Obtiene todos los pedidos pendientes de aceptación
    async getPendingOrders() {
        try {
            // OData: Traemos pedidos, expandiendo el restaurante (y su usuario) y el cliente
            // CAMBIO: restaurant -> restaurantId, client -> clientId
            const response: any = await this.http.get(`${environment.apiUrl}/Orders?$filter=status eq 'pendiente_de_aceptacion_repartidor'&$expand=restaurantId($expand=userID),clientId`).toPromise();

            if (!response?.value) return { data: [], error: null };

            const enrichedOrders = response.value.map((o: any) => ({
                ...o,
                restaurant: {
                    ...o.restaurantId,
                    name: o.restaurantId?.userID?.name || 'Unknown Restaurant'
                },
                // OJO: CDS devuelve camelCase 'defaultAddress'
                deliveryAddress: o.clientId?.defaultAddress || 'Dirección no disponible'
            }));

            return { data: enrichedOrders, error: null };
        } catch (error) {
            console.error('Error fetching pending orders:', error);
            return { data: null, error };
        }
    }
    //Permite al un restaurante aceptar un pedido
    async acceptOrderByRestaurant(orderId: string) {
        try {
            await this.http.patch(`${environment.apiUrl}/Orders/${orderId}`, {
                status: 'pendiente_de_aceptacion_repartidor'
            }).toPromise();
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    }
    //Permite al un restaurante rechazar un pedido
    async rejectOrderByRestaurant(orderId: string) {
        try {
            await this.http.patch(`${environment.apiUrl}/Orders/${orderId}`, {
                status: 'cancelado_por_restaurante'
            }).toPromise();
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    }

    // Permite a un repartidor aceptar un pedido
    async acceptOrderByDriver(orderId: string, driverId: string) {
        try {
            await this.http.patch(`${environment.apiUrl}/Orders/${orderId}`, {
                status: 'en_camino',
                driverId_ID: driverId
            }).toPromise();
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    }

    // Obtiene el pedido activo actual para un repartidor específico
    async getActiveOrder(driverId: string) {
        try {
            // Un repartidor solo puede tener un pedido activo (en_camino o recogido)
            const statusFilter = "(status eq 'en_camino' or status eq 'recogido')";
            // CAMBIO: restaurant -> restaurantId, client -> clientId
            const query = `${environment.apiUrl}/Orders?$filter=driverId_ID eq ${driverId} and ${statusFilter}&$expand=restaurantId($expand=userID),clientId`;

            const response: any = await this.http.get(query).toPromise();

            if (!response?.value?.length) return { data: null, error: null };

            const order = response.value[0];
            const enrichedOrder = {
                ...order,
                restaurant: {
                    ...order.restaurantId,
                    name: order.restaurantId?.userID?.name || 'Unknown Restaurant'
                },
                // Mapear defaultAddress de client o usar string vacío
                deliveryAddress: order.clientId?.defaultAddress || 'Dirección no disponible'
            };

            return { data: enrichedOrder, error: null };
        } catch (error) {
            console.error('Error fetching active order:', error);
            return { data: null, error };
        }
    }

    // Obtiene los pedidos asignados a un restaurante específico
    async getRestaurantOrders(restaurantId: string) {
        try {
            // Filtro complejo: status IN (...) AND restaurantId = ...
            // OData no tiene operador IN nativo en V4 standard simple, se usa (status eq X or status eq Y)
            // O simplemente filtramos por restaurante y luego en cliente filtramos por estado si es más fácil, 
            // pero mejor hacerlo en query.
            const statusFilter = "(status eq 'en_camino' or status eq 'pendiente_de_aceptacion_restaurante' or status eq 'pendiente_de_aceptacion_repartidor')";
            // CAMBIO: client -> clientId, restaurant -> restaurantId($expand=userID)
            const query = `${environment.apiUrl}/Orders?$filter=restaurantId_ID eq ${restaurantId} and ${statusFilter}&$expand=clientId,items($expand=productId),restaurantId($expand=userID)&$orderby=ID desc`;

            const response: any = await this.http.get(query).toPromise();

            if (!response?.value) return { data: [], error: null };

            const enrichedOrders = response.value.map((o: any) => {
                return {
                    ...o,
                    clientName: 'Cliente', // Podríamos expandir User del cliente, pero 'Cliente' vale por ahora
                    deliveryAddress: o.clientId?.defaultAddress || 'Dirección no disponible',
                    items: o.items?.map((i: any) => ({
                        ...i,
                        product: i.productId || { name: 'Producto Eliminado', price: 0 }
                    })) || []
                };
            });

            return { data: enrichedOrders, error: null };

        } catch (error) {
            console.error('Error fetching restaurant orders:', error);
            return { data: null, error };
        }
    }
    // Verifica el código de recogida del pedido (local verifica al repartidor)
    async verifyOrderCode(orderId: string, inputCode: number): Promise<{ success: boolean; error?: any }> {
        try {
            const response: any = await this.http.get(`${environment.apiUrl}/Orders/${orderId}`).toPromise();

            if (response && response.codeVerificationLocal == inputCode) {
                await this.http.patch(`${environment.apiUrl}/Orders/${orderId}`, {
                    status: 'recogido'
                }).toPromise();
                return { success: true };
            } else {
                return { success: false, error: 'Código incorrecto' };
            }
        } catch (error) {
            console.error('Error verifying order code:', error);
            return { success: false, error };
        }
    }
    // Verifica el código de entrega del pedido (cliente verifica al repartidor)
    async verifyDeliveryCode(orderId: string, inputCode: number): Promise<{ success: boolean; error?: any }> {
        try {
            const response: any = await this.http.get(`${environment.apiUrl}/Orders/${orderId}`).toPromise();

            if (response && response.codeVerificationClient == inputCode) {
                await this.http.patch(`${environment.apiUrl}/Orders/${orderId}`, {
                    status: 'entregado'
                }).toPromise();
                return { success: true };
            } else {
                return { success: false, error: 'Código incorrecto' };
            }
        } catch (error) {
            console.error('Error verifying client code:', error);
            return { success: false, error };
        }
    }

    // Obtiene el historial de pedidos de un cliente
    async getClientOrders(clientId: string) {
        try {
            // Traemos pedidos ordenados por ID (tiempo) descendente
            // Expandimos restaurant(con userID para el nombre) e items(con productId)
            // CAMBIO: restaurant -> restaurantId, items(productId)
            const query = `${environment.apiUrl}/Orders?$filter=clientId_ID eq ${clientId}&$expand=restaurantId($expand=userID),items($expand=productId)&$orderby=ID desc`;

            const response: any = await this.http.get(query).toPromise();

            if (!response?.value) return { data: [], error: null };

            const enrichedOrders = response.value.map((o: any) => ({
                ...o,
                restaurantName: o.restaurantId?.userID?.name || 'Unknown Restaurant',
                // Aseguramos estructura compatible con la vista
                restaurant: {
                    ...o.restaurantId,
                    name: o.restaurantId?.userID?.name || 'Unknown Restaurant'
                },
                items: o.items?.map((i: any) => ({
                    ...i,
                    product: i.productId || { name: 'Producto Eliminado', price: 0 }
                })) || [],
                statusText: this.getStatusText(o.status)
            }));

            return { data: enrichedOrders, error: null };
        } catch (error) {
            console.error('Error fetching client orders:', error);
            return { data: null, error };
        }
    }

    // Traduce el estado del pedido a un texto legible(quitar las _ y poner espacios)
    public getStatusText(status: string): string {
        switch (status) {
            case 'pendiente_de_aceptacion_restaurante': return 'Pendiente de aceptación Restaurante';
            case 'pendiente_de_aceptacion_repartidor': return 'Pendiente de aceptación Repartidor';
            case 'en_camino': return 'En camino';
            case 'recogido': return 'Recogido (¡Verifícame!)';
            case 'entregado': return 'Entregado';
            case 'cancelado': return 'Cancelado';
            default: return status;
        }
    }

    // Elimina un pedido y sus detalles de la base de datos
    async deleteOrder(orderId: string): Promise<{ success: boolean; error?: any }> {
        try {
            await this.http.delete(`${environment.apiUrl}/Orders/${orderId}`).toPromise();
            return { success: true };
        } catch (error) {
            console.error('Error deleting order:', error);
            return { success: false, error };
        }
    }
}
