// plugins/menu.js - ESM Version (List Selector)
import { fileURLToPath } from 'url';
import path from 'path';
import config from '../config.js';
import { cmd, commands } from '../command.js';
import { runtime } from '../lib/functions.js';
import axios from 'axios';
import { Button } from '../lib/mb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Small caps helper
const toSmallCaps = (text) => {
    if (!text || typeof text !== 'string') return '';
    const map = {
        'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ',
        'j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ',
        's':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ',
        'A':'ᴀ','B':'ʙ','C':'ᴄ','D':'ᴅ','E':'ᴇ','F':'ғ','G':'ɢ','H':'ʜ','I':'ɪ',
        'J':'ᴊ','K':'ᴋ','L':'ʟ','M':'ᴍ','N':'ɴ','O':'ᴏ','P':'ᴘ','Q':'ǫ','R':'ʀ',
        'S':'s','T':'ᴛ','U':'ᴜ','V':'ᴠ','W':'ᴡ','X':'x','Y':'ʏ','Z':'ᴢ'
    };
    return text.split('').map(c => map[c] || c).join('');
};

const formatCategory = (category, cmds) => {
    const valid = cmds.filter(c => c.pattern && c.pattern.trim() !== '');
    if (!valid.length) return '';
    const title = `\n\`『 ${category.toUpperCase()} 』\`\n╭───────────────────⊷\n`;
    const body = valid.map(c => `*┋ ⬡ ${toSmallCaps(c.pattern)}*`).join('\n');
    return `${title}${body}\n╰───────────────────⊷`;
};

const getMediaType = (url) => {
    if (!url || typeof url !== 'string' || !url.trim()) return null;
    const l = url.toLowerCase();
    if (['.jpg','.jpeg','.png','.gif','.webp'].some(e => l.endsWith(e))) return 'image';
    if (['.mp4','.mov','.avi','.mkv','.webm'].some(e => l.endsWith(e))) return 'video';
    return null;
};

const resolveMedia = async () => {
    const localImage = path.join(__dirname, '../lib/khanmd.jpg');
    const mt = getMediaType(config.BOT_MEDIA_URL);
    if (mt === 'image' || mt === 'video') {
        try {
            await axios.head(config.BOT_MEDIA_URL, { timeout: 3000 });
            return { [mt]: { url: config.BOT_MEDIA_URL } };
        } catch {
            return { image: { url: localImage } };
        }
    }
    return { image: { url: localImage } };
};

const getCategorized = () => {
    const arr = Array.isArray(commands) ? commands : Object.values(commands);
    const categories = [...new Set(arr.map(c => c.category))]
        .filter(c => c && c.trim() !== '' && c !== 'undefined')
        .sort((a, b) => a.localeCompare(b));
    const categorized = {};
    categories.forEach(cat => {
        const v = arr.filter(c => c.category === cat).filter(c => c.pattern && c.pattern.trim() !== '');
        if (v.length > 0) categorized[cat] = v;
    });
    return { categorized, totalCommands: arr.length };
};

// ===============================
// MENU — List Selector
// ===============================
cmd({
    pattern: "menux",
    alias: ["m", "help"],
    desc: "Show all bot commands in list selector",
    category: "main",
    react: "⚡",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply }) => {
    try {
        await conn.sendPresenceUpdate('composing', from);

        const { categorized, totalCommands } = getCategorized();
        const categories = Object.keys(categorized);

        const btn = new Button(conn);
        btn
            .setTitle(`${config.BOT_NAME}`)
            .setSubtitle('ᴄᴏᴍᴍᴀɴᴅ ᴄᴇɴᴛᴇʀ')
            .setBody(
`*╭┈───〔 ${config.BOT_NAME} 〕┈───⊷*
*├▢ Owner:* ${config.OWNER_NAME}
*├▢ Prefix:* ${config.PREFIX}
*├▢ Version:* ${config.VERSION}
*├▢ Plugins:* ${totalCommands}
*├▢ Runtime:* ${runtime(process.uptime())}
*╰───────────────────⊷*

*ᴛᴀᴘ ʙᴇʟᴏᴡ ᴛᴏ ᴏᴘᴇɴ ᴄᴀᴛᴇɢᴏʀʏ ʟɪsᴛ 📂*`
            )
            .setFooter('> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴊᴀᴡᴀᴅᴛᴇᴄʜx');

        if (config.BOT_MEDIA_URL && getMediaType(config.BOT_MEDIA_URL) === 'image') {
            btn.setImage(config.BOT_MEDIA_URL);
        }

        // Single "Open Menu" dropdown
        btn.addSelection('📂 Open Menu');

        const perSection = 10;
        for (let i = 0; i < categories.length; i += perSection) {
            const chunk = categories.slice(i, i + perSection);
            const pageNum = Math.floor(i / perSection) + 1;
            btn.makeSection(`📁 Page ${pageNum}`);
            for (const cat of chunk) {
                const count = categorized[cat].length;
                btn.makeRow('📌', cat.toUpperCase(), `${count} commands available`, `menu_${cat}`);
            }
        }

        btn.addReply('📜 Full Menu', 'menu_full');
        btn.addReply('🏓 Ping', 'menu_ping');

        await btn.send(from, { quoted: mek });

        // Listener
        const listener = async (msgData) => {
            const msg = msgData.messages[0];
            if (!msg?.message) return;

            const tappedId =
                msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                msg.message?.buttonsResponseMessage?.selectedButtonId ||
                msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
                msg.message?.conversation;

            if (!tappedId) return;

            let id = tappedId;
            if (typeof id === 'string' && id.startsWith('{')) {
                try { id = JSON.parse(id).id || tappedId; } catch {}
            }

            if (!id.startsWith('menu_')) return;

            conn.ev.off('messages.upsert', listener);

            if (id === 'menu_full') {
                await conn.sendMessage(msg.key.remoteJid, { text: `*ᴜsᴇ ${config.PREFIX}ᴍᴇɴᴜ2*` }, { quoted: msg });
                return;
            }
            if (id === 'menu_ping') {
                await conn.sendMessage(msg.key.remoteJid, { text: '🏓 Pong!' }, { quoted: msg });
                return;
            }

            const cat = id.replace('menu_', '');
            const cmds = categorized[cat];
            if (!cmds) {
                await conn.sendMessage(msg.key.remoteJid, { text: '❌ Unknown category' }, { quoted: msg });
                return;
            }

            const displayName = cat.charAt(0).toUpperCase() + cat.slice(1);
            let catMenu = `*╭┈───〔 ${displayName} Menu 〕┈───⊷*\n`;
            catMenu += `*├▢ 📜 Category:* ${cat}\n`;
            catMenu += `*├▢ 🔢 Commands:* ${cmds.length}\n`;
            catMenu += `*╰───────────────────⊷*`;
            catMenu += formatCategory(cat, cmds);
            catMenu += `\n\n> *ᴜsᴇ ${config.PREFIX}ᴍᴇɴᴜ ᴛᴏ ɢᴏ ʙᴀᴄᴋ*`;

            const catMedia = await resolveMedia();
            await conn.sendMessage(msg.key.remoteJid, {
                ...catMedia,
                caption: catMenu
            }, { quoted: msg });
        };

        conn.ev.on('messages.upsert', listener);
        setTimeout(() => conn.ev.off('messages.upsert', listener), 120000);

    } catch (e) {
        console.error(e);
        reply(`❌ Error:\n${e.message}`);
    }
});
