import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
    selector: 'app-restaurant-orders',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './restaurant-orders.html',
    styleUrl: './restaurant-orders.css'
})
export class RestaurantOrdersComponent implements OnInit {
    private orderService = inject(OrderService);
    private supabaseService = inject(SupabaseService);
    private cdr = inject(ChangeDetectorRef);

    orders: any[] = [];
    loading = true;
    currentRestaurantId = '';

    async ngOnInit() {

        try {
            const user = await this.supabaseService.getUser();

            if (user) {
                const { data: profile, error } = await this.supabaseService.getRestaurantProfile(user.id);

                if (profile) {
                    this.currentRestaurantId = profile.id || profile.ID;

                    this.loadOrders(this.currentRestaurantId);
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

    async loadOrders(restaurantId: string) {

        this.loading = true;
        const { data, error } = await this.orderService.getRestaurantOrders(restaurantId);

        if (data) {
            this.orders = data;
        } else {
            console.error('Error loading orders:', error);
        }
        this.loading = false;
        this.cdr.detectChanges();
    }

    refreshOrders() {
        if (this.currentRestaurantId) {
            this.loadOrders(this.currentRestaurantId);
        }
    }

    async verifyOrder(order: any) {
        if (!order.verificationCode || order.verificationCode.length !== 4) {
            alert('El código debe tener 4 números');
            return;
        }

        const { success, error } = await this.orderService.verifyOrderCode(order.id, parseInt(order.verificationCode));

        if (success) {
            alert(`Código Correcto: ${order.verificationCode}`);
            this.refreshOrders();
        } else {
            alert('Código Incorrecto');
        }
    }
}
