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

// MySQL kapcsolódás
const db = mysql.createPool({
  host: "127.0.0.1",
  user: "packandgo_user",
  password: "secure_password",
  database: "PackAndGO",
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user:process.env.EMAIL_USER,
    pass:process.env.EMAIL_PASS,
  },
});

// Inicializálás
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cors({
  origin: '*',  // Fejlesztési célokra engedélyezve minden origin
  methods: ['GET', 'POST'],
}));

// Üdvözlő üzenet
app.get('/', (req, res) => {
  res.send('Hello, Pack And Go API!');
});

// Amadeus API kulcs
const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
});

// NINJA API kulcs
const NINJA_API_KEY = process.env.NINJA_API_KEY;
if (!NINJA_API_KEY) {
  console.error("Missing NINJA_API_KEY in environment variables");
  process.exit(1);
}

// Repülőtétek keresése a NINJA API-val
app.get('/city-and-airport-search/:parameter', async (req, res) => {
  const parameter = req.params.parameter;
  const apiUrl = `https://api.api-ninjas.com/v1/airports?name=${parameter}`;

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'X-Api-Key': NINJA_API_KEY,
      },
    });

    if (response.status === 200) {
      res.status(200).json(response.data);
    } else {
      res.status(response.status).json({
        error: `Error fetching data: ${response.statusText}`,
      });
    }
  } catch (error) {
    console.error('Error fetching airport data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dátum validálása
const validateDepartureDate = (date) => {
  const today = new Date();
  const requestedDate = new Date(date);
  return requestedDate > today
    ? requestedDate.toISOString().split('T')[0]
    : new Date(today.setDate(today.getDate() + 1)).toISOString().split('T')[0];
};

// Járatok keresése
app.get('/flight-search', async (req, res) => {
  const { originCode, destinationCode, dateOfDeparture, dateOfReturn } = req.query;

  console.log('Received request with params:', req.query);  // Paraméterek logolása

  // Ellenőrizni kell, hogy minden paraméter át van adva
  if (!originCode || !destinationCode || !dateOfDeparture) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  const validatedDateOfDeparture = validateDepartureDate(dateOfDeparture);
  const validatedDateOfReturn = dateOfReturn || null;

  console.log('Validated dates:', validatedDateOfDeparture, validatedDateOfReturn); // Validált dátumok logolása

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
      console.log('Flight Results:', response.result.data);  // Járatok logolása
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

// Hotel ajánlatok keresése (a frontend /hotel-search végpontját használjuk)
app.get('/hotel-search', async (req, res) => {
  const { cityName, checkInDate, checkOutDate } = req.query;

  // Ha nincs bemenet, akkor hiba
  if (!cityName || !checkInDate || !checkOutDate) {
    return res.status(400).send({ error: "Missing required query parameters: cityName, checkInDate, or checkOutDate" });
  }

  // Dátumok érvényességének ellenőrzése
  const today = new Date();
  const validatedCheckInDate = new Date(checkInDate);
  const validatedCheckOutDate = new Date(checkOutDate);

  if (validatedCheckInDate < today || validatedCheckOutDate < today) {
    return res.status(400).send({ error: "Invalid date: dates cannot be in the past" });
  }

  let hotelids;

  // Hotel ID-k lekérése az adott városban
  try {
    const hotelResponse = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode: cityName,
    });

    hotelids = hotelResponse.result.data
      .slice(0, 50) // Csak az első 50 hotel ID-t használjuk
      .map(hotel => hotel.hotelId)
      .join(','); // Hotel ID-k összefűzése vesszővel elválasztva
  } catch (error) {
    console.error("Error fetching hotel IDs:", error);
    return res.status(500).send(error.response ? error.response.data : error.message);
  }

  // Hotel ajánlatok lekérése a kapott hotel ID-k alapján
  try {
    const offersResponse = await amadeus.shopping.hotelOffersSearch.get({
      hotelIds: hotelids,
      checkInDate: validatedCheckInDate.toISOString().split('T')[0], // Dátum formázása
      checkOutDate: validatedCheckOutDate.toISOString().split('T')[0], // Dátum formázása
      roomQuantity: 1,
      adults: 1,
    });

    res.send(offersResponse.result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).send(error.response ? error.response.data : error.message);
  }
});

// Regisztráció
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

// Bejelentkezés
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
  const { flight, hotel, name, email, phone } = req.body;

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
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: "Foglalás sikeres, email elküldve!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send({ error: "Hiba történt az email küldése során." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port: http://localhost:${PORT}`);
});