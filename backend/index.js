import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import Amadeus from 'amadeus';
import dotenv from 'dotenv';
import axios from 'axios';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';

dotenv.config();

const db = mysql.createPool({
  host: "127.0.0.1",
  user: "packandgo_user",
  password: "secure_password",
  database: "PackAndGO",
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

app.get('/', (req, res) => {
  res.send('Hello, Pack And Go API!');
});

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
});

const NINJA_API_KEY = process.env.NINJA_API_KEY;
if (!NINJA_API_KEY) {
  console.error("Missing NINJA_API_KEY in environment variables");
}

app.get('/get-city-code/:iataCode', async (req, res) => {
  const { iataCode } = req.params;

  try {
    let cityCode;
    try {
      const response = await amadeus.referenceData.locations.get({
        subType: 'AIRPORT',
        keyword: iataCode,
      });
      const data = JSON.parse(response.body).data;
      if (data && data.length > 0) {
        cityCode = data[0].address.cityCode;
        if (iataCode == 'BUD' && cityCode== 'DBN') cityCode = 'BUD'
        return res.json({ cityCode });
      } else {
        console.warn(`No city code found for IATA ${iataCode} using Amadeus API. Falling back to AeroDataBox API.`);
      }
    } catch (amadeusError) {
      console.error('Error with Amadeus API:', amadeusError.message);
    }

    //Fallback az AeroDataBox API-ra, ha az Amadeus nem adott eredményt
    const aeroDataBoxUrl = `https://aerodatabox.p.rapidapi.com/airports/search/term?q=${iataCode}`;
    const aeroDataBoxResponse = await axios.get(aeroDataBoxUrl, {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      },
    });

    if (aeroDataBoxResponse.status === 200 && aeroDataBoxResponse.data.items && aeroDataBoxResponse.data.items.length > 0) {
      cityCode = aeroDataBoxResponse.data.items[0].iata;
      return res.json({ cityCode });
    } else {
      return res.status(404).json({ error: `No city code found for IATA ${iataCode}` });
    }
  } catch (error) {
    console.error('Error in /get-city-code:', error.message);
    return res.status(500).json({ error: 'Failed to fetch city code', errorDetails: error.message });
  }
});
const validateDepartureDate = (date) => {
  const today = new Date();
  const requestedDate = new Date(date);
  return requestedDate > today
    ? requestedDate.toISOString().split('T')[0]
    : new Date(today.setDate(today.getDate() + 1)).toISOString().split('T')[0];
};

app.get('/flight-search', async (req, res) => {
  const { originCode, destinationCode, dateOfDeparture, dateOfReturn } = req.query;

  console.log('Received request with params:', req.query);

  if (!originCode || !destinationCode || !dateOfDeparture) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  const validatedDateOfDeparture = validateDepartureDate(dateOfDeparture);
  const validatedDateOfReturn = dateOfReturn || null;

  console.log('Validated dates:', validatedDateOfDeparture, validatedDateOfReturn);

  try {
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate: validatedDateOfDeparture,
      returnDate: validatedDateOfReturn,
      adults: '1',
      max: '10',
    });

    if (response.result && response.result.data && response.result.data.length > 0) {
      console.log('Flight Results:', response.result.data);
      res.status(200).json(response.result.data);
    } else {
      console.log('No flights found.');
      res.status(404).json({ error: 'No flights found' });
    }
  } catch (error) {
    console.error('Amadeus API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/hotel-search', async (req, res) => {
  const { cityName, checkInDate, checkOutDate } = req.query;

  if (!cityName || !checkInDate || !checkOutDate) {
    return res.status(400).send({ error: "Missing required query parameters: cityName, checkInDate, or checkOutDate" });
  }

  const today = new Date();
  const validatedCheckInDate = new Date(checkInDate);
  const validatedCheckOutDate = new Date(checkOutDate);

  if (validatedCheckInDate < today || validatedCheckOutDate < today) {
    return res.status(400).send({ error: "Invalid date: dates cannot be in the past" });
  }

  let hotelids;

  try {
    const hotelResponse = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode: cityName,
    });

    hotelids = hotelResponse.result.data
      .slice(0, 50)
      .map(hotel => hotel.hotelId)
      .join(',');
  } catch (error) {
    console.error("Error fetching hotel IDs:", error);
    return res.status(500).send(error.response ? error.response.data : error.message);
  }

  try {
    const offersResponse = await amadeus.shopping.hotelOffersSearch.get({
      hotelIds: hotelids,
      checkInDate: validatedCheckInDate.toISOString().split('T')[0],
      checkOutDate: validatedCheckOutDate.toISOString().split('T')[0],
      roomQuantity: 1,
      adults: 1,
    });

    res.send(offersResponse.result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send(error.response ? error.response.data : error.message);
  }
});

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Minden mezőt ki kell tölteni!' });
  }

  try {
    const [existingUser] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Az email már regisztrálva van.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query('INSERT INTO Users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())', [name, email, hashedPassword, 0]);

    res.status(201).json({ message: 'Regisztráció sikeres!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Hiba történt a regisztráció során.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Felhasználónév és jelszó megadása kötelező!' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM Users WHERE name = ?', [username]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó!' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (passwordMatch) {
      return res.status(200).json({ message: 'Bejelentkezés sikeres!' });
    } else {
      return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó!' });
    }
  } catch (error) {
    console.error('Hiba a bejelentkezés során:', error);
    return res.status(500).json({ message: 'Hiba történt a bejelentkezés során!' });
  }
});

