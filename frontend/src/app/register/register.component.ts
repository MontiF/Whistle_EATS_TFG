import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

    // Señales para la visibilidad de la UI (derivado de cambios de valor del formulario podría ser más limpio, pero mantenemos señales por ahora)
    userType = signal<string>('');
    vehicleType = signal<string>('');

    registerForm: FormGroup = this.fb.group({
        userType: ['', Validators.required],

        // Campos de consumidor
        consumerName: [''],
        consumerAddress: [''],

        // Campos compartidos
        phone: ['', [Validators.required, phoneValidator()]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, passwordStrengthValidator()]],
        confirmPassword: ['', Validators.required],

        // Campos de restaurante
        restaurantName: [''],
        cif: [''],
        restaurantAddress: [''],

        // Campos de repartidor
        deliveryName: [''],
        dni: ['', [dniValidator()]],

        // Campos de vehículo
        vehicleType: [''],
        vehiclePlate: [''],
        vehicleBrand: [''],
        vehicleModel: [''],
        vehicleColor: [''],
        drivingLicense: ['']
    }, { validators: passwordMatchValidator('password', 'confirmPassword') });

    constructor() {
        // Sincronizar señales y lógica de validación
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
        // Reiniciar validadores para campos específicos según el tipo
        const consumerFields = ['consumerName', 'consumerAddress'];
        const restaurantFields = ['restaurantName', 'cif', 'restaurantAddress'];
        const deliveryFields = ['deliveryName', 'dni']; // DNI is here

        // Limpiar todo primero
        [...consumerFields, ...restaurantFields, ...deliveryFields].forEach(field => {
            this.registerForm.get(field)?.clearValidators();
            this.registerForm.get(field)?.updateValueAndValidity();
        });

        // Establecer requerido para el tipo seleccionado
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

    onSubmit() {
        if (this.registerForm.invalid) {
            this.registerForm.markAllAsTouched();
            this.showErrorModal.set(true);
            return;
        }
        console.log('Form Valid', this.registerForm.value);
    }

    closeErrorModal() {
        this.showErrorModal.set(false);
    }
}
