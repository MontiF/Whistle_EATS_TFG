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
        return await this.supabase.auth.signOut();
    }

    async getUser(): Promise<User | null> {
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
}
