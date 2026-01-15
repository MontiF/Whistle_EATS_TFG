import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    }

    async signIn(email: string, password: string) {
        try {
            const { data, error } = await this.supabase
                .from('my_bookshop_users')
                .select('*')
                .eq('email', email)
                .eq('password', password) // Validating plaintext password as requested
                .single();

            if (error) {
                return { data: { user: null }, error };
            }

            if (!data) {
                return { data: { user: null }, error: { message: 'Credenciales inválidas' } };
            }

            // Map DB user to a structure resembling a Supabase Auth User to keep component compat
            // We treat the DB record itself as the 'user' object
            return { data: { user: data }, error: null };
        } catch (err: any) {
            return { data: { user: null }, error: { message: err.message || 'Error desconocido' } };
        }
    }

    async registerUser(formData: any) {
        const roleMapping: any = {
            'consumer': 'cliente',
            'delivery': 'repartidor',
            'restaurant': 'local'
        };

        const role = roleMapping[formData.userType];

        // 1. Create User (let DB generate ID)
        const { data: userData, error: userError } = await this.supabase
            .from('my_bookshop_users')
            .insert({
                email: formData.email,
                password: formData.password,
                role: role,
                name: formData.consumerName || formData.restaurantName || formData.deliveryName || '',
                phone: formData.phone
            })
            .select()
            .single();

        if (userError) {
            return { error: userError };
        }

        const userId = userData.id;

        // 2. Create Specific Profile
        let profileError = null;

        if (formData.userType === 'consumer') {
            const { error } = await this.supabase
                .from('my_bookshop_clients')
                .insert({
                    userid_id: userId,
                    defaultaddress: formData.consumerAddress
                });
            profileError = error;
        } else if (formData.userType === 'restaurant') {
            const { error } = await this.supabase
                .from('my_bookshop_restaurants')
                .insert({
                    userid_id: userId,
                    cif: formData.cif,
                    address: formData.restaurantAddress
                });
            profileError = error;
        } else if (formData.userType === 'delivery') {
            const { error } = await this.supabase
                .from('my_bookshop_drivers')
                .insert({
                    userid_id: userId,
                    vehicletype: formData.vehicleType,
                    vehicleplate: formData.vehiclePlate,
                    dni: formData.dni,
                    vehiclebrand: formData.vehicleBrand,
                    vehiclemodel: formData.vehicleModel,
                    vehiclecolor: formData.vehicleColor,
                    drivinglicense: formData.drivingLicense
                });
            profileError = error;
        }

        if (profileError) {
            // Optional: Rollback user creation if profile fails
            return { error: profileError };
        }

        return { data: { id: userId }, error: null };
    }

    async signOut() {
        return await this.supabase.auth.signOut();
    }

    async getUser(): Promise<User | null> {
        const { data } = await this.supabase.auth.getUser();
        return data.user;
    }
}
