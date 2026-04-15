import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from '../components/Map';
import './Home.css';

function Home() {
    const navigate = useNavigate();
    const [submittedLat, setSubmittedLat] = useState(null);
    const [submittedLng, setSubmittedLng] = useState(null);

    const handleNext = () => {
        if (!submittedLat || !submittedLng) {
            alert('Please locate a position on the map first');
            return;
        }

        // Navigate to category selection with location data
        navigate('/categories', {
            state: {
                latitude: submittedLat,
                longitude: submittedLng
            }
        });
    };

    const handleReset = () => {
        setSubmittedLat(null);
        setSubmittedLng(null);
    };

    const handleLocationSelect = (lat, lng) => {
        setSubmittedLat(lat);
        setSubmittedLng(lng);
    };

    return (
        <div className="app">
            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Find Your Perfect Location
                        </h1>
                        <p className="hero-subtitle">
                            Discover if a location suits your lifestyle needs with AI-powered insights
                        </p>
                    </div>
                </div>
            </section>

            {/* Map Section */}
            <section className="map-section" style={{ paddingBottom: '4rem' }}>
                <div className="container">
                    <div className="glass-card map-card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2>Select Location on Map</h2>
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    Click anywhere on the map to pin your desired location.
                                </p>
                            </div>
                            <div className="button-group" style={{ margin: 0 }}>
                                {(submittedLat && submittedLng) && (
                                    <>
                                        <button type="button" className="btn btn-secondary" onClick={handleReset}>
                                            Reset
                                        </button>
                                        <button type="button" className="btn btn-primary" onClick={handleNext}>
                                            Next: Select Categories →
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        <div style={{ marginTop: '-1rem' }}>
                            <Map lat={submittedLat} lng={submittedLng} onLocationSelect={handleLocationSelect} />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;
