// Comprehensive lists of all possible needs and risks for dropdown selection
export const allPossibleNeeds = [
    { name: 'Parks', type: 'park', icon: '🌳' },
    { name: 'Restaurants', type: 'restaurant', icon: '🍴' },
    { name: 'Shopping Malls', type: 'shopping_mall', icon: '🛍️' },
    { name: 'Cafes', type: 'cafe', icon: '☕' },
    { name: 'Movie Theaters', type: 'movie_theater', icon: '🎬' },
    { name: 'Public Transport', type: 'transit_station', icon: '🚌' },
    { name: 'Gyms', type: 'gym', icon: '💪' },
    { name: 'ATMs', type: 'atm', icon: '🏧' },
    { name: 'Convenience Stores', type: 'convenience_store', icon: '🛒' },
    { name: 'Hospitals', type: 'hospital', icon: '🏥' },
    { name: 'Pharmacies', type: 'pharmacy', icon: '💊' },
    { name: 'Temples/Churches', type: 'place_of_worship', icon: '⛪' },
    { name: 'Grocery Stores', type: 'supermarket', icon: '🥩' },
    { name: 'Schools', type: 'school', icon: '🏫' },
    { name: 'Playgrounds', type: 'playground', icon: '🪁' },
    { name: 'Libraries', type: 'library', icon: '📚' },
    { name: 'Colleges', type: 'college', icon: '🎓' },
    { name: 'Universities', type: 'university', icon: '📜' },
    { name: 'Pubs', type: 'pub', icon: '🍺' },
    { name: 'Bars', type: 'bar', icon: '🍸' },
    { name: 'Airports', type: 'airport', icon: '✈️' },
    { name: 'Police Stations', type: 'police', icon: '👮' },
    { name: 'Post Offices', type: 'post_office', icon: '📮' },
    { name: 'Banks', type: 'bank', icon: '🏦' }
];

export const allPossibleRisks = [
    { name: 'Industrial Areas', type: 'industrial', icon: '🏭' },
    { name: 'Highways', type: 'highway', icon: '🛣️' },
    { name: 'Noisy Areas', type: 'noise', icon: '🔊' },
    { name: 'Isolated Areas', type: 'isolated', icon: '🏚️' },
    { name: 'Busy Roads', type: 'busy_road', icon: '🚗' },
    { name: 'Bars/Liquor Stores', type: 'liquor_store', icon: '🍷' },
    { name: 'Busy Traffic Areas', type: 'traffic', icon: '🚥' },
    { name: 'Railway Tracks', type: 'railway', icon: '🚂' },
    { name: 'Construction Sites', type: 'construction', icon: '🏗️' },
    { name: 'Garbage Dumps', type: 'waste_disposal', icon: '🗑️' }
];

// Category definitions with default needs and risks
export const categories = {
    couples: {
        id: 'couples',
        name: 'Couples',
        icon: '💑',
        defaultNeeds: ['park', 'restaurant', 'shopping_mall', 'cafe', 'movie_theater'],
        defaultRisks: ['industrial', 'highway', 'noise']
    },
    bachelors: {
        id: 'bachelors',
        name: 'Bachelors',
        icon: '🏠',
        defaultNeeds: ['transit_station', 'restaurant', 'gym', 'atm', 'convenience_store', 'college'],
        defaultRisks: ['isolated']
    },
    oldAge: {
        id: 'oldAge',
        name: 'Old Age People',
        icon: '👴',
        defaultNeeds: ['hospital', 'pharmacy', 'park', 'place_of_worship', 'supermarket'],
        defaultRisks: ['highway', 'noise']
    },
    schoolChildren: {
        id: 'schoolChildren',
        name: 'School Children',
        icon: '🎒',
        defaultNeeds: ['school', 'playground', 'park', 'library'],
        defaultRisks: ['highway', 'liquor_store', 'industrial', 'traffic']
    },
    comparison: {
        id: 'comparison',
        name: 'ComParison',
        icon: '📊',
        defaultNeeds: [],
        defaultRisks: []
    }
};

export const getCategoryById = (id) => {
    return categories[id];
};

export const getAllCategories = () => {
    return Object.values(categories);
};

