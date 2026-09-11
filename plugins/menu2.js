// plugins/menu.js - ESM Version (List Selector - Fixed)
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
    const url = config.BOT_IMAGE || config.BOT_MEDIA_URL;
    const mt = getMediaType(url);
    if (mt === 'image' || mt === 'video') {
        try {
            await axios.head(url, { timeout: 3000 });
            return { [mt]: { url } };
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
// MENU — List Selector (Fixed)
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

        // 1️⃣ Send header image + info text
        const media = await resolveMedia();
        const headerText =
`*╭┈───〔 ${config.BOT_NAME} 〕┈───⊷*
*├▢ Owner:* ${config.OWNER_NAME}
*├▢ Prefix:* ${config.PREFIX}
*├▢ Version:* ${config.VERSION}
*├▢ Plugins:* ${totalCommands}
*├▢ Runtime:* ${runtime(process.uptime())}
*╰───────────────────⊷*

*ᴛᴀᴘ ʙᴇʟᴏᴡ ᴛᴏ ᴏᴘᴇɴ ᴄᴀᴛᴇɢᴏʀʏ ʟɪsᴛ 📂*`;

        const headerMsg = await conn.sendMessage(from, {
            ...media,
            caption: headerText
        }, { quoted: mek });

        const headerId = headerMsg.key.id;

        // 2️⃣ Send the button/list message
        const btn = new Button(conn);
        btn
            .setTitle(`${config.BOT_NAME}`)
            .setSubtitle('ᴄᴏᴍᴍᴀɴᴅ ᴄᴇɴᴛᴇʀ')
            .setBody('*📂 sᴇʟᴇᴄᴛ ᴀ ᴄᴀᴛᴇɢᴏʀʏ ʙᴇʟᴏᴡ*')
            .setFooter('> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴊᴀᴡᴀᴅᴛᴇᴄʜx');

        // ⬇️ SINGLE "Open Menu" selector
        btn.addSelection('📂 Open Menu');

        // ✅ ONLY 1 PAGE — put all categories in one section
        btn.makeSection('📁 Categories');
        for (const cat of categories) {
            const count = categorized[cat].length;
            btn.makeRow(
                '📌',
                cat.toUpperCase(),
                `${count} commands available`,
                `menu_${cat}`
            );
        }

        // Quick reply shortcuts
        btn.addReply('📜 Full Menu', 'menu_full');
        btn.addReply('🏓 Ping', 'menu_ping');

        const sentBtn = await btn.send(from, { quoted: mek });
        const buttonId = sentBtn.key.id;

        // 3️⃣ Listener — match EITHER header msg OR button msg
        const listener = async (msgData) => {
            const msg = msgData.messages[0];
            if (!msg?.message) return;

            // Only listen in this chat
            if (msg.key.remoteJid !== from) return;

            // Extract context info (for reply-to detection)
            const ctx =
                msg.message?.extendedTextMessage?.contextInfo ||
                msg.message?.listResponseMessage?.contextInfo ||
                msg.message?.buttonsResponseMessage?.contextInfo ||
                msg.message?.interactiveResponseMessage?.contextInfo;

            const stanzaId = ctx?.stanzaId;

            // Only handle if it's a reply to OUR header or button message
            const isReplyToOurs = stanzaId === headerId || stanzaId === buttonId;

            // Extract selection ID
            let tappedId =
                msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                msg.message?.buttonsResponseMessage?.selectedButtonId ||
                msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text;

            // Handle JSON-wrapped params
            if (typeof tappedId === 'string' && tappedId.startsWith('{')) {
                try { tappedId = JSON.parse(tappedId).id || tappedId; } catch {}
            }

            // Only handle taps that start with menu_ OR came from our message
            const isMenuTap = typeof tappedId === 'string' && tappedId.startsWith('menu_');
            if (!isMenuTap && !isReplyToOurs) return;

            // Remove listener on first valid interaction
            conn.ev.off('messages.upsert', listener);

            try {
                await conn.sendMessage(from, { react: { text: '⬇️', key: msg.key } });
            } catch {}

            // Quick replies
            if (tappedId === 'menu_full') {
                await conn.sendMessage(from, { text: `*ᴜsᴇ ${config.PREFIX}ᴍᴇɴᴜ2*` }, { quoted: msg });
                return;
            }
            if (tappedId === 'menu_ping') {
                await conn.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });
                return;
            }

            // Category selected
            if (isMenuTap) {
                const cat = tappedId.replace('menu_', '');
                const cmds = categorized[cat];
                if (!cmds) {
                    await conn.sendMessage(from, { text: '❌ Unknown category' }, { quoted: msg });
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
                await conn.sendMessage(from, {
                    ...catMedia,
                    caption: catMenu
                }, { quoted: msg });
                return;
            }

            // Reply-with-number fallback (for users who reply to the header)
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

                    const catMedia = await resolveMedia();
                    await conn.sendMessage(from, {
                        ...catMedia,
                        caption: catMenu
                    }, { quoted: msg });
                }
            }
        };

        conn.ev.on('messages.upsert', listener);

        // Auto cleanup after 120s
        setTimeout(() => {
            conn.ev.off('messages.upsert', listener);
        }, 120000);

    } catch (e) {
        console.error(e);
        reply(`❌ Error:\n${e.message}`);
    }
});
