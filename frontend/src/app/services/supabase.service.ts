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

    async signOut() {
        return await this.supabase.auth.signOut();
    }

    async getUser(): Promise<User | null> {
        const { data } = await this.supabase.auth.getUser();
        return data.user;
    }
}
