import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper for colored pin badges in multi-location mode
const LOCATION_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#10b981'];

const createNumberIcon = (number, color) => {
  return L.divIcon({
    className: 'custom-pin-badge',
    html: `<div style="
      background-color: ${color};
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
      border: 2px solid white;
    ">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Component to handle map view updates & bounds auto-fit
function ChangeView({ center, zoom, bounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (center) {
      const targetZoom = map.getZoom() < zoom ? zoom : map.getZoom();
      map.flyTo(center, targetZoom, {
        animate: true,
        duration: 1.5
      });
    }
  }, [center, zoom, bounds, map]);
  
  return null;
}

// Component to handle map clicks
function LocationMarker({ position, onLocationSelect, activeIndex = 0 }) {
  const markerRef = useRef(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        if (onLocationSelect) {
          onLocationSelect(latlng.lat, latlng.lng, activeIndex);
        }
      }
    },
  };

  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng, activeIndex);
      }
    },
  });

  return position === null ? null : (
    <Marker 
      position={position} 
      draggable={true} 
      eventHandlers={eventHandlers}
      ref={markerRef}
      autoPan={true}
    >
      <Popup>
        <div style={{ textAlign: 'center' }}>
          <strong>Selected Location</strong>
          <br />
          Lat: {position[0].toFixed(4)}
          <br />
          Lng: {position[1].toFixed(4)}
          <br />
          <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
            (Drag pin to fine-tune)
          </small>
        </div>
      </Popup>
    </Marker>
  );
}

export default function Map({ lat, lng, locationsList = [], activeLocationIndex = 0, onLocationSelect }) {
  const isMultiMode = locationsList && locationsList.length > 0;
  
  const position = lat && lng ? [parseFloat(lat), parseFloat(lng)] : null;
  const defaultCenter = [20.5937, 78.9629]; // Center of India
  const defaultZoom = 5;
  const zoomedLevel = 15;

  const validLocations = locationsList.filter(l => l && l.lat && l.lng);
  const bounds = validLocations.map(l => [l.lat, l.lng]);

  const mapCenter = position || (bounds.length > 0 ? bounds[0] : defaultCenter);

  return (
    <div style={{ height: '500px', width: '100%', marginTop: '2rem', position: 'relative', zIndex: 1 }}>
      <MapContainer
        center={mapCenter}
        zoom={position ? Math.max(defaultZoom, zoomedLevel) : defaultZoom}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ChangeView center={position} zoom={zoomedLevel} bounds={bounds.length > 1 ? bounds : null} />

        {/* Single mode marker */}
        {!isMultiMode && (
          <LocationMarker position={position} onLocationSelect={onLocationSelect} />
        )}

        {/* Multi-location mode markers */}
        {isMultiMode && validLocations.map((loc, idx) => {
          const color = LOCATION_COLORS[idx % LOCATION_COLORS.length];
          const customIcon = createNumberIcon(idx + 1, color);

          return (
            <Marker
              key={loc.id || `loc_${idx}`}
              position={[loc.lat, loc.lng]}
              icon={customIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const latlng = e.target.getLatLng();
                  if (onLocationSelect) {
                    onLocationSelect(latlng.lat, latlng.lng, idx);
                  }
                }
              }}
            >
              <Popup>
                <div style={{ textAlign: 'center', minWidth: '150px' }}>
                  <div style={{ fontWeight: 'bold', color: color, fontSize: '1rem' }}>
                    {idx + 1}. {loc.name || `Location ${idx + 1}`}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px' }}>
                    Lat: {loc.lat.toFixed(4)} | Lng: {loc.lng.toFixed(4)}
                  </div>
                  <small style={{ color: '#888', marginTop: '4px', display: 'block' }}>
                    (Drag to adjust pin)
                  </small>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Catch map clicks in multi-location mode */}
        {isMultiMode && onLocationSelect && (
          <LocationMarker position={null} onLocationSelect={onLocationSelect} activeIndex={activeLocationIndex} />
        )}
      </MapContainer>
    </div>
  );
}
