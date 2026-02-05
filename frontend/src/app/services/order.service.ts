
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

    async createOrder(cartItems: CartItem[], userId: string): Promise<{ success: boolean; error?: any }> {
        if (!cartItems.length || !userId) {
            return { success: false, error: 'No items or user' };
        }

        // 1. Group items by restaurant
        const orderGroups = new Map<string, CartItem[]>();
        cartItems.forEach(item => {
            const rid = item.restaurantId;
            if (!orderGroups.has(rid)) {
                orderGroups.set(rid, []);
            }
            orderGroups.get(rid)?.push(item);
        });

        try {
            // 2. Process each restaurant order
            for (const [restaurantId, items] of orderGroups) {
                const totalAmount = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
                const orderId = crypto.randomUUID();
                // Generar código entre 1000 y 9999 (inclusive)
                const codeVerificationlocal = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
                const codeVerificationClient = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;


                // Create Order
                const { error: orderError } = await this.supabase
                    .from('my_bookshop_orders')
                    .insert({
                        id: orderId,
                        clientid_id: userId, // Assuming current user is client
                        restaurantid_id: restaurantId,
                        totalamount: totalAmount,
                        status: 'pendiente_de_aceptacion',
                        codeverificationlocal: codeVerificationlocal,
                        codeverificationclient: codeVerificationClient,
                    });

                if (orderError) throw orderError;

                // Create Order Items
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

    async getPendingOrders() {
        try {
            console.log('Fetching pending orders...');
            // 1. Get orders
            const { data: orders, error: ordersError } = await this.supabase
                .from('my_bookshop_orders')
                .select('*')
                .eq('status', 'pendiente_de_aceptacion');

            if (ordersError) {
                console.error('Error fetching orders table:', ordersError);
                throw ordersError;
            }

            console.log('Orders found:', orders);

            if (!orders || orders.length === 0) return { data: [], error: null };

            // 2. Enhance with Restaurant Info
            const restaurantIds = [...new Set(orders.map((o: any) => o.restaurantid_id))];
            const { data: restaurants, error: restError } = await this.supabase
                .from('my_bookshop_restaurants')
                .select('*')
                .in('id', restaurantIds);

            if (restError) throw restError;

            // 3. Enhance with Restaurant User Names (to show readable name)
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

            // 4. Enhance with Client info (address)
            // Note: client address is in my_bookshop_Clients linked by clientId_ID -> UserID... 
            // Actually Order has clientId_ID which is the UserID of the client.
            // Client Address is in Clients table.
            const clientUserIds = [...new Set(orders.map((o: any) => o.clientid_id))];

            // Get Clients table entry to get defaultAddress
            // But wait, the order might not have address snapshot. Ideally it should. 
            // For now let's try to get address from Clients table using the User ID.
            const { data: clients, error: clientError } = await this.supabase
                .from('my_bookshop_clients')
                .select('*')
                .in('userid_id', clientUserIds); // Assuming clientId_ID in Order is actually User ID.

            // Map client addresses
            const clientMap = new Map(clients?.map((c: any) => [c.userid_id, c.defaultaddress]));

            const enrichedOrders = orders.map((o: any) => ({
                ...o,
                restaurant: restaurantMap.get(o.restaurantid_id),
                deliveryAddress: clientMap.get(o.clientid_id) || 'Dirección no disponible'
            }));

            console.log('Enriched Orders:', enrichedOrders);

            return { data: enrichedOrders, error: null };
        } catch (error) {
            console.error('Error fetching pending orders:', error);
            return { data: null, error };
        }
    }

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

    async getActiveOrder(driverId: string) {
        try {
            console.log('Checking for active order...');
            const { data: orders, error } = await this.supabase
                .from('my_bookshop_orders')
                .select('*')
                .eq('driverid_id', driverId)
                .in('status', ['en_camino', 'recogido'])
                .maybeSingle();

            if (error) throw error;
            if (!orders) return { data: null, error: null };

            const order = orders;

            // Enrich with restaurant info
            const { data: restaurant, error: restError } = await this.supabase
                .from('my_bookshop_restaurants')
                .select('*')
                .eq('id', order.restaurantid_id)
                .single();

            if (restError) throw restError;

            // Enrich with Restaurant User Name
            const { data: resUser, error: resUserError } = await this.supabase
                .from('my_bookshop_users')
                .select('name')
                .eq('id', restaurant.userid_id)
                .single();

            if (resUserError) throw resUserError;

            // Enrich with Client info (address)
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

    async getRestaurantOrders(restaurantId: string) {
        try {
            console.log('Fetching orders for restaurant:', restaurantId);
            const { data: orders, error } = await this.supabase
                .from('my_bookshop_orders')
                .select('*')
                .eq('restaurantid_id', restaurantId)
                .eq('status', 'en_camino')
                .order('id', { ascending: false });

            if (error) throw error;

            if (!orders || orders.length === 0) return { data: [], error: null };

            // Enrich with Client info (address)
            const clientUserIds = [...new Set(orders.map((o: any) => o.clientid_id))];
            const { data: clients, error: clientError } = await this.supabase
                .from('my_bookshop_clients')
                .select('*')
                .in('userid_id', clientUserIds);

            if (clientError) console.warn('Error fetching clients for restaurant orders', clientError);

            const clientMap = new Map(clients?.map((c: any) => [c.userid_id, c]));

            // Enrich with Order Items
            const orderIds = orders.map((o: any) => o.id);
            const { data: orderItems, error: itemsError } = await this.supabase
                .from('my_bookshop_orderitems')
                .select('*')
                .in('orderid_id', orderIds);

            if (itemsError) console.warn('Error fetching items for restaurant orders', itemsError);

            if (orderItems && orderItems.length > 0) {
                // Manually fetch products to avoid Join 400 error
                const productIds = [...new Set(orderItems.map((i: any) => i.productid_id))];
                const { data: products, error: productsError } = await this.supabase
                    .from('my_bookshop_products')
                    .select('*')
                    .in('id', productIds);

                if (productsError) console.warn('Error fetching products for items', productsError);

                const productsMap = new Map(products?.map((p: any) => [p.id, p]));

                // Attach product to item
                orderItems.forEach((item: any) => {
                    item.product = productsMap.get(item.productid_id) || { name: 'Unknown Product', price: 0 };
                });
            }

            // Group items by order
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
    async verifyOrderCode(orderId: string, inputCode: number): Promise<{ success: boolean; error?: any }> {
        try {
            console.log('Verifying code in DB for order:', orderId);
            const { data, error } = await this.supabase
                .from('my_bookshop_orders')
                .select('codeverificationlocal')
                .eq('id', orderId)
                .single();

            if (error) throw error;

            if (data && data.codeverificationlocal == inputCode) {
                // Update status to 'recogido'
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
    async verifyDeliveryCode(orderId: string, inputCode: number): Promise<{ success: boolean; error?: any }> {
        try {
            console.log('Verifying client code in DB for order:', orderId);
            const { data, error } = await this.supabase
                .from('my_bookshop_orders')
                .select('codeverificationclient')
                .eq('id', orderId)
                .single();

            if (error) throw error;

            if (data && data.codeverificationclient == inputCode) {
                // Update status to 'entregado'
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
}
