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

    // Alterna la visibilidad de la contraseña en el formulario
    togglePasswordVisibility() {
        this.showPassword = !this.showPassword;
    }

    // Gestiona el envío del formulario de inicio de sesión y la redirección según el rol
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
                this.supabaseService.getUserRole(data.user.id).then(({ data, error }: { data: any, error: any }) => {
                    if (error) {
                        console.error('Error al obtener el rol del usuario:', error.message);
                        this.errorMessage = 'Error al obtener el rol del usuario: ' + error.message;
                        return;
                    }
                    if (data.role === 'repartidor' && data.hired) {
                        this.router.navigate(['/dealer']);
                    } else if (data.role === 'local' && data.hired) {
                        this.router.navigate(['/restaurant']);
                    } else if (data.role === 'cliente') {
                        this.router.navigate(['/client']);
                    } else {
                        this.errorMessage = 'Usuario sin contrato, espera a que te contraten, esto puede tardar de 3 a 5 dias';
                    }
                })
            }
        });
    }
}

