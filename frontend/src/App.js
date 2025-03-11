import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, useNavigate } from 'react-router-dom';
import SearchResults from './SearchResults';
import GoogleMapComponent from './GoogleMapComponent';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [originName, setOriginName] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [originCode, setOriginCode] = useState('');
  const [destinationCode, setDestinationCode] = useState('');
  const [suggestedOrigins, setSuggestedOrigins] = useState([]);
  const [suggestedDestinations, setSuggestedDestinations] = useState([]);
  const [isReturn, setIsReturn] = useState(true);
  const [hotels, setHotels] = useState([]);
  const [showHotels, setShowHotels] = useState(false);
  const [originCoords, setOriginCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const apiKey = process.env.REACT_APP_NINJA_API_KEY;

  const navigate = useNavigate();

  useEffect(() => {
    const storedLoginStatus = localStorage.getItem('isLoggedIn');
    setIsLoggedIn(storedLoginStatus === 'true');
  }, []);

  // Koordináták lekérdezése API Ninjas-tól
  const fetchCoordinates = async (iataCode, setCoords) => {
    if (!iataCode) return;
    const apiUrl = `https://api.api-ninjas.com/v1/airports?iata=${iataCode}`;

    try {
      const response = await axios.get(apiUrl, {
        headers: { 'X-Api-Key': apiKey },
      });
      if (response.status === 200 && response.data.length > 0) {
        const { latitude, longitude } = response.data[0];
        setCoords({ lat: parseFloat(latitude), lng: parseFloat(longitude) });
      } else {
        console.error('No coordinates found for IATA:', iataCode);
        setCoords(null);
      }
    } catch (error) {
      console.error('Error fetching coordinates:', error.message);
      setCoords(null);
    }
  };

  useEffect(() => {
    fetchCoordinates(originCode, setOriginCoords);
  }, [originCode]);

  useEffect(() => {
    fetchCoordinates(destinationCode, setDestinationCoords);
  }, [destinationCode]);

  const fetchSuggestions = async (query, setSuggestions) => {
    if (!query.trim()) return;
    const apiUrl = `https://api.api-ninjas.com/v1/airports?name=${query}`;

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

  const handleSuggestionClick = (suggestion, setInputName, setInputCode) => {
    setInputName(suggestion.name);
    setInputCode(suggestion.iataCode);
    setSuggestedOrigins([]);
    setSuggestedDestinations([]);
  };

  const searchFlights = () => {
    if (!originCode || !destinationCode) {
      alert('Please select both origin and destination');
      return;
    }

    const queryParams = new URLSearchParams({
      originCode: originCode,
      destinationCode: destinationCode,
      dateOfDeparture: departureDate,
      ...(returnDate && { dateOfReturn: returnDate }),
    }).toString();

    navigate(`/flight-search?${queryParams}`);
  };

  const searchHotels = async () => {
    if (!destinationCode) {
      alert('Please select a destination for hotel search');
      return;
    }

    const queryParams = new URLSearchParams({
      cityCode: destinationCode,
      checkInDate: departureDate,
      checkOutDate: returnDate || departureDate,
    }).toString();

    try {
      const response = await axios.get(`http://localhost:3000/hotel-search?${queryParams}`);
      setHotels(response.data.data || []);
      setShowHotels(true);
    } catch (error) {
      console.error('Error fetching hotels:', error);
      setHotels([]);
      alert('Failed to fetch hotels. Please try again later.');
    }
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

            <main style={styles.mainContainer}>
              <div style={styles.searchContainer}>
                <h1 style={styles.title}>Discover how to get anywhere</h1>
                <h3 style={styles.subtitle}>BY PLANE, TRAIN, BUS, FERRY AND CAR</h3>

                <div>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Origin"
                    value={originName}
                    onChange={(e) => {
                      setOriginName(e.target.value);
                      fetchSuggestions(e.target.value, setSuggestedOrigins);
                    }}
                  />
                  {suggestedOrigins.length > 0 && (
                    <ul style={styles.suggestionList}>
                      {suggestedOrigins.map((suggestion, index) => (
                        <li
                          key={suggestion.iataCode || index}
                          style={styles.suggestionItem}
                          onClick={() =>
                            handleSuggestionClick(suggestion, setOriginName, setOriginCode)
                          }
                        >
                          {suggestion.name} ({suggestion.iataCode})
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
                    value={destinationName}
                    onChange={(e) => {
                      setDestinationName(e.target.value);
                      fetchSuggestions(e.target.value, setSuggestedDestinations);
                    }}
                  />
                  {suggestedDestinations.length > 0 && (
                    <ul style={styles.suggestionList}>
                      {suggestedDestinations.map((suggestion, index) => (
                        <li
                          key={suggestion.iataCode || index}
                          style={styles.suggestionItem}
                          onClick={() =>
                            handleSuggestionClick(suggestion, setDestinationName, setDestinationCode)
                          }
                        >
                          {suggestion.name} ({suggestion.iataCode})
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
              </div>

              <div style={styles.mapContainer}>
                <GoogleMapComponent
                  origin={originCoords}
                  destination={destinationCoords}
                />
              </div>
            </main>

            {showHotels && (
              <div style={styles.hotelsContainer}>
                <h2>Hotels in {destinationCode}</h2>
                {hotels.length === 0 ? (
                  <div>No hotels found.</div>
                ) : (
                  <div>
                    {hotels.map((hotel, index) => (
                      <div key={index} style={styles.hotelCard}>
                        <h3>{hotel.hotel.name}</h3>
                        <p>{hotel.hotel.description}</p>
                        <p>Price: {hotel.offers[0].price.total} {hotel.offers[0].price.currency}</p>
                        <p>Check-In: {hotel.offers[0].checkInDate}</p>
                        <p>Check-Out: {hotel.offers[0].checkOutDate}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />
      <Route path="/flight-search" element={<SearchResults />} />
    </Routes>
  );
};

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '20px',
    backgroundColor: '#f0f0f0',
  },
  logo: {
    width: '100px',
  },
  mainContainer: {
    display: 'flex',
    flex: 1,
    padding: '20px',
  },
  searchContainer: {
    flex: 0.3,
    padding: '20px',
    backgroundColor: '#f9f9f9',
    marginRight: '20px',
  },
  mapContainer: {
    flex: 0.7,
    padding: '20px',
    backgroundColor: '#f0f0f0',
  },
  title: {
    textAlign: 'center',
    fontSize: '24px',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: '16px',
    marginBottom: '20px',
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    borderRadius: '5px',
  },
  passengerCounter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '10px 0',
  },
  searchButton: {
    width: '100%',
    padding: '15px',
    backgroundColor: 'blue',
    color: 'white',
    borderRadius: '5px',
    margin: '10px 0',
  },
  suggestionList: {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
    backgroundColor: '#fff',
    borderRadius: '5px',
    maxHeight: '200px',
    overflowY: 'auto',
    border: '1px solid #ccc',
  },
  suggestionItem: {
    padding: '8px',
    cursor: 'pointer',
  },
  hotelsContainer: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#f0f0f0',
    borderRadius: '8px',
  },
  hotelCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    marginBottom: '10px',
  },
};

export default App;