import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule],
    templateUrl: './login.html',
    styleUrl: './login.css'
})
export class LoginComponent {
    private fb = inject(FormBuilder);
    private http = inject(HttpClient);
    private router = inject(Router);

    loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required]
    });

    errorMessage = '';

    onSubmit() {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        const { email, password } = this.loginForm.value;

        // Consultamos al backend simulado
        const url = `http://localhost:4004/odata/v4/catalog/Users?$filter=email eq '${email}'`;

        this.http.get<any>(url).subscribe({
            next: (response) => {
                // OData devuelve los datos en la propiedad 'value'
                const users = response.value || [];

                if (users.length === 0) {
                    this.errorMessage = 'Usuario no encontrado';
                    return;
                }

                const user = users[0];
                if (user.password !== password) {
                    this.errorMessage = 'Contraseña incorrecta';
                    return;
                }

                // Login exitoso - Redirección según rol
                if (user.role === 'repartidor') {
                    // this.router.navigate(['/delivery']); // TODO: Crear ruta
                    alert(`Bienvenido Repartidor ${user.name}`);
                } else if (user.role === 'admin') {
                    alert(`Bienvenido Admin ${user.name}`);
                } else {
                    // this.router.navigate(['/home']); // TODO: Crear ruta
                    alert(`Bienvenido Cliente ${user.name}`);
                }
            },
            error: (err) => {
                console.error('Error de conexión:', err);
                this.errorMessage = 'Error al conectar con el servidor. Asegúrate de que el backend esté corriendo en el puerto 4004.';
            }
        });
    }
}
