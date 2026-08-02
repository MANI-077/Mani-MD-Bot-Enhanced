const express = require('express');
const path = require('path');
const axios = require('axios');

function startServer() {
    const app = express();
    const port = process.env.PORT || 3000;

    // Serve static files (like index.html)
    app.use(express.static(path.join(__dirname)));

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.get('/ping', (req, res) => {
        res.status(200).send({
            status: 'online',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    });

    app.listen(port, () => {
        console.log(`🌐 Web server is running on port ${port}`);
    });

    // Self-pinging mechanism to keep the bot alive on Render
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
    if (RENDER_URL) {
        console.log(`🚀 Self-pinging enabled for: ${RENDER_URL}`);
        setInterval(async () => {
            try {
                await axios.get(`${RENDER_URL}/ping`);
                console.log('💓 Keep-alive ping sent');
            } catch (error) {
                console.error('❌ Keep-alive ping failed:', error.message);
            }
        }, 5 * 60 * 1000); // Ping every 5 minutes
    }
}

module.exports = { startServer };
