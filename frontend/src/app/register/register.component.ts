import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { dniValidator } from '../validators/dni.validator';
import { cifValidator } from '../validators/cif.validator';
import { passwordMatchValidator, passwordStrengthValidator } from '../validators/password.validator';
import { phoneValidator } from '../validators/phone.validator';
import { plateValidator } from '../validators/plate.validator';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './register.html',
    styleUrls: ['./register.css']
})
export class RegisterComponent {
    private fb = inject(FormBuilder);
    private supabaseService = inject(SupabaseService);
    private router = inject(Router);


    userType = signal<string>('');
    vehicleType = signal<string>('');

    registerForm: FormGroup = this.fb.group({
        userType: ['', Validators.required],


        consumerName: [''],
        consumerAddress: [''],


        phone: ['', [Validators.required, phoneValidator()]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, passwordStrengthValidator()]],
        confirmPassword: ['', Validators.required],


        restaurantName: [''],
        cif: [''],
        restaurantAddress: [''],


        deliveryName: [''],
        dni: ['', [dniValidator()]],


        vehicleType: [''],
        vehiclePlate: [''],
        vehicleBrand: [''],
        vehicleModel: [''],
        vehicleColor: [''],
        drivingLicense: ['']
    }, { validators: passwordMatchValidator('password', 'confirmPassword') });

    constructor() {

        this.registerForm.get('userType')?.valueChanges.subscribe((value: string | null) => {
            this.userType.set(value || '');
            this.updateValidators(value || '');
        });

        this.registerForm.get('vehicleType')?.valueChanges.subscribe((value: string | null) => {
            this.vehicleType.set(value || '');
            this.updateVehicleValidators(value || '');
        });
    }

    updateValidators(type: string) {

        const consumerFields = ['consumerName', 'consumerAddress'];
        const restaurantFields = ['restaurantName', 'cif', 'restaurantAddress'];
        const deliveryFields = ['deliveryName', 'dni'];


        [...consumerFields, ...restaurantFields, ...deliveryFields].forEach(field => {
            this.registerForm.get(field)?.clearValidators();
            this.registerForm.get(field)?.updateValueAndValidity();
        });


        if (type === 'consumer') {
            consumerFields.forEach(field => this.registerForm.get(field)?.setValidators(Validators.required));
        } else if (type === 'restaurant') {
            restaurantFields.forEach(field => this.registerForm.get(field)?.setValidators(Validators.required));
            this.registerForm.get('cif')?.setValidators([Validators.required, cifValidator()]);
        } else if (type === 'delivery') {
            this.registerForm.get('deliveryName')?.setValidators(Validators.required);
            this.registerForm.get('dni')?.setValidators([Validators.required, dniValidator()]);
        }

        this.registerForm.updateValueAndValidity();
    }

    updateVehicleValidators(type: string) {
        const vehicleFields = ['vehiclePlate', 'vehicleBrand', 'vehicleModel', 'vehicleColor', 'drivingLicense'];

        vehicleFields.forEach(field => {
            this.registerForm.get(field)?.clearValidators();
            this.registerForm.get(field)?.updateValueAndValidity();
        });

        if (type === 'moto' || type === 'coche') {
            vehicleFields.forEach(field => this.registerForm.get(field)?.setValidators(Validators.required));
            this.registerForm.get('vehiclePlate')?.setValidators([
                Validators.required,
                plateValidator()
            ]);
        }

        this.registerForm.updateValueAndValidity();
    }

    showErrorModal = signal<boolean>(false);

    async onSubmit() {
        if (this.registerForm.invalid) {
            this.registerForm.markAllAsTouched();
            this.showErrorModal.set(true);
            return;
        }

        const { error } = await this.supabaseService.registerUser(this.registerForm.value);

        if (error) {
            console.error('Error al registrar usuario:', error);
            alert('Error al registrar usuario: ' + error.message);
        } else {
            alert('Registro exitoso! Por favor inicia sesión.');
            this.router.navigate(['/login']);
        }
    }

    closeErrorModal() {
        this.showErrorModal.set(false);
    }
}
