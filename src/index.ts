/* Asha, or Alekha, is ready for migration! */

/* Dependencies and external JSONs */
import Discord from "discord.js";
import Sequelize from "sequelize";
import BotConf from "./botconf.json";

/* External modules */
import * as ext from "./functions";

/* Constants, etc */
const Client = new Discord.Client({disableMentions: "everyone"});
const NameVer = `asha_ts@${BotConf.version}`;

/* Database madness! */
/** Constructor for the Sequelize database used in this program. */
const Sqz = new Sequelize.Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: './db/database.sqlite'
});
/**  Tags table for the tag command. */
const Tags = Sqz.define('tags', {
    name: {
        type: Sequelize.STRING,
        unique: true,
    },
    content: Sequelize.TEXT,
    authorid: Sequelize.INTEGER,
    usage_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    created_at: {
        type: Sequelize.DATE
    }
});


/* Client login */
Client.login(BotConf.token);

/* Runs at the beginning */
Client.once('ready', () => {
    // Logs login data into console.
    console.log(`This is ${NameVer}}!`);
    Client.user.setActivity(`TypeScript`, { type: "PLAYING" })
        .then(presence => console.log(`Activity set to "${presence.activities[0].name}"`));
    console.log(`Currently in ${Client.guilds.cache.size} servers.`);

    // Synchronises tables in the Sqz database.
    Tags.sync();
});

/* Main event loops */

// Catch messages
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
    console.log(`[${msg.guild.name}] #${msg.channel.name} ${msg.author.username} invoked '${cmd}' ${(options.length>0)? `with option arguments: ${options}`:``} just now.`);

    // Switch cases of the commands that the user sent.
    switch (cmd) {

        // Short, operational-related commands.

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

        // Admin privs only pls 

        /** Bulk clear messages. */
        case `clear`:
        case `bulkclear`:
            ext.bulkClear(Client, msg, args);
            break;

        /** Setting activity! */
        case `activity`:
            const types = ["PLAYING", "WATCHING", "LISTENING"];
            if (msg.author.id !== '519030001216258082') {
                msg.react(ext.findEmote(Client, 'NOPERS'));
                return;
            } else if (args.length < 1) {
                msg.react(ext.findEmote(Client, 'SHUTUPSTOPIT'));
                Client.user.setActivity(`in version ${BotConf.version}.`, { type: "PLAYING" })
                    .then(presence => console.log(`Activity set to "PLAYING ${presence.activities[0].name}"`));
            } else if (types.includes(args[0].toUpperCase())) {
                msg.react(ext.findEmote(Client, 'NODDERS'));
                // @ts-expect-error
                Client.user.setActivity(args.slice(1).join(' '), { type: args[0].toUpperCase() });
            } else if (args[0].toLowerCase() === `servercount`) {
                msg.react(ext.findEmote(Client, 'NODDERS'));
                Client.user.setActivity(`in ${Client.guilds.cache.size} guilds.`, { type: "PLAYING" })
                    .then(presence => console.log(`Activity set to "${args[0].toUpperCase()} ${presence.activities[0].name}"`))
            } else {
                msg.react(ext.findEmote(Client, 'NODDERS'));
                Client.user.setActivity(args.join(' '), { type: "PLAYING" })
                    .then(presence => console.log(`Activity set to "PLAYING ${presence.activities[0].name}"`));
            };
            if (msg.guild.me.hasPermission('MANAGE_MESSAGES')) await msg.delete({ timeout: 5000, reason: "A-NNA" }).catch(console.error);
            break;

        // Funky functions!

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
            ext.caption(Client, msg, args, spoiler);
            break;

        /** Emote functionality. */
        case `e`:
        case `emote`:
        case `emoji`:
            if (options.includes('-list') || options.includes('-l')) {
                await ext.sendEmoteList(Client, msg, (options.includes('-animated') || options.includes('-anim')?false:true));
                if (options.includes(`-delete`) || options.includes(`-d`)) {
                    if (msg.guild.me.hasPermission('MANAGE_MESSAGES')) await msg.delete({ reason: "A-NNA" }).catch(console.error);
                };
            }
            else if (args.length<1) {
                msg.channel.send(`I need something to work with here, add an emote name after the command.`)
                    .then(reply => reply.delete({ timeout: 7500, reason: "Bot error A-URR" })).catch(console.error);
                return;
            }
            else {
                await ext.sendEmote(Client, msg, args);
                if (options.includes(`-delete`) || options.includes(`-d`)) {
                    if (msg.guild.me.hasPermission('MANAGE_MESSAGES')) await msg.delete({ reason: "A-NNA" }).catch(console.error);
                };
            };
            break;
        
        /** React functionality. */
        case `r`:
        case `react`:
            if (args.length < 1) {
                msg.channel.send(`I need something to work with here, add an emote name after the command.`)
                    .then(reply => reply.delete({ timeout: 7500, reason: "Bot error A-URR" })).catch(console.error);
                return;
            }
            else {
                await ext.reactToMessage(Client, msg, args);
            };
            break;

        /** Tag functionality. */
        case `t`:
        case `tag`:
            if (options.includes('-add') || options.includes('-a')) {
                if (args[0].length < 3) {
                    return msg.channel.send(`The tag name needs to be longer than 2 characters long.`)
                        .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
                }
                ext.tagAdd(msg, args, Tags);
            } else if (options.includes('-list') || options.includes('-l')) {
                ext.tagList(Client, msg, args, Tags);
            }
            else {
                if (args.length < 1) {
                    return msg.channel.send(`You typed blank, love, I need something to work with here.`)
                        .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
                }
                else if (options.includes('-info') || options.includes('-i')) {
                    ext.tagInfo(Client, msg, args, Tags);
                }
                else if (options.includes('-edit') || options.includes('-e')) {
                    ext.tagEdit(msg, args, Tags);
                } else if (options.includes('-delete') || options.includes('-d')) {
                    ext.tagDelete(msg, args, Tags);
                }
                else ext.tagFetch(msg, args, Tags);
            }
            break;

        default:
            console.log(` ...but no such command exists.`);
            break;
            
    };

});