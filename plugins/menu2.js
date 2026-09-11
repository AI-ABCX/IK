// plugins/menu.js - ESM Version (Single Message + Multi-Select + Direct Command Exec)
import { fileURLToPath } from 'url';
import path from 'path';
import config from '../config.js';
import { cmd, commands } from '../command.js';
import { runtime } from '../lib/functions.js';
import axios from 'axios';
import { Button } from '../lib/mb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== SMALL CAPS ==========
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

// ========== FORMAT CATEGORY ==========
const formatCategory = (category, cmds) => {
    const valid = cmds.filter(c => c.pattern && c.pattern.trim() !== '');
    if (!valid.length) return '';
    const title = `\n\`『 ${category.toUpperCase()} 』\`\n╭───────────────────⊷\n`;
    const body = valid.map(c => `*┋ ⬡ ${toSmallCaps(c.pattern)}*`).join('\n');
    return `${title}${body}\n╰───────────────────⊷`;
};

// ========== MEDIA HELPERS ==========
const getMediaType = (url) => {
    if (!url || typeof url !== 'string' || !url.trim()) return null;
    const l = url.toLowerCase();
    if (['.jpg','.jpeg','.png','.gif','.webp'].some(e => l.endsWith(e))) return 'image';
    if (['.mp4','.mov','.avi','.mkv','.webm'].some(e => l.endsWith(e))) return 'video';
    return null;
};

const getImageUrl = () => {
    return config.BOT_IMAGE || config.BOT_MEDIA_URL || path.join(__dirname, '../lib/khanmd.jpg');
};

// ========== CATEGORIZED COMMANDS ==========
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

// ========== FIND COMMAND BY PATTERN ==========
const findCommand = (pattern) => {
    const arr = Array.isArray(commands) ? commands : Object.values(commands);
    return arr.find(c => c.pattern === pattern)
        || arr.find(c => c.alias && c.alias.includes(pattern));
};

// ========== EXECUTE COMMAND DIRECTLY ==========
const execCommand = async (conn, msg, from, commandObj) => {
    if (!commandObj) return false;

    // Support both .function and .handler property names
    const handler = commandObj.function || commandObj.handler || commandObj.execute;
    if (!handler) return false;

    const fakeMek = { ...msg };
    const fakeM = {
        chat: from,
        sender: msg.key.participant || msg.key.remoteJid,
        isGroup: from.endsWith('@g.us'),
        mentionedJid: [],
        quoted: null,
        text: '',
    };

    const fakeArgs = {
        from,
        sender: fakeM.sender,
        reply: (t) => conn.sendMessage(from, { text: t }, { quoted: msg }),
        args: [],
        q: '',
        react: async (e) => conn.sendMessage(from, { react: { text: e, key: msg.key } }),
    };

    try {
        await handler(conn, fakeMek, fakeM, fakeArgs);
        return true;
    } catch (err) {
        console.error(`exec ${commandObj.pattern} error:`, err);
        await conn.sendMessage(from, { text: `❌ ${commandObj.pattern} error: ${err.message}` }, { quoted: msg });
        return false;
    }
};

// ===============================
// MENU — Single Message + Multi-Select
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
        const imageUrl = getImageUrl();

        // Build the single combined message
        const btn = new Button(conn);

        // Header image
        btn.setImage(imageUrl);

        // Title + subtitle + body
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

