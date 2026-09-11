// plugins/aireply.js
import { cmd } from '../command.js';
import { AIRich } from '../lib/mb.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

cmd({
    pattern: "aireply",
    alias: ["airich", "ai"],
    desc: "Send an AI-style rich response",
    category: "ai",
    react: "🤖",
    filename: __filename,
    use: ".aireply <question>",
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        if (!args[0]) {
            return reply(`*🤖 AI Rich Reply*\n\n*Usage:* .aireply <question>\n*Example:* .aireply what is javascript`);
        }

        await conn.sendPresenceUpdate('composing', from);

        const query = args.join(' ');
        const rich = new AIRich(conn);

        rich
            .setTitle('AI Assistant')
            .setFooter('Powered by JawadTechX');

        // Section 1: Main answer (markdown + hyperlink)
        rich.addText(
`## 📘 ${query}

Here's a concise answer with a [reference link](https://developer.mozilla.org) and inline details.

- Point one
- Point two with more context
- Point three — quick summary`
        );

        // Section 2: Code block (syntax highlighted)
        rich.addCode('javascript',
`// Example for: ${query}
function answer() {
    const result = "Hello from AI";
    console.log(result);
    return result;
}
answer();`
        );

        // Section 3: Table
        rich.addTable([
            ['Feature', 'Value', 'Notes'],
            ['Speed', 'Fast', 'Optimized'],
            ['Size', 'Small', 'Lightweight'],
            ['Support', 'Wide', 'Community']
        ]);

        // Section 4: Sources
        rich.addSource([
            {
                icon: 'https://www.google.com/favicon.ico',
                url: 'https://developer.mozilla.org',
                title: 'MDN Web Docs',
                subtitle: 'developer.mozilla.org'
            },
            {
                icon: 'https://github.com/favicon.ico',
                url: 'https://github.com',
                title: 'GitHub',
                subtitle: 'github.com'
            }
        ]);

        // Section 5: Tip
        rich.addTip('You can ask follow-up questions for more details.');

        // Section 6: Suggestion pills
        rich.addSuggest([
            'Give an example',
            'Explain deeper',
            'Show alternatives',
            'Best practices'
        ]);

        await rich.send(from, {
            forwarded: true,
            notification: false,
            quoted: mek,
        });

    } catch (e) {
        console.error('AIReply error:', e);
        reply(`❌ *AI Reply Error:*\n\`\`\`${e.message}\`\`\``);
    }
});
