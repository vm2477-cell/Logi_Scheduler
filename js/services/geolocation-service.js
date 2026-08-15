// js/services/geolocation-service.js

export class GeolocationService {
    constructor() {
        this.watcherId = null;
    }

    startWatching(onUpdate, onError) {
        if (!('geolocation' in navigator)) {
            onError(new Error('이 브라우저에서는 GPS 기능을 지원하지 않습니다.'));
            return;
        }

        if (this.watcherId !== null) {
            this.stopWatching();
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        this.watcherId = navigator.geolocation.watchPosition(onUpdate, onError, options);
        return this.watcherId;
    }

    stopWatching() {
        if (this.watcherId !== null && 'geolocation' in navigator) {
            navigator.geolocation.clearWatch(this.watcherId);
            this.watcherId = null;
        }
    }

    /**
     * 두 지점 간의 거리를 미터(m) 단위로 계산합니다 (Haversine 공식).
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        if ((lat1 == lat2) && (lon1 == lon2)) {
            return 0;
        }

        const R = 6371e3; // 지구 반지름 (미터)
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    requestPermission() {
        return new Promise((resolve, reject) => {
            if (!('geolocation' in navigator)) {
                return reject('GPS 미지원 브라우저');
            }
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
    }
}