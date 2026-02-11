import { Component, inject, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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
    imports: [CommonModule, FormsModule],
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
    routingControl: any;
    hasRoute: boolean = false;

    // Inicializa el seguimiento de ubicación y sondeo de pedidos después de cargar la vista
    async ngAfterViewInit(): Promise<void> {

        setTimeout(() => {
            const vehicleType = localStorage.getItem('vehicleType') || 'Moto';
            this.vehicleType = vehicleType;
            this.startLocationTracking();
            this.startOrderPolling();
        }, 100);


        const user = await this.supabaseService.getUser();
        if (user) {
            this.driverId = await this.supabaseService.getDriverId(user.id);
            this.loadOrders();
        }
    }

    // Carga los pedidos disponibles o el pedido activo del repartidor
    async loadOrders() {
        console.log(`[Dealer] 🔄 Cargando pedidos... (DriverID: ${this.driverId})`);

        if (this.driverId) {
            const { data: activeOrder, error: activeError } = await this.orderService.getActiveOrder(this.driverId);
            if (activeError) console.error('[Dealer] Error buscando pedido activo:', activeError);

            if (activeOrder) {
                console.log('[Dealer] ✅ Encontrado pedido activo:', activeOrder.ID, 'Estado:', activeOrder.status);
                this.activeOrder = activeOrder;
                // NOTA: Ya no hacemos 'return' aquí ni vaciamos 'this.orders'
                // Queremos que el repartidor vea qué más hay disponible.
                this.updateRouteForActiveOrder();
            } else {
                console.log('[Dealer] ℹ️ No hay pedido activo actualmente.');
                this.activeOrder = null;
                this.clearRoute();
            }
        }

        const { data, error } = await this.orderService.getPendingOrders();
        if (data) {
            // Filtramos para no mostrar el pedido que ya tenemos activo como "disponible"
            this.orders = data.filter((o: any) => o.ID !== this.activeOrder?.ID);
            console.log(`[Dealer] 📦 Pedidos pendientes cargados: ${this.orders.length}`);
        } else {
            console.error('[Dealer] Error cargando pedidos pendientes:', error);
        }
    }

    // Actualiza la ruta en el mapa según el estado del pedido activo
    async updateRouteForActiveOrder() {
        if (!this.activeOrder || !this.userLocation || !this.map) {
            console.log('[Dealer] ℹ️ Saltando actualización de ruta: falta pedido, ubicación o mapa.');
            return;
        }

        let destinationAddress = '';
        if (this.activeOrder.status === 'en_camino') {
            destinationAddress = this.activeOrder.restaurant.address;
        } else if (this.activeOrder.status === 'recogido') {
            destinationAddress = this.activeOrder.deliveryAddress;
        } else {
            this.clearRoute();
            return;
        }

        console.log(`[Dealer] 🗺️ Calculando ruta hacia: ${destinationAddress}`);
        const coords = await this.geocodingService.getCoordinates(destinationAddress);
        if (coords) {
            this.calculateRoute(this.userLocation, coords);
        } else {
            console.warn('[Dealer] ❌ No se encontraron coordenadas para:', destinationAddress);
            // Quitamos el alert para no bloquear la app, basta con el warning en consola
            // o podrías mostrar un aviso discreto en el HTML.
            this.clearRoute();
        }
    }

    // Calcula y muestra la ruta entre dos puntos en el mapa
    calculateRoute(start: { lat: number, lng: number }, end: { lat: number, lng: number }) {
        if (!this.map) return;


        this.clearRoute();


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
            show: false,
            addWaypoints: false,
            routeWhileDragging: false,
            fitSelectedRoutes: true,
            createMarker: () => null
        } as any).addTo(this.map);

        this.hasRoute = true;
    }

    // Borra la ruta actual del mapa
    clearRoute() {
        if (this.routingControl && this.map) {
            this.map.removeControl(this.routingControl);
            this.routingControl = null;
            this.hasRoute = false;
        }
    }

    // Acepta un pedido y lo asigna al repartidor actual
    async acceptOrder(order: any) {
        if (!this.driverId) {
            alert('Error: No se ha podido identificar al conductor.');
            return;
        }

        console.log(`[Dealer] 👆 Intento de aceptación manual del pedido: ${order.ID}`);
        const result = await this.orderService.acceptOrderByDriver(order.ID, this.driverId);
        if (result.success) {
            console.log(`[Dealer] ✅ Pedido ${order.ID} aceptado con éxito.`);
            alert('Pedido aceptado!');


            this.activeOrder = {
                ...order
            };
            this.orders = this.orders.filter(o => o.ID !== order.ID);
            this.cdr.detectChanges();


            this.updateRouteForActiveOrder();


            await this.loadOrders();
            this.cdr.detectChanges();
        } else {
            console.error('[Dealer] ❌ Error al aceptar el pedido:', result.error);
            alert('Error al aceptar el pedido.');
        }
    }

    // Rechaza un pedido eliminándolo de la lista local
    rejectOrder(order: any) {

        this.orders = this.orders.filter(o => o.ID !== order.ID);
    }

    // Inicia el seguimiento de la ubicación del usuario
    private startLocationTracking(): void {

        if (navigator.geolocation) {
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };


            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.initMap();

                    this.watchLocationAndSpeed();
                },
                (error) => {
                    console.error('Error obteniendo ubicación:', error);

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

    // Observa cambios en la ubicación y velocidad del usuario
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


                    // Convertimos la velocidad de m/s a km/h
                    this.currentSpeed = (position.coords.speed || 0) * 3.6;


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

    // Actualiza el marcador del usuario en el mapa
    private updateMarker(location: { lat: number; lng: number }): void {
        if (!this.map) return;

        const emoji = this.getEmoji();


        const emojiIcon = L.divIcon({
            html: `<div style="font-size: 3rem; line-height: 1; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));">${emoji}</div>`,
            iconSize: [50, 50],
            iconAnchor: [25, 25],
            popupAnchor: [0, -25],
            className: 'emoji-icon'
        });

        if (this.userMarker) {
            this.userMarker.setLatLng([location.lat, location.lng]);
            this.userMarker.setIcon(emojiIcon);
        } else {
            // Si no existe, creamos uno nuevo centrado en la ubicación
            this.userMarker = L.marker([location.lat, location.lng], { icon: emojiIcon })
                .bindPopup(`Velocidad: ${this.currentSpeed.toFixed(1)} km/h`)
                .addTo(this.map);
        }


        if (this.userAccuracyCircle) {
            this.userAccuracyCircle.setLatLng([location.lat, location.lng]);
        }
    }

    // Determina el emoji a mostrar según la velocidad y tipo de vehículo
    private getEmoji(): string {
        if (this.currentSpeed > 10) {

            if (this.vehicleType === 'Coche') return '🚗';
            if (this.vehicleType === 'Moto') return '🏍️';
            if (this.vehicleType === 'Bici') return '🚴';
        }

        return '🚶';
    }

    // Limpia los observadores y temporizadores al destruir el componente
    ngOnDestroy(): void {
        if (this.watchPositionId !== null) {
            navigator.geolocation.clearWatch(this.watchPositionId);
        }
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }

    pollingInterval: any;

    // Inicia el sondeo periódico de actualizaciones del pedido
    startOrderPolling() {
        this.pollingInterval = setInterval(async () => {
            if (this.activeOrder && this.driverId) {
                const { data: updatedOrder } = await this.orderService.getActiveOrder(this.driverId);
                if (updatedOrder) {
                    // Si el estado ha cambiado, actualizamos la orden y la ruta
                    if (updatedOrder.status !== this.activeOrder.status) {

                        this.activeOrder = updatedOrder;
                        this.updateRouteForActiveOrder();
                        this.cdr.detectChanges();
                    }
                }
            }
        }, 5000);
    }

    // Inicializa el mapa Leaflet
    private initMap(): void {
        if (!this.userLocation) return;

        this.map = L.map('map').setView([this.userLocation.lat, this.userLocation.lng], 19);

        L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors, © CartoDB'
        }).addTo(this.map);


        this.userAccuracyCircle = L.circle([this.userLocation.lat, this.userLocation.lng], {
            color: '#0066cc',
            fillColor: '#0066cc',
            fillOpacity: 0.3,
            weight: 3,
            opacity: 1,
            radius: 15
        }).addTo(this.map);


        this.updateMarker(this.userLocation);

        setTimeout(() => {
            this.map?.invalidateSize();
        }, 0);
    }

    // Verifica el código de entrega para completar el pedido
    async verifyDelivery(order: any) {
        if (!order.verificationCode || order.verificationCode.length !== 4) {
            alert('El código debe tener 4 números');
            return;
        }

        const { success, error } = await this.orderService.verifyDeliveryCode(order.ID, parseInt(order.verificationCode));

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
