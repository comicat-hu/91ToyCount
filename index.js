var axios = require('axios');
var cheerio = require('cheerio');
var cheerioTableparser = require('cheerio-tableparser');
var log4js = require('log4js');
var cache = require('node-file-cache').create();
var bots = require('./bots');

require('dotenv').config();

var getEnv = function (key) {
    var value = process.env[key];
    if (value.toLowerCase() === 'true') {
        return true;
    }
    if (value.toLowerCase() === 'false') {
        return false;
    }
    return value;
};

log4js.configure({
    appenders: { appLog: { type: 'file', filename: getEnv('LOG_PATH') }, console: { type: 'console' }},
    categories: { default: { appenders: ['appLog', 'console'], level: getEnv('LOGGER_LEVEL') || 'error' } }
});
var logger = log4js.getLogger('appLog');

var debug = false;

var getSenders = function () {
    var senders = [];
    if (getEnv('SLACK_NT') === true) {
        var bot = new bots.slackBot(getEnv('SLACK_BOT_TOKEN'));
        bot.channel = getEnv('SLACK_CHANNEL_ID');
        bot.unfurl_links = false;
		bot.username = '一番くじ';
		bot.icon_emoji = ':gift:';
        senders.push(bot);
    }
    return senders;
};

var parseCliParams = function () {
    var args = process.argv.slice(2);
    var params = {};
    for (var arg of args) {
        kvPair = arg.split('=');
        if (kvPair[1] !== undefined) {
            if (kvPair[1] === 'true') {
                params[kvPair[0]] = true;
            } else if (kvPair[1] === 'false') {
                params[kvPair[0]] = false;
            } else {
                params[kvPair[0]] = kvPair[1];
            } 
        } else {
            params[kvPair[0]] = true;
        }
    }
    return params;
};

var run = async function (target, cliParams = {}) {

    // 爬取資料
    var targetUrl = target;
    var response = await axios.get(targetUrl);
    // 使用可能redirect後的Url
    targetUrl = response.request.res.responseUrl;

    var $ = cheerio.load(response.data);
    var title = $('title').text();
    var table = $('#right_content > div:nth-child(3) > div:nth-child(2) > table');

    cheerioTableparser($); // .parsetable(dupCols, dupRows, textMode)
    var data = table.parsetable(false, false, true);

    if (!data) {
        throw new Error('Result empty.');
    }

    // 整理資料
    result = {};
    remain = 0;
    for (let i = 0; i < data[0].length; i++) {
        if (i != 0) {
            result[data[0][i]] = {
                '原始數量': data[1][i],
                '剩餘數量': data[2][i]
            }
            remain += Number.parseInt(data[2][i]);
        }
    }

    // 查找歷史數量是否變更
    remainHistory = cache.get(targetUrl);
    if (remainHistory && remainHistory == remain) {
        logger.info(`${targetUrl} remain not change.`);
        return;
    }

    cache.set(targetUrl, remain, { life: 86400 });

    // 組合通知內容
    var sendText = `*${title}*\n`;
    sendText += `${targetUrl}\n`;
    sendText += '```';
    for (let name in result) {
        sendText += (name + ': ' + JSON.stringify(result[name]) + '\n');
    }
    sendText += `剩餘總數: ${remain}\n`;
    sendText += '```\n';

    if (debug) {
        logger.debug(sendText);
        return;
    }

    // 寄送通知
    var senders = getSenders();

    for (var sender of senders) {
        try {
            var botResponse = await sender.send(sendText);

            logger.info('Send success by ' + sender.constructor.name + ' : ');
            logger.info(botResponse);
        } catch (err) {
            logger.error('Send failed by ' + sender.constructor.name + ' : ');
            logger.error(err);
        }
    }
};

var main = async function () {
    try {
        var cliParams = parseCliParams();
        if (cliParams.debug) {
            debug = true;
            logger.level = 'debug';
            logger.debug('Debug mode enable.');
        }

        var targets = require('./targets.json');
        for (var target of targets) {
            await run(target, cliParams);
        }
    } catch (err) {
        logger.error(err);
    }
}();
