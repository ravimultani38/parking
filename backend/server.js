const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const port = 3000;

// MongoDB connection without deprecated options
mongoose.connect('mongodb://localhost:37017/locationDB')
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Monitor MongoDB connection
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// Use CORS
app.use(cors());

// Middleware to parse JSON bodies with error handling
app.use(express.json());
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).send({ error: 'Invalid JSON' });
    }
    next();
});

// Import the location model
const Location = require('./models/Location');

// Enhanced endpoint with validation
app.post('/send-location', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        // Validate input
        if (!latitude || !longitude) {
            console.log('Invalid data received:', req.body);
            return res.status(400).json({
                error: 'Missing required fields',
                received: req.body
            });
        }

        // Validate number types and ranges
        if (!isFinite(latitude) || latitude < -90 || latitude > 90) {
            return res.status(400).json({
                error: 'Invalid latitude value',
                received: latitude
            });
        }

        if (!isFinite(longitude) || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                error: 'Invalid longitude value',
                received: longitude
            });
        }

        // Create and save location with await
        const newLocation = new Location({ latitude, longitude });
        const savedLocation = await newLocation.save();

        console.log('Location saved successfully:', savedLocation);
        res.status(200).json({
            message: 'Location saved successfully',
            location: savedLocation
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            error: 'Server error',
            message: error.message
        });
    }
});

// GET endpoint to verify stored data
app.get('/locations', async (req, res) => {
    try {
        const locations = await Location.find().sort('-createdAt').limit(10);
        res.status(200).json(locations);
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({
            error: 'Error fetching locations',
            message: error.message
        });
    }
});

// Start the server with error handling
const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
});

// Handle process termination
process.on('SIGTERM', () => {
    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log('Server closed. Database instance disconnected');
            process.exit(0);
        });
    });
});