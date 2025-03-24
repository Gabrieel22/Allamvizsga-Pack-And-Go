import React, { useEffect, useState } from "react";
import axios from "axios";
import './App.css';
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
        const response = await axios.get("http://localhost:3000/hotel-search", {
          params: { cityName: destinationCode, checkInDate: dateOfDeparture, checkOutDate: dateOfReturn || dateOfDeparture },
        });
        const sortedHotels = response.data.data.sort((a, b) => parseFloat(a.offers[0].price.total) - parseFloat(b.offers[0].price.total));
        setHotels(sortedHotels || []);
      } catch (err) {
        console.error('Error fetching hotels:', err);
        setHotels([]);
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
      const destinationCode = flights[0].itineraries[1].segments[0].departure.iataCode;
  
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
    return `${hours} óra ${minutes} perc`;
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!flights || flights.length === 0) return <div>No flights found</div>;

  return (
    <div className="search-results-container">
      <div className="flights-column">
        <h1>Flight Search Results</h1>
        <div>
          {flights.map((flight, index) => {
            const { departureTime, arrivalTime } = getFlightTimes(flight.itineraries);
            const roundTripTimes = getRoundTripTimes(flight.itineraries);
            const duration = formatDuration(flight.itineraries[0].duration);

            return (
              <div
                key={index}
                className={`flight-card ${selectedFlight?.id === flight.id ? "selected" : ""}`}
              >
                <h2>Flight {index + 1}</h2>
                <p>Departure: {new Date(departureTime).toLocaleString()}</p>
                <p>Arrival: {new Date(arrivalTime).toLocaleString()}</p>
                <p>Travel Time (Outbound): {duration}</p>
                {roundTripTimes && (
                  <>
                    <p>Return Departure: {new Date(roundTripTimes.returnDeparture).toLocaleString()}</p>
                    <p>Return Arrival: {new Date(roundTripTimes.returnArrival).toLocaleString()}</p>
                    <p>Travel Time (Return): {roundTripTimes.returnDuration}</p>
                  </>
                )}
                <p>Price: {flight.price.total} {flight.price.currency}</p>
                <button onClick={() => handleSelectFlight(flight)}>Kiválaszt</button>
                <button onClick={() => handleShowFlightDetails(flight)}>Részletek</button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="hotels-column">
        <h2>Hotels in {destinationCode}</h2>
        {!hotels || hotels.length === 0 ? (
          <div>No hotels found.</div>
        ) : (
          <div>
            {hotels.map((hotel, index) => (
              <div
                key={index}
                className={`hotel-card ${selectedHotel?.hotel.hotelId === hotel.hotel.hotelId ? "selected" : ""}`}
              >
                <h3>{hotel.hotel.name}</h3>
                <p>{hotel.hotel.description}</p>
                <p>Price: {hotel.offers[0].price.total} {hotel.offers[0].price.currency}</p>
                <p>Check-In: {hotel.offers[0].checkInDate}</p>
                <p>Check-Out: {hotel.offers[0].checkOutDate}</p>
                <div className="hotel-card-buttons">
                  <button onClick={() => handleSelectHotel(hotel)}>Kiválaszt</button>
                  <button 
                    onClick={() => handleViewHotel(hotel.hotel.name)}
                    aria-label={`View ${hotel.hotel.name} on Google`}
                  >
                    Megtekintés
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFlight && selectedHotel && (
        <div className="booking-button-container">
          <button className="booking-button" onClick={handleBookingClick}>
            Foglalás
          </button>
        </div>
      )}

      {showBookingPopup && (
        <div className="popup">
          <div className="popup-content">
            <h2>Foglalás</h2>
            <form onSubmit={(e) => e.preventDefault()}>
              <label>
                Név:
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label>
                Email:
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                Telefonszám:
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </label>
              <button type="button" onClick={handleBookingSubmit}>
                Foglalás elküldése
              </button>
              <button type="button" onClick={() => setShowBookingPopup(false)}>
                Mégse
              </button>
            </form>
          </div>
        </div>
      )}

      {showFlightDetailsPopup && selectedFlight && (
        <div className="popup">
          <div className="popup-content">
            <h2>Flight Details</h2>
            <p>Flight ID: {selectedFlight.id}</p>
            <p>Last Ticketing Date: {selectedFlight.lastTicketingDate}</p>
            <p>Number of Seats: {selectedFlight.numberOfBookableSeats}</p>
            <p>One Way: {selectedFlight.oneWay ? "Yes" : "No"}</p>
            <h3>Itineraries:</h3>
            {selectedFlight.itineraries.map((itinerary, index) => (
              <div key={index}>
                <h4>Itinerary {index + 1}</h4>
                <p>Duration: {formatDuration(itinerary.duration)}</p>
                {itinerary.segments.map((segment, segmentIndex) => (
                  <div key={segmentIndex}>
                    <p>Segment {segmentIndex + 1}:</p>
                    <p>From: {segment.departure.iataCode} at {segment.departure.at}</p>
                    <p>To: {segment.arrival.iataCode} at {segment.arrival.at}</p>
                    <p>Carrier: {segment.carrierCode}</p>
                    <p>Flight Number: {segment.number}</p>
                    <p>Duration: {segment.duration}</p>
                  </div>
                ))}
              </div>
            ))}
            <h3>Price Details:</h3>
            <p>Currency: {selectedFlight.price.currency}</p>
            <p>Total: {selectedFlight.price.total}</p>
            <p>Base: {selectedFlight.price.base}</p>
            {selectedFlight.price.fees?.map((fee, index) => (
              <p key={index}>
                Fee ({fee.type}): {fee.amount}
              </p>
            ))}
            {selectedFlight.price.additionalServices?.map((service, index) => (
              <p key={index}>
                Service ({service.type}): {service.amount}
              </p>
            ))}
            <p>Grand Total: {selectedFlight.price.grandTotal}</p>
            <button onClick={() => setShowFlightDetailsPopup(false)}>Bezár</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;