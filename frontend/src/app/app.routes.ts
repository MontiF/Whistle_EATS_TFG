import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { RestaurantComponent } from './restaurant/restaurant.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'restaurant', component: RestaurantComponent },
    { path: 'recover', loadComponent: () => import('./recover/recover.component').then(m => m.RecoverComponent) },
    { path: '', redirectTo: 'login', pathMatch: 'full' }
];
