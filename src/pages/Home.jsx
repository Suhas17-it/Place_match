import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from '../components/Map';
import { saveFavorite, isFavorite } from '../services/favoritesService';
import './Home.css';

const SLOT_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#10b981'];

function Home() {
    const navigate = useNavigate();

    // Mode: 'single' or 'multi'
    const [mode, setMode] = useState('single');

    // Single Location State
    const [submittedLat, setSubmittedLat] = useState(null);
    const [submittedLng, setSubmittedLng] = useState(null);
    const [locationName, setLocationName] = useState('Primary Location');
    const [savedNotice, setSavedNotice] = useState(false);

    // Multi-Location State (2-5 locations)
    const [activeSlotIndex, setActiveSlotIndex] = useState(0);
    const [locations, setLocations] = useState([
        { id: 'loc_1', name: 'Location A (Downtown)', lat: null, lng: null },
        { id: 'loc_2', name: 'Location B (Suburbs)', lat: null, lng: null }
    ]);

    const handleSingleLocationSelect = (lat, lng) => {
        setSubmittedLat(lat);
        setSubmittedLng(lng);
    };

    const handleMultiLocationSelect = (lat, lng, slotIndex) => {
        const targetIdx = slotIndex !== undefined ? slotIndex : activeSlotIndex;
        const updated = [...locations];
        if (updated[targetIdx]) {
            updated[targetIdx] = {
                ...updated[targetIdx],
                lat,
                lng
            };
            setLocations(updated);

            // Move active slot to next unpinned location if available
            const nextEmptyIdx = updated.findIndex((loc, i) => i > targetIdx && (loc.lat === null || loc.lng === null));
            if (nextEmptyIdx !== -1) {
                setActiveSlotIndex(nextEmptyIdx);
            }
        }
    };

    const handleAddSlot = () => {
        if (locations.length >= 5) {
            alert('You can compare up to 5 locations maximum.');
            return;
        }
        const nextLetter = String.fromCharCode(65 + locations.length);
        const newSlot = {
            id: `loc_${Date.now()}`,
            name: `Location ${nextLetter}`,
            lat: null,
            lng: null
        };
        setLocations([...locations, newSlot]);
        setActiveSlotIndex(locations.length);
    };

    const handleRemoveSlot = (index) => {
        if (locations.length <= 2) {
            alert('Multi-location comparison requires at least 2 locations.');
            return;
        }
        const updated = locations.filter((_, i) => i !== index);
        setLocations(updated);
        setActiveSlotIndex(Math.max(0, index - 1));
    };

    const handleUpdateSlotName = (index, name) => {
        const updated = [...locations];
        updated[index].name = name;
        setLocations(updated);
    };

    const handleSaveCurrentSingleFavorite = () => {
        if (!submittedLat || !submittedLng) return;
        saveFavorite({
            name: locationName,
            lat: submittedLat,
            lng: submittedLng,
            notes: 'Saved from map pin'
        });
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3000);
    };

    const handleReset = () => {
        setSubmittedLat(null);
        setSubmittedLng(null);
    };

    const handleNext = () => {
        if (mode === 'single') {
            if (!submittedLat || !submittedLng) {
                alert('Please click on the map to pin your target location.');
                return;
            }
            navigate('/categories', {
                state: {
                    latitude: submittedLat,
                    longitude: submittedLng,
                    locationName: locationName
                }
            });
        } else {
            const validLocations = locations.filter(l => l.lat !== null && l.lng !== null);
            if (validLocations.length < 2) {
                alert('Please pin at least 2 locations on the map for side-by-side comparison.');
                return;
            }
            navigate('/categories', {
                state: {
                    locations: validLocations,
                    isMultiLocationMode: true
                }
            });
        }
    };

    const validPinnedCount = locations.filter(l => l.lat !== null && l.lng !== null).length;

    return (
        <div className="app">
            {/* Background Animation Decorations */}
            <div className="bg-decorations">
                <div className="decor-circle circle-1"></div>
                <div className="decor-circle circle-2"></div>
                <div className="decor-circle circle-3"></div>
            </div>

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Find Your Perfect Location
                        </h1>
                        <p className="hero-subtitle">
                            Discover if a location suits your lifestyle needs with AI-powered insights & realistic travel-time routing
                        </p>

                        {/* Feature Highlights */}
                        <div className="feature-highlights">
                            <div className="feature-item">
                                <div className="feature-icon">🗺️</div>
                                <span className="feature-label">Map Search</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon">📊</div>
                                <span className="feature-label">Multi-Site Compare</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon">🚗</div>
                                <span className="feature-label">Travel Times</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon">🤖</div>
                                <span className="feature-label">AI Analysis</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mode Switcher */}
            <div className="container">
                <div className="mode-switcher-container">
                    <div className="mode-switcher-tabs">
                        <button
                            className={`mode-tab ${mode === 'single' ? 'active' : ''}`}
                            onClick={() => setMode('single')}
                        >
                            📍 Single Location Analysis
                        </button>
                        <button
                            className={`mode-tab ${mode === 'multi' ? 'active' : ''}`}
                            onClick={() => setMode('multi')}
                        >
                            📊 Compare 2–5 Locations Side-by-Side
                        </button>
                    </div>
                </div>
            </div>

            {/* Map Section */}
            <section className="map-section" style={{ paddingBottom: '4rem' }}>
                <div className="container">
                    <div className="glass-card map-card" style={{ padding: '2rem' }}>
                        
                        {mode === 'single' ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h2>Pin Location on Map</h2>
                                    <p style={{ color: 'var(--text-secondary)' }}>
                                        Click anywhere on the map to pin your desired location.
                                    </p>
                                </div>

                                <div className="button-group" style={{ margin: 0 }}>
                                    {(submittedLat && submittedLng) && (
                                        <>
                                            <span className="location-selected-badge">
                                                ✓ Location Pinned
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={handleSaveCurrentSingleFavorite}
                                            >
                                                {savedNotice ? '⭐ Saved!' : (isFavorite(submittedLat, submittedLng) ? '⭐ Saved' : '⭐ Save to Favorites')}
                                            </button>
                                            <button type="button" className="btn btn-secondary" onClick={handleReset}>
                                                Reset
                                            </button>
                                            <button type="button" className="btn btn-primary btn-glow" onClick={handleNext}>
                                                Next: Select Categories →
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <h2>Compare 2–5 Locations</h2>
                                        <p style={{ color: 'var(--text-secondary)' }}>
                                            Click on a slot below, then click on the map to pin that location.
                                        </p>
                                    </div>
                                    <div className="button-group" style={{ margin: 0 }}>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-glow"
                                            disabled={validPinnedCount < 2}
                                            onClick={handleNext}
                                            style={{ opacity: validPinnedCount < 2 ? 0.5 : 1 }}
                                        >
                                            Compare {validPinnedCount} Locations →
                                        </button>
                                    </div>
                                </div>

                                {/* Multi Location Slots Grid */}
                                <div className="multi-locations-bar">
                                    {locations.map((loc, idx) => {
                                        const color = SLOT_COLORS[idx % SLOT_COLORS.length];
                                        const isActive = activeSlotIndex === idx;
                                        const isPinned = loc.lat !== null && loc.lng !== null;

                                        return (
                                            <div
                                                key={loc.id}
                                                className={`location-slot-card ${isActive ? 'active-slot' : ''}`}
                                                onClick={() => setActiveSlotIndex(idx)}
                                            >
                                                <div className="slot-badge-header">
                                                    <span className="slot-number-badge" style={{ backgroundColor: color }}>
                                                        {idx + 1}
                                                    </span>
                                                    {locations.length > 2 && (
                                                        <button
                                                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveSlot(idx);
                                                            }}
                                                            title="Remove location slot"
                                                        >
                                                            &times;
                                                        </button>
                                                    )}
                                                </div>

                                                <input
                                                    type="text"
                                                    className="slot-title-input"
                                                    value={loc.name}
                                                    onChange={(e) => handleUpdateSlotName(idx, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder={`Location ${idx + 1}`}
                                                />

                                                <div className="slot-coords">
                                                    {isPinned ? (
                                                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                                            ✓ {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-secondary)', italic: 'true' }}>
                                                            {isActive ? '👉 Click map to pin' : 'Click slot to set pin'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {locations.length < 5 && (
                                        <button className="add-location-btn" onClick={handleAddSlot}>
                                            <span>➕ Add Location ({locations.length}/5)</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Interactive Map Component */}
                        <div style={{ marginTop: '0.5rem' }}>
                            <Map
                                lat={mode === 'single' ? submittedLat : null}
                                lng={mode === 'single' ? submittedLng : null}
                                locationsList={mode === 'multi' ? locations : []}
                                activeLocationIndex={activeSlotIndex}
                                onLocationSelect={mode === 'single' ? handleSingleLocationSelect : handleMultiLocationSelect}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;
