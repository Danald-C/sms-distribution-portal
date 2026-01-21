if(!process.env.DOCKER && process.env.NODE_ENV !== 'production') {
    require('dotenv').config({override: false});
}

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool, dbObj } = require('./db');
const cors = require('cors');
const router = express.Router();

const bodyParser = require('body-parser') // 
const cookieParser = require('cookie-parser') // 
const authRoutes = require('./routes/auth')
const smsRoutes = require('./routes/sms')
const paymentsRoutes = require('./routes/payments')

// http://localhost:5000
// pgAdmin: http://localhost:5050
// Redis port 6379

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

const app = express()
app.use(cors());
app.use(cookieParser())
app.use(bodyParser.json())
// app.use(express.json())

    const connString = async () => {
      try {
        const res = await pool.query('SELECT 1');
        console.log('✅ PostgreSQL connected successfully');
      } catch (err) {
        console.error('❌ PostgreSQL connection failed:', err.message);
      }
    };
// mount APIs
// console.log('I just added this one right here...')
console.log('Process ENV Here.', process.env.SMS_PROVIDER_API_URL)
// connString()
app.use('/', router.get('/', (req, res) => {
    res.send('API is running...')
    // res.render('API is running...')
}))
app.use('/api/auth', authRoutes)
app.use('/api/sms', smsRoutes.router)
app.use('/api/payments', paymentsRoutes)

app.use(cors());
// mount APIs
app.get('/health', (req,res)=>res.json({ ok: true }));

const PORT = process.env.PORT || 4000; // 8080
app.listen(PORT, () => console.log('Backend listening on', PORT))