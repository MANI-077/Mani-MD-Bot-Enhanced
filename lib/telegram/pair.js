const TelegramBot = require('node-telegram-bot-api').TelegramBot || require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs');
const path = require('path');
const settings = require('../../settings');

async function startTelegramPairSystem() {
    const token = settings.telegramToken;
    if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN') {
        console.log("Telegram Token not set in settings.js. Telegram Pair System disabled.");
        return;
    }

    const bot = new TelegramBot(token, { polling: true });
    console.log("Telegram Pair System started...");

    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, "👋 Welcome to Mani-MD Telegram Pair System!\n\nUse /pair <number> to get your WhatsApp pairing code.\nExample: `/pair 9779807044421`", { parse_mode: 'Markdown' });
    });

    bot.onText(/\/pair (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        let phoneNumber = match[1].replace(/[^0-9]/g, '');

        if (!phoneNumber || phoneNumber.length < 10) {
            return bot.sendMessage(chatId, "❌ Invalid phone number. Please provide a full international number without + or spaces.");
        }

        bot.sendMessage(chatId, "⏳ Requesting pairing code for " + phoneNumber + "...");

        try {
            const { version } = await fetchLatestBaileysVersion();
            const tempSessionDir = path.join(__dirname, '../../temp_session_' + chatId);
            const { state, saveCreds } = await useMultiFileAuthState(tempSessionDir);

            const sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false,
                browser: ["Ubuntu", "Chrome", "121.0.6167.184"],
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                }
            });

            if (!sock.authState.creds.registered) {
                setTimeout(async () => {
                    try {
                        let code = await sock.requestPairingCode(phoneNumber);
                        code = code?.match(/.{1,4}/g)?.join("-") || code;
                        
                        await bot.sendMessage(chatId, `✅ *Your Pairing Code:* \`${code}\`\n\n1. Open WhatsApp\n2. Settings > Linked Devices\n3. Link a Device > Link with phone number instead\n4. Enter the code above.`, { parse_mode: 'Markdown' });
                        
                        // Clean up temp session after sending code
                        // Note: We don't delete immediately to allow the connection to happen if needed, 
                        // but for pairing code only, we can clean up after a timeout.
                        setTimeout(() => {
                            if (fs.existsSync(tempSessionDir)) {
                                fs.rmSync(tempSessionDir, { recursive: true, force: true });
                            }
                        }, 5 * 60 * 1000); // 5 minutes

                    } catch (err) {
                        console.error("Pairing code error:", err);
                        bot.sendMessage(chatId, "❌ Failed to get pairing code. " + err.message);
                    }
                }, 3000);
            } else {
                bot.sendMessage(chatId, "💡 This session is already registered.");
            }
        } catch (error) {
            console.error("Telegram Pair Error:", error);
            bot.sendMessage(chatId, "❌ An error occurred: " + error.message);
        }
    });
}

module.exports = { startTelegramPairSystem };
