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

// Component to handle map view updates
function ChangeView({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      // Only zoom in if the current zoom is lower than target zoom
      const targetZoom = map.getZoom() < zoom ? zoom : map.getZoom();
      map.flyTo(center, targetZoom, {
        animate: true,
        duration: 1.5
      });
    }
  }, [center, zoom, map]);
  
  return null;
}

// Component to handle map clicks
function LocationMarker({ position, onLocationSelect }) {
  const markerRef = useRef(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        if (onLocationSelect) {
          onLocationSelect(latlng.lat, latlng.lng);
        }
      }
    },
  };

  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
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

export default function Map({ lat, lng, onLocationSelect }) {
  const position = lat && lng ? [parseFloat(lat), parseFloat(lng)] : null;
  const defaultCenter = [20.5937, 78.9629]; // Center of India
  const defaultZoom = 5;
  const zoomedLevel = 15;

  return (
    <div style={{ height: '500px', width: '100%', marginTop: '2rem', position: 'relative', zIndex: 1 }}>
      <MapContainer
        center={position || defaultCenter}
        zoom={position ? Math.max(defaultZoom, zoomedLevel) : defaultZoom}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {position && <ChangeView center={position} zoom={zoomedLevel} />}
        <LocationMarker position={position} onLocationSelect={onLocationSelect} />
      </MapContainer>
    </div>
  );
}
