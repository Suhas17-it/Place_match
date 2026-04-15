// Service to handle nearby places search using OpenStreetMap (Overpass API)
// and AI suitability analysis (using Gemini API)

/**
 * Searches for nearby places using Overpass API (OpenStreetMap)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Array} selectedCategories - Selected category objects
 * @returns {Promise<Object>} - Object with needs and risks arrays
 */
export const searchNearbyPlaces = async (lat, lng, selectedCategories) => {
    console.log(`Searching for places near ${lat}, ${lng} for categories:`, selectedCategories.map(c => c.id));

    // Overpass API Query
    // We'll search for specific amenities within 2000 meters
    const radius = 4000;

    // Collect all types needed from selected categories
    const types = new Set();
    selectedCategories.forEach(cat => {
        cat.needs?.forEach(n => types.add(n.type));
        cat.risks?.forEach(r => types.add(r.type));
    });

    // Map our internal types to Overpass tags
    const typeMap = {
        'hospital': 'amenity=hospital',
        'school': 'amenity=school',
        'park': 'leisure=park',
        'restaurant': 'amenity=restaurant',
        'cafe': 'amenity=cafe',
        'pharmacy': 'amenity=pharmacy',
        'transit_station': 'type=route', // Simplified for transit
        'shopping_mall': 'shop=mall',
        'movie_theater': 'amenity=cinema',
        'gym': 'leisure=fitness_centre',
        'atm': 'amenity=atm',
        'convenience_store': 'shop=convenience',
        'place_of_worship': 'amenity=place_of_worship',
        'supermarket': 'shop=supermarket',
        'playground': 'leisure=playground',
        'industrial': 'landuse=industrial',
        'highway': 'highway=motorway',
        'liquor_store': 'shop=alcohol',
        'traffic': 'highway=traffic_signals',
        'college': 'amenity=college',
        'university': 'amenity=university',
        'noise': 'highway=motorway', // Will also check railway below
        'railway': 'railway=rail',
        'pub': 'amenity=pub',
        'bar': 'amenity=bar',
        'airport': 'aeroway=aerodrome'
    };

    // Build the Overpass Query
    let queryParts = [];
    types.forEach(type => {
        const tag = typeMap[type];
        if (tag) {
            queryParts.push(`node[${tag}](around:${radius},${lat},${lng});`);
            queryParts.push(`way[${tag}](around:${radius},${lat},${lng});`);
            queryParts.push(`relation[${tag}](around:${radius},${lat},${lng});`);
        }
    });

    const overpassQuery = `
    [out:json][timeout:25];
    (
      ${queryParts.join('\n      ')}
    );
    out center;
  `;

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: overpassQuery
        });

        if (!response.ok) throw new Error('Overpass API request failed');

        const data = await response.json();

        // Process results
        const results = {
            needs: [],
            risks: []
        };

        // Helper to calculate distance in km
        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Radius of the earth in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return parseFloat((R * c).toFixed(2));
        };
        data.elements.forEach(el => {
            const tags = el.tags || {};
            const placeLat = el.lat || (el.center && el.center.lat);
            const placeLng = el.lon || (el.center && el.center.lon);
            const name = tags.name || tags.amenity || tags.leisure || tags.shop || 'Nearby Facility';
            const distance = calculateDistance(lat, lng, placeLat, placeLng);

            // Determine if it's a need or risk based on selected categories
            let typeFound = null;
            let finalCategory = null;

            selectedCategories.forEach(cat => {
                if (!cat || finalCategory) return;

                // Check needs
                cat.needs?.forEach(n => {
                    const tagInfo = typeMap[n.type];
                    if (tagInfo) {
                        const [k, v] = tagInfo.split('=');
                        if (tags[k] === v) {
                            finalCategory = 'need';
                            typeFound = n.type;
                        }
                    }
                });

                // Check risks (overrides need if both exist, though unlikely)
                cat.risks?.forEach(r => {
                    const tagInfo = typeMap[r.type];
                    if (tagInfo) {
                        const [k, v] = tagInfo.split('=');

                        // Special handling for multi-tag risks
                        if (r.type === 'highway') {
                            // Busy roads
                            if (tags[k] === 'motorway' || tags[k] === 'primary' || tags[k] === 'secondary') {
                                finalCategory = 'risk';
                                typeFound = r.type;
                            }
                        } else if (r.type === 'noise') {
                            // Any loud facility
                            if (tags['highway'] === 'motorway' || tags['railway'] === 'rail' || tags['amenity'] === 'pub' || tags['amenity'] === 'bar' || tags['aeroway'] === 'aerodrome') {
                                finalCategory = 'risk';
                                typeFound = r.type;
                            }
                        } else if (tags[k] === v) {
                            finalCategory = 'risk';
                            typeFound = r.type;
                        }
                    }
                });
            });

            // ONLY add if we explicitly matched it to a requirement
            if (finalCategory) {
                const processedPlace = {
                    name,
                    distance,
                    lat: placeLat,
                    lng: placeLng,
                    type: typeFound,
                    category: finalCategory
                };

                if (finalCategory === 'need') {
                    results.needs.push(processedPlace);
                } else {
                    results.risks.push(processedPlace);
                }
            }
        });

        // Sort by distance and remove duplicates
        const filterAndSort = (items) => {
            return items
                .sort((a, b) => a.distance - b.distance)
                .filter((v, i, a) => a.findIndex(t => (t.name === v.name && t.type === v.type)) === i);
        };

        results.needs = filterAndSort(results.needs).slice(0, 15);
        results.risks = filterAndSort(results.risks).slice(0, 10);

        return results;

    } catch (error) {
        console.error('Error fetching from Overpass API:', error);
        // Fallback if API fails (could use mock data or empty results)
        return { needs: [], risks: [] };
    }
};

