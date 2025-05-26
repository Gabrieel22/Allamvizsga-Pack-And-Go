import React from 'react';
import { GoogleMap, useLoadScript, Marker, Polyline } from '@react-google-maps/api';
import './GoogleMapComponent.css';

const GoogleMapComponent = ({ origin, destination }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_API_KEY,
  });

  const defaultCenter = {
    lat: 47.4979,
    lng: 19.0402,
  };

  const center = origin && destination
    ? {
        lat: (origin.lat + destination.lat) / 2,
        lng: (origin.lng + destination.lng) / 2,
      }
    : defaultCenter;

  const path = [];
  if (origin) path.push(origin);
  if (destination) path.push(destination);

  if (loadError) return <div className="map-error">Error loading maps</div>;
  if (!isLoaded) return <div className="map-loading">Loading Maps...</div>;

  return (
    <GoogleMap
      mapContainerClassName="map-container"
      zoom={origin && destination ? 4 : 3}
      center={center}
      options={{
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      }}
    >
      {origin && (
        <Marker 
          position={origin} 
          title="Origin"
          icon={{
            url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
          }}
        />
      )}
      {destination && (
        <Marker 
          position={destination} 
          title="Destination"
          icon={{
            url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
          }}
        />
      )}
      {origin && destination && (
        <Polyline
          path={path}
          options={{
            strokeColor: '#3b82f6',
            strokeOpacity: 0.8,
            strokeWeight: 3,
          }}
        />
      )}
    </GoogleMap>
  );
};

export default GoogleMapComponent;