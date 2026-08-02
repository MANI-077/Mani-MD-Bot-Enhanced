const os = require('os');
const { sizeFormatter } = require('human-readable');

const format = sizeFormatter({
    std: 'JEDEC',
    decimalPlaces: 2,
    keepTrailingZeros: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
});

async function systemCommand(sock, chatId, message) {
    try {
        const used = process.memoryUsage();
        const cpus = os.cpus();
        const cpu = cpus[0];
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        
        const systemInfo = `*ꜱʏꜱᴛᴇᴍ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ*\n\n` +
            `💻 *Platform:* ${os.platform()} ${os.release()}\n` +
            `🧠 *CPU:* ${cpu.model} (${cpus.length} cores)\n` +
            `📊 *RAM Usage:* ${format(used.rss)} / ${format(totalMem)}\n` +
            `📉 *Free RAM:* ${format(freeMem)}\n` +
            `🕒 *Uptime:* ${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m\n\n` +
            `> Powered by ᴍᴀɴɪ ᴍᴅ ☘`;
            
        await sock.sendMessage(chatId, { text: systemInfo }, { quoted: message });
    } catch (error) {
        console.error('Error in systemCommand:', error);
    }
}

module.exports = systemCommand;
