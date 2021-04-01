/* Asha, or Alekha, is ready for migration! */

/* Dependencies and external JSONs */
import Discord from "discord.js";
import Sequelize from "sequelize";
import BotConf from "./botconf.json";

/* External modules */
import * as ext from "./functions";

/* Constants, etc */
/** Discord client of the bot. */
const Client = new Discord.Client({disableMentions: "everyone"});
const NameVer = `asha_ts@${BotConf.version}`;

/* Database madness! */
/** Constructor for the Sequelize database used in this program. */
const Sqz = new Sequelize.Sequelize('asha-db', 'alekha', 'pASSword', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: './db/asha-db.sqlite'
});
/**  Tags table for the tag command. */
const Tags = Sqz.define('tags', {
    /** Name of tag */
    name: {
        type: Sequelize.STRING,
        unique: true,
    },
    /** Content of tag */
    content: Sequelize.TEXT,
    /** URL of attachment */
    attachment: {
        type: Sequelize.TEXT,
        defaultValue: null,
        allowNull: true
    },
    /** ID of tag author */
    authorid: Sequelize.INTEGER,
    /** Count of how many times tag has been called */
    usage_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    /** Timestamp for when tag was created */
    created_at: {
        type: Sequelize.DATE
    }
});

/* Client login */
Client.login(BotConf.token);

/* Runs at the beginning */
Client.once('ready', () => {
    // Logs login data into console.
    console.log(`This is ${NameVer}!`);
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
    console.log(`[${msg.guild.name}] #${msg.channel.name} ${msg.author.username} invoked '${cmd}'${(options.length>0)? ` with option arguments: ${options} `:` `}just now.`);

    // Switch cases of the commands that the user sent.
    switch (cmd) {

        // Short, utility-related commands.

        /** Ping! */
        case `ping`:
            var sent = await msg.channel.send(`Pinging, hold on...`);
            await msg.channel.send(`Pong. Took ${sent.createdTimestamp - msg.createdTimestamp}ms.`);
            break;
        
        /** Echo! */
        case `echo`:
            await msg.channel.send(args.join(' '));
            break;

        /** Caches previous50 (default) messages. */
        case `cache`:
            var cacheCount: number;
            if (isNaN(parseInt(args[0])) || parseInt(args[0]) <= 50) cacheCount = 50
            else if (parseInt(args[0]) > 200) cacheCount = 200
            else cacheCount = parseInt(args[0]);
            msg.channel.messages.fetch({ limit: cacheCount }).catch(console.error);
            console.log(`Cached the previous ${cacheCount} messages in [${msg.guild.name}] #${msg.channel.name}.`);
            if (msg.guild.me.hasPermission('MANAGE_MESSAGES')) await msg.delete({ reason: "A-NNA" }).catch(console.error);
            break;

        // Admin privs only pls 

        /** Bulk clear messages. */
        case `clear`:
        case `bulkclear`:
            ext.bulkClear(Client, msg, args);
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
            else if (args.length==1) {
                await ext.searchEmote(Client, msg, args[0]);
            } 
            else {
                await ext.sendEmoteBulk(Client, msg, args);
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
                } else if (options.includes('-remove') || options.includes('-r')) {
                    ext.tagRemove(msg, args, Tags);
                }
                else ext.tagFetch(msg, args, Tags);
            }
            break;

        default:
            if (msg.author.id !== BotConf.ownerID) console.log(` ...but no such command exists.`)
            else {
                // Owner privs only pls
                switch (cmd) {
                    /** Setting activity! */
                    case `activity`:
                        ext.setActivity(Client, msg, args);
                        break;
                    /** Setting nickname! */
                    case `nick`:
                    case `nickname`:
                        ext.setNickname(Client, msg, args);
                        break;
                    /** Checks the uptime of the bot! */
                    case `uptime`:
                        var uptime = ext.checkUptime(Client);
                        await msg.channel.send(`I have been running for ${uptime}.`);
                        break;
                    case `kill`:
                        var uptime = ext.checkUptime(Client);
                        await msg.channel.send(`Na, bis bald. Logging out now.\nFinal uptime: ${uptime}.`);
                        console.log(`I have logged out. I ran for ${uptime} before stopping.`);
                        Client.destroy();
                        break;
                    default:
                        console.log(` ...but no such command exists.`);
                };
            break;
        };
            
    };

});

Client.on("messageReactionAdd", async (reaction, user) => {
    if (reaction.emoji.name === "📌") {
        var pinChannel = reaction.message.guild.channels.cache.find(channel => channel.name === "pins" && channel.type === "text");
        if (!pinChannel) return;
        else if (reaction.message.reactions.cache.get("📌").count > 1) return;
        else if (reaction.message.content === "" && reaction.message.attachments.size === 0) return;
        else {
            // @ts-expect-error
            // Say pinChannel is always a TextChannel.
            ext.pintoPinChannel(Client, reaction, user, pinChannel);
        }
    }
});