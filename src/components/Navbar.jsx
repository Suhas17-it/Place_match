import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFavorites } from '../services/favoritesService';
import './Navbar.css';

export default function Navbar({ onOpenFavorites }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [favCount, setFavCount] = useState(0);

    useEffect(() => {
        const favs = getFavorites();
        setFavCount(favs.length);

        // Listen to storage updates
        const handleStorageChange = () => {
            setFavCount(getFavorites().length);
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [location]);

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-brand" onClick={() => navigate('/')}>
                    <span>📍 PlaceMatch</span>
                </div>

                <div className="navbar-links">
                    {location.pathname !== '/' && (
                        <button className="nav-link-btn" onClick={() => navigate('/')}>
                            🏠 Home Map
                        </button>
                    )}

                    <button className="nav-link-btn" onClick={onOpenFavorites}>
                        <span>⭐ Saved Places</span>
                        {favCount > 0 && <span className="nav-badge">{favCount}</span>}
                    </button>
                </div>
            </div>
        </nav>
    );
}
