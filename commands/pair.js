
const axios = require('axios');
const { sleep } = require('../lib/myfunc');

async function pairCommand(sock, chatId, message, q) {
    try {
        if (!q) {
            return await sock.sendMessage(chatId, {
                text: "Please provide a valid WhatsApp number\nExample: .pair 2567899XXXXX"
            }, { quoted: message });
        }

        const numbers = q.split(',')
            .map((v) => v.replace(/[^0-9]/g, ''))
            .filter((v) => v.length > 5 && v.length < 20);

        if (numbers.length === 0) {
            return await sock.sendMessage(chatId, {
                text: "Invalid number❌️ Please use the correct format!"
            }, { quoted: message });
        }

        for (const number of numbers) {
            const whatsappID = number + '@s.whatsapp.net';
            console.log("Checking WhatsApp ID:", whatsappID);

            const result = await sock.onWhatsApp(whatsappID);
            console.log("onWhatsApp result:", result);

            if (!result || result.length === 0 || !result[0]?.exists) {
                await sock.sendMessage(chatId, {
                    text: `This number (${number}) is not registered on WhatsApp❗️`
                }, { quoted: message });
                continue;
            }

            await sock.sendMessage(chatId, { text: `⏳ Generating pairing code for ${number}, Please wait...`
            }, { quoted: message });
            await sleep(1000);

            try {
                // Using internal pairing request instead of external API
                let code = await sock.requestPairingCode(number);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                
                await sleep(1000);
                await sock.sendMessage(chatId, {
                    text: `✅ *Pairing Code for ${number}:*\n\n\`${code}\`\n\n> Enter this in your WhatsApp to link.`
                }, { quoted: message });
            } catch (err) {
                console.error('Pairing Error:', err);
                await sock.sendMessage(chatId, { text: "❌ Failed to generate pairing code internally." });
            }
        }
    } catch (error) {
        console.error("pairCommand error:", error);
        await sock.sendMessage(chatId, {
            text: "⚠️ An error occurred. Please try again later."
        });
    }
}

module.exports = pairCommand;
