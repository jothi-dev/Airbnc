const express = require('express');
const app = express();
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const cors = require('cors');
const imageDownloader = require('image-downloader');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const cookieParser = require('cookie-parser')
require('dotenv').config()

const jwtSecret = 'Josphat';

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname+'/uploads'))

app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173',
}));

mongoose.connect(process.env.MONGO_URL);

app.get('/test', (req,res) =>{
    res.json('test ok');
});

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

        const userDoc = await User.create({
            name,
            email,
            password: hashedPassword 
        });
        res.json(userDoc);
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'An error occurred while registering user' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userDoc = await User.findOne({ email });

        if (!userDoc) {
            return res.status(404).json({ error: 'User not found' });
        }

        const passOk = bcrypt.compareSync(password, userDoc.password);
        if (!passOk) {
            return res.status(422).json({ error: 'Incorrect password' });
        }

        const token = jwt.sign({ email: userDoc.email, id: userDoc._id }, jwtSecret);
        res.cookie('token', token);
        res.json(userDoc);
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'An error occurred during login' });
    }
});



app.get('/profile', async (req, res) => {
    const { token } = req.cookies;
    if (token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if (err) {
                console.error('Error verifying token:', err);
                return res.status(500).json({ error: 'Error verifying token' });
            }
            try {
                const {name, email, _id} = await User.findById(userData.id);
                res.json({name, email, _id});
            } catch (error) {
                console.error('Error finding user by ID:', error);
                res.status(500).json({ error: 'Error finding user by ID' });
            }
        });
    } else {
        res.json(null);
    }
});

app.post('/logout', (req, res) => {
    res.cookie('token', '').json(true);
})


app.post('/upload-by-link', async(req, res) =>{
    const {link} = req.body
    const newName = 'photo' + Date.now() + '.jpg';
    await imageDownloader.image({
        url: link,
        dest: __dirname + '/uploads/' + newName,
    })
    res.json(newName);
})

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'favicon.ico'));
});

app.listen(4000);
