import React from 'react';
import { GoogleMap, LoadScript } from '@react-google-maps/api';

// Térkép stílus beállítása
const mapContainerStyle = {
  width: '100%',   // Térkép szélessége
  height: '400px', // Térkép magassága
};

// Térkép középpontja (pl. világközéppont)
const center = {
  lat: 0,  // Szélesség
  lng: 0,  // Hosszúság
};

// Térkép komponens
const MapComponent = () => {
  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_API_KEY}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={2} // Alapértelmezett nagyítás
        center={center}
      >
        {/* Itt lehet hozzáadni jelölőket vagy egyéb elemeket */}
      </GoogleMap>
    </LoadScript>
  );
};

export default MapComponent;