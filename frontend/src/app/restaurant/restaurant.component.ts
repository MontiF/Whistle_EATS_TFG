import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { OrderService } from '../services/order.service';

@Component({
    selector: 'app-restaurant',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
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
    searchProduct = '';


    productForm = this.fb.group({
        name: ['', Validators.required],
        description: ['', Validators.required],
        price: [0, [Validators.required, Validators.min(0)]],
        imageUrl: [''],
        type: ['comida', Validators.required]
    });

    selectedFile: File | null = null;
    previewUrl: string | null = null;

    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            // Generate a preview URL
            const reader = new FileReader();
            reader.onload = (e) => {
                this.previewUrl = e.target?.result as string;
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(file);
        }
    }

    // Inicializa el componente cargando el perfil del restaurante del usuario actual
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

    // Carga los datos del perfil del restaurante
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

    // Carga y ordena los productos del restaurante(1º menú, 2º comida, 3º bebida, 4º complemento)
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
            const typePriority: { [key: string]: number } = {
                'menu': 1,
                'comida': 2,
                'bebida': 3,
                'complemento': 4
            };

            this.products = data.sort((a: any, b: any) => {
                // Asignamos prioridad 99 a tipos desconocidos para que aparezcan al final
                const priorityA = typePriority[a.type] || 99;
                const priorityB = typePriority[b.type] || 99;
                return priorityA - priorityB;
            });
            this.cdr.detectChanges();
        }
    }

    editingProduct: any = null;

    // Alterna la visibilidad del formulario de producto y prellena datos si se está editando
    toggleAddForm(product: any = null) {
        if (product) {
            this.editingProduct = product;
            this.productForm.patchValue({
                name: product.name,
                description: product.description,
                price: product.price,
                imageUrl: product.imageurl || product.imageUrl,
                type: product.type || 'comida'
            });
            this.showAddForm = true;
        } else {
            this.editingProduct = null;
            this.productForm.reset({
                type: 'comida'
            });
            this.showAddForm = !this.showAddForm;
            this.selectedFile = null;
            this.previewUrl = null;
        }
    }

    // Guarda un producto nuevo o actualiza uno existente en la base de datos
    async onSaveProduct() {
        if (this.productForm.invalid) {
            console.error('Form is invalid:', this.productForm.errors);
            return;
        }
        if (!this.restaurantId) {
            console.error('No restaurant ID found');
            return;
        }

        const productData = {
            ...this.productForm.value as any,
            restaurantId: this.restaurantId
        };

        // Asegúrese de que la imagen sea la predeterminada si no se proporciona ninguna
        if (!productData.imageUrl) {
            productData.imageUrl = 'images/600x400.jpg';
        }

        if (this.selectedFile) {
            const fileExt = this.selectedFile.name.split('.').pop();
            const safeRestaurantName = (this.restaurantName || 'Restaurante').replace(/[^a-zA-Z0-9]/g, '_');
            const safeProductName = (productData.name as string || 'Producto').replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${safeRestaurantName}_${safeProductName}_${Date.now()}.${fileExt}`;

            const { data, error } = await this.supabaseService.uploadProductImage(this.selectedFile, fileName);
            if (error) {
                console.error('Error uploading image:', error);
                alert('Error al subir la imagen. Inténtalo de nuevo.');
                return;
            }
            if (data) {
                // Si estamos editando y existía una imagen anterior, la borramos del bucket
                if (this.editingProduct) {
                    const oldImageUrl = this.editingProduct.imageurl || this.editingProduct.imageUrl;
                    if (oldImageUrl) {
                        await this.supabaseService.deleteProductImage(oldImageUrl);
                    }
                }
                productData.imageUrl = data.publicUrl;
            }
        }

        let result;
        if (this.editingProduct) {
            result = await this.supabaseService.updateProduct({
                ...productData,
                id: this.editingProduct.ID
            });
        } else {
            result = await this.supabaseService.addProduct(productData);
        }

        const { error } = result as any;

        if (!error) {
            this.loadProducts();
            this.cancelEdit();
        } else {
            console.error('Error saving product:', error);
            alert('Error al guardar el producto: ' + (error.message || error));
        }
    }

    // Maneja la acción de añadir un producto (llama a onSaveProduct)
    onAddProduct() {
        this.onSaveProduct();
    }

    // Elimina un producto tras confirmar la acción
    async onDeleteProduct(productId: string) {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            return;
        }

        const { error } = (await this.supabaseService.deleteProduct(productId)) as any;

        if (!error) {
            this.loadProducts();
            if (this.editingProduct && this.editingProduct.ID === productId) {
                this.cancelEdit();
            }
        } else {
            console.error('Error deleting product:', error);
        }
    }

    // Prepara el formulario para editar un producto existente
    startEdit(product: any) {
        this.editingProduct = product;
        this.showAddForm = false;
        this.productForm.patchValue({
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.imageurl || product.imageUrl,
            type: product.type || 'comida'
        });
    }

    // Cancela la edición y limpia el formulario
    cancelEdit() {
        this.editingProduct = null;
        this.showAddForm = false;
        this.selectedFile = null;
        this.previewUrl = null;
        this.productForm.reset({
            type: 'comida'
        });
    }

}
