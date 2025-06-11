const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();
app.use(express.json());

const TOKEN = '7688960001:AAEkrhJAYVKLrIsFPdWgCmRBoEF_BI4Fb9k';
const bot = new TelegramBot(TOKEN, { polling: true });

function escapeHTML(text) {
    // Always convert to string to avoid .replace on undefined/null
    text = (text === undefined || text === null) ? '' : String(text);
    return text.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function markdownToHtml(text) {
    // Always convert to string to avoid .replace on undefined/null
    text = (text === undefined || text === null) ? '' : String(text);
    let html = escapeHTML(text);
    html = html.replace(/\*([^\*]+)\*/g, '<b>$1</b>');
    html = html.replace(/\((https?:\/\/[^\s)]+)\)/g, (match, url) => `<a href="${url}">${url}</a>`);
    html = html.replace(/(^|[^">])((https?:\/\/[^\s<)]+))/g, (match, prefix, url) => {
        if (prefix.endsWith('href=')) return match;
        return `${prefix}<a href="${url}">${url}</a>`;
    });
    return html;
}

app.post('/alert', (req, res) => {
    console.log('Received body:', req.body);

    const { groupId, alert, summary } = req.body;

    // 1. Handle detailed alert 
    if (
        alert &&
        typeof alert === 'object' &&
        (
            (alert.severity || '').toLowerCase() === 'high' ||
            (alert.severity || '').toLowerCase() === 'critical'
        )
    ) {
        const alertMsg = `
<b>🚨 ${(escapeHTML(alert.severity || '')).toUpperCase()} Alert</b>
<b>Name:</b> ${escapeHTML(alert.name || '')}
<b>Category:</b> ${escapeHTML(alert.threat_category || '')} (${escapeHTML(alert.sub_type || '')})
<b>IP:</b> ${escapeHTML(alert.ip || '')}:${escapeHTML(String(alert.port || ''))}
<b>Host:</b> ${escapeHTML(alert.hostname || '')}
<b>Region:</b> ${escapeHTML(alert.region_name || '')}, ${escapeHTML(alert.country_name || '')}
<b>Risk Score:</b> ${escapeHTML(String(alert.risk_score || ''))}
<b>Time:</b> ${escapeHTML(alert.timestamp || '')}
<b>Reason:</b> ${escapeHTML(alert.reason || '')}
        `.trim();

        bot.sendMessage(groupId, alertMsg, { parse_mode: 'HTML' })
            .catch(err => {
                console.error('Telegram sendMessage error:', err);
            });
        return res.json({ status: 'ok' });
    }

    // 2. Handle summary message (from summary generator)
    if (typeof summary === 'string' && summary.trim().length > 0) {
        const safeSummary = markdownToHtml(summary);

        bot.sendMessage(groupId, safeSummary, {
            parse_mode: 'HTML'
        }).catch(err => {
            console.error('Telegram sendMessage error:', err);
        });

        return res.json({ status: 'ok' });
    }

    // If nothing matches, just acknowledge
    res.json({ status: 'ignored' });
});

app.listen(3000, () => {
    console.log('Bot backend listening on port 3000');
});

bot.on('message', (msg) => {
    console.log('Chat ID:', msg.chat.id);
});