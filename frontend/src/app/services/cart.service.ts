import { Injectable, computed, signal } from '@angular/core';

export interface CartItem {
    product: any;
    quantity: number;
    restaurantId: string;
}

@Injectable({
    providedIn: 'root'
})
export class CartService {
    // Signals
    cartItems = signal<CartItem[]>([]);

    count = computed(() => this.cartItems().reduce((acc, item) => acc + item.quantity, 0));
    total = computed(() => this.cartItems().reduce((acc, item) => acc + (item.quantity * item.product.price), 0));

    constructor() {
        // Load from localStorage if exists
        const stored = localStorage.getItem('cart');
        if (stored) {
            this.cartItems.set(JSON.parse(stored));
        }
    }

    addToCart(product: any, restaurantId: string) {
        this.cartItems.update(items => {
            const existing = items.find(i => i.product.id === product.id);
            if (existing) {
                // Return new array with updated item
                return items.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            // Add new item
            return [...items, { product, quantity: 1, restaurantId }];
        });
        this.saveCart();
    }

    removeFromCart(productId: string) {
        this.cartItems.update(items => {
            const existing = items.find(i => i.product.id === productId);
            if (existing && existing.quantity > 1) {
                return items.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
            }
            // Remove item if quantity becomes 0
            return items.filter(i => i.product.id !== productId);
        });
        this.saveCart();
    }

    getQuantity(productId: string): number {
        const item = this.cartItems().find(i => i.product.id === productId);
        return item ? item.quantity : 0;
    }

    clearCart() {
        this.cartItems.set([]);
        this.saveCart();
    }

    private saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cartItems()));
    }
}
