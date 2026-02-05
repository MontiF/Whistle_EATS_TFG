import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
    selector: 'app-client',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './client.html',
    styleUrl: './client.css'
})
export class ClientComponent {
    private supabaseService = inject(SupabaseService);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);

    restaurants: any[] = [];

    // Carga la lista de restaurantes al iniciar el componente
    async ngOnInit() {
        const { data, error } = await this.supabaseService.getAllRestaurants();
        if (data) {
            this.restaurants = data;
            this.cdr.detectChanges();
        } else {
            console.error('Error loading restaurants:', error);
        }
    }

    // Navega a la página de detalles de un restaurante específico
    goToRestaurant(restaurantId: string) {
        this.router.navigate(['/client/restaurant', restaurantId]);
    }
}
