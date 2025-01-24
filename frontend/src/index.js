import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Ide jön a Router
import App from './App'; // Az alkalmazás fő komponens

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App /> {/* A teljes alkalmazást itt rendeled el */}
  </BrowserRouter>
);
