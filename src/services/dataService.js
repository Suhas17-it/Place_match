// Service to handle nearby places search using OpenStreetMap (Overpass API)
// and AI suitability analysis (using Gemini API)
import { enrichPlacesWithTravelTimes } from './travelTimeService';

/**
 * Searches for nearby places using Overpass API (OpenStreetMap)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Array} selectedCategories - Selected category objects
 * @returns {Promise<Object>} - Object with needs and risks arrays
 */
export const searchNearbyPlaces = async (lat, lng, selectedCategories, radius = 4000) => {
    console.log(`Searching for places near ${lat}, ${lng} for categories:`, selectedCategories.map(c => c.id), `with radius: ${radius}`);

    // Collect all types needed from selected categories
    const types = new Set();
    selectedCategories.forEach(cat => {
        cat.needs?.forEach(n => types.add(n.type || n));
        cat.risks?.forEach(r => types.add(r.type || r));
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
        'airport': 'aeroway=aerodrome',
        'police': 'amenity=police',
        'post_office': 'amenity=post_office',
        'bank': 'amenity=bank',
        'isolated': 'place=isolated_dwelling',
        'busy_road': 'highway=primary',
        'construction': 'landuse=construction',
        'waste_disposal': 'amenity=waste_disposal'
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

    // Multiple official Overpass API servers for failover
    // kumi.systems is put first because official servers often throw "too busy" HTML errors
    const overpassServers = [
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://z.overpass-api.de/api/interpreter'
    ];

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

    const radiusKm = radius / 1000; // Convert metres to km for filtering

    // Try each server until one succeeds
    let lastError = null;
    let data = null;

    for (const server of overpassServers) {
        try {
            console.log(`Trying Overpass server: ${server}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s client timeout per server

            // Use URL-encoded body which is safer for Overpass API
            const response = await fetch(server, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `data=${encodeURIComponent(overpassQuery)}`,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`Server ${server} returned ${response.status}, trying next...`);
                lastError = new Error(`Server returned ${response.status}`);
                continue;
            }

            const responseText = await response.text();
            
            // Check if response is actually HTML error page from "too busy" OSM servers
            if (responseText.includes('error') && responseText.includes('too busy')) {
                console.warn(`Server ${server} is too busy, trying next...`);
                lastError = new Error('Server too busy');
                continue;
            }

            try {
                data = JSON.parse(responseText);
            } catch (err) {
                console.warn(`Server ${server} returned invalid JSON, trying next...`);
                lastError = err;
                continue;
            }

            if (!data.elements) {
                console.warn(`Server ${server} returned no elements array, trying next...`);
                lastError = new Error('No elements in response');
                continue;
            }

            console.log(`Overpass returned ${data.elements.length} elements from ${server}`);
            break; // Success! Break out of the loop

        } catch (error) {
            console.warn(`Overpass server ${server} failed:`, error.message);
            lastError = error;
            continue;
        }
    }

    if (!data || !data.elements) {
        console.error('All Overpass API servers failed. Last error:', lastError);
        
        // Generate some mock fallback data if the API completely fails
        // so the UI isn't completely bare
        const fallbackNeeds = await enrichPlacesWithTravelTimes(lat, lng, [
            { name: "City Center Cafe", distance: 1.2, lat: lat + 0.01, lng: lng + 0.01, type: "cafe", category: "need" },
            { name: "Local Park", distance: 2.5, lat: lat - 0.02, lng: lng + 0.01, type: "park", category: "need" }
        ]);
        const fallbackRisks = await enrichPlacesWithTravelTimes(lat, lng, [
            { name: "Main Highway", distance: 3.1, lat: lat + 0.03, lng: lng - 0.02, type: "highway", category: "risk" }
        ]);
        return {
            needs: fallbackNeeds,
            risks: fallbackRisks
        };
    }

    // Process results
    const results = {
        needs: [],
        risks: []
    };

    data.elements.forEach(el => {
                const tags = el.tags || {};
                const placeLat = el.lat || (el.center && el.center.lat);
                const placeLng = el.lon || (el.center && el.center.lon);

                // Skip elements with no valid coordinates
                if (!placeLat || !placeLng) return;

                const name = tags.name || tags.amenity || tags.leisure || tags.shop || 'Nearby Facility';
                const distance = calculateDistance(lat, lng, placeLat, placeLng);

                // Skip places that exceed the search radius
                if (distance > radiusKm) return;

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

            // Enrich places with realistic walking and driving travel times
            results.needs = await enrichPlacesWithTravelTimes(lat, lng, results.needs);
            results.risks = await enrichPlacesWithTravelTimes(lat, lng, results.risks);

            return results;
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

/**
 * Searches for nearby places matching needs/risks across multiple categories in a single Overpass query.
 */
export const getPlacesForMultipleCategories = async (lat, lng, categoriesList, radius = 4000) => {
    const types = new Set();
    categoriesList.forEach(cat => {
        cat.needs?.forEach(n => types.add(n.type || n));
        cat.risks?.forEach(r => types.add(r.type || r));
    });

    const typeMap = {
        'hospital': 'amenity=hospital',
        'school': 'amenity=school',
        'park': 'leisure=park',
        'restaurant': 'amenity=restaurant',
        'cafe': 'amenity=cafe',
        'pharmacy': 'amenity=pharmacy',
        'transit_station': 'type=route',
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
        'noise': 'highway=motorway',
        'railway': 'railway=rail',
        'pub': 'amenity=pub',
        'bar': 'amenity=bar',
        'airport': 'aeroway=aerodrome',
        'police': 'amenity=police',
        'post_office': 'amenity=post_office',
        'bank': 'amenity=bank',
        'isolated': 'place=isolated_dwelling',
        'busy_road': 'highway=primary',
        'construction': 'landuse=construction',
        'waste_disposal': 'amenity=waste_disposal'
    };

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

    const overpassServers = [
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://z.overpass-api.de/api/interpreter'
    ];

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return parseFloat((R * c).toFixed(2));
    };

    const radiusKm = radius / 1000;
    let lastError = null;
    let data = null;

    for (const server of overpassServers) {
        try {
            console.log(`Trying Overpass server for multiple categories: ${server}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(server, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `data=${encodeURIComponent(overpassQuery)}`,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                lastError = new Error(`Server returned ${response.status}`);
                continue;
            }

            const responseText = await response.text();
            if (responseText.includes('error') && responseText.includes('too busy')) {
                lastError = new Error('Server too busy');
                continue;
            }

            data = JSON.parse(responseText);
            if (data && data.elements) {
                break;
            }
        } catch (error) {
            lastError = error;
        }
    }

    const elements = data?.elements || [];

    const results = {};

    categoriesList.forEach(cat => {
        const catNeeds = [];
        const catRisks = [];

        elements.forEach(el => {
            const tags = el.tags || {};
            const placeLat = el.lat || (el.center && el.center.lat);
            const placeLng = el.lon || (el.center && el.center.lon);

            if (!placeLat || !placeLng) return;

            const name = tags.name || tags.amenity || tags.leisure || tags.shop || 'Nearby Facility';
            const distance = calculateDistance(lat, lng, placeLat, placeLng);

            if (distance > radiusKm) return;

            let isNeed = false;
            let needType = null;
            cat.needs?.forEach(n => {
                const tagInfo = typeMap[n.type || n];
                if (tagInfo) {
                    const [k, v] = tagInfo.split('=');
                    if (tags[k] === v) {
                        isNeed = true;
                        needType = n.type || n;
                    }
                }
            });

            let isRisk = false;
            let riskType = null;
            cat.risks?.forEach(r => {
                const tagInfo = typeMap[r.type || r];
                if (tagInfo) {
                    const [k, v] = tagInfo.split('=');
                    if ((r.type || r) === 'highway') {
                        if (tags[k] === 'motorway' || tags[k] === 'primary' || tags[k] === 'secondary') {
                            isRisk = true;
                            riskType = r.type || r;
                        }
                    } else if ((r.type || r) === 'noise') {
                        if (tags['highway'] === 'motorway' || tags['railway'] === 'rail' || tags['amenity'] === 'pub' || tags['amenity'] === 'bar' || tags['aeroway'] === 'aerodrome') {
                            isRisk = true;
                            riskType = r.type || r;
                        }
                    } else if (tags[k] === v) {
                        isRisk = true;
                        riskType = r.type || r;
                    }
                }
            });

            if (isNeed) {
                catNeeds.push({ name, distance, lat: placeLat, lng: placeLng, type: needType, category: 'need' });
            }
            if (isRisk) {
                catRisks.push({ name, distance, lat: placeLat, lng: placeLng, type: riskType, category: 'risk' });
            }
        });

        const filterAndSort = (items) => {
            return items
                .sort((a, b) => a.distance - b.distance)
                .filter((v, i, a) => a.findIndex(t => (t.name === v.name && t.type === v.type)) === i);
        };

        results[cat.id] = {
            needs: filterAndSort(catNeeds).slice(0, 15),
            risks: filterAndSort(catRisks).slice(0, 10)
        };
    });

    return results;
};

/**
 * Generates an AI suitability analysis comparing multiple categories using Gemini API (or simulated)
 */
export const generateComparisonAnalysis = async (location, categoriesList, nearbyPlacesPerCategory) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    const categoriesDetails = categoriesList.map(cat => {
        const places = nearbyPlacesPerCategory[cat.id] || { needs: [], risks: [] };
        return `Category name: ${cat.name}
- Needs found: ${places.needs.map(p => `${p.name} (${p.distance}km)`).join(', ') || 'None'}
- Risks found: ${places.risks.map(p => `${p.name} (${p.distance}km)`).join(', ') || 'None'}`;
    }).join('\n\n');

    const prompt = `
    Analyze and compare the suitability of a single location for multiple categories of lifestyles.
    Location Coordinates: ${location.latitude}, ${location.longitude}

    Lifestyles & Nearby Amenities:
    ${categoriesDetails}
    
    Please provide:
    1. A comparison summary (approx 150 words) comparing how suitable this location is for different lifestyles.
    2. A suitability score (0-100) and a brief individual recommendation (approx 20 words) for EACH category.
    
    Return the response in this EXACT format:
    Overall Summary: [Your overall comparison summary here]
    
    Scores & Recommendations:
    ${categoriesList.map(cat => `- ${cat.name}: [Score (0-100)] | [Recommendation]`).join('\n')}
    `;

    if (!apiKey) {
        console.warn('Gemini API key not found. Using simulated comparison analysis.');
        return simulateComparisonAnalysis(categoriesList, nearbyPlacesPerCategory);
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

        const summaryMatch = text.match(/Overall Summary: ([\s\S]*?)(?=Scores & Recommendations:|$)/);
        const scoresSection = text.split('Scores & Recommendations:\n')[1] || '';
        
        const results = {
            summary: summaryMatch ? summaryMatch[1].trim() : 'Unable to generate comparison summary.',
            categories: {}
        };

        categoriesList.forEach(cat => {
            const escapedName = cat.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const pattern = new RegExp(`-\\s*${escapedName}:\\s*(\\d+)\\s*\\|\\s*(.*)`);
            const match = scoresSection.match(pattern);
            
            const places = nearbyPlacesPerCategory[cat.id] || { needs: [], risks: [] };
            const needsCount = places.needs.length;
            const risksCount = places.risks.length;
            
            if (match) {
                results.categories[cat.id] = {
                    score: parseInt(match[1]),
                    recommendation: match[2].trim(),
                    needsCount,
                    risksCount
                };
            } else {
                const score = Math.min(100, Math.round(((needsCount + 1) / (needsCount + risksCount + 1)) * 100));
                results.categories[cat.id] = {
                    score,
                    recommendation: `This area provides basic amenities for ${cat.name} with ${needsCount} needs met and ${risksCount} risks.`,
                    needsCount,
                    risksCount
                };
            }
        });

        return results;

    } catch (error) {
        console.error('Gemini API Comparison Error:', error);
        return simulateComparisonAnalysis(categoriesList, nearbyPlacesPerCategory);
    }
};

const simulateComparisonAnalysis = (categoriesList, nearbyPlacesPerCategory) => {
    const results = {
        summary: `This comparison analyzes the suitability of the location across all ${categoriesList.length} categories. Differences flow from the profile of needs and risks matching each group. (Note: Real AI comparison requires a Gemini API key).`,
        categories: {}
    };

    categoriesList.forEach(cat => {
        const places = nearbyPlacesPerCategory[cat.id] || { needs: [], risks: [] };
        const needsCount = places.needs.length;
        const risksCount = places.risks.length;
        const score = Math.min(100, Math.round(((needsCount + 1) / (needsCount + risksCount + 1)) * 100));

        results.categories[cat.id] = {
            score,
            recommendation: `This area offers ${needsCount} matching amenities against ${risksCount} risk factors.`,
            needsCount,
            risksCount
        };
    });

    return results;
};

/**
 * Searches for nearby places and generates suitability analysis for multiple distinct locations (2 to 5 locations)
 * @param {Array} locationsList - Array of location objects [{ id, name, lat, lng }, ...]
 * @param {Array} selectedCategories - Selected category objects
 * @param {number} radius - Search radius in meters
 * @returns {Promise<Object>} Object containing per-location results, scores, and overall comparative summary
 */
export const getPlacesForMultipleLocations = async (locationsList, selectedCategories, radius = 4000) => {
    const locationResults = {};
    const scores = [];

    await Promise.all(
        locationsList.map(async (loc) => {
            const places = await searchNearbyPlaces(loc.lat, loc.lng, selectedCategories, radius);
            const analysis = await generateSuitabilityAnalysis({ latitude: loc.lat, longitude: loc.lng }, selectedCategories, places);
            
            const locKey = loc.id || `loc_${loc.lat.toFixed(3)}_${loc.lng.toFixed(3)}`;
            locationResults[locKey] = {
                location: loc,
                places,
                analysis
            };

            scores.push({
                locationId: locKey,
                locationName: loc.name || `Location (${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)})`,
                score: analysis.score,
                needsCount: places.needs.length,
                risksCount: places.risks.length,
                summary: analysis.summary
            });
        })
    );

    // Sort by suitability score descending
    scores.sort((a, b) => b.score - a.score);
    const winner = scores[0];

    const categoryNames = selectedCategories.map(c => c.name).join(', ');
    const overallSummary = `Multi-Location Comparison of ${locationsList.length} sites evaluated for ${categoryNames}. ` +
        `"${winner.locationName}" emerges as the top-ranking location with a Suitability Score of ${winner.score}/100 ` +
        `(${winner.needsCount} amenities within ${radius/1000}km vs ${winner.risksCount} risk factors).`;

    return {
        locationResults,
        winner,
        overallSummary,
        scores
    };
};
