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

    cartItems = signal<CartItem[]>([]);

    count = computed(() => this.cartItems().reduce((acc, item) => acc + item.quantity, 0));
    total = computed(() => this.cartItems().reduce((acc, item) => acc + (item.quantity * item.product.price), 0));

    constructor() {

        const stored = localStorage.getItem('cart');
        if (stored) {
            this.cartItems.set(JSON.parse(stored));
        }
    }

    // Añade un producto al carrito o incrementa su cantidad si ya existe
    addToCart(product: any, restaurantId: string) {
        this.cartItems.update(items => {
            const existing = items.find(i => i.product.id === product.id);
            if (existing) {

                return items.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }

            return [...items, { product, quantity: 1, restaurantId }];
        });
        this.saveCart();
    }

    // Elimina un producto del carrito o decrementa su cantidad
    removeFromCart(productId: string) {
        this.cartItems.update(items => {
            const existing = items.find(i => i.product.id === productId);
            if (existing && existing.quantity > 1) {
                return items.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
            }

            return items.filter(i => i.product.id !== productId);
        });
        this.saveCart();
    }

    // Obtiene la cantidad actual de un producto específico en el carrito
    getQuantity(productId: string): number {
        const item = this.cartItems().find(i => i.product.id === productId);
        return item ? item.quantity : 0;
    }

    // Vacía el carrito por completo
    clearCart() {
        this.cartItems.set([]);
        this.saveCart();
    }

    // Guarda el estado actual del carrito en el almacenamiento local
    private saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cartItems()));
    }
}
