async function repoCommand(sock, chatId, message) {
    try {
        const repoInfo = `*ᴍᴀɴɪ ᴍᴅ ☘ ʀᴇᴘᴏꜱɪᴛᴏʀʏ*\n\n` +
            `🌟 *Stars:* Loading...\n` +
            `🍴 *Forks:* Loading...\n` +
            `🔗 *Link:* https://github.com/MANI-077/Mani-MD-Bot-Enhanced\n\n` +
            `> _Don't forget to star the repo!_`;
            
        await sock.sendMessage(chatId, { 
            image: { url: "https://telegra.ph/file/3c2751375c9a4f1ee2c30.jpg" },
            caption: repoInfo 
        }, { quoted: message });
    } catch (error) {
        console.error('Error in repoCommand:', error);
    }
}

module.exports = repoCommand;
