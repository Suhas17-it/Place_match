// Category definitions with default needs and risks
export const categories = {
    couples: {
        id: 'couples',
        name: 'Couples',
        icon: '💑',
        needs: [
            { name: 'Parks', type: 'park', importance: 'high' },
            { name: 'Restaurants', type: 'restaurant', importance: 'high' },
            { name: 'Shopping Malls', type: 'shopping_mall', importance: 'medium' },
            { name: 'Cafes', type: 'cafe', importance: 'medium' },
            { name: 'Movie Theaters', type: 'movie_theater', importance: 'low' }
        ],
        risks: [
            { name: 'Industrial Areas', type: 'industrial', importance: 'high' },
            { name: 'Highways', type: 'highway', importance: 'medium' },
            { name: 'Noisy Areas', type: 'noise', importance: 'low' }
        ]
    },
    bachelors: {
        id: 'bachelors',
        name: 'Bachelors',
        icon: '🏠',
        needs: [
            { name: 'Public Transport', type: 'transit_station', importance: 'high' },
            { name: 'Restaurants', type: 'restaurant', importance: 'high' },
            { name: 'Gyms', type: 'gym', importance: 'medium' },
            { name: 'ATMs', type: 'atm', importance: 'medium' },
            { name: 'Convenience Stores', type: 'convenience_store', importance: 'high' },
            { name: 'College', type: 'college', importance: 'high' },
            { name: 'college', type: 'college', importance: 'high' }
        ],
        risks: [
            { name: 'Isolated Areas', type: 'isolated', importance: 'high' },
            { name: 'Far from City Center', type: 'remote', importance: 'medium' }
        ]
    },
    oldAge: {
        id: 'oldAge',
        name: 'Old Age People',
        icon: '👴',
        needs: [
            { name: 'Hospitals', type: 'hospital', importance: 'high' },
            { name: 'Pharmacies', type: 'pharmacy', importance: 'high' },
            { name: 'Parks', type: 'park', importance: 'medium' },
            { name: 'Temples/Churches', type: 'place_of_worship', importance: 'medium' },
            { name: 'Grocery Stores', type: 'supermarket', importance: 'high' }
        ],
        risks: [
            { name: 'Steep Hills', type: 'steep_terrain', importance: 'high' },
            { name: 'Busy Roads', type: 'highway', importance: 'high' },
            { name: 'Noisy Areas', type: 'noise', importance: 'medium' },
            { name: 'Far from Medical Facilities', type: 'remote_medical', importance: 'high' }
        ]
    },
    schoolChildren: {
        id: 'schoolChildren',
        name: 'School Children',
        icon: '🎒',
        needs: [
            { name: 'Schools', type: 'school', importance: 'high' },
            { name: 'Playgrounds', type: 'playground', importance: 'high' },
            { name: 'Parks', type: 'park', importance: 'medium' },
            { name: 'Libraries', type: 'library', importance: 'medium' },
            { name: 'Safe Neighborhoods', type: 'residential', importance: 'high' }
        ],
        risks: [
            { name: 'Highways', type: 'highway', importance: 'high' },
            { name: 'Bars/Liquor Stores', type: 'liquor_store', importance: 'high' },
            { name: 'Industrial Areas', type: 'industrial', importance: 'high' },
            { name: 'Busy Traffic Areas', type: 'traffic', importance: 'medium' }
        ]
    }
};

export const getCategoryById = (id) => {
    return categories[id];
};

export const getAllCategories = () => {
    return Object.values(categories);
};
