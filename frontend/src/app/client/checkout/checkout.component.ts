import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';

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

    goBack() {
        this.router.navigate(['/client']);
        // Ideally go back to the restaurant, but we'd need to track where we came from.
        // Simple back to client home is safer for now.
    }

    pay() {
        // Simulate payment
        alert('¡Pedido realizado con éxito!');
        this.cartService.clearCart();
        this.router.navigate(['/client']);
    }
}
