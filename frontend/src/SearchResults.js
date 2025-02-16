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
          params: { cityCode: destinationCode, checkInDate: dateOfDeparture, checkOutDate: dateOfReturn || dateOfDeparture },
        });
        setHotels(response.data);
      } catch (err) {
        console.error('Error fetching hotels:', err);
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
      <div style={styles.priceDetails}>
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
      <div key={index} style={styles.itinerary}>
        <h4>Itinerary {index + 1}</h4>
        <p>Duration: {itinerary.duration}</p>
        {itinerary.segments.map((segment, segmentIndex) => (
          <div key={segmentIndex} style={styles.segment}>
            <p>Segment {segmentIndex + 1}:</p>
            <p>
              From: {segment.departure.iataCode} at {segment.departure.at}
            </p>
            <p>
              To: {segment.arrival.iataCode} at {segment.arrival.at}
            </p>
            <p>Carrier: {segment.carrierCode}</p>
            <p>Flight Number: {segment.number}</p>
            <p>Duration: {segment.duration}</p>
          </div>
        ))}
      </div>
    ));
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Flight Search Results</h1>
      <div style={styles.flightsContainer}>
        {flights.map((flight, index) => (
          <div key={index} style={styles.flightCard}>
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

      <div style={styles.hotelsContainer}>
        <h2>Hotels in {destinationCode}</h2>
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
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    backgroundColor: '#f9f9f9',
  },
  header: {
    textAlign: 'center',
    fontSize: '24px',
    marginBottom: '20px',
  },
  flightsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  flightCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  itinerary: {
    marginTop: '10px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  segment: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
  priceDetails: {
    marginTop: '10px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
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

export default SearchResults;