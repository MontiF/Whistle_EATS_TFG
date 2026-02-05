import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
    selector: 'app-client-orders',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './client-orders.html',
    styleUrl: './client-orders.css'
})
export class ClientOrdersComponent implements OnInit {
    private orderService = inject(OrderService);
    private supabaseService = inject(SupabaseService);
    private cdr = inject(ChangeDetectorRef);

    orders: any[] = [];
    loading = true;


    showRatingModal = false;
    selectedOrder: any = null;
    currentRating = 0;

    // Carga los pedidos del cliente al iniciar
    async ngOnInit() {
        try {
            const user = await this.supabaseService.getUser();
            if (user) {
                const { data, error } = await this.orderService.getClientOrders(user.id);
                if (data) {
                    this.orders = data;
                } else {
                    console.error('Error fetching client orders:', error);
                }
            }
        } catch (error) {
            console.error('Error in ClientOrdersComponent:', error);
        } finally {
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    // Abre el modal de valoración para un pedido
    openRating(order: any) {
        this.selectedOrder = order;
        this.currentRating = 0;
        this.showRatingModal = true;
    }

    // Cierra el modal de valoración y reinicia el estado
    closeRating() {
        this.showRatingModal = false;
        this.selectedOrder = null;
        this.currentRating = 0;
    }

    // Establece la puntuación actual seleccionada
    setRating(rating: number) {
        this.currentRating = rating;
    }

    isSubmitting = false;

    // Envía la valoración del pedido y lo elimina de la lista localmente mientras se procesa en segundo plano
    async submitRating() {
        if (!this.selectedOrder || this.currentRating === 0 || this.isSubmitting) return;


        const restaurantId = this.selectedOrder.restaurantid_id;
        const orderId = this.selectedOrder.id;
        const rating = this.currentRating;



        this.orders = this.orders.filter(o => o.id !== orderId);


        // Cerramos modal y mostramos alerta inmediatamente
        this.closeRating();


        setTimeout(() => alert('¡Gracias por tu valoración!'), 10);



        // Procesamos la lógica pesada (API calls) en segundo plano
        this.processRatingInBackground(restaurantId, orderId, rating);
    }

    // Procesa la valoración y la eliminación del pedido en la base de datos
    async processRatingInBackground(restaurantId: string, orderId: string, rating: number) {
        try {

            // 1. Calificamos al restaurante
            const { success: rateSuccess, error: rateError } = await this.supabaseService.rateRestaurant(restaurantId, rating);
            if (!rateSuccess) throw rateError;


            // 2. Si hubo éxito, eliminamos el pedido del listado
            const { success: deleteSuccess, error: deleteError } = await this.orderService.deleteOrder(orderId);
            if (!deleteSuccess) throw deleteError;


        } catch (error) {
            console.error('Background rating/deletion failed:', error);

        }
    }
}
