import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';

@Component({
    selector: 'app-restaurant',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './restaurant.html',
    styleUrl: './restaurant.css'
})
export class RestaurantComponent {
    private supabaseService = inject(SupabaseService);
    private fb = inject(FormBuilder);
    private cdr = inject(ChangeDetectorRef);

    restaurantName = '';
    restaurantAddress = '';
    restaurantId = '';
    productType = 'all';
    products: any[] = [];
    restaurantStars = 0;
    showAddForm = false;


    productForm = this.fb.group({
        name: ['', Validators.required],
        description: ['', Validators.required],
        price: [0, [Validators.required, Validators.min(0)]],
        imageUrl: ['', Validators.required]
    });

    async ngOnInit() {
        try {
            const user = await this.supabaseService.getUser();
            if (user) {
                this.loadRestaurantProfile(user.id);
            }
        } catch (e: any) {
            console.error('Error in ngOnInit:', e);
        }
    }

    async loadRestaurantProfile(userId: string) {
        const { data, error } = await this.supabaseService.getRestaurantProfile(userId);

        if (error) {
            console.error('Error loading profile:', error);
            return;
        }

        if (data) {
            this.restaurantName = data.name;
            this.restaurantAddress = data.address;
            this.restaurantId = data.id || data.ID;
            this.restaurantStars = data.stars;
            this.loadProducts();
            this.cdr.detectChanges();
        }
    }

    async loadProducts() {
        if (!this.restaurantId) {
            return;
        }

        const { data, error } = await this.supabaseService.getRestaurantProducts(this.restaurantId);

        if (error) {
            console.error('Error loading products:', error);
            return;
        }

        if (data) {
            this.products = data;
            this.cdr.detectChanges();
        }
    }

    toggleAddForm() {
        this.showAddForm = !this.showAddForm;
    }

    async onAddProduct() {
        if (this.productForm.invalid || !this.restaurantId) return;

        const newProduct = {
            ...this.productForm.value as any,
            restaurantId: this.restaurantId,
            type: 'Food'
        };

        const { error } = await this.supabaseService.addProduct(newProduct);
        if (!error) {
            this.loadProducts();
            this.productForm.reset();
            this.showAddForm = false;
        } else {
            console.error('Error adding product:', error);
        }
    }
}