app.post('/book', async (req, res) => {
  try {
    const { flight, hotel, name, email, phone, costOfLivingDifference, originCity, destinationCity } = req.body;

    const getCountryNameByIataCode = async (iataCode) => {
      try {
        const response = await axios.get('http://localhost:3000/get-city-name', {
          params: { iataCode },
        });
    
        if (response.data && response.data.countryName) {
          return response.data.countryName;
        } else {
          throw new Error(`City not found for IATA code: ${iataCode}`);
        }
      } catch (error) {
        console.error('Error fetching city name:', error);
        throw error;
      }
    };

    const country = await getCountryNameByIataCode(flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode);

    const apiUrl = `https://api.api-ninjas.com/v1/country?name=${country}`;

    const apiResponse = await axios.get(apiUrl, {
      headers: {
        'X-Api-Key': process.env.NINJA_API_KEY,
      },
    });

    let currency = "Ismeretlen pénznem";
    if (apiResponse.data && apiResponse.data.length > 0 && apiResponse.data[0].currency) {
      currency = apiResponse.data[0].currency.code +' , '+apiResponse.data[0].currency.name;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Foglalás megerősítése',
      text: `
        Köszönjük a foglalását!

        Repülőjárat részletei:
        - Repülőjárat ID: ${flight.id}
        - Indulás: ${flight.itineraries[0].segments[0].departure.at}
        - Érkezés: ${flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.at}
        - Ár: ${flight.price.total} ${flight.price.currency}

        Szállás részletei:
        - Szállás neve: ${hotel.hotel.name}
        - Ár: ${hotel.offers[0].price.total} ${hotel.offers[0].price.currency}
        - Check-In: ${hotel.offers[0].checkInDate}
        - Check-Out: ${hotel.offers[0].checkOutDate}

        Elérhetőségek:
        - Név: ${name}
        - Email: ${email}
        - Telefonszám: ${phone}

        Cost of Living Comparison:
        - ${costOfLivingDifference.percentageDifference.toFixed(2)}% ${costOfLivingDifference.percentageDifference > 0 ? 'drágább' : 'olcsóbb'} a célállomás, mint az indulási hely.
        - Ha ${originCity}-ben 1000$ kell egy hétre, akkor ${destinationCity}-ben körülbelül ${(1000 * (1 + costOfLivingDifference.percentageDifference / 100)).toFixed(2)}$ szükséges.
        - Pénznem a célországban: ${currency}
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: "Foglalás sikeres, email elküldve!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send({ error: "Hiba történt az email küldése során." });
  }
});

app.get('/get-city-name', async (req, res) => {
  const { iataCode } = req.query;

  if (!iataCode) {
    return res.status(400).json({ error: 'IATA code is required' });
  }

  const apiUrl = `https://api.api-ninjas.com/v1/airports?iata=${iataCode}`;

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'X-Api-Key': NINJA_API_KEY,
      },
    });

    if (response.status === 200 && response.data.length > 0) {
      const cityName = response.data[0].city;
      const countryName = response.data[0].country;
      return res.status(200).json({ cityName, countryName });
    } else {
      return res.status(404).json({ error: 'City or country not found' });
    }
  } catch (error) {
    console.error('Error fetching airport data:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port: http://localhost:${PORT}`);
});