import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavorites, removeFavorite, updateFavorite } from '../services/favoritesService';
import './FavoritesDrawer.css';

export default function FavoritesDrawer({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editNoteText, setEditNoteText] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFavorites(getFavorites());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleToggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(item => item !== id));
        } else {
            if (selectedIds.length >= 5) {
                alert('You can select up to 5 locations to compare side-by-side.');
                return;
            }
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleDelete = (id) => {
        const updated = removeFavorite(id);
        setFavorites(updated);
        setSelectedIds(selectedIds.filter(item => item !== id));
    };

    const handleStartEdit = (fav) => {
        setEditingId(fav.id);
        setEditNoteText(fav.notes || '');
    };

    const handleSaveNote = (id) => {
        const updated = updateFavorite(id, { notes: editNoteText });
        setFavorites(updated);
        setEditingId(null);
    };

    const handleAnalyzeSingle = (fav) => {
        onClose();
        navigate('/categories', {
            state: {
                latitude: fav.lat,
                longitude: fav.lng,
                locationName: fav.name
            }
        });
    };

    const handleCompareSelected = () => {
        if (selectedIds.length < 2) {
            alert('Please select at least 2 locations to compare (up to 5).');
            return;
        }

        const selectedLocations = favorites
            .filter(f => selectedIds.includes(f.id))
            .map(f => ({
                id: f.id,
                name: f.name,
                lat: f.lat,
                lng: f.lng
            }));

        onClose();
        navigate('/categories', {
            state: {
                locations: selectedLocations,
                isMultiLocationMode: true
            }
        });
    };

    return (
        <div className="favorites-overlay" onClick={onClose}>
            <div className="favorites-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="favorites-header">
                    <div className="favorites-header-title">
                        <h2>⭐ Saved Places</h2>
                        <span className="favorites-count-badge">{favorites.length}</span>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="favorites-body">
                    {favorites.length === 0 ? (
                        <div className="empty-favorites">
                            <div className="empty-favorites-icon">📍</div>
                            <h3>No Saved Locations Yet</h3>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                Pin a location on the map and click <strong>"⭐ Save Location"</strong> to store it here for fast access and multi-location comparisons!
                            </p>
                        </div>
                    ) : (
                        favorites.map((fav) => {
                            const isSelected = selectedIds.includes(fav.id);
                            return (
                                <div key={fav.id} className={`favorite-card ${isSelected ? 'selected' : ''}`}>
                                    <div className="favorite-card-top">
                                        <div className="favorite-checkbox-container">
                                            <input
                                                type="checkbox"
                                                className="favorite-checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelect(fav.id)}
                                            />
                                            <span className="favorite-name">{fav.name}</span>
                                        </div>
                                        {fav.lastScore !== null && (
                                            <span className="favorite-score-badge">
                                                {fav.lastScore}/100
                                            </span>
                                        )}
                                    </div>

                                    <div className="favorite-details">
                                        <span>📍 {fav.lat.toFixed(4)}, {fav.lng.toFixed(4)}</span>
                                        <small>Added: {new Date(fav.createdAt).toLocaleDateString()}</small>

                                        {editingId === fav.id ? (
                                            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    value={editNoteText}
                                                    onChange={(e) => setEditNoteText(e.target.value)}
                                                    placeholder="Add a note..."
                                                    style={{
                                                        flex: 1,
                                                        background: 'rgba(0,0,0,0.4)',
                                                        border: '1px solid var(--border-color)',
                                                        color: '#fff',
                                                        padding: '0.3rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.85rem'
                                                    }}
                                                />
                                                <button className="btn btn-primary btn-xs" onClick={() => handleSaveNote(fav.id)}>Save</button>
                                            </div>
                                        ) : (
                                            fav.notes && <div className="favorite-notes">"{fav.notes}"</div>
                                        )}
                                    </div>

                                    <div className="favorite-card-actions">
                                        <button className="btn btn-secondary btn-xs" onClick={() => handleStartEdit(fav)}>
                                            {fav.notes ? 'Edit Note' : '+ Note'}
                                        </button>
                                        <button className="btn btn-secondary btn-xs" onClick={() => handleAnalyzeSingle(fav)}>
                                            Analyze
                                        </button>
                                        <button className="btn btn-secondary btn-xs" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(fav.id)}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {favorites.length > 0 && (
                    <div className="favorites-footer">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span>Selected for comparison:</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{selectedIds.length} / 5</strong>
                        </div>

                        <button
                            className="btn btn-primary btn-glow"
                            disabled={selectedIds.length < 2}
                            onClick={handleCompareSelected}
                            style={{ opacity: selectedIds.length < 2 ? 0.5 : 1, width: '100%' }}
                        >
                            📊 Compare Selected ({selectedIds.length}) →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
