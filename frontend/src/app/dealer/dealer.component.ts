import { Component, inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

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
export class DealerComponent implements AfterViewInit {
    map: L.Map | undefined;

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.initMap();
        }, 100);
    }

    private initMap(): void {
        const center = { lat: 40.416775, lng: -3.703790 }; // Madrid
        this.map = L.map('map').setView([center.lat, center.lng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        setTimeout(() => {
            this.map?.invalidateSize();
        }, 0);
    }
}