*ᴛᴀᴘ ʙᴇʟᴏᴡ ᴛᴏ ᴏᴘᴇɴ ᴄᴀᴛᴇɢᴏʀʏ ʟɪsᴛ*`
            )
            .setFooter('> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴊᴀᴡᴀᴅᴛᴇᴄʜx');

        // Single "Open Menu" selector
        btn.addSelection('📂 Open Menu');

        // One section — all categories
        btn.makeSection('📁 Categories');
        for (const cat of categories) {
            const count = categorized[cat].length;
            btn.makeRow('📌', cat.toUpperCase(), `${count} commands available`, `menu_${cat}`);
        }

        // Quick reply shortcuts
        btn.addReply('📜 Full Menu', 'menu_full');
        btn.addReply('🏓 Ping', 'menu_ping');

        // Send single message
        const sentMsg = await btn.send(from, { quoted: mek });
        const messageId = sentMsg.key.id;

        // ============================================
        // LISTENER — multi-select + direct command exec
        // ============================================
        const listener = async (msgData) => {
            const msg = msgData.messages[0];
            if (!msg?.message) return;

            if (msg.key.remoteJid !== from) return;

            const ctx =
                msg.message?.extendedTextMessage?.contextInfo ||
                msg.message?.listResponseMessage?.contextInfo ||
                msg.message?.buttonsResponseMessage?.contextInfo ||
                msg.message?.interactiveResponseMessage?.contextInfo;

            const stanzaId = ctx?.stanzaId;

            let tappedId =
                msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                msg.message?.buttonsResponseMessage?.selectedButtonId ||
                msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text;

            if (typeof tappedId === 'string' && tappedId.startsWith('{')) {
                try { tappedId = JSON.parse(tappedId).id || tappedId; } catch {}
            }

            const isReplyToOurs = stanzaId === messageId;
            const isMenuTap = typeof tappedId === 'string' && tappedId.startsWith('menu_');

            if (!isMenuTap && !isReplyToOurs) return;

            try {
                await conn.sendMessage(from, { react: { text: '⬇️', key: msg.key } });
            } catch {}

            // ========== FULL MENU → execute menu2 ==========
            if (tappedId === 'menu_full') {
                const menu2Cmd = findCommand('menu2');
                const ok = await execCommand(conn, msg, from, menu2Cmd);
                if (!ok) {
                    await conn.sendMessage(from, { text: `*ᴜsᴇ ${config.PREFIX}ᴍᴇɴᴜ2*` }, { quoted: msg });
                }
                return;
            }

            // ========== PING → execute ping ==========
            if (tappedId === 'menu_ping') {
                const pingCmd = findCommand('ping');
                const ok = await execCommand(conn, msg, from, pingCmd);
                if (!ok) {
                    await conn.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });
                }
                return;
            }

            // ========== CATEGORY TAP ==========
            if (isMenuTap) {
                const cat = tappedId.replace('menu_', '');
                const cmds = categorized[cat];
                if (!cmds) return;

                const displayName = cat.charAt(0).toUpperCase() + cat.slice(1);
                let catMenu = `*╭┈───〔 ${displayName} Menu 〕┈───⊷*\n`;
                catMenu += `*├▢ 📜 Category:* ${cat}\n`;
                catMenu += `*├▢ 🔢 Commands:* ${cmds.length}\n`;
                catMenu += `*╰───────────────────⊷*`;
                catMenu += formatCategory(cat, cmds);
                catMenu += `\n\n> *ᴜsᴇ ${config.PREFIX}ᴍᴇɴᴜ ᴛᴏ ɢᴏ ʙᴀᴄᴋ*`;

                await conn.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: catMenu
                }, { quoted: msg });
                return;
            }

            // ========== REPLY-WITH-NUMBER FALLBACK ==========
            if (isReplyToOurs) {
                const num = parseInt(tappedId);
                if (num >= 1 && num <= categories.length) {
                    const cat = categories[num - 1];
                    const cmds = categorized[cat];
                    const displayName = cat.charAt(0).toUpperCase() + cat.slice(1);
                    let catMenu = `*╭┈───〔 ${displayName} Menu 〕┈───⊷*\n`;
                    catMenu += `*├▢ 📜 Category:* ${cat}\n`;
                    catMenu += `*├▢ 🔢 Commands:* ${cmds.length}\n`;
                    catMenu += `*╰───────────────────⊷*`;
                    catMenu += formatCategory(cat, cmds);
                    catMenu += `\n\n> *ᴜsᴇ ${config.PREFIX}ᴍᴇɴᴜ ᴛᴏ ɢᴏ ʙᴀᴄᴋ*`;

                    await conn.sendMessage(from, {
                        image: { url: imageUrl },
                        caption: catMenu
                    }, { quoted: msg });
                }
            }
        };

        conn.ev.on('messages.upsert', listener);

        // 60s cleanup
        setTimeout(() => {
            conn.ev.off('messages.upsert', listener);
        }, 60000);

    } catch (e) {
        console.error(e);
        reply(`❌ Error:\n${e.message}`);
    }
});
