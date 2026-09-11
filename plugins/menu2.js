// plugins/utilities.js - ESM Version (All-in-One)
import { fileURLToPath } from 'url';
import path from 'path';
import config from '../config.js';
import { cmd, commands } from '../command.js';
import { runtime, lidToPhone, cleanPN } from '../lib/functions.js';
import axios from 'axios';
import { Button, ButtonV2, Carousel, MB } from '../lib/mb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_BASE = "https://xjawadtech.vercel.app";

// ========== HELPERS ==========
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

function getVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
}

const formatCategory = (category, cmds) => {
    const valid = cmds.filter(c => c.pattern && c.pattern.trim() !== '');
    if (!valid.length) return '';
    const title = `\n\`『 ${category.toUpperCase()} 』\`\n╭───────────────────⊷\n`;
    const body = valid.map(c => `*┋ ⬡ ${toSmallCaps(c.pattern)}*`).join('\n');
    return `${title}${body}\n╰───────────────────⊷`;
};

const getImageUrl = () => config.BOT_IMAGE || config.BOT_MEDIA_URL || path.join(__dirname, '../lib/khanmd.jpg');

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

const findCommand = (pattern) => {
    const arr = Array.isArray(commands) ? commands : Object.values(commands);
    return arr.find(c => c.pattern === pattern) || arr.find(c => c.alias && c.alias.includes(pattern));
};

const execCommand = async (conn, msg, from, commandObj) => {
    if (!commandObj) return false;
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
    try { await handler(conn, fakeMek, fakeM, fakeArgs); return true; }
    catch (err) { console.error(err); return false; }
};

// ==================== ID (Copy Button) ====================
cmd({
    pattern: "idx",
    alias: ["chatid", "jid", "gjid", "channelid", "newsletter", "cid"],
    desc: "Get various IDs",
    react: "⚡",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, { from, isGroup, reply, sender, fromMe, botNumber2, text }) => {
    try {
        let resultId = null;

        if (text && text.includes('whatsapp.com/channel/')) {
            const match = text.match(/whatsapp\.com\/channel\/([\w-]+)/);
            if (!match) return reply("⚠️ *Invalid channel link.*");
            const inviteId = match[1];
            let metadata;
            try { metadata = await conn.newsletterMetadata("invite", inviteId); }
            catch { return reply("❌ Failed to fetch channel metadata."); }
            if (!metadata || !metadata.id) return reply("❌ Channel not found.");
            resultId = metadata.id;
        } else if (isGroup) {
            resultId = from.includes('@g.us') ? from : `${from}@g.us`;
        } else {
            if (fromMe) {
                const botPN = botNumber2.split('@')[0];
                resultId = `${botPN}@s.whatsapp.net`;
            } else {
                let senderPN = sender.split('@')[0];
                if (sender.includes('@lid')) senderPN = await lidToPhone(conn, sender);
                resultId = `${senderPN}@s.whatsapp.net`;
            }
        }

        const btn = new Button(conn);
        btn.setBody(`⚡ *ID Result*\n\n\`${resultId}\``);
        btn.setFooter('> Powered by KHAN-MD');
        btn.addCopy('📋 Copy ID', resultId);
        await btn.send(from, { quoted: mek });

    } catch (e) {
        console.error("ID Error:", e);
        return reply(`⚠️ Error: ${e.message}`);
    }
});

