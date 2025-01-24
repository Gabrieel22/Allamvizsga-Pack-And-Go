import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, useNavigate } from 'react-router-dom';  // Remove BrowserRouter
import { useLocation } from 'react-router-dom';
import SearchResults from './SearchResults';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [suggestedOrigins, setSuggestedOrigins] = useState([]);
  const [suggestedDestinations, setSuggestedDestinations] = useState([]);
  const [isReturn, setIsReturn] = useState(true);

  const navigate = useNavigate(); // React Router navigáció

  useEffect(() => {
    const storedLoginStatus = localStorage.getItem('isLoggedIn');
    setIsLoggedIn(storedLoginStatus === 'true');
  }, []);

  const fetchSuggestions = async (query, setSuggestions) => {
    if (!query.trim()) return;

    const apiUrl = `https://api.api-ninjas.com/v1/airports?name=${query}`;
    const apiKey = 'Sr/MW85xFBvy52Cq4QCquw==FVfWmwxGQLRnogFI';

    try {
      const response = await axios.get(apiUrl, {
        headers: { 'X-Api-Key': apiKey },
      });
      if (response.status === 200) {
        const data = response.data;
        if (data.length === 0) {
          alert('No suggestions found for this query.');
        } else {
          const formattedSuggestions = data.map((item) => ({
            name: item.name,
            iataCode: item.iata,
          }));
          setSuggestions(formattedSuggestions);
        }
      } else {
        console.error('No suggestions found:', response);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error.message);
      alert('Failed to fetch suggestions. Please try again later.');
    }
  };

  const handleSuggestionClick = (suggestion, setInputValue) => {
    setInputValue(suggestion.name);
    setSuggestedOrigins([]);
    setSuggestedDestinations([]);
  };

  const searchFlights = () => {
    if (!origin || !destination) {
      alert('Please select both origin and destination');
      return;
    }

    const queryParams = new URLSearchParams({
      originCode: origin,
      destinationCode: destination,
      dateOfDeparture: departureDate,
      ...(returnDate && { dateOfReturn: returnDate }),
    }).toString();

    navigate(`/flight-search?${queryParams}`);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div style={styles.container}>
            <header style={styles.headerContainer}>
              <img src="./assets/pictures/logo.png" alt="Logo" style={styles.logo} />
              <button
                onClick={() => {
                  const storedLoginStatus = localStorage.getItem('isLoggedIn');
                  if (storedLoginStatus === 'true') {
                    // Navigate to profile
                  } else {
                    // Navigate to login page
                  }
                }}
              >
                Profile
              </button>
            </header>

            <main style={styles.searchContainer}>
              <h1 style={styles.title}>Discover how to get anywhere</h1>
              <h3 style={styles.subtitle}>BY PLANE, TRAIN, BUS, FERRY AND CAR</h3>

              <div>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Origin"
                  value={origin}
                  onChange={(e) => {
                    setOrigin(e.target.value);
                    fetchSuggestions(e.target.value, setSuggestedOrigins);
                  }}
                />
                {suggestedOrigins.length > 0 && (
                  <ul style={styles.suggestionList}>
                    {suggestedOrigins.map((suggestion, index) => (
                      <li
                        key={suggestion.iataCode || index}
                        style={styles.suggestionItem}
                        onClick={() => handleSuggestionClick(suggestion, setOrigin)}
                      >
                        {suggestion.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Destination"
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    fetchSuggestions(e.target.value, setSuggestedDestinations);
                  }}
                />
                {suggestedDestinations.length > 0 && (
                  <ul style={styles.suggestionList}>
                    {suggestedDestinations.map((suggestion, index) => (
                      <li
                        key={suggestion.iataCode || index}
                        style={styles.suggestionItem}
                        onClick={() => handleSuggestionClick(suggestion, setDestination)}
                      >
                        {suggestion.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <input
                type="date"
                style={styles.input}
                placeholder="Departure Date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
              {isReturn && (
                <input
                  type="date"
                  style={styles.input}
                  placeholder="Return Date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              )}

              <div style={styles.passengerCounter}>
                <label>Adults:</label>
                <button onClick={() => setAdults(adults + 1)}>+</button>
                <span>{adults}</span>
                <button onClick={() => setAdults(adults > 1 ? adults - 1 : 1)}>-</button>
              </div>
              <div style={styles.passengerCounter}>
                <label>Children:</label>
                <button onClick={() => setChildren(children + 1)}>+</button>
                <span>{children}</span>
                <button onClick={() => setChildren(children > 0 ? children - 1 : 0)}>-</button>
              </div>

              <button style={styles.searchButton} onClick={searchFlights}>
                Search Flights
              </button>
            </main>
          </div>
        }
      />
      <Route path="/flight-search" element={<SearchResults />} />
    </Routes>
  );
};

const styles = {
  container: { fontFamily: 'Arial, sans-serif' },
  headerContainer: { display: 'flex', justifyContent: 'space-between', padding: '20px' },
  logo: { width: '100px' },
  searchContainer: { padding: '20px', backgroundColor: '#f9f9f9' },
  title: { textAlign: 'center', fontSize: '24px' },
  subtitle: { textAlign: 'center', fontSize: '16px', marginBottom: '20px' },
  input: { display: 'block', width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px' },
  passengerCounter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' },
  searchButton: { width: '100%', padding: '15px', backgroundColor: 'blue', color: 'white', borderRadius: '5px' },
  suggestionList: { listStyleType: 'none', padding: 0, margin: 0, backgroundColor: '#fff', borderRadius: '5px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc' },
  suggestionItem: { padding: '8px', cursor: 'pointer' },
};

export default App;
