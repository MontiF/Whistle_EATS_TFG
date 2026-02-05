import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { passwordMatchValidator, passwordStrengthValidator } from '../validators/password.validator';

@Component({
    selector: 'app-recover',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './recover.html',
    styleUrl: './recover.css'
})
export class RecoverComponent {
    private fb = inject(FormBuilder);

    recoverForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        recoveryCode: [''],
        newPassword: ['', [Validators.required, passwordStrengthValidator()]],
        confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator('newPassword', 'confirmPassword') });

    // Simula el envío de un correo de recuperación(No implementado)
    sendRecoveryEmail() {
        if (this.recoverForm.get('email')?.invalid) {
            this.recoverForm.get('email')?.markAsTouched();
            return;
        }

        alert('Email de recuperación enviado (simulado)');
    }

    // Simula el cambio de contraseña(No implementado)
    resetPassword() {
        if (this.recoverForm.invalid) {
            this.recoverForm.markAllAsTouched();
            return;
        }

        alert('Contraseña cambiada (simulado)');
    }
}
