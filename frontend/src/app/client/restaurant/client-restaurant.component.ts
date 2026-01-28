import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { CartService } from '../../services/cart.service';

@Component({
    selector: 'app-client-restaurant',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './client-restaurant.html',
    styleUrl: './client-restaurant.css'
})
export class ClientRestaurantComponent {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private supabaseService = inject(SupabaseService);
    private cdr = inject(ChangeDetectorRef);
    public cartService = inject(CartService);

    restaurantId = '';
    restaurantName = '';
    restaurantAddress = '';
    restaurantStars = 0;
    productType = 'all';
    searchProduct = '';
    products: any[] = [];

    async ngOnInit() {
        this.restaurantId = this.route.snapshot.paramMap.get('id') || '';
        if (this.restaurantId) {
            this.loadRestaurantData();
        }
    }

    async loadRestaurantData() {
        // Fetch products
        const { data: productsData } = await this.supabaseService.getRestaurantProducts(this.restaurantId);
        if (productsData) {
            this.products = productsData;
        }

        const { data: allRestaurants } = await this.supabaseService.getAllRestaurants();
        const current = allRestaurants?.find((r: any) => r.id === this.restaurantId);
        if (current) {
            console.log('Restaurant Data:', current); // Debug log
            this.restaurantName = current.name;
            this.restaurantAddress = current.address;
            this.restaurantStars = current.stars;
        }

        this.cdr.detectChanges();
    }

    addToCart(product: any) {
        event?.stopPropagation();
        this.cartService.addToCart(product, this.restaurantId);
    }

    removeFromCart(product: any) {
        event?.stopPropagation();
        this.cartService.removeFromCart(product.id);
    }

    getQuantity(productId: string): number {
        return this.cartService.getQuantity(productId);
    }

    goToCheckout() {
        this.router.navigate(['/client/checkout']);
    }
}
