const { runtime } = require('../lib/myfunc');

async function runtimeCommand(sock, chatId, message) {
    try {
        const time = runtime(process.uptime());
        await sock.sendMessage(chatId, { 
            text: `🕒 *Bot Runtime:* ${time}\n\n> Powered by ᴍᴀɴɪ ᴍᴅ ☘` 
        }, { quoted: message });
    } catch (error) {
        console.error('Error in runtimeCommand:', error);
    }
}

module.exports = runtimeCommand;