// ==================== GETLID (Copy Button) ====================
cmd({
    pattern: "getlidx",
    alias: ["lidonly", "rawlid", "mylid"],
    desc: "Get your LID directly",
    react: "🆔",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, { from, isGroup, reply, sender, fromMe, botNumber2, mentionUser }) => {
    try {
        let resultLid = null;
        const mentionedUser = mentionUser ? mentionUser[0] : null;

        if (mentionedUser) {
            if (mentionedUser.includes('@lid')) resultLid = mentionedUser;
            else return reply('⚠️ Mentioned user is not in LID format.');
        } else if (isGroup) {
            if (sender.includes('@lid')) resultLid = sender;
            else return reply("⚠️ You don't have a LID format in this chat.");
        } else {
            resultLid = fromMe ? botNumber2 : sender;
        }

        const btn = new Button(conn);
        btn.setBody(`🆔 *LID Result*\n\n\`${resultLid}\``);
        btn.setFooter('> Powered by KHAN-MD');
        btn.addCopy('📋 Copy LID', resultLid);
        await btn.send(from, { quoted: mek });

    } catch (e) {
        console.error("GetLID Error:", e);
        return reply(`⚠️ Error: ${e.message}`);
    }
});

// ==================== IMG (Pure Carousel) ====================
cmd({
    pattern: "imgx",
    alias: ["image", "pinterest", "searchimg"],
    react: "🦋",
    desc: "Search images from Pinterest",
    category: "fun",
    use: ".img <keywords>",
    filename: __filename
}, async (conn, mek, m, { reply, args, from }) => {
    try {
        const query = args.join(" ");
        if (!query) return reply("🖼️ Please provide a search query\nExample: .img Imran Khan");

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const url = `https://api.nexray.eu.cc/search/pinterest?q=${encodeURIComponent(query)}`;
        const response = await axios.get(url);

        if (!response.data?.status || !response.data.result?.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply("❌ No images found. Try different keywords");
        }

        const results = response.data.result.sort(() => 0.5 - Math.random()).slice(0, 5);
        const imageUrls = results.map(r => r.images_url).filter(Boolean);

        if (!imageUrls.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply("❌ No valid images.");
        }

        const carousel = new Carousel(conn);
        carousel
            .setBody(`📷 *Pinterest Results*\n🔎 ${query}`)
            .setFooter('> Powered by JawadTechX');

        const cards = imageUrls.map((imgUrl, i) => ({
            header: {
                hasMediaAttachment: true,
                imageMessage: { url: imgUrl }
            },
            body: { text: `Result ${i + 1} for: ${query}` },
            footer: { text: '> Powered by JawadTechX' },
            nativeFlowMessage: {
                messageParamsJson: '{}',
                buttons: [
                    {
                        name: 'cta_copy',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📋 Copy URL',
                            copy_code: imgUrl
                        })
                    }
                ]
            }
        }));

        carousel.addCard(cards);
        await carousel.send(from, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (error) {
        console.error('Pinterest Error:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Error: ${error.message || "Failed to fetch"}`);
    }
});

// ==================== PLAY (ButtonV2 — Download + Cancel) ====================
cmd({
    pattern: "playx",
    alias: ["music", "audio"],
    desc: "Download YouTube audio (ButtonV2)",
    category: "download",
    react: "🎧",
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    try {
        if (!text) return reply("❌ Please provide song name\nExample: .play Shape of You");

        const { default: yts } = await import('yt-search');
        let url = text;
        let vid = null;

        if (text.startsWith('http://') || text.startsWith('https://')) {
            if (!text.includes("youtube.com") && !text.includes("youtu.be")) return reply("❌ Invalid URL!");
            const videoId = getVideoId(text);
            if (!videoId) return reply("❌ Invalid YouTube URL!");
            vid = await yts({ videoId });
        } else {
            const search = await yts(text);
            if (!search.videos?.length) return reply("❌ No song found!");
            vid = search.videos[0];
            url = vid.url;
        }

        if (!vid) return reply("❌ No results!");

        // ===== BUTTONV2 MESSAGE =====
        const btn = new ButtonV2(conn);
        btn
            .setBody(
`🎧 *AUDIO DOWNLOADER*

*Title:* ${vid.title}
*Duration:* ${vid.timestamp}
*Views:* ${vid.views?.toLocaleString() || 'N/A'}
*Author:* ${vid.author?.name || 'Unknown'}`
            )
            .setFooter('> Powered by KHAN-MD')
            .setThumbnail(vid.thumbnail);

        // Only 2 buttons: Download + Cancel
        btn.addButton('⬇️ Download', 'play_dl');
        btn.addButton('❌ Cancel', 'play_cancel');

        await btn.send(from, { quoted: mek });

        // Listener
        const listener = async (msgData) => {
            const rec = msgData.messages[0];
            if (!rec?.message) return;
            if (rec.key.remoteJid !== from) return;

            const tapped =
                rec.message?.buttonsResponseMessage?.selectedButtonId ||
                rec.message?.templateButtonReplyMessage?.selectedId;

            if (tapped !== 'play_dl' && tapped !== 'play_cancel') return;

            try { await conn.sendMessage(from, { react: { text: '⬇️', key: rec.key } }); } catch {}

            // ===== CANCEL =====
            if (tapped === 'play_cancel') {
                try { await conn.sendMessage(from, { react: { text: '❌', key: rec.key } }); } catch {}
                await conn.sendMessage(from, { text: '❌ *Cancelled.*' }, { quoted: rec });
                conn.ev.off('messages.upsert', listener);
                return;
            }

            // ===== DOWNLOAD =====
            const audioAPIs = [
                `${API_BASE}/yta6?url=${encodeURIComponent(url)}`,
                `${API_BASE}/yta7?url=${encodeURIComponent(url)}`,
                `${API_BASE}/yta1?url=${encodeURIComponent(url)}`,
                `${API_BASE}/yta2?url=${encodeURIComponent(url)}`,
                `${API_BASE}/yta3?url=${encodeURIComponent(url)}`,
                `${API_BASE}/yta4?url=${encodeURIComponent(url)}`,
                `${API_BASE}/yta5?url=${encodeURIComponent(url)}`
            ];
            let audioUrl = null;
            for (const apiUrl of audioAPIs) {
                try {
                    const r = await axios.get(apiUrl, { timeout: 15000 });
                    audioUrl = r.data?.status && r.data?.download?.url ? r.data.download.url : null;
                    if (audioUrl) break;
                } catch { continue; }
            }
            if (!audioUrl) {
                await conn.sendMessage(from, { text: '❌ All sources failed.' }, { quoted: rec });
                conn.ev.off('messages.upsert', listener);
                return;
            }
            await conn.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                fileName: `${vid.title}.mp3`,
                ptt: false
            }, { quoted: rec });
            try { await conn.sendMessage(from, { react: { text: '✅', key: rec.key } }); } catch {}
            conn.ev.off('messages.upsert', listener);
        };

        conn.ev.on('messages.upsert', listener);
        setTimeout(() => conn.ev.off('messages.upsert', listener), 60000);

    } catch (err) {
        console.error("PLAY ERROR:", err);
        reply("❌ Error!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

// ==================== SONG (Button with 4 options) ====================
cmd({
    pattern: "songx",
    alias: ["yt", "ytdl"],
    desc: "Download YouTube (4 options)",
    category: "download",
    react: "🎧",
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    try {
        if (!text) return reply("🎶 Provide a YouTube name or link.\nExample: `.song Alone`");

        const { default: yts } = await import('yt-search');
        let vid = null;

        if (text.startsWith('http://') || text.startsWith('https://')) {
            if (!text.includes("youtube.com") && !text.includes("youtu.be")) return reply("❌ Invalid URL!");
            const videoId = getVideoId(text);
            if (!videoId) return reply("❌ Invalid URL!");
            vid = await yts({ videoId });
        } else {
            const search = await yts(text);
            if (!search.videos?.length) return reply("❌ No results!");
            vid = search.videos[0];
        }

        if (!vid) return reply("❌ No results!");

        const btn = new Button(conn);
        btn.setImage(vid.thumbnail);
        btn.setTitle(toSmallCaps('YT Downloader')).setSubtitle(vid.author?.name || 'YouTube');
        btn.setBody(
`*╭┈───〔 ${toSmallCaps('YT Downloader')} 〕┈───⊷*
*├▢ 🎬 Title:* ${vid.title}
*├▢ 📺 Channel:* ${vid.author?.name || 'Unknown'}
*├▢ ⏰ Duration:* ${vid.timestamp}
*├▢ 👀 Views:* ${vid.views?.toLocaleString() || 'N/A'}
*╰───────────────────⊷*

*ᴛᴀᴘ ᴀ ʙᴜᴛᴛᴏɴ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ:*`
        );
        btn.setFooter('> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴋʜᴀɴ-ᴍᴅ');

        const payload = (c) => JSON.stringify({ c, u: vid.url });
        btn.addReply('🎧 Audio MP3', payload('audio'));
        btn.addReply('📹 Video MP4', payload('video'));
        btn.addReply('📄 Audio Doc', payload('adoc'));
        btn.addReply('📄 Video Doc', payload('vdoc'));

        await btn.send(from, { quoted: mek });

        const listener = async (msgData) => {
            const rec = msgData.messages[0];
            if (!rec?.message) return;
            if (rec.key.remoteJid !== from) return;

            let raw =
                rec.message?.buttonsResponseMessage?.selectedButtonId ||
                rec.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
                rec.message?.conversation ||
                rec.message?.extendedTextMessage?.text;

            if (!raw || !raw.startsWith('{')) return;
            let data;
            try { data = JSON.parse(raw); } catch { return; }
            if (!data?.c || !data?.u) return;

            try { await conn.sendMessage(from, { react: { text: '⬇️', key: rec.key } }); } catch {}

            const isAudio = data.c === 'audio' || data.c === 'adoc';
            const isDoc = data.c === 'adoc' || data.c === 'vdoc';

            if (isAudio) {
                let audioUrl = null;
                const apis = [
                    `${API_BASE}/yta6?url=${encodeURIComponent(data.u)}`,
                    `${API_BASE}/yta7?url=${encodeURIComponent(data.u)}`,
                    `${API_BASE}/yta1?url=${encodeURIComponent(data.u)}`,
                    `${API_BASE}/yta2?url=${encodeURIComponent(data.u)}`,
                    `${API_BASE}/yta3?url=${encodeURIComponent(data.u)}`,
                    `${API_BASE}/yta4?url=${encodeURIComponent(data.u)}`,
                    `${API_BASE}/yta5?url=${encodeURIComponent(data.u)}`
                ];
                for (const apiUrl of apis) {
                    try {
                        const r = await axios.get(apiUrl, { timeout: 15000 });
                        audioUrl = r.data?.status && r.data?.download?.url ? r.data.download.url : null;
                        if (audioUrl) break;
                    } catch { continue; }
                }
                if (!audioUrl) return await conn.sendMessage(from, { text: '❌ Audio failed.' }, { quoted: rec });
                if (isDoc) {
                    await conn.sendMessage(from, {
                        document: { url: audioUrl }, mimetype: 'audio/mpeg',
                        fileName: `${vid.title}.mp3`,
                        caption: `📄 *${vid.title}*\n🎧 Audio Document`
                    }, { quoted: rec });
                } else {
                    await conn.sendMessage(from, {
                        audio: { url: audioUrl }, mimetype: 'audio/mpeg',
                        fileName: `${vid.title}.mp3`, ptt: false
                    }, { quoted: rec });
                }
            } else {
                let videoUrl = null;
                const apis = [
                    `${API_BASE}/ytv1?url=${encodeURIComponent(data.u)}`,
                    `${API_BASE}/ytv2?url=${encodeURIComponent(data.u)}`,
                    `${API_BASE}/ytv3?url=${encodeURIComponent(data.u)}`,
                    `${API_BASE}/ytv4?url=${encodeURIComponent(data.u)}`
                ];
                for (const apiUrl of apis) {
                    try {
                        const r = await axios.get(apiUrl, { timeout: 15000 });
                        videoUrl = r.data?.status && r.data?.download?.url ? r.data.download.url : null;
                        if (videoUrl) break;
                    } catch { continue; }
                }
                if (!videoUrl) return await conn.sendMessage(from, { text: '❌ Video failed.' }, { quoted: rec });
                if (isDoc) {
                    await conn.sendMessage(from, {
                        document: { url: videoUrl }, mimetype: 'video/mp4',
                        fileName: `${vid.title}.mp4`,
                        caption: `📄 *${vid.title}*\n📹 Video Document`
                    }, { quoted: rec });
                } else {
                    await conn.sendMessage(from, {
                        video: { url: videoUrl },
                        caption: `🎬 *${vid.title}*`
                    }, { quoted: rec });
                }
            }

            try { await conn.sendMessage(from, { react: { text: '✅', key: rec.key } }); } catch {}
            conn.ev.off('messages.upsert', listener);
        };

        conn.ev.on('messages.upsert', listener);
        setTimeout(() => conn.ev.off('messages.upsert', listener), 60000);

    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

// ==================== MENU ====================
cmd({
    pattern: "menux",
    alias: ["m", "help"],
    desc: "Show all commands in list selector",
    category: "main",
    react: "⚡",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply }) => {
    try {
        await conn.sendPresenceUpdate('composing', from);
        const { categorized, totalCommands } = getCategorized();
        const categories = Object.keys(categorized);
        const imageUrl = getImageUrl();

        const btn = new Button(conn);
        btn.setImage(imageUrl);
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

        btn.addSelection('📂 Open Menu');
        btn.makeSection('📁 Categories');
        for (const cat of categories) {
            const count = categorized[cat].length;
            btn.makeRow('📌', cat.toUpperCase(), `${count} commands`, `menu_${cat}`);
        }
        btn.addReply('📜 Full Menu', 'menu_full');
        btn.addReply('🏓 Ping', 'menu_ping');

        const sentMsg = await btn.send(from, { quoted: mek });
        const messageId = sentMsg.key.id;

        const listener = async (msgData) => {
            const msg = msgData.messages[0];
            if (!msg?.message || msg.key.remoteJid !== from) return;

            const ctx = msg.message?.extendedTextMessage?.contextInfo
                || msg.message?.listResponseMessage?.contextInfo
                || msg.message?.buttonsResponseMessage?.contextInfo
                || msg.message?.interactiveResponseMessage?.contextInfo;

            let tappedId =
                msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                msg.message?.buttonsResponseMessage?.selectedButtonId ||
                msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text;

            if (typeof tappedId === 'string' && tappedId.startsWith('{')) {
                try { tappedId = JSON.parse(tappedId).id || tappedId; } catch {}
            }

            const isReplyToOurs = ctx?.stanzaId === messageId;
            const isMenuTap = typeof tappedId === 'string' && tappedId.startsWith('menu_');

            if (!isMenuTap && !isReplyToOurs) return;

            try { await conn.sendMessage(from, { react: { text: '⬇️', key: msg.key } }); } catch {}

            if (tappedId === 'menu_full') {
                await execCommand(conn, msg, from, findCommand('menu2'));
                return;
            }
            if (tappedId === 'menu_ping') {
                await execCommand(conn, msg, from, findCommand('ping'));
                return;
            }

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
                await conn.sendMessage(from, { image: { url: imageUrl }, caption: catMenu }, { quoted: msg });
                return;
            }

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
                    await conn.sendMessage(from, { image: { url: imageUrl }, caption: catMenu }, { quoted: msg });
                }
            }
        };

        conn.ev.on('messages.upsert', listener);
        setTimeout(() => conn.ev.off('messages.upsert', listener), 60000);

    } catch (e) {
        console.error(e);
        reply(`❌ Error:\n${e.message}`);
    }
});
