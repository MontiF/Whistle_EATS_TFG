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


            localStorage.setItem('currentUser', JSON.stringify(data));

            return { data: { user: data }, error: null };
        } catch (err: any) {
            return { data: { user: null }, error: { message: err.message || 'Error desconocido' } };
        }
    }


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

        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            return JSON.parse(storedUser);
        }


        const { data } = await this.supabase.auth.getUser();
        return data.user;
    }


    async getUserRole(userId: string): Promise<{ data: any, error: any }> {
        try {

            const { data: userData, error: userError } = await this.supabase
                .from('my_bookshop_users')
                .select('role')
                .eq('id', userId)
                .single();

            if (userError) return { data: null, error: userError };

            const role = userData.role;
            let hired = false;


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
                hired = true;
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

            const { data: restaurantData, error: restaurantError } = await this.supabase
                .from('my_bookshop_restaurants')
                .select('*')
                .eq('userid_id', userId)
                .single();

            if (restaurantError) throw restaurantError;


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

            const { data: restaurants, error: restError } = await this.supabase
                .from('my_bookshop_restaurants')
                .select('*');

            if (restError) throw restError;

            if (!restaurants || restaurants.length === 0) {
                return { data: [], error: null };
            }


            const userIds = restaurants.map((r: any) => r.userid_id || r.userID_ID).filter(id => id);

            if (userIds.length === 0) {
                return { data: restaurants, error: null };
            }


            const { data: users, error: userError } = await this.supabase
                .from('my_bookshop_users')
                .select('id, name')
                .in('id', userIds);

            if (userError) throw userError;


            const userMap = new Map();
            users?.forEach((u: any) => userMap.set(u.id, u.name));


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

            const { data: currentData, error: fetchError } = await this.supabase
                .from('my_bookshop_restaurants')
                .select('stars')
                .eq('id', restaurantId)
                .single();

            if (fetchError) throw fetchError;

            const currentStars = currentData.stars || 0;


            const average = (currentStars + rating) / 2;
            const newStars = Math.round(average);




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