/**
 * Generates an AI suitability analysis using Gemini API (or simulated if no key)
 * @param {Object} location - Latitude and Longitude
 * @param {Array} selectedCategories - Selected category objects
 * @param {Object} nearbyPlaces - Results from searchNearbyPlaces
 * @returns {Promise<Object>} - Suitability summary and score
 */
export const generateSuitabilityAnalysis = async (location, selectedCategories, nearbyPlaces) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const categoryNames = selectedCategories.map(c => c.name).join(', ');

    const prompt = `
    Analyze the suitability of a location for ${categoryNames}.
    Location Coordinates: ${location.latitude}, ${location.longitude}
    Nearby Amenities Found: ${nearbyPlaces.needs.map(p => `${p.name} (${p.distance}km)`).join(', ')}
    Potential Risks/Disadvantages: ${nearbyPlaces.risks.map(p => `${p.name} (${p.distance}km)`).join(', ')}
    
    Please provide:
    1. A concise, professional suitability summary (approx 100 words).
    2. A suitability score from 0-100 based on the balance of needs and risks.
    
    Return the response in this EXACT format:
    Summary: [Your summary here]
    Score: [Number only]
  `;

    if (!apiKey) {
        console.warn('Gemini API key not found. Using simulated analysis.');
        return simulateAnalysis(categoryNames, nearbyPlaces);
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const summaryMatch = text.match(/Summary: ([\s\S]*?)(?=Score:|$)/);
        const scoreMatch = text.match(/Score: (\d+)/);

        return {
            summary: summaryMatch ? summaryMatch[1].trim() : 'Unable to generate summary.',
            score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
            needsCount: nearbyPlaces.needs.length,
            risksCount: nearbyPlaces.risks.length
        };

    } catch (error) {
        console.error('Gemini API Error:', error);
        return simulateAnalysis(categoryNames, nearbyPlaces);
    }
};

const simulateAnalysis = (categoryNames, nearbyPlaces) => {
    const needsCount = nearbyPlaces.needs.length;
    const risksCount = nearbyPlaces.risks.length;
    const score = Math.min(100, Math.round(((needsCount + 1) / (needsCount + risksCount + 1)) * 100));

    return {
        summary: `Based on our automated scan, this area is reasonably suited for ${categoryNames}. We found ${needsCount} relevant amenities and ${risksCount} potential risk factors. The proximity to key facilities suggests moderate convenience. (Note: Real AI analysis requires a Gemini API key).`,
        score,
        needsCount,
        risksCount
    };
};
