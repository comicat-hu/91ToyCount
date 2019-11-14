var slack = require('slack');

var slackBot = function (token) {
    var bot = new slack({ token });

    this.channel = '';
    this.unfurl_links = true; // 顯示連結預覽(但太多同樣的連結slack就不會顯示預覽)
	this.username = '';
	this.icon_emoji = '';

    this.send = async function (text) { 
        var botResponse = await bot.chat.postMessage({
            channel: this.channel,
            text,
            unfurl_links: this.unfurl_links,
			username: this.username,
			icon_emoji: this.icon_emoji
        });
        return botResponse;
    }

    this.delete = async function (ts) {
        var botResponse = await bot.chat.delete({
            channel: this.channel,
            ts
        });
        return botResponse;
    }
}

module.exports = { slackBot };
