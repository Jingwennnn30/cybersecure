const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();
app.use(express.json());

const TOKEN = '7688960001:AAEkrhJAYVKLrIsFPdWgCmRBoEF_BI4Fb9k';
const bot = new TelegramBot(TOKEN, { polling: true });

function escapeHTML(text) {
    return text.replace(/&/g, "&amp;");
}

function markdownToHtml(text) {
    let html = escapeHTML(text);
    html = html.replace(/\*([^\*]+)\*/g, '<b>$1</b>');
    html = html.replace(/\((https?:\/\/[^\s)]+)\)/g, (match, url) => `<a href="${url}">${url}</a>`);
    html = html.replace(/(^|[^">])((https?:\/\/[^\s<)]+))/g, (match, prefix, url) => {
        if (prefix.endsWith('href=')) return match;
        return `${prefix}<a href="${url}">${url}</a>`;
    });
    // REMOVE this line:
    // html = html.replace(/\n/g, '<br>');
    return html;
}

app.post('/alert', (req, res) => {
    console.log('Received body:', req.body);

    const { groupId, summary, titles } = req.body;

    const safeSummary = markdownToHtml(summary);

    // Create inline buttons for each title if titles array is provided
    let keyboard = undefined;
    if (Array.isArray(titles) && titles.length > 0) {
        keyboard = {
            inline_keyboard: titles.map(title => [
                { text: title, callback_data: 'noop' }
            ])
        };
    }

    bot.sendMessage(groupId, safeSummary, {
        parse_mode: 'HTML',
        reply_markup: keyboard
    }).catch(err => {
        console.error('Telegram sendMessage error:', err);
    });

    res.json({ status: 'ok' });
});

app.listen(3000, () => {
    console.log('Bot backend listening on port 3000');
});

bot.on('message', (msg) => {
    console.log('Chat ID:', msg.chat.id);
});
