/**
 * Service for managing user's saved/favorite locations in LocalStorage.
 */

const FAVORITES_STORAGE_KEY = 'placematch_favorite_locations';

/**
 * Get all saved favorite locations.
 * @returns {Array} List of favorite location objects
 */
export const getFavorites = () => {
    try {
        const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to parse favorites from LocalStorage:', e);
        return [];
    }
};

/**
 * Save a new location to favorites.
 * @param {Object} location - { name, lat, lng, notes, lastScore }
 * @returns {Array} Updated list of favorites
 */
export const saveFavorite = (location) => {
    const favorites = getFavorites();
    const newFav = {
        id: location.id || `fav_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: location.name || `Location (${location.lat.toFixed(3)}, ${location.lng.toFixed(3)})`,
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        notes: location.notes || '',
        createdAt: new Date().toISOString(),
        lastScore: location.lastScore ?? null
    };

    // Prevent exact duplicates within ~100m
    const exists = favorites.some(
        f => Math.abs(f.lat - newFav.lat) < 0.001 && Math.abs(f.lng - newFav.lng) < 0.001
    );

    if (exists) {
        return favorites;
    }

    const updated = [newFav, ...favorites];
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to save favorite to LocalStorage:', e);
    }
    return updated;
};

/**
 * Remove a favorite by ID.
 * @param {string} id - Favorite item ID
 * @returns {Array} Updated list of favorites
 */
export const removeFavorite = (id) => {
    const favorites = getFavorites();
    const updated = favorites.filter(f => f.id !== id);
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to update favorites in LocalStorage:', e);
    }
    return updated;
};

/**
 * Update notes or name for a favorite.
 * @param {string} id
 * @param {Object} updates - { name, notes }
 * @returns {Array} Updated list of favorites
 */
export const updateFavorite = (id, updates) => {
    const favorites = getFavorites();
    const updated = favorites.map(f => {
        if (f.id === id) {
            return { ...f, ...updates };
        }
        return f;
    });
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to update favorite in LocalStorage:', e);
    }
    return updated;
};

/**
 * Check if a specific lat/lng location is saved as favorite.
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
export const isFavorite = (lat, lng) => {
    if (!lat || !lng) return false;
    const favorites = getFavorites();
    return favorites.some(
        f => Math.abs(f.lat - lat) < 0.001 && Math.abs(f.lng - lng) < 0.001
    );
};
