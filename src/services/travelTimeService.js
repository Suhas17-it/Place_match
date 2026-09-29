/**
 * Service to calculate realistic travel times and routing distances (Walking & Driving)
 * using OSRM (Open Source Routing Machine) public routing API with instantaneous fallback models.
 */

// In-memory cache for computed travel times to avoid duplicate API calls
const routeCache = new Map();

/**
 * Calculates straight line (Haversine) distance in km
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
};

/**
 * Fallback estimation formula based on urban road network circuity
 * @param {number} straightDistanceKm - Haversine distance in km
 * @returns {Object} { walkDist, walkTimeMin, driveDist, driveTimeMin }
 */
export const estimateTravelTimeFallback = (straightDistanceKm) => {
    // Urban road circuity factor (~1.3x straight line distance)
    const walkCircuity = 1.25;
    const driveCircuity = 1.35;

    const walkDist = parseFloat((straightDistanceKm * walkCircuity).toFixed(2));
    const driveDist = parseFloat((straightDistanceKm * driveCircuity).toFixed(2));

    // Average speeds: Walking ~4.8 km/h (80m/min), Urban Driving ~28 km/h
    const walkTimeMin = Math.max(1, Math.round((walkDist / 4.8) * 60));
    const driveTimeMin = Math.max(1, Math.round((driveDist / 28) * 60));

    return {
        walkDist,
        walkTimeMin,
        driveDist,
        driveTimeMin
    };
};

/**
 * Fetch routing details for a single origin & destination from OSRM
 * @param {number} startLat
 * @param {number} startLng
 * @param {number} endLat
 * @param {number} endLng
 * @returns {Promise<Object>} { walkDist, walkTimeMin, driveDist, driveTimeMin }
 */
export const getTravelTime = async (startLat, startLng, endLat, endLng) => {
    const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}->${endLat.toFixed(4)},${endLng.toFixed(4)}`;
    if (routeCache.has(cacheKey)) {
        return routeCache.get(cacheKey);
    }

    const straightDist = calculateHaversineDistance(startLat, startLng, endLat, endLng);
    const fallback = estimateTravelTimeFallback(straightDist);

    // If extremely close (< 100 meters), return direct walking
    if (straightDist < 0.1) {
        const result = {
            walkDist: straightDist,
            walkTimeMin: 1,
            driveDist: straightDist,
            driveTimeMin: 1,
            isEstimate: false
        };
        routeCache.set(cacheKey, result);
        return result;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for fast response

        // OSRM expects coordinates as Lng,Lat
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`;

        const response = await fetch(osrmUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const driveDistKm = parseFloat((route.distance / 1000).toFixed(2));
                const driveTimeMin = Math.max(1, Math.round(route.duration / 60));

                // Estimate walk based on walk speed & slightly shorter walk path
                const walkDistKm = parseFloat((straightDist * 1.25).toFixed(2));
                const walkTimeMin = Math.max(1, Math.round((walkDistKm / 4.8) * 60));

                const result = {
                    walkDist: walkDistKm,
                    walkTimeMin,
                    driveDist: driveDistKm,
                    driveTimeMin,
                    isEstimate: false
                };
                routeCache.set(cacheKey, result);
                return result;
            }
        }
    } catch (err) {
        // Fallback silently without throwing errors
    }

    // Cache fallback if OSRM is unreachable
    routeCache.set(cacheKey, fallback);
    return fallback;
};

/**
 * Batch enriches a list of place items with realistic travel time metrics
 * @param {number} originLat
 * @param {number} originLng
 * @param {Array} placesList
 * @returns {Promise<Array>} Array of places with added travelTime properties
 */
export const enrichPlacesWithTravelTimes = async (originLat, originLng, placesList) => {
    if (!placesList || placesList.length === 0) return [];

    const enriched = await Promise.all(
        placesList.map(async (place) => {
            const travel = await getTravelTime(originLat, originLng, place.lat, place.lng);
            return {
                ...place,
                travelTime: travel
            };
        })
    );

    return enriched;
};
