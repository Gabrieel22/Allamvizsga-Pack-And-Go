import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaPlane, FaHotel, FaRegCalendarAlt, FaUserFriends, FaArrowLeft, FaStar, FaWifi, FaParking, FaSwimmingPool, FaUtensils } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import { GiAirplane } from "react-icons/gi";
import './SearchResults.css';
import cities from './CostOfLivingIndexByCity.json';
import countries from './CostOfLivingIndexByCountry.json';

const SearchResults = () => {
  const [flights, setFlights] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  const [showFlightDetailsPopup, setShowFlightDetailsPopup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [costOfLivingDifference, setCostOfLivingDifference] = useState(null);
  const [originCity, setOriginCity] = useState(null);
  const [destinationCity, setDestinationCity] = useState(null);
  const [fetchingCityCode, setFetchingCityCode] = useState(false);
  const [sortOption, setSortOption] = useState("price");
  const [filterOption, setFilterOption] = useState("all");
  const [activeTab, setActiveTab] = useState("flights");

  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const originCode = urlParams.get("originCode");
  const destinationCode = urlParams.get("destinationCode");
  const dateOfDeparture = urlParams.get("dateOfDeparture");
  const dateOfReturn = urlParams.get("dateOfReturn");

  const getCityNameByIataCode = async (iataCode) => {
    try {
      const response = await axios.get('http://localhost:3000/get-city-name', {
        params: { iataCode },
      });
  
      if (response.data && response.data.cityName) {
        return response.data.cityName;
      } else {
        throw new Error(`City not found for IATA code: ${iataCode}`);
      }
    } catch (error) {
      console.error('Error fetching city name:', error);
      throw error;
    }
  };

  const getCityCodeByIataCode = async (iataCode) => {
    try {
      const response = await axios.get(`http://localhost:3000/get-city-code/${iataCode}`);
      
      if (response.data && response.data.cityCode) {
        return response.data.cityCode;
      } else {
        throw new Error(`City code not found for IATA code: ${iataCode}`);
      }
    } catch (error) {
      console.error('Error fetching city code:', error);
      throw error;
    }
  };
  
  const calculateCostOfLivingDifference = (originCity, destinationCity) => {
    const originCityData = cities.cities.find(city => city.name === originCity);
    const destinationCityData = cities.cities.find(city => city.name === destinationCity);
  
    let originIndex, destinationIndex;
  
    if (!originCityData) {
      const originCountryData = countries.countries.find(country => country.name === originCity);
      if (!originCountryData) {
        throw new Error(`Origin city (${originCity}) and country not found in the database.`);
      }
      originIndex = originCountryData.score;
    } else {
      originIndex = originCityData.score;
    }
  
    if (!destinationCityData) {
      const destinationCountryData = countries.countries.find(country => country.name === destinationCity);
      if (!destinationCountryData) {
        throw new Error(`Destination city (${destinationCity}) and country not found in the database.`);
      }
      destinationIndex = destinationCountryData.score;
    } else {
      destinationIndex = destinationCityData.score;
    }
  
    const percentageDifference = ((destinationIndex - originIndex) / originIndex) * 100;
  
    return {
      percentageDifference,
      destinationIndex,
      originIndex
    };
  };

  const handleViewHotel = (hotelName) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(hotelName)}`;
    window.open(searchUrl, '_blank');
  };

  const sortedFlights = React.useMemo(() => {
    if (!flights) return [];
    
    return [...flights].sort((a, b) => {
      if (sortOption === "price") {
        return parseFloat(a.price.total) - parseFloat(b.price.total);
      } else if (sortOption === "duration") {
        return a.itineraries[0].duration.localeCompare(b.itineraries[0].duration);
      } else if (sortOption === "departure") {
        return new Date(a.itineraries[0].segments[0].departure.at) - new Date(b.itineraries[0].segments[0].departure.at);
      }
      return 0;
    });
  }, [flights, sortOption]);

  const filteredFlights = React.useMemo(() => {
    if (filterOption === "all") return sortedFlights;
    
    return sortedFlights.filter(flight => {
      if (filterOption === "nonstop") {
        return flight.itineraries[0].segments.length === 1;
      } else if (filterOption === "oneStop") {
        return flight.itineraries[0].segments.length === 2;
      }
      return true;
    });
  }, [sortedFlights, filterOption]);

  const sortedHotels = React.useMemo(() => {
    return [...hotels].sort((a, b) => 
      parseFloat(a.offers[0].price.total) - parseFloat(b.offers[0].price.total))
  }, [hotels]);

  useEffect(() => {
    const fetchFlights = async () => {
      setLoading(true);
      try {
        const response = await axios.get("http://localhost:3000/flight-search", {
          params: { originCode, destinationCode, dateOfDeparture, dateOfReturn },
        });
        setFlights(response.data);
      } catch (err) {
        setError("Error fetching flights: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchHotels = async () => {
      try {
        setFetchingCityCode(true);
        const cityCode = await getCityCodeByIataCode(destinationCode);
        const response = await axios.get("http://localhost:3000/hotel-search", {
          params: { cityName: cityCode, checkInDate: dateOfDeparture, checkOutDate: dateOfReturn || dateOfDeparture },
        });
        setHotels(response.data.data || []);
      } catch (err) {
        console.error('Error fetching hotels:', err);
        setHotels([]);
      } finally {
        setFetchingCityCode(false);
      }
    };

    if (originCode && destinationCode && dateOfDeparture) {
      fetchFlights();
      fetchHotels();
    }
  }, [originCode, destinationCode, dateOfDeparture, dateOfReturn]);

  useEffect(() => {
    if (flights && flights.length > 0) {
      const originCode = flights[0].itineraries[0].segments[0].departure.iataCode;
      const destinationCode = flights[0].itineraries[0].segments[flights[0].itineraries[0].segments.length - 1].arrival.iataCode;
  
      const fetchCityNamesAndCalculateDifference = async () => {
        try {
          const origin = await getCityNameByIataCode(originCode);
          const destination = await getCityNameByIataCode(destinationCode);
  
          if (origin && destination) {
            setOriginCity(origin);
            setDestinationCity(destination);
            
            const difference = calculateCostOfLivingDifference(origin, destination);
            setCostOfLivingDifference(difference);
          } else {
            console.error('City names not found.');
            setCostOfLivingDifference(null);
          }
        } catch (error) {
          console.error(error.message);
          setCostOfLivingDifference(null);
        }
      };
  
      fetchCityNamesAndCalculateDifference();
    }
  }, [flights]);

  const formatDuration = (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    const hours = match[1] ? match[1].replace('H', '') : '0';
    const minutes = match[2] ? match[2].replace('M', '') : '0';
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getFlightTimes = (itineraries) => {
    const departureTime = itineraries[0].segments[0].departure.at;
    const arrivalTime = itineraries[0].segments[itineraries[0].segments.length - 1].arrival.at;
    return { departureTime, arrivalTime };
  };

  const getRoundTripTimes = (itineraries) => {
    if (itineraries.length === 2) {
      const outboundDeparture = itineraries[0].segments[0].departure.at;
      const outboundArrival = itineraries[0].segments[itineraries[0].segments.length - 1].arrival.at;
      const outboundDuration = formatDuration(itineraries[0].duration);

      const returnDeparture = itineraries[1].segments[0].departure.at;
      const returnArrival = itineraries[1].segments[itineraries[1].segments.length - 1].arrival.at;
      const returnDuration = formatDuration(itineraries[1].duration);

      return { outboundDeparture, outboundArrival, outboundDuration, returnDeparture, returnArrival, returnDuration };
    }
    return null;
  };

  const handleSelectFlight = (flight) => {
    setSelectedFlight(flight);
  };

  const handleSelectHotel = (hotel) => {
    setSelectedHotel(hotel);
  };

  const handleBookingClick = () => {
    setShowBookingPopup(true);
  };

  const handleBookingSubmit = async () => {
    if (!name || !email || !phone) {
      alert("Kérjük, töltsd ki az összes mezőt!");
      return;
    }

    const bookingDetails = {
      flight: selectedFlight,
      hotel: selectedHotel,
      name,
      email,
      phone,
      costOfLivingDifference,
      originCity,
      destinationCity,
    };

    try {
      const response = await axios.post("http://localhost:3000/book", bookingDetails);
      if (response.status === 200) {
        alert("Foglalás sikeres! Hamarosan emailt kapsz a részletekkel.");
        setShowBookingPopup(false);
        setSelectedFlight(null);
        setSelectedHotel(null);
      }
    } catch (error) {
      console.error("Error submitting booking:", error);
      alert("Hiba történt a foglalás során. Kérjük, próbáld újra később.");
    }
  };

  const handleShowFlightDetails = (flight) => {
    setSelectedFlight(flight);
    setShowFlightDetailsPopup(true);
  };

  const handleBackToSearch = () => {
    navigate(-1);
  };

  const renderFlightAmenities = (flight) => {
    const amenities = [];
    if (flight.travelerPricings?.[0]?.fareOption === 'STANDARD') {
      amenities.push('Standard fare');
    }
    if (flight.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags?.weight > 0) {
      amenities.push('Checked baggage');
    }
    if (flight.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.amenities?.includes('MEAL')) {
      amenities.push('Meal included');
    }
    
    return amenities.length > 0 ? (
      <div className="flight-amenities">
        {amenities.map((amenity, index) => (
          <span key={index} className="amenity-badge">{amenity}</span>
        ))}
      </div>
    ) : null;
  };

  const renderHotelAmenities = (hotel) => {
    const amenities = [];
    if (hotel.hotel.amenities?.includes('WIFI')) amenities.push(<FaWifi key="wifi" title="WiFi" />);
    if (hotel.hotel.amenities?.includes('PARKING')) amenities.push(<FaParking key="parking" title="Parking" />);
    if (hotel.hotel.amenities?.includes('POOL')) amenities.push(<FaSwimmingPool key="pool" title="Pool" />);
    if (hotel.hotel.amenities?.includes('RESTAURANT')) amenities.push(<FaUtensils key="restaurant" title="Restaurant" />);
    
    return amenities.length > 0 ? (
      <div className="hotel-amenities">
        {amenities}
      </div>
    ) : null;
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Searching for flights...</p>
    </div>
  );
  
  if (error) return (
    <div className="error-container">
      <p>{error}</p>
      <button onClick={handleBackToSearch} className="back-button">
        <FaArrowLeft /> Back to Search
      </button>
    </div>
  );
  
  if (!flights || flights.length === 0) return (
    <div className="no-results-container">
      <p>No flights found for your search criteria.</p>
      <button onClick={handleBackToSearch} className="back-button">
        <FaArrowLeft /> Back to Search
      </button>
    </div>
  );

  return (
    <div className="search-results-container">
      <div className="results-header">
        <button onClick={handleBackToSearch} className="back-button">
          <FaArrowLeft /> Modify Search
        </button>
        <h1>Flight Search Results</h1>
        <div className="results-summary">
          <span>{originCode} <IoIosArrowForward /> {destinationCode}</span>
          <span>{formatDate(dateOfDeparture)} {dateOfReturn && `- ${formatDate(dateOfReturn)}`}</span>
        </div>
      </div>

      <div className="results-tabs">
        <button 
          className={`results-tab ${activeTab === 'flights' ? 'active' : ''}`}
          onClick={() => setActiveTab('flights')}
        >
          <FaPlane /> Flights ({filteredFlights.length})
        </button>
        <button 
          className={`results-tab ${activeTab === 'hotels' ? 'active' : ''}`}
          onClick={() => setActiveTab('hotels')}
        >
          <FaHotel /> Hotels ({sortedHotels.length})
        </button>
      </div>

      {activeTab === 'flights' && (
        <>
          <div className="filters-container">
            <div className="sort-options">
              <label>Sort by:</label>
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                <option value="price">Price</option>
                <option value="duration">Duration</option>
                <option value="departure">Departure Time</option>
              </select>
            </div>
            <div className="filter-options">
              <label>Filter:</label>
              <select value={filterOption} onChange={(e) => setFilterOption(e.target.value)}>
                <option value="all">All Flights</option>
                <option value="nonstop">Nonstop Only</option>
                <option value="oneStop">1 Stop Only</option>
              </select>
            </div>
          </div>

          <div className="flights-list">
            {filteredFlights.map((flight, index) => {
              const { departureTime, arrivalTime } = getFlightTimes(flight.itineraries);
              const roundTripTimes = getRoundTripTimes(flight.itineraries);
              const duration = formatDuration(flight.itineraries[0].duration);
              const stops = flight.itineraries[0].segments.length - 1;
              const airlineLogo = `https://d1ufw0nild2mi8.cloudfront.net/images/airlines/V2/srp/result_desktop/${flight.itineraries[0].segments[0].carrierCode}.png`;

              return (
                <div
                  key={index}
                  className={`flight-card ${selectedFlight?.id === flight.id ? "selected" : ""}`}
                >
                  <div className="flight-header">
                    <div className="flight-price">
                      {flight.price.total} {flight.price.currency}
                    </div>
                    <div className="flight-airline">
                      <img 
                        src={airlineLogo} 
                        alt={flight.itineraries[0].segments[0].carrierCode}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/50x50';
                        }}
                      />
                      <span>{flight.itineraries[0].segments[0].carrierCode} {flight.itineraries[0].segments[0].number}</span>
                    </div>
                  </div>
                  
                  {renderFlightAmenities(flight)}
                  
                  <div className="flight-details">
                    <div className="flight-segment">
                      <div className="time-info">
                        <span className="time">{formatDate(departureTime)}</span>
                        <span className="airport">{flight.itineraries[0].segments[0].departure.iataCode}</span>
                      </div>
                      
                      <div className="duration-info">
                        <div className="duration-line">
                          <div className="line"></div>
                          <GiAirplane className="airplane-icon" />
                          <div className="line"></div>
                        </div>
                        <div className="duration">{duration}</div>
                        <div className="stops">
                          {stops === 0 ? 'Nonstop' : `${stops} ${stops === 1 ? 'stop' : 'stops'}`}
                        </div>
                      </div>
                      
                      <div className="time-info">
                        <span className="time">{formatDate(arrivalTime)}</span>
                        <span className="airport">
                          {flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode}
                        </span>
                      </div>
                    </div>
                    
                    {roundTripTimes && (
                      <div className="flight-segment return">
                        <div className="time-info">
                          <span className="time">{formatDate(roundTripTimes.returnDeparture)}</span>
                          <span className="airport">{flight.itineraries[1].segments[0].departure.iataCode}</span>
                        </div>
                        
                        <div className="duration-info">
                          <div className="duration-line">
                            <div className="line"></div>
                            <GiAirplane className="airplane-icon" />
                            <div className="line"></div>
                          </div>
                          <div className="duration">{roundTripTimes.returnDuration}</div>
                          <div className="stops">
                            {flight.itineraries[1].segments.length - 1 === 0 ? 'Nonstop' : 
                              `${flight.itineraries[1].segments.length - 1} ${flight.itineraries[1].segments.length - 1 === 1 ? 'stop' : 'stops'}`}
                          </div>
                        </div>
                        
                        <div className="time-info">
                          <span className="time">{formatDate(roundTripTimes.returnArrival)}</span>
                          <span className="airport">
                            {flight.itineraries[1].segments[flight.itineraries[1].segments.length - 1].arrival.iataCode}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flight-actions">
                    <button 
                      onClick={() => handleSelectFlight(flight)}
                      className={`select-button ${selectedFlight?.id === flight.id ? 'selected' : ''}`}
                    >
                      {selectedFlight?.id === flight.id ? 'Selected' : 'Select Flight'}
                    </button>
                    <button 
                      onClick={() => handleShowFlightDetails(flight)}
                      className="details-button"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'hotels' && (
        <div className="hotels-list-container">
          <h2>Hotels in {destinationCity || destinationCode}</h2>
          {fetchingCityCode ? (
            <div className="loading-hotels">
              <div className="loading-spinner"></div>
              <p>Searching for hotels...</p>
            </div>
          ) : !hotels || hotels.length === 0 ? (
            <div className="no-hotels">
              <p>No hotels found in this location.</p>
              <button onClick={handleBackToSearch} className="back-button">
                <FaArrowLeft /> Back to Search
              </button>
            </div>
          ) : (
            <div className="hotels-list">
              {sortedHotels.map((hotel, index) => (
                <div
                  key={index}
                  className={`hotel-card ${selectedHotel?.hotel.hotelId === hotel.hotel.hotelId ? "selected" : ""}`}
                >
                  <div className="hotel-image">
                    <img src="https://via.placeholder.com/300x200" alt={hotel.hotel.name} />
                    <div className="hotel-rating">
                      <FaStar className="star-icon" />
                      <span>4.5</span>
                    </div>
                  </div>
                  <div className="hotel-info">
                    <h3>{hotel.hotel.name}</h3>
                    <p className="hotel-description">
                      {hotel.hotel.description || 'Comfortable accommodation with great amenities'}
                    </p>
                    
                    {renderHotelAmenities(hotel)}
                    
                    <div className="hotel-price">
                      <span className="price">{hotel.offers[0].price.total} {hotel.offers[0].price.currency}</span>
                      <span className="per-night">per night</span>
                    </div>
                    <div className="hotel-dates">
                      <span><FaRegCalendarAlt /> Check-in: {hotel.offers[0].checkInDate}</span>
                      <span><FaRegCalendarAlt /> Check-out: {hotel.offers[0].checkOutDate}</span>
                    </div>
                  </div>
                  <div className="hotel-actions">
                    <button 
                      onClick={() => handleSelectHotel(hotel)}
                      className={`select-button ${selectedHotel?.hotel.hotelId === hotel.hotel.hotelId ? 'selected' : ''}`}
                    >
                      {selectedHotel?.hotel.hotelId === hotel.hotel.hotelId ? 'Selected' : 'Select'}
                    </button>
                    <button 
                      onClick={() => handleViewHotel(hotel.hotel.name)}
                      className="view-button"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedFlight && selectedHotel && (
        <div className="booking-container">
          <div className="booking-summary">
            <div className="summary-flight">
              <h3>Selected Flight</h3>
              <p>{originCode} <IoIosArrowForward /> {destinationCode}</p>
              <p>{formatDate(selectedFlight.itineraries[0].segments[0].departure.at)}</p>
              <p>{selectedFlight.price.total} {selectedFlight.price.currency}</p>
            </div>
            <div className="summary-hotel">
              <h3>Selected Hotel</h3>
              <p>{selectedHotel.hotel.name}</p>
              <p>{selectedHotel.offers[0].price.total} {selectedHotel.offers[0].price.currency}</p>
            </div>
            <div className="summary-total">
              <h3>Total</h3>
              <p className="total-price">
                {parseFloat(selectedFlight.price.total) + parseFloat(selectedHotel.offers[0].price.total)} 
                {selectedFlight.price.currency}
              </p>
            </div>
          </div>
          <button 
            onClick={handleBookingClick}
            className="book-now-button"
          >
            Book Now
          </button>
        </div>
      )}

      {showBookingPopup && (
        <div className="popup-overlay">
          <div className="booking-popup">
            <h2>Complete Your Booking</h2>
            <form className="booking-form">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  required
                />
              </div>
              
              {costOfLivingDifference && (
                <div className="cost-comparison">
                  <h3>Cost of Living Comparison</h3>
                  <p>
                    {destinationCity} is {Math.abs(costOfLivingDifference.percentageDifference).toFixed(2)}% 
                    {costOfLivingDifference.percentageDifference > 0 ? ' more expensive' : ' cheaper'} than {originCity}
                  </p>
                  <p>
                    If you need $1000 for a week in {originCity}, you'll need about 
                    ${(1000 * (1 + costOfLivingDifference.percentageDifference / 100)).toFixed(2)} in {destinationCity}
                  </p>
                </div>
              )}
              
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={handleBookingSubmit}
                  className="submit-button"
                >
                  Confirm Booking
                </button>
                <button 
                  type="button"
                  onClick={() => setShowBookingPopup(false)}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFlightDetailsPopup && selectedFlight && (
        <div className="popup-overlay">
          <div className="flight-details-popup">
            <h2>Flight Details</h2>
            <button 
              className="close-popup"
              onClick={() => setShowFlightDetailsPopup(false)}
            >
              &times;
            </button>
            
            <div className="flight-summary">
              <div className="summary-item">
                <span>Flight Number</span>
                <span>{selectedFlight.itineraries[0].segments[0].carrierCode} {selectedFlight.itineraries[0].segments[0].number}</span>
              </div>
              <div className="summary-item">
                <span>Departure</span>
                <span>{formatDate(selectedFlight.itineraries[0].segments[0].departure.at)}</span>
              </div>
              <div className="summary-item">
                <span>Arrival</span>
                <span>{formatDate(selectedFlight.itineraries[0].segments[selectedFlight.itineraries[0].segments.length - 1].arrival.at)}</span>
              </div>
              <div className="summary-item">
                <span>Duration</span>
                <span>{formatDuration(selectedFlight.itineraries[0].duration)}</span>
              </div>
              <div className="summary-item">
                <span>Aircraft</span>
                <span>{selectedFlight.itineraries[0].segments[0].aircraft?.code || 'Unknown'}</span>
              </div>
            </div>
            
            <h3>Itinerary</h3>
            <div className="itinerary-details">
              {selectedFlight.itineraries.map((itinerary, idx) => (
                <div key={idx} className="itinerary-segment">
                  <h4>{idx === 0 ? 'Outbound' : 'Return'} Flight</h4>
                  {itinerary.segments.map((segment, segIdx) => (
                    <div key={segIdx} className="segment-details">
                      <div className="segment-header">
                        <span className="segment-airports">
                          {segment.departure.iataCode} <IoIosArrowForward /> {segment.arrival.iataCode}
                        </span>
                        <span className="segment-time">
                          {formatDate(segment.departure.at)} - {formatDate(segment.arrival.at)}
                        </span>
                      </div>
                      <div className="segment-info">
                        <span>Flight: {segment.carrierCode} {segment.number}</span>
                        <span>Duration: {segment.duration}</span>
                        <span>Aircraft: {segment.aircraft?.code || 'Unknown'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            <h3>Price Breakdown</h3>
            <div className="price-details">
              <div className="price-item">
                <span>Base Fare</span>
                <span>{selectedFlight.price.base} {selectedFlight.price.currency}</span>
              </div>
              {selectedFlight.price.fees?.map((fee, idx) => (
                <div key={idx} className="price-item">
                  <span>{fee.type} Fee</span>
                  <span>{fee.amount} {selectedFlight.price.currency}</span>
                </div>
              ))}
              <div className="price-item total">
                <span>Total Price</span>
                <span>{selectedFlight.price.total} {selectedFlight.price.currency}</span>
              </div>
            </div>
            
            <div className="popup-actions">
              <button 
                onClick={() => setShowFlightDetailsPopup(false)}
                className="close-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;