import { Component, inject, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { SupabaseService } from '../services/supabase.service';
import { OrderService } from '../services/order.service';
import { GeocodingService } from '../services/geocoding.service';

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = L.icon({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;


@Component({
    selector: 'app-dealer',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './dealer.html',
    styleUrl: './dealer.css'
})
export class DealerComponent implements AfterViewInit, OnDestroy {
    map: L.Map | undefined;
    userLocation: { lat: number; lng: number } | null = null;
    userMarker: L.Marker | undefined;
    userAccuracyCircle: L.Circle | undefined;
    vehicleType: string = 'Moto';
    currentSpeed: number = 0;
    watchPositionId: number | null = null;
    private orderService = inject(OrderService);
    private supabaseService = inject(SupabaseService);
    private geocodingService = inject(GeocodingService);
    private cdr = inject(ChangeDetectorRef);
    orders: any[] = [];
    activeOrder: any = null;
    driverId: string | null = null;
    routingControl: any; // L.Routing.Control
    hasRoute: boolean = false;

    async ngAfterViewInit(): Promise<void> {
        // Initialize map logic...
        setTimeout(() => {
            const vehicleType = localStorage.getItem('vehicleType') || 'Moto';
            this.vehicleType = vehicleType;
            this.startLocationTracking();
            this.startOrderPolling();
        }, 100);

        // Fetch driver ID and orders
        const user = await this.supabaseService.getUser();
        if (user) {
            this.driverId = await this.supabaseService.getDriverId(user.id);
            this.loadOrders();
        }
    }

    async loadOrders() {
        console.log('DealerComponent: Loading orders...');

        // 1. Check for active order first
        if (this.driverId) {
            const { data: activeOrder } = await this.orderService.getActiveOrder(this.driverId);
            if (activeOrder) {
                console.log('DealerComponent: Active order found', activeOrder);
                this.activeOrder = activeOrder;
                this.orders = []; // Clear pending list if there's an active order
                this.updateRouteForActiveOrder();
                return;
            }
        }

        // 2. If no active order, load pending orders
        const { data, error } = await this.orderService.getPendingOrders();
        if (data) {
            console.log('DealerComponent: Orders loaded', data);
            this.orders = data;
        } else {
            console.error('DealerComponent: Error loading orders', error);
        }
    }

    async updateRouteForActiveOrder() {
        if (!this.activeOrder || !this.userLocation || !this.map) return;

        let destinationAddress = '';
        if (this.activeOrder.status === 'en_camino') {
            // Going to Restaurant
            destinationAddress = this.activeOrder.restaurant.address;
            console.log('Routing to Restaurant:', destinationAddress);
        } else if (this.activeOrder.status === 'recogido') {
            // Going to Client
            destinationAddress = this.activeOrder.deliveryAddress;
            console.log('Routing to Client:', destinationAddress);
        } else {
            this.clearRoute();
            return;
        }

        const coords = await this.geocodingService.getCoordinates(destinationAddress);
        if (coords) {
            this.calculateRoute(this.userLocation, coords);
        } else {
            console.warn('Could not find coordinates for address:', destinationAddress);
            alert('No se pudo encontrar la ruta para esta dirección: ' + destinationAddress);
        }
    }

    calculateRoute(start: { lat: number, lng: number }, end: { lat: number, lng: number }) {
        if (!this.map) return;

        // Si ya hay una ruta, la quitamos para dibujar la nueva
        this.clearRoute();

        // @ts-ignore
        this.routingControl = L.Routing.control({
            waypoints: [
                L.latLng(start.lat, start.lng),
                L.latLng(end.lat, end.lng)
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            lineOptions: {
                styles: [{ color: '#6FA1EC', weight: 4 }]
            } as any,
            show: false, // Don't show the itinerary panel
            addWaypoints: false,
            routeWhileDragging: false,
            fitSelectedRoutes: true
        }).addTo(this.map);

        this.hasRoute = true;
    }

    clearRoute() {
        if (this.routingControl && this.map) {
            this.map.removeControl(this.routingControl);
            this.routingControl = null;
            this.hasRoute = false;
        }
    }

    async acceptOrder(order: any) {
        if (!this.driverId) {
            alert('Error: No se ha podido identificar al conductor.');
            return;
        }

        const result = await this.orderService.acceptOrder(order.id, this.driverId);
        if (result.success) {
            alert('Pedido aceptado!');

            // 1. Optimistic Update
            this.activeOrder = {
                ...order
            };
            this.orders = [];
            this.cdr.detectChanges(); // Force update

            // 2. Calculate initial route to restaurant
            this.updateRouteForActiveOrder();

            // 3. Reload to ensure data consistency (getting full enriched data)
            await this.loadOrders();
            this.cdr.detectChanges(); // Force update again after reload
        } else {
            alert('Error al aceptar el pedido.');
        }
    }

    rejectOrder(order: any) {
        // Just remove from local view
        this.orders = this.orders.filter(o => o.id !== order.id);
    }

    private startLocationTracking(): void {
        // ... (rest of the tracking logic)
        if (navigator.geolocation) {
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };

            // Primero obtener ubicación inicial
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.initMap();
                    // Luego iniciar monitoreo continuo
                    this.watchLocationAndSpeed();
                },
                (error) => {
                    console.error('Error obteniendo ubicación:', error);
                    // Fallback a Madrid si falla
                    this.userLocation = { lat: 40.416775, lng: -3.703790 };
                    this.initMap();
                    this.watchLocationAndSpeed();
                },
                options
            );
        } else {
            console.warn('Geolocalización no soportada');
            this.userLocation = { lat: 40.416775, lng: -3.703790 };
            this.initMap();
        }
    }

    private watchLocationAndSpeed(): void {
        if (navigator.geolocation) {
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };

            this.watchPositionId = navigator.geolocation.watchPosition(
                (position) => {
                    const newLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    // Calcular velocidad en km/h (speed está en m/s)
                    this.currentSpeed = (position.coords.speed || 0) * 3.6;

                    // Actualizar marcador con el emoji correcto según velocidad y vehículo
                    this.updateMarker(newLocation);
                    this.userLocation = newLocation;
                },
                (error) => {
                    console.error('Error en watchPosition:', error);
                },
                options
            );
        }
    }

    private updateMarker(location: { lat: number; lng: number }): void {
        if (!this.map) return;

        const emoji = this.getEmoji();

        // Crear un icono con emoji usando HTML sin caja de fondo
        const emojiIcon = L.divIcon({
            html: `<div style="font-size: 3rem; line-height: 1; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));">${emoji}</div>`,
            iconSize: [50, 50],
            iconAnchor: [25, 25],
            popupAnchor: [0, -25],
            className: 'emoji-icon' // Clase vacía para no aplicar estilos por defecto
        });

        if (this.userMarker) {
            this.userMarker.setLatLng([location.lat, location.lng]);
            this.userMarker.setIcon(emojiIcon);
        } else {
            this.userMarker = L.marker([location.lat, location.lng], { icon: emojiIcon })
                .bindPopup(`Velocidad: ${this.currentSpeed.toFixed(1)} km/h`)
                .addTo(this.map);
        }

        // Actualizar también el círculo de precisión/ubicación
        if (this.userAccuracyCircle) {
            this.userAccuracyCircle.setLatLng([location.lat, location.lng]);
        }
    }

    private getEmoji(): string {
        if (this.currentSpeed > 5) { // Bajamos umbral a 5km/h para detectar mejor
            // Mostrando vehículo en movimiento según tipo
            if (this.vehicleType === 'Coche') return '🚗';
            if (this.vehicleType === 'Moto') return '🏍️';
            if (this.vehicleType === 'Bici') return '🚴';
        }
        // Si va lento, probablemente está andando o parado
        return '🚶';
    }

    ngOnDestroy(): void {
        if (this.watchPositionId !== null) {
            navigator.geolocation.clearWatch(this.watchPositionId);
        }
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }

    pollingInterval: any;

    startOrderPolling() {
        this.pollingInterval = setInterval(async () => {
            if (this.activeOrder && this.driverId) {
                const { data: updatedOrder } = await this.orderService.getActiveOrder(this.driverId);
                if (updatedOrder) {
                    // Check for status change
                    if (updatedOrder.status !== this.activeOrder.status) {
                        console.log('Order status changed:', updatedOrder.status);
                        this.activeOrder = updatedOrder;
                        this.updateRouteForActiveOrder();
                        this.cdr.detectChanges();
                    }
                }
            }
        }, 5000); // Poll every 5 seconds
    }

    private initMap(): void {
        if (!this.userLocation) return;

        this.map = L.map('map').setView([this.userLocation.lat, this.userLocation.lng], 19);

        L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors, © CartoDB'
        }).addTo(this.map);

        // Agregar un círculo azul alrededor de la ubicación actual y guardar referencia
        this.userAccuracyCircle = L.circle([this.userLocation.lat, this.userLocation.lng], {
            color: '#0066cc',
            fillColor: '#0066cc',
            fillOpacity: 0.3,
            weight: 3,
            opacity: 1,
            radius: 15
        }).addTo(this.map);

        // Crear marcador inicial con emoji
        this.updateMarker(this.userLocation);

        setTimeout(() => {
            this.map?.invalidateSize();
        }, 0);
    }

    async verifyDelivery(order: any) {
        if (!order.verificationCode || order.verificationCode.length !== 4) {
            alert('El código debe tener 4 números');
            return;
        }

        const { success, error } = await this.orderService.verifyDeliveryCode(order.id, parseInt(order.verificationCode));

        if (success) {
            alert(`¡Pedido Entregado!`);
            this.activeOrder = null;
            this.clearRoute();
            this.loadOrders();
            this.cdr.detectChanges();
        } else {
            alert('Código Incorrecto');
        }
    }
}
