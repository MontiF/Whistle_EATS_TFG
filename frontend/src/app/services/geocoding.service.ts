import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class GeocodingService {
    private http = inject(HttpClient);
    private nominatimUrl = 'https://nominatim.openstreetmap.org/search';

    // Obtiene las coordenadas (latitud, longitud) a partir de una dirección textual para conseguir la ruta
    async getCoordinates(address: string): Promise<{ lat: number, lng: number } | null> {
        try {
            const params = {
                q: address,
                format: 'json',
                limit: '1'
            };

            const response: any[] = await firstValueFrom(
                this.http.get<any[]>(this.nominatimUrl, { params })
            );

            if (response && response.length > 0) {
                return {
                    lat: parseFloat(response[0].lat),
                    lng: parseFloat(response[0].lon)
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting coordinates:', error);
            return null;
        }
    }
}
