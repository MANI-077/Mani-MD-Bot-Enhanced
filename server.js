const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs');

function startServer() {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);
    const port = process.env.PORT || 3000;

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

    io.on('connection', (socket) => {
        console.log('👤 New client connected to web panel');

        socket.on('qr-request', async () => {
            console.log(`📲 QR request from web panel`);
            try {
                const { version } = await fetchLatestBaileysVersion();
                const tempDir = path.join(__dirname, 'session_qr_' + socket.id);
                const { state, saveCreds } = await useMultiFileAuthState(tempDir);

                const sock = makeWASocket({
                    version,
                    logger: pino({ level: 'silent' }),
                    printQRInTerminal: false,
                    browser: ["Ubuntu", "Chrome", "20.0.04"],
                    auth: {
                        creds: state.creds,
                        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                    }
                });

                sock.ev.on('creds.update', saveCreds);

                sock.ev.on('connection.update', async (update) => {
                    const { connection, qr, lastDisconnect } = update;
                    if (qr) {
                        socket.emit('qr-code', qr);
                    }
                    if (connection === 'open') {
                        socket.emit('connection-status', { connected: true });
                        console.log(`✅ Web client linked via QR`);
                    }
                    if (connection === 'close') {
                        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
                        if (!shouldReconnect) {
                            fs.rmSync(tempDir, { recursive: true, force: true });
                        }
                    }
                });
            } catch (error) {
                console.error("Socket QR error:", error);
                socket.emit('pair-error', 'Internal server error');
            }
        });
        
        socket.on('pair-request', async (data) => {
            const { number } = data;
            if (!number) return socket.emit('pair-error', 'Number is required');
            
            console.log(`📲 Pairing request for: ${number}`);
            
            try {
                const { version } = await fetchLatestBaileysVersion();
                const tempDir = path.join(__dirname, 'session_web_' + socket.id);
                const { state, saveCreds } = await useMultiFileAuthState(tempDir);
                
                const sock = makeWASocket({
                    version,
                    logger: pino({ level: 'silent' }),
                    printQRInTerminal: false,
                    browser: ["Ubuntu", "Chrome", "20.0.04"],
                    auth: {
                        creds: state.creds,
                        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                    }
                });
                
                sock.ev.on('creds.update', saveCreds);
                
                if (!sock.authState.creds.registered) {
                    // Increased delay to 5 seconds for reliable notification
                    setTimeout(async () => {
                        try {
                            const cleanNumber = number.replace(/[^0-9]/g, '');
                            let code = await sock.requestPairingCode(cleanNumber);
                            code = code?.match(/.{1,4}/g)?.join("-") || code;
                            socket.emit('pairing-code', code);
                        } catch (err) {
                            console.error("Web pairing error:", err);
                            socket.emit('pair-error', 'Failed to get code. Check number.');
                        }
                    }, 5000);
                }

                sock.ev.on('connection.update', async (update) => {
                    const { connection, lastDisconnect } = update;
                    if (connection === 'open') {
                        socket.emit('connection-status', { connected: true });
                        console.log(`✅ Web client linked successfully: ${number}`);
                        // Move creds to main session folder if needed, or just let user download it
                        // For now, just keep it live
                    }
                    if (connection === 'close') {
                        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
                        if (!shouldReconnect) {
                            fs.rmSync(tempDir, { recursive: true, force: true });
                        }
                    }
                });
                
            } catch (error) {
                console.error("Socket pair error:", error);
                socket.emit('pair-error', 'Internal server error');
            }
        });
    });

    server.listen(port, () => {
        console.log(`🌐 Web server is running on port ${port}`);
    });

    const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
    if (RENDER_URL) {
        setInterval(async () => {
            try {
                await axios.get(`${RENDER_URL}/ping`);
            } catch (error) {}
        }, 5 * 60 * 1000);
    }
}

module.exports = { startServer };
