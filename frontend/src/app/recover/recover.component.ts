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

    sendRecoveryEmail() {
        if (this.recoverForm.get('email')?.invalid) {
            this.recoverForm.get('email')?.markAsTouched();
            return;
        }
        console.log('Sending recovery email to:', this.recoverForm.get('email')?.value);
        alert('Email de recuperación enviado (simulado)');
    }

    resetPassword() {
        if (this.recoverForm.invalid) {
            this.recoverForm.markAllAsTouched();
            return;
        }
        console.log('Resetting password with:', this.recoverForm.value);
        alert('Contraseña cambiada (simulado)');
    }
}
