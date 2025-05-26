import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import SearchResults from './SearchResults';
import GoogleMapComponent from './GoogleMapComponent';
import { FaUser, FaPlane, FaHotel, FaCalendarAlt, FaUserFriends, FaExchangeAlt } from 'react-icons/fa';
import { IoIosArrowDown } from 'react-icons/io';
import './App.css';
import logo from './assets/images/logo.png'

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
  const [activeTab, setActiveTab] = useState('flights');
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);
  const apiKey = process.env.REACT_APP_RAPIDAPI_KEY;

  const navigate = useNavigate();

  useEffect(() => {
    const storedLoginStatus = localStorage.getItem('isLoggedIn');
    setIsLoggedIn(storedLoginStatus === 'true');
  }, []);

const fetchCoordinates = async (iataCode, setCoords) => {
    if (!iataCode) {
      setCoords(null);
      return;
    }
    const apiUrl = `https://aerodatabox.p.rapidapi.com/airports/search/term?q=${iataCode}`;

    try {
      const response = await axios.get(apiUrl, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
        },
      });
      if (response.status === 200 && response.data.items && response.data.items.length > 0) {
        const latitude = response.data.items[0].location.lat;
        const longitude = response.data.items[0].location.lon;
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
          setCoords({ lat, lng });
        } else {
          console.error('Invalid coordinates received:', { latitude, longitude });
          setCoords(null);
        }
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
    if (!query.trim() || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const apiUrl = `https://aerodatabox.p.rapidapi.com/airports/search/term?q=${query}`;

    try {
      const response = await axios.get(apiUrl, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
        },
      });
      if (response.status === 200 && response.data.items) {
        const data = response.data.items;
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
    <div className="app-container">
      <header className="app-header">
        <div className="logo-container">
          <img src={logo} alt="PackAndGo Logo" className="logo" width="200px"/>
          <h1 className="brand-name">PackAndGo</h1>
        </div>
        <nav className="nav-links">
          <Link to="/" className="nav-link active">Home</Link>
          <Link to="/flights" className="nav-link">Flights</Link>
          <Link to="/hotels" className="nav-link">Hotels</Link>
          <Link to="/deals" className="nav-link">Deals</Link>
        </nav>
        <div className="user-actions">
          {isLoggedIn ? (
            <div className="user-profile">
              <FaUser className="user-icon" />
              <span>My Account</span>
            </div>
          ) : (
            <>
              <button className="login-btn">Sign In</button>
              <button className="signup-btn">Sign Up</button>
            </>
          )}
        </div>
      </header>

      <div className="search-section">
        <div className="search-tabs">
          <button 
            className={`tab ${activeTab === 'flights' ? 'active' : ''}`}
            onClick={() => setActiveTab('flights')}
          >
            <FaPlane /> Flights
          </button>
          <button 
            className={`tab ${activeTab === 'hotels' ? 'active' : ''}`}
            onClick={() => setActiveTab('hotels')}
          >
            <FaHotel /> Hotels
          </button>
        </div>

        <div className="search-container">
          <div className="search-form">
            <div className="form-row">
              <div className="input-group origin">
                <label>From</label>
                <div className="input-with-icon">
                  <FaPlane className="input-icon" />
                  <input
                    type="text"
                    placeholder="City or Airport"
                    value={originName}
                    onChange={(e) => {
                      setOriginName(e.target.value);
                      fetchSuggestions(e.target.value, setSuggestedOrigins);
                    }}
                  />
                </div>
                {suggestedOrigins.length > 0 && (
                  <ul className="suggestion-dropdown">
                    {suggestedOrigins.map((suggestion, index) => (
                      <li
                        key={suggestion.iataCode || index}
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

              <button className="swap-button" onClick={() => {
                const tempName = originName;
                const tempCode = originCode;
                setOriginName(destinationName);
                setOriginCode(destinationCode);
                setDestinationName(tempName);
                setDestinationCode(tempCode);
              }}>
                <FaExchangeAlt />
              </button>

              <div className="input-group destination">
                <label>To</label>
                <div className="input-with-icon">
                  <FaPlane className="input-icon" />
                  <input
                    type="text"
                    placeholder="City or Airport"
                    value={destinationName}
                    onChange={(e) => {
                      setDestinationName(e.target.value);
                      fetchSuggestions(e.target.value, setSuggestedDestinations);
                    }}
                  />
                </div>
                {suggestedDestinations.length > 0 && (
                  <ul className="suggestion-dropdown">
                    {suggestedDestinations.map((suggestion, index) => (
                      <li
                        key={suggestion.iataCode || index}
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
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Departure</label>
                <div className="input-with-icon">
                  <FaCalendarAlt className="input-icon" />
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                  />
                </div>
              </div>

              {isReturn && (
                <div className="input-group">
                  <label>Return</label>
                  <div className="input-with-icon">
                    <FaCalendarAlt className="input-icon" />
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="input-group passengers">
                <label>Passengers</label>
                <div 
                  className="passenger-selector"
                  onClick={() => setShowPassengerDropdown(!showPassengerDropdown)}
                >
                  <FaUserFriends className="input-icon" />
                  <span>{adults + children} Traveler{adults + children !== 1 ? 's' : ''}</span>
                  <IoIosArrowDown className={`arrow-icon ${showPassengerDropdown ? 'up' : ''}`} />
                </div>
                
                {showPassengerDropdown && (
                  <div className="passenger-dropdown">
                    <div className="passenger-option">
                      <span style={{color: 'black'}}>Adults</span>
                      <div className="counter" style={{color: 'black'}}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdults(adults > 1 ? adults - 1 : 1);
                          }}
                        >-</button>
                        <span>{adults}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdults(adults + 1);
                          }}
                        >+</button>
                      </div>
                    </div>
                    <div className="passenger-option">
                      <span style={{color: 'black'}}>Children</span>
                      <div className="counter" style={{color: 'black'}}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setChildren(children > 0 ? children - 1 : 0);
                          }}
                        >-</button>
                        <span>{children}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setChildren(children + 1);
                          }}
                        >+</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button 
                className="search-button"
                onClick={searchFlights}
              >
                Search Flights
              </button>
              <button 
                className="secondary-button"
                onClick={searchHotels}
              >
                Find Hotels
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="map-results-container">
        <div className="map-container">
          <GoogleMapComponent
            origin={originCoords}
            destination={destinationCoords}
          />
        </div>
        
        {showHotels && (
          <div className="hotel-results">
            <h2 className="section-title">Hotels in {destinationName || destinationCode}</h2>
            <div className="hotel-grid">
              {hotels.length === 0 ? (
                <div className="no-results">No hotels found.</div>
              ) : (
                hotels.map((hotel, index) => (
                  <div key={index} className="hotel-card">
                    <div className="hotel-image">
                      <img src="https://via.placeholder.com/300x200" alt={hotel.hotel.name} />
                    </div>
                    <div className="hotel-details">
                      <h3>{hotel.hotel.name}</h3>
                      <p className="hotel-description">{hotel.hotel.description || 'Luxury accommodation with premium amenities'}</p>
                      <div className="price-info">
                        <span className="price">${hotel.offers[0].price.total}</span>
                        <span className="per-night">per night</span>
                      </div>
                      <div className="date-info">
                        <span>Check-in: {hotel.offers[0].checkInDate}</span>
                        <span>Check-out: {hotel.offers[0].checkOutDate}</span>
                      </div>
                      <button className="view-button">View Deal</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Company</h3>
            <ul>
              <li>About Us</li>
              <li>Careers</li>
              <li>Press</li>
              <li>Blog</li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Support</h3>
            <ul>
              <li>Help Center</li>
              <li>Safety Information</li>
              <li>Cancellation Options</li>
              <li>Report Issue</li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Contact</h3>
            <ul>
              <li>+40 753 641 499</li>
              <li>support@packandgo.com</li>
              <li>24/7 Customer Service</li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Subscribe</h3>
            <p>Get the latest deals and offers</p>
            <div className="newsletter-form">
              <input type="email" placeholder="Your email address" />
              <button>Subscribe</button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 PackAndGo. All rights reserved.</p>
          <div className="legal-links">
            <a href="#">Terms of Service</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </footer>

      <Routes>
        <Route path="/flight-search" element={<SearchResults />} />
      </Routes>
    </div>
  );
};

export default App;