import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule, RouterLink],
    templateUrl: './login.html',
    styleUrl: './login.css'
})
export class LoginComponent {
    private fb = inject(FormBuilder);
    private supabaseService = inject(SupabaseService);
    private router = inject(Router);

    loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required]
    });

    errorMessage = '';
    showPassword = false;

    togglePasswordVisibility() {
        this.showPassword = !this.showPassword;
    }

    onSubmit() {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        const { email, password } = this.loginForm.value;

        if (!email || !password) return;

        this.supabaseService.signIn(email, password).then(({ data, error }) => {
            if (error) {
                console.error('Error de inicio de sesión:', error.message);
                this.errorMessage = 'Credenciales inválidas o error en el servicio: ' + error.message;
                return;
            }

            if (data.user) {
                // Login exitoso
                alert(`Login Exitoso! ID: ${data.user.id}`);
            }
        });
    }
}
