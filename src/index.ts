// Asha, or Alekha, is ready for migration!

// Dependencies and external JSONs
import Discord from "discord.js";
import BotConf from "./botconf.json";

// External modules.
import {caption} from "./functions";

// Constants, etc
const Client = new Discord.Client({disableMentions: "everyone"});

Client.login(BotConf.token);

// Runs at the beginning.
Client.once('ready', () => {
    // Logs login data into console.
    console.log(`This is asha_ts@${BotConf.version}!`);
    Client.user.setActivity(`TypeScript`, { type: "PLAYING" })
        .then(presence => console.log(`Activity set to "${presence.activities[0].name}"`));
    console.log(`Currently in ${Client.guilds.cache.size} servers.`);
});

Client.on('message', async msg => {

    // Checks whether the message should be bothered with or not.
    if (msg.author.bot) return; // Bot? No.
    if (!msg.content.startsWith(BotConf.prefix)) return; // Doesn't start with the prefix? No.
    if (msg.channel.type === "dm") return; // Is a DM? No, wait, how did you even get here?

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

    // Logs when a command is detected.
    console.log(`[${msg.guild.name}] #${msg.channel.name} ${msg.author.username} invoked '${cmd}' just now.`);

    // Switch cases of the commands that the user sent.
    switch (cmd) {

        /** Ping! */
        case `ping`:
            await msg.channel.send(`Pinging, hold on...`).then(sent => {
                sent.edit(`Pong. Took ${sent.createdTimestamp - msg.createdTimestamp}ms.`);
            }).catch(console.error);
            break;
        
        /** Echo! */
        case `echo`:
            await msg.channel.send(msg.content);
            break;

        /** Adds a caption onto the image. */
        case `caption`:
            if (msg.attachments.size < 1) {
                await msg.channel.send(`What am I supposed to caption, exactly?`)
                    .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
                return;
            } else if (args.length < 1) {
                await msg.channel.send(`What text am I supposed to put on this?`)
                    .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
                return;
            };
            var spoiler: boolean = false;
            if (options.includes('-spoiler') || options.includes('-s')) {
                spoiler = true;
            };
            caption(Client, msg, args, spoiler);
            break;

        default:
            console.log(` ...but no such command exists.`);
            break;
            
    };

});