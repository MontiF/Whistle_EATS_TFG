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
        return await this.supabase.auth.signInWithPassword({
            email,
            password,
        });
    }

    async signOut() {
        return await this.supabase.auth.signOut();
    }

    async getUser(): Promise<User | null> {
        const { data } = await this.supabase.auth.getUser();
        return data.user;
    }
}
