import React, { useEffect, useState } from "react";
import axios from "axios";
import './App.css'; // Importáljuk a CSS fájlt

const SearchResults = () => {
  const [flights, setFlights] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null); // Kiválasztott repülőjárat
  const [selectedHotel, setSelectedHotel] = useState(null); // Kiválasztott hotel
  const [showBookingPopup, setShowBookingPopup] = useState(false); // Foglalás popup megjelenítése
  const [showFlightDetailsPopup, setShowFlightDetailsPopup] = useState(false); // Részletes információk popup megjelenítése
  const [name, setName] = useState(""); // Név
  const [email, setEmail] = useState(""); // Email
  const [phone, setPhone] = useState(""); // Telefonszám

  const urlParams = new URLSearchParams(window.location.search);
  const originCode = urlParams.get("originCode");
  const destinationCode = urlParams.get("destinationCode");
  const dateOfDeparture = urlParams.get("dateOfDeparture");
  const dateOfReturn = urlParams.get("dateOfReturn");

  useEffect(() => {
    const fetchFlights = async () => {
      setLoading(true);
      try {
        const response = await axios.get("http://localhost:3000/flight-search", {
          params: { originCode, destinationCode, dateOfDeparture, dateOfReturn },
        });
        setFlights(response.data);
        console.log("Fetched flights:", response.data);
      } catch (err) {
        setError("Error fetching flights: " + err.message);
        console.error(err);
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!flights || flights.length === 0) return <div>No flights found</div>;

  // Az első indulási és utolsó érkezési idő kinyerése
  const getFlightTimes = (itineraries) => {
    const departureTime = itineraries[0].segments[0].departure.at;
    const arrivalTime = itineraries[0].segments[itineraries[0].segments.length - 1].arrival.at;
    return { departureTime, arrivalTime };
  };

  // Az oda- és visszaút időpontjainak kinyerése
  const getRoundTripTimes = (itineraries) => {
    if (itineraries.length === 2) {
      const outboundDeparture = itineraries[0].segments[0].departure.at;
      const outboundArrival = itineraries[0].segments[itineraries[0].segments.length - 1].arrival.at;
      const returnDeparture = itineraries[1].segments[0].departure.at;
      const returnArrival = itineraries[1].segments[itineraries[1].segments.length - 1].arrival.at;
      return { outboundDeparture, outboundArrival, returnDeparture, returnArrival };
    }
    return null;
  };

  // Repülőjárat kiválasztása
  const handleSelectFlight = (flight) => {
    setSelectedFlight(flight);
  };

  // Hotel kiválasztása
  const handleSelectHotel = (hotel) => {
    setSelectedHotel(hotel);
  };

  // Foglalás gombra kattintás eseménykezelő
  const handleBookingClick = () => {
    setShowBookingPopup(true);
  };

  // Foglalás adatok elküldése
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
    };

    try {
      // Küldjük a foglalás adatait a backendnek
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

  // Részletes információk megjelenítése
  const handleShowFlightDetails = (flight) => {
    setSelectedFlight(flight);
    setShowFlightDetailsPopup(true);
  };

  return (
    <div className="search-results-container">
      <div className="flights-column">
        <h1>Flight Search Results</h1>
        <div>
          {flights.map((flight, index) => {
            const { departureTime, arrivalTime } = getFlightTimes(flight.itineraries);
            const roundTripTimes = getRoundTripTimes(flight.itineraries);

            return (
              <div
                key={index}
                className={`flight-card ${selectedFlight?.id === flight.id ? "selected" : ""}`}
              >
                <h2>Flight {index + 1}</h2>
                <p>Departure: {new Date(departureTime).toLocaleString()}</p>
                <p>Arrival: {new Date(arrivalTime).toLocaleString()}</p>
                {roundTripTimes && (
                  <>
                    <p>Return Departure: {new Date(roundTripTimes.returnDeparture).toLocaleString()}</p>
                    <p>Return Arrival: {new Date(roundTripTimes.returnArrival).toLocaleString()}</p>
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
                onClick={() => handleSelectHotel(hotel)} // Kattintásra kiválasztjuk a hotelt
              >
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

      {/* Foglalás gomb */}
      {selectedFlight && selectedHotel && (
        <div className="booking-button-container">
          <button className="booking-button" onClick={handleBookingClick}>
            Foglalás
          </button>
        </div>
      )}

      {/* Foglalás popup */}
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

      {/* Részletes információk popup */}
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
                <p>Duration: {itinerary.duration}</p>
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