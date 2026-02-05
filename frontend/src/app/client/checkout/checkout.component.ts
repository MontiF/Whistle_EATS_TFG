import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
    selector: 'app-checkout',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './checkout.html',
    styleUrl: './checkout.css'
})
export class CheckoutComponent {
    public cartService = inject(CartService);
    private router = inject(Router);
    private orderService = inject(OrderService);
    private supabaseService = inject(SupabaseService);

    // Navega de vuelta a la página principal del cliente
    goBack() {
        this.router.navigate(['/client']);
    }

    // Procesa el pago, verifica el usuario, crea el pedido y limpia el carrito(Es un pago simulado, no se realiza ningún pago real)
    async pay() {
        const user = await this.supabaseService.getUser();
        if (!user) {
            alert('Error: No se pudo identificar al usuario');
            return;
        }

        const result = await this.orderService.createOrder(this.cartService.cartItems(), user.id);

        if (result.success) {
            alert('¡Pedido realizado con éxito!');
            this.cartService.clearCart();
            this.router.navigate(['/client']);
        } else {
            alert('Error al realizar el pedido. Por favor, inténtalo de nuevo.');
            console.error(result.error);
        }
    }
}
