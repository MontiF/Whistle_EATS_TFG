import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;
    private http = inject(HttpClient);

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    }

    async signIn(email: string, password: string) {
        try {
            const { data, error } = await this.supabase
                .from('my_bookshop_users')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .single();

            if (error) {
                return { data: { user: null }, error };
            }

            if (!data) {
                return { data: { user: null }, error: { message: 'Credenciales inválidas' } };
            }

            // Persist user session manually since we are using a custom table
            localStorage.setItem('currentUser', JSON.stringify(data));

            return { data: { user: data }, error: null };
        } catch (err: any) {
            return { data: { user: null }, error: { message: err.message || 'Error desconocido' } };
        }
    }

    /**
     * Registro de usuario a través del Backend (SAP CAP)
     */
    async registerUser(formData: any): Promise<{ data?: any, error?: any }> {
        const roleMapping: any = {
            'consumer': 'cliente',
            'delivery': 'repartidor',
            'restaurant': 'local'
        };

        const payload = {
            userData: {
                email: formData.email,
                password: formData.password,
                role: roleMapping[formData.userType],
                name: formData.consumerName || formData.restaurantName || formData.deliveryName || '',
                phone: formData.phone,
                // Campos adicionales según rol
                address: formData.consumerAddress || formData.restaurantAddress || '',
                cif: formData.cif || '',
                vehicleType: formData.vehicleType || '',
                vehiclePlate: formData.vehiclePlate || '',
                dni: formData.dni || '',
                vehicleBrand: formData.vehicleBrand || '',
                vehicleModel: formData.vehicleModel || '',
                vehicleColor: formData.vehicleColor || '',
                drivingLicense: formData.drivingLicense || ''
            }
        };

        try {
            const response: any = await this.http.post(`${environment.apiUrl}/registerUser`, payload).toPromise();
            return { data: response, error: null };
        } catch (err: any) {
            console.error('Error al llamar al API de registro:', err);
            return {
                error: {
                    message: err.error?.error?.message || 'Error en el servidor al procesar el registro'
                }
            };
        }
    }

    async signOut() {
        localStorage.removeItem('currentUser');
        return await this.supabase.auth.signOut();
    }

    async getUser(): Promise<any | null> {
        // First try to get from localStorage (our custom session)
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            return JSON.parse(storedUser);
        }

        // Fallback to Supabase Auth (though likely not used if we use custom table)
        const { data } = await this.supabase.auth.getUser();
        return data.user;
    }

    /**
     * Obtiene el rol y el estado de contratación de un usuario
     */
    async getUserRole(userId: string): Promise<{ data: any, error: any }> {
        try {
            // Primero obtenemos el usuario y su rol
            const { data: userData, error: userError } = await this.supabase
                .from('my_bookshop_users')
                .select('role')
                .eq('id', userId)
                .single();

            if (userError) return { data: null, error: userError };

            const role = userData.role;
            let hired = false;

            // Según el rol, consultar la tabla correspondiente
            if (role === 'repartidor') {
                const { data: driverData, error: driverError } = await this.supabase
                    .from('my_bookshop_drivers')
                    .select('hired')
                    .eq('userid_id', userId)
                    .single();

                if (!driverError && driverData) {
                    hired = driverData.hired;
                }
            } else if (role === 'local') {
                const { data: restaurantData, error: restaurantError } = await this.supabase
                    .from('my_bookshop_restaurants')
                    .select('hired')
                    .eq('userid_id', userId)
                    .single();

                if (!restaurantError && restaurantData) {
                    hired = restaurantData.hired;
                }
            } else if (role === 'cliente') {
                hired = true; // Los clientes no necesitan ser "contratados"
            }

            return {
                data: { role, hired },
                error: null
            };
        } catch (err: any) {
            return { data: null, error: err };
        }
    }
    async getRestaurantStars(restaurantId: string) {
        try {
            const { data: restaurantData, error: restaurantError } = await this.supabase
                .from('my_bookshop_restaurants')
                .select('stars')
                .eq('id', restaurantId)
                .single();

            if (restaurantError) throw restaurantError;

            return { data: restaurantData, error: null };
        } catch (err: any) {
            return { data: null, error: err };
        }
    }

    async getRestaurantProfile(userId: string) {
        try {
            // 1. Get restaurant details to get the ID
            const { data: restaurantData, error: restaurantError } = await this.supabase
                .from('my_bookshop_restaurants')
                .select('*')
                .eq('userid_id', userId)
                .single();

            if (restaurantError) throw restaurantError;

            // 2. Get the name from the User table
            const { data: userData, error: userError } = await this.supabase
                .from('my_bookshop_users')
                .select('name')
                .eq('id', userId)
                .single();

            if (userError) throw userError;

            return {
                data: { ...restaurantData, name: userData.name },
                error: null
            };
        } catch (error: any) {
            return { data: null, error };
        }
    }

    async getRestaurantProducts(restaurantId: string) {
        return await this.supabase
            .from('my_bookshop_products')
            .select('*')
            .eq('restaurantid_id', restaurantId);
    }

    async addProduct(product: {
        name: string,
        description: string,
        price: number,
        imageUrl: string,
        restaurantId: string,
        type: string
    }) {
        const id = crypto.randomUUID();
        return await this.supabase
            .from('my_bookshop_products')
            .insert({
                id: id,
                name: product.name,
                description: product.description,
                price: product.price,
                imageurl: product.imageUrl,
                restaurantid_id: product.restaurantId,
                type: product.type
            });
    }

    async getAllRestaurants() {
        try {
            // 1. Fetch all restaurants
            const { data: restaurants, error: restError } = await this.supabase
                .from('my_bookshop_restaurants')
                .select('*');

            if (restError) throw restError;

            if (!restaurants || restaurants.length === 0) {
                return { data: [], error: null };
            }

            // 2. Extract user IDs
            // Check casing of userID_ID. Supabase usually returns lowercase `userid_id` or `userID_ID` depending on config.
            // We'll try to find the property that looks like user ID.
            const userIds = restaurants.map((r: any) => r.userid_id || r.userID_ID).filter(id => id);

            if (userIds.length === 0) {
                return { data: restaurants, error: null };
            }

            // 3. Fetch users for these restaurants
            const { data: users, error: userError } = await this.supabase
                .from('my_bookshop_users')
                .select('id, name')
                .in('id', userIds);

            if (userError) throw userError;

            // 4. Create a map of User ID -> Name
            const userMap = new Map();
            users?.forEach((u: any) => userMap.set(u.id, u.name));

            // 5. Merge data
            const mappedData = restaurants.map((r: any) => ({
                ...r,
                name: userMap.get(r.userid_id || r.userID_ID) || 'Unknown Restaurant'
            }));

            return {
                data: mappedData,
                error: null
            };
        } catch (error: any) {
            console.error('Error fetching restaurants:', error);
            return { data: null, error };
        }
    }
    async getDriverId(userId: string): Promise<string | null> {
        const { data, error } = await this.supabase
            .from('my_bookshop_drivers')
            .select('id')
            .eq('userid_id', userId)
            .single();

        if (error || !data) return null;
        return data.id;
    }

    async rateRestaurant(restaurantId: string, rating: number): Promise<{ success: boolean; error?: any }> {
        try {
            // 1. Get current stars
            const { data: currentData, error: fetchError } = await this.supabase
                .from('my_bookshop_restaurants')
                .select('stars')
                .eq('id', restaurantId)
                .single();

            if (fetchError) throw fetchError;

            const currentStars = currentData.stars || 0;

            // 2. Calculate new average (Simplified logic: average of current + new)
            // (Current + New) / 2
            // Example: Current 3, New 5 -> 4
            // Example: Current 4, New 5 -> 4.5 -> Round to 5 (Math.round)
            const average = (currentStars + rating) / 2;
            const newStars = Math.round(average);

            console.log(`Rating Restaurant: Current=${currentStars}, NewRating=${rating}, Avg=${average}, Rounded=${newStars}`);

            // 3. Update restaurant
            const { error: updateError } = await this.supabase
                .from('my_bookshop_restaurants')
                .update({ stars: newStars })
                .eq('id', restaurantId);

            if (updateError) throw updateError;

            return { success: true };

        } catch (error) {
            console.error('Error rating restaurant:', error);
            return { success: false, error };
        }
    }
}
