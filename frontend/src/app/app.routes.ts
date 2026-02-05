import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { RestaurantComponent } from './restaurant/restaurant.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'restaurant', component: RestaurantComponent },
    { path: 'restaurant/orders', loadComponent: () => import('./restaurant/orders/restaurant-orders.component').then(m => m.RestaurantOrdersComponent) },
    { path: 'client', loadComponent: () => import('./client/client.component').then(m => m.ClientComponent) },
    { path: 'client/checkout', loadComponent: () => import('./client/checkout/checkout.component').then(m => m.CheckoutComponent) },
    { path: 'client/restaurant/:id', loadComponent: () => import('./client/restaurant/client-restaurant.component').then(m => m.ClientRestaurantComponent) },
    { path: 'client/orders', loadComponent: () => import('./client/orders/client-orders.component').then(m => m.ClientOrdersComponent) },
    { path: 'dealer', loadComponent: () => import('./dealer/dealer.component').then(m => m.DealerComponent) },
    { path: 'recover', loadComponent: () => import('./recover/recover.component').then(m => m.RecoverComponent) },
    { path: '', redirectTo: 'login', pathMatch: 'full' }
];
