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

    // Rating Logic
    showRatingModal = false;
    selectedOrder: any = null;
    currentRating = 0;

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

    openRating(order: any) {
        this.selectedOrder = order;
        this.currentRating = 0;
        this.showRatingModal = true;
    }

    closeRating() {
        this.showRatingModal = false;
        this.selectedOrder = null;
        this.currentRating = 0;
    }

    setRating(rating: number) {
        this.currentRating = rating;
    }

    isSubmitting = false;

    async submitRating() {
        if (!this.selectedOrder || this.currentRating === 0 || this.isSubmitting) return;

        // Capture data for background tasks
        const restaurantId = this.selectedOrder.restaurantid_id;
        const orderId = this.selectedOrder.id;
        const rating = this.currentRating;

        // --- OPTIMISTIC UPDATE START ---
        // 1. Remove from local list immediately
        this.orders = this.orders.filter(o => o.id !== orderId);

        // 2. Close modal immediately
        this.closeRating();

        // 3. Show feedback immediately (using setTimeout to ensure UI updates first)
        setTimeout(() => alert('¡Gracias por tu valoración!'), 10);
        // --- OPTIMISTIC UPDATE END ---

        // 4. Perform operations in background
        this.processRatingInBackground(restaurantId, orderId, rating);
    }

    async processRatingInBackground(restaurantId: string, orderId: string, rating: number) {
        try {
            // Rate Restaurant
            const { success: rateSuccess, error: rateError } = await this.supabaseService.rateRestaurant(restaurantId, rating);
            if (!rateSuccess) throw rateError;

            // Delete Order
            const { success: deleteSuccess, error: deleteError } = await this.orderService.deleteOrder(orderId);
            if (!deleteSuccess) throw deleteError;

            console.log('Background rating and deletion successful for order:', orderId);
        } catch (error) {
            console.error('Background rating/deletion failed:', error);
            // Since we already removed it from UI, we might want to reload or notify user if critical.
            // For this use case, logging is likely sufficient as it's an edge case.
        }
    }
}
