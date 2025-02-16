import React, { useEffect, useState } from "react";
import axios from "axios";

const SearchResults = () => {
  const [flights, setFlights] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        // Rendezzük a hoteleket ár szerint növekvő sorrendben
        const sortedHotels = response.data.data.sort((a, b) => parseFloat(a.offers[0].price.total) - parseFloat(b.offers[0].price.total));
        setHotels(sortedHotels || []);
      } catch (err) {
        console.error('Error fetching hotels:', err);
        setHotels([]); // Ha hiba történik, akkor üres tömböt használunk
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

  const renderPriceDetails = (price) => {
    if (!price) return null;

    return (
      <div>
        <h4>Price Details:</h4>
        <p>Currency: {price.currency}</p>
        <p>Total: {price.total}</p>
        <p>Base: {price.base}</p>
        {price.fees?.map((fee, index) => (
          <p key={index}>
            Fee ({fee.type}): {fee.amount}
          </p>
        ))}
        {price.additionalServices?.map((service, index) => (
          <p key={index}>
            Service ({service.type}): {service.amount}
          </p>
        ))}
        <p>Grand Total: {price.grandTotal}</p>
      </div>
    );
  };

  const renderItineraries = (itineraries) => {
    return itineraries.map((itinerary, index) => (
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
    ));
  };

  return (
    <div>
      <h1>Flight Search Results</h1>
      <div>
        {flights.map((flight, index) => (
          <div key={index}>
            <h2>Flight {index + 1}</h2>
            <p>Flight ID: {flight.id}</p>
            <p>Last Ticketing Date: {flight.lastTicketingDate}</p>
            <p>Number of Seats: {flight.numberOfBookableSeats}</p>
            <p>One Way: {flight.oneWay ? "Yes" : "No"}</p>
            {renderItineraries(flight.itineraries)}
            {renderPriceDetails(flight.price)}
          </div>
        ))}
      </div>

      <h2>Hotels in {destinationCode}</h2>
      {!hotels || hotels.length === 0 ? (
        <div>No hotels found.</div>
      ) : (
        <div>
          {hotels.map((hotel, index) => (
            <div key={index}>
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
  );
};

export default SearchResults;