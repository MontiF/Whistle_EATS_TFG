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

    // Inicia sesión con email y contraseña, verificando las credenciales en la base de datos
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


    // Registra un nuevo usuario en el sistema a través de la API
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

    // Cierra la sesión del usuario actual
    async signOut() {
        localStorage.removeItem('currentUser');
        return await this.supabase.auth.signOut();
    }

    // Obtiene el usuario autenticado actualmente
    async getUser(): Promise<any | null> {

        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            return JSON.parse(storedUser);
        }


        const { data } = await this.supabase.auth.getUser();
        return data.user;
    }

    //Obtiene el nombre del usuario
    async getUserName(userId: string): Promise<string | null> {
        try {
            const response: any = await this.http.get(`${environment.apiUrl}/Users/${userId}`).toPromise();
            return response?.name || null;
        } catch (err: any) {
            return null;
        }
    }

    // Obtiene el rol y estado de contratación del usuario
    async getUserRole(userId: string): Promise<{ data: any, error: any }> {
        try {
            // 1. Obtenemos el usuario base
            const user: any = await this.http.get(`${environment.apiUrl}/Users/${userId}`).toPromise();

            if (!user) return { data: null, error: 'Usuario no encontrado' };

            const role = user.role;
            let hired = false;

            if (role === 'repartidor') {
                try {
                    // OData filter para buscar por userId_ID
                    const drivers: any = await this.http.get(`${environment.apiUrl}/Drivers?$filter=userID_ID eq ${userId}`).toPromise();
                    if (drivers?.value?.length > 0) {
                        hired = drivers.value[0].hired;
                    }
                } catch (e) { console.warn('Driver check failed', e); }

            } else if (role === 'local') {
                try {
                    const restaurants: any = await this.http.get(`${environment.apiUrl}/Restaurants?$filter=userID_ID eq ${userId}`).toPromise();
                    if (restaurants?.value?.length > 0) {
                        hired = restaurants.value[0].hired;
                    }
                } catch (e) { console.warn('Restaurant check failed', e); }

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
    // Obtiene la calificación (estrellas) actual de un restaurante
    async getRestaurantStars(restaurantId: string) {
        try {
            const response: any = await this.http.get(`${environment.apiUrl}/Restaurants/${restaurantId}`).toPromise();

            if (!response) throw new Error('Restaurante no encontrado');

            return { data: { stars: response.stars }, error: null };
        } catch (err: any) {
            return { data: null, error: err };
        }
    }

    // Obtiene el perfil completo de un restaurante usando el ID de usuario
    async getRestaurantProfile(userId: string) {
        try {
            // Buscamos el restaurante por userID_ID
            const response: any = await this.http.get(`${environment.apiUrl}/Restaurants?$filter=userID_ID eq ${userId}`).toPromise();

            if (!response?.value?.length) {
                return { data: null, error: 'Restaurante no encontrado' };
            }

            const restaurantData = response.value[0];

            // Obtenemos el nombre del usuario dueño
            const user: any = await this.http.get(`${environment.apiUrl}/Users/${userId}`).toPromise();

            return {
                data: { ...restaurantData, name: user?.name || '' },
                error: null
            };
        } catch (error: any) {
            return { data: null, error };
        }
    }

    // Obtiene la lista de productos de un restaurante específico
    async getRestaurantProducts(restaurantId: string) {
        try {
            const response: any = await this.http.get(`${environment.apiUrl}/Products?$filter=restaurantId_ID eq ${restaurantId}`).toPromise();
            return { data: response.value, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    // Añade un nuevo producto al catálogo
    async addProduct(product: {
        name: string,
        description: string,
        price: number,
        imageUrl: string,
        restaurantId: string,
        type: string
    }) {
        const payload = {
            ID: crypto.randomUUID(),
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.imageUrl,
            restaurantId_ID: product.restaurantId,
            type: product.type
        };

        return await this.http.post(`${environment.apiUrl}/Products`, payload).toPromise();
    }

    // Obtiene todos los restaurantes registrados
    async getAllRestaurants() {
        try {
            // Usamos $expand para traer el usuario asociado y obtener su nombre
            const response: any = await this.http.get(`${environment.apiUrl}/Restaurants?$filter=hired eq true&$expand=userID`).toPromise();

            if (!response?.value) {
                return { data: [], error: null };
            }

            const mappedData = response.value.map((r: any) => ({
                ...r,
                name: r.userID?.name || 'Unknown Restaurant'
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
    // Obtiene el ID del conductor asociado a un usuario
    async getDriverId(userId: string): Promise<string | null> {
        try {
            const response: any = await this.http.get(`${environment.apiUrl}/Drivers?$filter=userID_ID eq ${userId}`).toPromise();
            if (response?.value?.length > 0) {
                return response.value[0].ID;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    // Actualiza la calificación de un restaurante con una nueva valoración
    async rateRestaurant(restaurantId: string, rating: number): Promise<{ success: boolean; error?: any }> {
        try {
            const payload = { restaurantId, rating };
            // Llamamos a la Acción del backend
            await this.http.post(`${environment.apiUrl}/rateRestaurant`, payload).toPromise();
            return { success: true };
        } catch (error) {
            console.error('Error rating restaurant:', error);
            return { success: false, error };
        }
    }
    // Actualiza los datos de un producto existente
    async updateProduct(product: any) {
        const updateData = {
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.imageUrl,
            type: product.type
        };

        return await this.http.patch(`${environment.apiUrl}/Products/${product.id}`, updateData).toPromise();
    }

    // Elimina un producto del catálogo
    async deleteProduct(productId: string) {
        return await this.http.delete(`${environment.apiUrl}/Products/${productId}`).toPromise();
    }

    // Subir foto de producto al bucket 'products' y devuelve la URL pública
    async uploadProductImage(file: File, filePath: string): Promise<{ data: { publicUrl: string } | null, error: any }> {
        const { data, error } = await this.supabase.storage
            .from('products')
            .upload(filePath, file, {
                upsert: true
            });

        if (error) {
            return { data: null, error };
        }

        const { data: urlData } = this.supabase.storage
            .from('products')
            .getPublicUrl(filePath);

        return { data: { publicUrl: urlData.publicUrl }, error: null };
    }

    // Elimina una imagen del bucket 'products'
    async deleteProductImage(imageUrl: string) {
        try {
            // Extraer el path del archivo de la URL
            const url = new URL(imageUrl);
            const pathParts = url.pathname.split('/products/');
            if (pathParts.length < 2) return;

            const filePath = pathParts[1];

            const { error } = await this.supabase.storage
                .from('products')
                .remove([filePath]);

            if (error) {
                console.error('Error deleting image:', error);
            }
        } catch (e) {
            console.error('Error parsing image URL:', e);
        }
    }
}
