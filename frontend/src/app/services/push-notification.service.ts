import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { SupabaseService } from './supabase.service';

export interface PushDiagnostic {
    status: string;
    details?: string;
    httpError?: any;
}

@Injectable({
    providedIn: 'root'
})
export class PushNotificationService {
    private swPush: any = inject(SwPush);
    private http = inject(HttpClient);
    private supabaseService = inject(SupabaseService);

    async subscribeToNotifications(): Promise<PushDiagnostic> {
        try {
            console.log('--- DIAGNÓSTICO FRONTEND: INICIO ---');

            if (!this.swPush.isEnabled) {
                console.error('Service Worker / Push no habilitado');
                return { status: 'Service Worker o Push inactivo en este navegador' };
            }

            const subscription: any = await this.swPush.requestSubscription({
                serverPublicKey: environment.vapidPublicKey
            });

            console.log('Suscripción obtenida del navegador:', subscription);

            await this.saveSubscriptionToBackend(subscription);

            console.log('Suscripción guardada en backend con éxito');
            return { status: 'OK' };

        } catch (err: any) {
            console.error('Error detallado en el ciclo de suscripción:', err);

            const diagnostic: PushDiagnostic = {
                status: 'Error en proceso',
                details: err.message || 'Sin mensaje'
            };

            if (err.status) {
                diagnostic.httpError = {
                    status: err.status,
                    message: err.message,
                    error: err.error
                };
            }

            return diagnostic;
        }
    }

    private async saveSubscriptionToBackend(subscription: any) {
        const user = await this.supabaseService.getUser();
        if (!user) throw new Error('Usuario no identificado');

        const subJson = subscription.toJSON();

        // Formato exacto que espera la entidad en la DB
        const payload = {
            ID: crypto.randomUUID(), // Generamos un UUID nuevo para el registro
            userId_ID: user.id,
            endpoint: subJson.endpoint,
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth
        };

        console.log('Enviando POST directo a la entidad PushSubscriptions:', payload);
        return this.http.post(`${environment.apiUrl}/PushSubscriptions`, payload).toPromise();
    }

    // Método para probar notificaciones desde el backend
    async sendTestNotification() {
        const user = await this.supabaseService.getUser();
        if (!user) throw new Error('Usuario no identificado');

        console.log('Solicitando test de notificación al backend...');
        return this.http.post(`${environment.apiUrl}/sendTestNotification`, { userId: user.id }).toPromise();
    }
}
