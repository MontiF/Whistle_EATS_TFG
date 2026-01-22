import { Component, inject, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { SupabaseService } from '../services/supabase.service';

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
    imports: [CommonModule, RouterLink],
    templateUrl: './dealer.html',
    styleUrl: './dealer.css'
})
export class DealerComponent implements AfterViewInit, OnDestroy {
    map: L.Map | undefined;
    userLocation: { lat: number; lng: number } | null = null;
    userMarker: L.Marker | undefined;
    vehicleType: string = 'Moto';
    currentSpeed: number = 0;
    watchPositionId: number | null = null;
    private supabaseService = inject(SupabaseService);

    ngAfterViewInit(): void {
        setTimeout(() => {
            // Obtener tipo de vehículo del repartidor (desde localStorage o sesión)
            const vehicleType = localStorage.getItem('vehicleType') || 'Moto';
            this.vehicleType = vehicleType;
            this.startLocationTracking();
        }, 100);
    }

    private startLocationTracking(): void {
        if (navigator.geolocation) {
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
                    this.userLocation = { lat: 40.416775, lng: -3.703790 };
                    this.initMap();
                    this.watchLocationAndSpeed();
                }
            );
        } else {
            console.warn('Geolocalización no soportada');
            this.userLocation = { lat: 40.416775, lng: -3.703790 };
            this.initMap();
        }
    }

    private watchLocationAndSpeed(): void {
        if (navigator.geolocation) {
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
                }
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
    }

    private getEmoji(): string {
        if (this.currentSpeed > 20) {
            // Mostrando vehículo en movimiento según tipo
            if (this.vehicleType === 'Coche') return '🚗';
            if (this.vehicleType === 'Moto') return '🏍️';
            if (this.vehicleType === 'Bici') return '🚴';
        }
        // Si va a menos de 20 km/h, probablemente está andando
        return '🚶';
    }

    ngOnDestroy(): void {
        if (this.watchPositionId !== null) {
            navigator.geolocation.clearWatch(this.watchPositionId);
        }
    }

    private initMap(): void {
        if (!this.userLocation) return;

        this.map = L.map('map').setView([this.userLocation.lat, this.userLocation.lng], 19);

        L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors, © CartoDB'
        }).addTo(this.map);

        // Agregar un círculo azul alrededor de la ubicación actual
        L.circle([this.userLocation.lat, this.userLocation.lng], {
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
}
