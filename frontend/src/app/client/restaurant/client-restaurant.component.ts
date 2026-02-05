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

    // Inicializa el componente y carga los datos del restaurante
    async ngOnInit() {
        this.restaurantId = this.route.snapshot.paramMap.get('id') || '';
        if (this.restaurantId) {
            this.loadRestaurantData();
        }
    }

    // Obtiene los productos del restaurante y su información detallada
    async loadRestaurantData() {

        const { data: productsData } = await this.supabaseService.getRestaurantProducts(this.restaurantId);
        if (productsData) {
            const typePriority: { [key: string]: number } = {
                'menu': 1,
                'comida': 2,
                'bebida': 3,
                'complemento': 4
            };

            this.products = productsData.sort((a: any, b: any) => {
                const priorityA = typePriority[a.type] || 99;
                const priorityB = typePriority[b.type] || 99;
                return priorityA - priorityB;
            });
        }

        const { data: allRestaurants } = await this.supabaseService.getAllRestaurants();
        const current = allRestaurants?.find((r: any) => r.id === this.restaurantId);
        if (current) {

            this.restaurantName = current.name;
            this.restaurantAddress = current.address;
            this.restaurantStars = current.stars;
        }

        this.cdr.detectChanges();
    }

    // Añade un producto al carrito de compras
    addToCart(product: any) {
        event?.stopPropagation();
        this.cartService.addToCart(product, this.restaurantId);
    }

    // Elimina un producto del carrito
    removeFromCart(product: any) {
        event?.stopPropagation();
        this.cartService.removeFromCart(product.id);
    }

    // Obtiene la cantidad actual de un producto en el carrito
    getQuantity(productId: string): number {
        return this.cartService.getQuantity(productId);
    }

    // Navega a la página de pago
    goToCheckout() {
        this.router.navigate(['/client/checkout']);
    }
}
