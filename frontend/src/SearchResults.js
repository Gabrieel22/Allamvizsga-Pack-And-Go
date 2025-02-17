import React, { useEffect, useState } from "react";
import axios from "axios";
import './App.css'; // Importáljuk a CSS fájlt

const SearchResults = () => {
  const [flights, setFlights] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null); // Kiválasztott repülőjárat

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

  // Popup bezárása
  const closePopup = () => {
    setSelectedFlight(null);
  };

  // Hotel kártyára kattintás eseménykezelő
  const handleHotelClick = (hotelName) => {
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(hotelName)}`;
    window.open(googleSearchUrl, '_blank'); // Új lapon nyitja meg a Google keresést
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
                className="flight-card"
                onClick={() => setSelectedFlight(flight)} // Kattintásra kiválasztjuk a repülőjáratot
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
                className="hotel-card"
                onClick={() => handleHotelClick(hotel.hotel.name)} // Kattintásra Google keresés a hotel nevére
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

      {/* Popup a részletes információkhoz */}
      {selectedFlight && (
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
            <button onClick={closePopup}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;