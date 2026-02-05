
import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { CartItem } from './cart.service';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private supabase: SupabaseClient;

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



                const { error: orderError } = await this.supabase
                    .from('my_bookshop_orders')
                    .insert({
                        id: orderId,
                        clientid_id: userId,
                        restaurantid_id: restaurantId,
                        totalamount: totalAmount,
                        status: 'pendiente_de_aceptacion',
                        codeverificationlocal: codeVerificationlocal,
                        codeverificationclient: codeVerificationClient,
                    });

                if (orderError) throw orderError;


                const orderItemsData = items.map(item => ({
                    id: crypto.randomUUID(),
                    orderid_id: orderId,
                    productid_id: item.product.id,
                    quantity: item.quantity,
                    unitprice: item.product.price,
                    subtotal: item.product.price * item.quantity
                }));

                const { error: itemsError } = await this.supabase
                    .from('my_bookshop_orderitems')
                    .insert(orderItemsData);

                if (itemsError) throw itemsError;
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


            const { data: orders, error: ordersError } = await this.supabase
                .from('my_bookshop_orders')
                .select('*')
                .eq('status', 'pendiente_de_aceptacion');

            if (ordersError) {
                console.error('Error fetching orders table:', ordersError);
                throw ordersError;
            }



            if (!orders || orders.length === 0) return { data: [], error: null };


            const restaurantIds = [...new Set(orders.map((o: any) => o.restaurantid_id))];
            const { data: restaurants, error: restError } = await this.supabase
                .from('my_bookshop_restaurants')
                .select('*')
                .in('id', restaurantIds);

            if (restError) throw restError;


            const restaurantUserIds = restaurants?.map((r: any) => r.userid_id) || [];
            const { data: users, error: userError } = await this.supabase
                .from('my_bookshop_users')
                .select('id, name')
                .in('id', restaurantUserIds);

            if (userError) throw userError;

            const userMap = new Map(users?.map((u: any) => [u.id, u.name]));
            const restaurantMap = new Map(restaurants?.map((r: any) => [
                r.id,
                { ...r, name: userMap.get(r.userid_id) || 'Unknown Restaurant' }
            ]));


            const clientUserIds = [...new Set(orders.map((o: any) => o.clientid_id))];


            const { data: clients, error: clientError } = await this.supabase
                .from('my_bookshop_clients')
                .select('*')
                .in('userid_id', clientUserIds);


            const clientMap = new Map(clients?.map((c: any) => [c.userid_id, c.defaultaddress]));

            const enrichedOrders = orders.map((o: any) => ({
                ...o,
                restaurant: restaurantMap.get(o.restaurantid_id),
                deliveryAddress: clientMap.get(o.clientid_id) || 'Dirección no disponible'
            }));



            return { data: enrichedOrders, error: null };
        } catch (error) {
            console.error('Error fetching pending orders:', error);
            return { data: null, error };
        }
    }

    // Permite a un repartidor aceptar un pedido
    async acceptOrder(orderId: string, driverId: string) {
        try {
            const { error } = await this.supabase
                .from('my_bookshop_orders')
                .update({
                    status: 'en_camino',
                    driverid_id: driverId
                })
                .eq('id', orderId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    }

    // Obtiene el pedido activo actual para un repartidor específico
    async getActiveOrder(driverId: string) {
        try {

            const { data: orders, error } = await this.supabase
                .from('my_bookshop_orders')
                .select('*')
                .eq('driverid_id', driverId)
                .in('status', ['en_camino', 'recogido'])
                .maybeSingle();

            if (error) throw error;
            if (!orders) return { data: null, error: null };

            const order = orders;


            const { data: restaurant, error: restError } = await this.supabase
                .from('my_bookshop_restaurants')
                .select('*')
                .eq('id', order.restaurantid_id)
                .single();

            if (restError) throw restError;


            const { data: resUser, error: resUserError } = await this.supabase
                .from('my_bookshop_users')
                .select('name')
                .eq('id', restaurant.userid_id)
                .single();

            if (resUserError) throw resUserError;


            const { data: client, error: clientError } = await this.supabase
                .from('my_bookshop_clients')
                .select('defaultaddress')
                .eq('userid_id', order.clientid_id)
                .single();

            if (clientError) console.warn('Could not fetch client address', clientError);

            const enrichedOrder = {
                ...order,
                restaurant: { ...restaurant, name: resUser.name },
                deliveryAddress: client?.defaultaddress || 'Dirección no disponible'
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

            const { data: orders, error } = await this.supabase
                .from('my_bookshop_orders')
                .select('*')
                .eq('restaurantid_id', restaurantId)
                .eq('status', 'en_camino')
                .order('id', { ascending: false });

            if (error) throw error;

            if (!orders || orders.length === 0) return { data: [], error: null };


            const clientUserIds = [...new Set(orders.map((o: any) => o.clientid_id))];
            const { data: clients, error: clientError } = await this.supabase
                .from('my_bookshop_clients')
                .select('*')
                .in('userid_id', clientUserIds);

            if (clientError) console.warn('Error fetching clients for restaurant orders', clientError);

            const clientMap = new Map(clients?.map((c: any) => [c.userid_id, c]));


            const orderIds = orders.map((o: any) => o.id);
            const { data: orderItems, error: itemsError } = await this.supabase
                .from('my_bookshop_orderitems')
                .select('*')
                .in('orderid_id', orderIds);

            if (itemsError) console.warn('Error fetching items for restaurant orders', itemsError);

            if (orderItems && orderItems.length > 0) {

                const productIds = [...new Set(orderItems.map((i: any) => i.productid_id))];
                const { data: products, error: productsError } = await this.supabase
                    .from('my_bookshop_products')
                    .select('*')
                    .in('id', productIds);

                if (productsError) console.warn('Error fetching products for items', productsError);

                const productsMap = new Map(products?.map((p: any) => [p.id, p]));


                orderItems.forEach((item: any) => {
                    item.product = productsMap.get(item.productid_id) || { name: 'Unknown Product', price: 0 };
                });
            }


            const itemsMap = new Map<string, any[]>();
            orderItems?.forEach((item: any) => {
                if (!itemsMap.has(item.orderid_id)) {
                    itemsMap.set(item.orderid_id, []);
                }
                itemsMap.get(item.orderid_id)?.push(item);
            });

            const enrichedOrders = orders.map((o: any) => {
                const client = clientMap.get(o.clientid_id);
                return {
                    ...o,
                    clientName: client ? 'Cliente' : 'Desconocido',
                    deliveryAddress: client?.defaultaddress || 'Dirección no disponible',
                    items: itemsMap.get(o.id) || []
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

            const { data, error } = await this.supabase
                .from('my_bookshop_orders')
                .select('codeverificationlocal')
                .eq('id', orderId)
                .single();

            if (error) throw error;

            if (data && data.codeverificationlocal == inputCode) {

                // Si coincidimos, actualizamos el estado a 'recogido'
                const { error: updateError } = await this.supabase
                    .from('my_bookshop_orders')
                    .update({ status: 'recogido' })
                    .eq('id', orderId);

                if (updateError) throw updateError;

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

            const { data, error } = await this.supabase
                .from('my_bookshop_orders')
                .select('codeverificationclient')
                .eq('id', orderId)
                .single();

            if (error) throw error;

            if (data && data.codeverificationclient == inputCode) {

                // Si el código es correcto, marcamos como 'entregado'
                const { error: updateError } = await this.supabase
                    .from('my_bookshop_orders')
                    .update({ status: 'entregado' })
                    .eq('id', orderId);

                if (updateError) throw updateError;

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

            const { data: orders, error } = await this.supabase
                .from('my_bookshop_orders')
                .select('*')
                .eq('clientid_id', clientId)
                .order('id', { ascending: false });

            if (error) throw error;

            if (!orders || orders.length === 0) return { data: [], error: null };


            const restaurantIds = [...new Set(orders.map((o: any) => o.restaurantid_id))];
            const { data: restaurants, error: restError } = await this.supabase
                .from('my_bookshop_restaurants')
                .select('*')
                .in('id', restaurantIds);

            if (restError) throw restError;


            const restaurantUserIds = restaurants?.map((r: any) => r.userid_id) || [];
            const { data: users, error: userError } = await this.supabase
                .from('my_bookshop_users')
                .select('id, name')
                .in('id', restaurantUserIds);

            if (userError) throw userError;

            const userMap = new Map(users?.map((u: any) => [u.id, u.name]));
            const restaurantMap = new Map(restaurants?.map((r: any) => [
                r.id,
                { ...r, name: userMap.get(r.userid_id) || 'Unknown Restaurant' }
            ]));

            const enrichedOrders = orders.map((o: any) => ({
                ...o,
                restaurant: restaurantMap.get(o.restaurantid_id),
                statusText: this.getStatusText(o.status)
            }));

            return { data: enrichedOrders, error: null };

        } catch (error) {
            console.error('Error fetching client orders:', error);
            return { data: null, error };
        }
    }

    // Traduce el estado del pedido a un texto legible(quitar las _ y poner espacios)
    private getStatusText(status: string): string {
        switch (status) {
            case 'pendiente_de_aceptacion': return 'Pendiente de aceptación';
            case 'en_camino': return 'En camino';
            case 'recogido': return 'Recogido (¡Verifícame!)';
            case 'entregado': return 'Entregado';
            default: return status;
        }
    }

    // Elimina un pedido y sus detalles de la base de datos
    async deleteOrder(orderId: string): Promise<{ success: boolean; error?: any }> {
        try {



            const { error: itemsError } = await this.supabase
                .from('my_bookshop_orderitems')
                .delete()
                .eq('orderid_id', orderId);

            if (itemsError) throw itemsError;


            const { error: orderError } = await this.supabase
                .from('my_bookshop_orders')
                .delete()
                .eq('id', orderId);

            if (orderError) throw orderError;

            return { success: true };
        } catch (error) {
            console.error('Error deleting order:', error);
            return { success: false, error };
        }
    }
}
