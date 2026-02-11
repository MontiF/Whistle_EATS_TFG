import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { SupabaseService } from '../../services/supabase.service';
import { HttpErrorResponse } from '@angular/common/http';
import { PushNotificationService, PushDiagnostic } from '../../services/push-notification.service';

@Component({
    selector: 'app-restaurant-orders',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './restaurant-orders.html',
    styleUrl: './restaurant-orders.css'
})
export class RestaurantOrdersComponent implements OnInit, OnDestroy {
    private orderService = inject(OrderService);
    private supabaseService = inject(SupabaseService);
    private pushService = inject(PushNotificationService);
    private cdr = inject(ChangeDetectorRef);

    orders: any[] = [];
    loading = true;
    currentRestaurantId = '';
    refreshInterval: any;

    // Inicializa la vista de pedidos del restaurante, cargando el perfil y los pedidos
    async ngOnInit() {

        try {
            const user = await this.supabaseService.getUser();

            if (user) {
                const { data: profile, error } = await this.supabaseService.getRestaurantProfile(user.id);

                if (profile) {
                    this.currentRestaurantId = profile.id || profile.ID;

                    this.loadOrders(this.currentRestaurantId);

                    // Iniciamos el auto-refresco cada 10 segundos
                    this.refreshInterval = setInterval(() => {
                        this.loadOrders(this.currentRestaurantId, true);
                    }, 10000);
                } else {
                    this.loading = false;
                    this.cdr.detectChanges();
                }
            } else {
                this.loading = false;
                this.cdr.detectChanges();
            }
        } catch (error) {
            console.error('Error initializing orders page:', error);
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    // Limpiamos el intervalo al salir del componente
    ngOnDestroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    // Carga los pedidos asociados al restaurante desde el servicio
    async loadOrders(restaurantId: string, silent = false) {

        if (!silent) this.loading = true;
        const { data, error } = await this.orderService.getRestaurantOrders(restaurantId);

        if (data) {
            this.orders = data;
        } else {
            console.error('Error loading orders:', error);
        }
        this.loading = false;
        this.cdr.detectChanges();
    }

    // Recarga la lista de pedidos actual
    refreshOrders() {
        if (this.currentRestaurantId) {
            this.loadOrders(this.currentRestaurantId);
        }
    }

    // Formatea el estado del pedido para mostrarlo de forma legible
    formatStatus(status: string): string {
        return this.orderService.getStatusText(status);
    }

    // Aceptar el pedido
    acceptOrder(order: any) {
        this.orderService.acceptOrderByRestaurant(order.ID).then(() => {
            this.refreshOrders();
        });
    }

    // Rechazar el pedido
    rejectOrder(order: any) {
        this.orderService.rejectOrderByRestaurant(order.ID).then(() => {
            this.refreshOrders();
        });
    }

    // Verifica el código de pedido para confirmar la entrega/recogida
    async verifyOrder(order: any) {
        if (!order.verificationCode || order.verificationCode.length !== 4) {
            alert('El código debe tener 4 números');
            return;
        }

        const { success, error } = await this.orderService.verifyOrderCode(order.ID, parseInt(order.verificationCode));

        if (success) {
            alert(`Código Correcto: ${order.verificationCode}`);
            this.refreshOrders();
        } else {
            alert('Código Incorrecto');
        }
    }

    // Método para suscribirse a notificaciones push
    async subscribeToPush() {
        const result: PushDiagnostic = await this.pushService.subscribeToNotifications();
        if (result.status === 'OK') {
            alert('🔔 ¡Notificaciones activadas con éxito! Ahora enviaré una prueba...');
            // Inmediatamente intentamos enviar una prueba
            this.sendTestNotification();
        } else {
            console.error('DIAGNÓSTICO FALLIDO:', result);
            let msg = `❌ Error: ${result.status}\n`;
            if (result.details) msg += `Detalle: ${result.details}\n`;
            // ... (resto del log de error es igual)
            if (result.httpError) {
                msg += `\n--- DEBUG HTTP ---\n`;
                msg += `Status: ${result.httpError.status}\n`;
                msg += `Msg: ${result.httpError.message}\n`;
                msg += `Body: ${JSON.stringify(result.httpError.error)}\n`;
            }
            msg += `\nPor favor, verifica los Ajustes de la app en Android.`;
            alert(msg);
        }
    }

    // Método para enviar notificación de prueba
    sendTestNotification() {
        this.pushService.sendTestNotification().then((res: any) => {
            if (res.success) {
                alert(`✅ Test enviado. Deberías recibirlo en breve. (Enviados: ${res.count})`);
            } else {
                alert('⚠️ El backend intentó enviar pero algo falló. Revisa la consola del servidor.');
            }
        }).catch(err => {
            console.error('Error test notification:', err);
            alert('❌ Error llamando al test endpoint: ' + (err.message || JSON.stringify(err)));
        });
    }
}
