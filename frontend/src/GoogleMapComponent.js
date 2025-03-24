import React from 'react';
import { GoogleMap, useLoadScript, Marker, Polyline } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: 'calc(100vh - 100px)', // Térkép majdnem az egész képernyőt kitölti
};

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

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={origin && destination ? 3 : 3}
      center={center}
    >
      {origin && <Marker position={origin} title="Origin" />}
      {destination && <Marker position={destination} title="Destination" />}
      {origin && destination && (
        <Polyline
          path={path}
          options={{
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2,
          }}
        />
      )}
    </GoogleMap>
  );
};

export default GoogleMapComponent;