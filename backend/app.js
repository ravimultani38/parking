const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Location = require('./models/Location'); // Ensure this path is correct

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection without deprecated options
mongoose.connect(process.env.DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Monitor MongoDB connection
mongoose.connection.on('error', (err) => {
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

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendPath));

    // All unknown routes should be handed to React app
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// Enhanced POST endpoint with validation
app.post('/send-location', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        // Validate input
        if (latitude == null || longitude == null) {
            return res.status(400).json({
                error: 'Missing required fields',
                received: req.body,
            });
        }

        // Validate number types and ranges
        if (!isFinite(latitude) || latitude < -90 || latitude > 90) {
            return res.status(400).json({
                error: 'Invalid latitude value',
                received: latitude,
            });
        }

        if (!isFinite(longitude) || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                error: 'Invalid longitude value',
                received: longitude,
            });
        }

        // Create and save location
        const newLocation = new Location({ latitude, longitude });
        const savedLocation = await newLocation.save();

        res.status(200).json({
            message: 'Location saved successfully',
            location: savedLocation,
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            error: 'Server error',
            message: error.message,
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
            message: error.message,
        });
    }
});

// Test endpoint
app.get('/test', (req, res) => {
    res.status(200).json({
        message: 'Test endpoint is working!',
        timestamp: new Date().toISOString(),
    });
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
