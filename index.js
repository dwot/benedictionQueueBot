// Require the necessary discord.js classes
const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const axios = require('axios');
const JSSoup = require('jssoup').default;
const cron = require('node-cron');
const fs = require('fs');

let config = {}
config.queueCount = "n/a";
config.queueStatus = false;
config.updateTime = "n/a";
config.lastUpdate = "n/a";
config.estTime = "n/a";
config.path = "./config.dat";
config.subscribedChannels = [];

function saveConfig() {
    try {
        fs.writeFileSync(config.path, JSON.stringify(config));
    } catch (error) {
        console.log(error, error.message);
    }
}

function loadConfig() {
    try {
        const fileContent = fs.readFileSync(config.path);
        config = JSON.parse(fileContent);
    } catch (error) {
        console.log(error, error.message);
    }
}

function sendStatusMessage(channelRef, preMsg) {
    let statusMessage = "";
    let channel = client.channels.cache.get(channelRef)
    if (config.queueStatus === true) {
        statusMessage = (`\`\`\`${preMsg}Queue ${config.queueCount} @ ${config.updateTime}.\nEstimated queue duration is ${config.estTime}.\`\`\``);
    } else if (config.queueStatus === false) {
        statusMessage = (`\`\`\`No Queue @ ${config.updateTime}.\`\`\``);
    }
    channel.send(statusMessage);
}

function sendAlertBlast(preMsg) {
    config.subscribedChannels.forEach(function (channelRef, index) {
        try {
            //let guild = client.guilds.cache.get(channelRef.guildId);
            //let channel = guild.channels.cache.find(c => c.id ===  && c.type === 'text');
            sendStatusMessage(channelRef, preMsg)
            console.log("Sent Alert Message!");
        } catch (error) {
            console.log(error, error.message);
        }
    });
}

//Update from MDC Cron
cron.schedule('* * * * *', () => {
    console.log('Updating data from multidollar.');
    let website = 'https://multidollar.company/';
    /*
    let seed = Math.floor(Math.random() * (10 + 1));
    if (seed <=3) {
        website = 'https://web.archive.org/web/20220920193245/https://multidollar.company/'
    } else {
        website = 'https://web.archive.org/web/20221005191753/https://multidollar.company/'
    }; //Queue
    console.log(seed);
    //website = 'https://web.archive.org/web/20220920193245/https://multidollar.company/'; //No Queue
    //website = 'https://web.archive.org/web/20221005191753/https://multidollar.company/'; //Queue
     */
    try {
        axios(website).then((response) => {
            const html = response.data;
            const soup = new JSSoup(html);
            let titleclass = soup.findAll('h2', 'is-3');
            let timestamp = soup.findAll('p', 'subtitle');
            config.updateTime = timestamp[0].contents[0]._text;
            config.updateTime = config.updateTime.replaceAll('&#x2F;', '-');
            if (html.search('yes-queue') > 0) {
                //console.log("Yes, queue");
                config.estTime = titleclass[0].contents[1].contents[1].contents[0]._text;
                config.queueCount = titleclass[0].contents[0].contents[1].contents[0]._text;
                if (config.queueStatus === false) {
                    config.queueStatus = true;
                    sendAlertBlast('QUEUE HAS STARTED!!!!!    ');
                }

            } else {
                //console.log("No queue");
                config.estTime = "";
                config.queueCount = 0;
                if (config.queueStatus === true) {
                    config.queueStatus = false;
                    sendAlertBlast('Queue has ENDED!    ');
                }
            }

            console.log(`Status: ${config.queueStatus} Updated mdc data @ ${config.updateTime}`)
            saveConfig();
        });
    } catch (error) {
        console.log(error, error.message);
    }
});

//Cron Queue Updater
cron.schedule('0,15,30,45 * * * *', () => {
    console.log('Updating Queue Status');
    try {
        if (config.queueStatus === false) {
            console.log('No queue, no status needed.');
        } else {
            config.subscribedChannels.forEach(function (channelRef, index) {
                try {
                    sendStatusMessage(channelRef, '');
                    console.log("Sent Status Message!");
                } catch (error) {
                    console.log(error, error.message);
                }
            });
        }
    } catch (error) {
        console.log(error, error.message);
    }
});

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Ready!');
    loadConfig();
    console.log(`Loaded Subscribed Channels: ${config.subscribedChannels.length}`)
});

client.on('interactionCreate', async interaction => {
    try {
        if (!interaction.isChatInputCommand()) return;

        const { commandName } = interaction;
        if (commandName === 'queue') {
            interaction.reply("Got it, I'll keep this channel updated with queue status.");
            sendStatusMessage(interaction.channelId, 'Init Status:  ');
            config.subscribedChannels.push(interaction.channelId);
            saveConfig();
        } else {
            interaction.reply("Something went goofy, oops?");
        }
    } catch (error) {
        console.log(error, error.message);
    }
});

// Login to Discord with your client's token
client.login(token);