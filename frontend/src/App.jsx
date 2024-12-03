import { useEffect, useState, useRef } from 'react';
import 'ol/ol.css';
import { Map, View } from 'ol';
import { Tile as TileLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import { fromLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Icon } from 'ol/style';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import './App.css';

function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          setCurrentLocation(location);
          setLoading(false);

          // Send location to backend
          fetch('/send-location/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(location),
          })
            .then((response) => response.text())
            .then((data) => console.log(data))
            .catch((err) => {
              console.error('Error:', err);
              setError('Failed to send location to server');
            });
        },
        (error) => {
          console.error('Error obtaining location:', error);
          setError('Failed to get your location. Please enable location services.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentLocation && mapRef.current && !mapInstance.current) {
      // Convert location to OpenLayers format
      const { latitude, longitude } = currentLocation;
      const center = fromLonLat([longitude, latitude]);

      // Create a map instance
      const map = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
        ],
        view: new View({
          center: center,
          zoom: 15,
        }),
      });

      // Add marker
      const marker = new Feature({
        geometry: new Point(center),
      });

      marker.setStyle(
        new Style({
          image: new Icon({
            anchor: [0.5, 1],
            src: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Use your own marker icon URL
            scale: 0.07,
          }),
        })
      );

      const vectorLayer = new VectorLayer({
        source: new VectorSource({
          features: [marker],
        }),
      });

      map.addLayer(vectorLayer);
      mapInstance.current = map;
    }
  }, [currentLocation]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading your location...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-text">{error}</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1 className="title">Your Current Location</h1>
      {currentLocation && (
        <div className="coordinates-container">
          <p className="coordinate">Latitude: {currentLocation.latitude.toFixed(6)}</p>
          <p className="coordinate">Longitude: {currentLocation.longitude.toFixed(6)}</p>
        </div>
      )}
      <div className="map-container">
        <div ref={mapRef} className="map"></div>
      </div>
    </div>
  );
}

export default App;
