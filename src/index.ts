// Asha, or Alekha, is ready for migration!

// Dependencies and external JSONs
import Discord = require("discord.js");
import BotConf = require("./botconf.json");

// Constants, etc
const Client = new Discord.Client({disableMentions: "everyone"});

Client.login(BotConf.token);

// Runs at the beginning.
Client.once('ready', () => {
    // Logs login data into console.
    console.log(`This is asha_ts v${BotConf.version}!`);
    Client.user.setActivity(`TypeScript`, { type: "PLAYING" })
        .then(presence => console.log(`Activity set to "${presence.activities[0].name}"`));
    console.log(`Currently in ${Client.guilds.cache.size} servers.`);
});

Client.on('message', async msg => {

    // Checks whether the message should be bothered with or not.
    if (msg.author.bot) return;
    if (!msg.content.startsWith(BotConf.prefix)) return;

    // Cuts between command and arguments.
    var args: string[] = msg.content.split(' ');
    var cmd: string = args[0].toLowerCase().slice(BotConf.prefix.length)
    args.shift();

    // Finds additional 'option' arguments that start with '-'
    var options: string[] = [];
    while (args.length > 0 && args[0].startsWith('-')) {
        if (args[0].startsWith('-') && !options.includes(args[0])) {
            options.push(args[0]);
            args.shift()
        };
    };

    // Switch cases of the commands that the user sent.
    switch (cmd) {

        case `ping`:
            await msg.channel.send(`Pinging, hold on...`).then(sent => {
                sent.edit(`Pong. Took ${sent.createdTimestamp - msg.createdTimestamp}ms.`);
            }).catch(console.error);
            break;
        
        case `echo`:
            await msg.channel.send(msg.content);
            break;

        default:
            console.log(` ...but no such command exists.`);
            break;
            
    };

});