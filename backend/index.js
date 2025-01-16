import express from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import Amadeus from 'amadeus';
import dotenv from 'dotenv';
import axios from 'axios';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise'; // Az új import!

const db = mysql.createPool({
  host: "127.0.0.1",
  user: "packandgo_user",
  password: "secure_password",
  database: "PackAndGO",
});

dotenv.config()
const app = express();
const PORT = 3000;
app.use(bodyParser.json())

app.use(cors({
  origin: '*', // Engedélyez minden origin-t (fejlesztési célokra)
  methods: ['GET', 'POST'],
}));



app.get('/', (req, res) => {
    res.send('Hello, Pack And Go API!');
});

app.listen(PORT, () =>
    console.log(`Server is running on port: http://localhost:${PORT}`)
);

const NINJA_API_KEY = process.env.NINJA_API_KEY;

if (!NINJA_API_KEY) {
  console.error("Missing NINJA_API_KEY in environment variables");
  process.exit(1);
}

const amadeus = new Amadeus({
    clientId:process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
});



//http://localhost:3000/city-and-airport-search/budapest

// Maradjon csak ez:
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


//http://localhost:3000/flight-search?originCode=LON&destinationCode=SFO&dateOfDeparture=2022-02-02

const validateDepartureDate = (date) => {
  const today = new Date();
  const requestedDate = new Date(date);
  return requestedDate > today
    ? requestedDate.toISOString().split('T')[0]
    : new Date(today.setDate(today.getDate() + 1)).toISOString().split('T')[0];
};


app.get('/flight-search', (req, res) => {
  const originCode = req.query.originCode;  // IATA kód
  const destinationCode = req.query.destinationCode;  // IATA kód
  let dateOfDeparture = validateDepartureDate(req.query.dateOfDeparture);  // Dátum kezelés

  // Logoljuk az érkező adatokat
  console.log('Flight Search Requested:');
  console.log('Origin:', originCode);
  console.log('Destination:', destinationCode);
  console.log('Date of Departure:', dateOfDeparture);

  amadeus.shopping.flightOffersSearch.get({
    originLocationCode: originCode,  // IATA kód
    destinationLocationCode: destinationCode,  // IATA kód
    departureDate: dateOfDeparture,
    adults: '1',
    max: '10'
  })
    .then((response) => {
      // Logoljuk a választ az Amadeus API-ból
      console.log('Amadeus API Response:', response);

      if (response.result && response.result.data && response.result.data.length > 0) {
        // Logoljuk a megtalált járatokat
        console.log('Flight Results:', response.result.data);
        res.status(200).json(response.result.data);  // Járat ajánlatok
      } else {
        console.log('No flights found.');
        res.status(404).json({ error: 'No flights found' });  // Nincs találat
      }
    })
    .catch((error) => {
      console.error('Amadeus API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
});

//---------------ADATBAZIS 


// Regisztrációs végpont
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  console.log(process.env.DB_HOST);  // Ellenőrizd, hogy helyesen van-e beállítva
  console.log(process.env.DB_USER);
  console.log(process.env.DB_PASSWORD);
  console.log(process.env.DB_NAME);
  
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

// Login endpoint
app.post('/login', async (req, res) => {
  console.log('Received body:', req.body); // Diagnosztika

  const { username, password } = req.body; // Itt "username" szerepel "name" helyett

  if (!username || !password) {
    return res.status(400).json({ message: 'Felhasználónév és jelszó megadása kötelező!' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM Users WHERE name = ?', [username]); // Itt "username"-t használunk
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
