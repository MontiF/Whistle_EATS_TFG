
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

                // Create Order
                const { error: orderError } = await this.supabase
                    .from('my_bookshop_orders')
                    .insert({
                        id: orderId,
                        clientid_id: userId, // Assuming current user is client
                        restaurantid_id: restaurantId,
                        totalamount: totalAmount,
                        status: 'pendiente_de_aceptacion'
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
}
