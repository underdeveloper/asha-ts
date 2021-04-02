/* Asha, or Alekha, is ready for migration! */

/* Dependencies and external JSONs */
import Discord from "discord.js";
import Sequelize from "sequelize";
import BotConf from "./botconf.json";

/* External modules */
import * as ext from "./functions";
import * as cmd from "./commands";

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
    /** Name of tag. */
    name: {
        type: Sequelize.STRING,
        unique: true,
    },
    /** Content of tag. */
    content: Sequelize.TEXT,
    /** URL of attachment. */
    attachment: {
        type: Sequelize.TEXT,
        defaultValue: null,
        allowNull: true
    },
    /** ID of tag author. */
    authorid: Sequelize.INTEGER,
    /** Count of how many times tag has been called */
    usage_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    /** Timestamp for when tag was created. */
    created_at: {
        type: Sequelize.DATE
    }
});

/* Client login. */
Client.login(BotConf.token);

/* Runs at the beginning. */
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

    /** The current request being handled. */
    var currentReq = cmd.extract(msg, BotConf.prefix);
    /** The context in which the request is. */
    var currentCtx = new cmd.CommandContext(Client, msg, msg.guild);

    // Logs when a command is detected.
    console.log(`[${msg.guild.name}] #${msg.channel.name} ${msg.author.username} invoked '${currentReq.name}'${(currentReq.options.length>0)? ` with option arguments: ${currentReq.options} `:` `}just now.`);

    // Special command for the tag. I haven't figured out how to connect the database yet.
    if (currentReq.name === "tag") {
        if (currentReq.options.includes('-add') || currentReq.options.includes('-a')) {
            if (currentReq.args[0].length < 3) {
                return msg.channel.send(`The tag name needs to be longer than 2 characters long.`)
                    .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
            }
            ext.tagAdd(msg, currentReq.args, Tags);
        } else if (currentReq.options.includes('-list') || currentReq.options.includes('-l')) {
            ext.tagList(Client, msg, currentReq.args, Tags);
        }
        else {
            if (currentReq.args.length < 1) {
                return msg.channel.send(`You typed blank, love, I need something to work with here.`)
                    .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
            }
            else if (currentReq.options.includes('-info') || currentReq.options.includes('-i')) {
                ext.tagInfo(Client, msg, currentReq.args, Tags);
            }
            else if (currentReq.options.includes('-edit') || currentReq.options.includes('-e')) {
                ext.tagEdit(msg, currentReq.args, Tags);
            } else if (currentReq.options.includes('-remove') || currentReq.options.includes('-r')) {
                ext.tagRemove(msg, currentReq.args, Tags);
            }
            else ext.tagFetch(msg, currentReq.args, Tags);
        }
        return;
    }

    // Trying to execute the command.
    /** The status of the command handler. */
    var status: [boolean, string] = cmd.execute(currentCtx, currentReq);
    if (!status[0]) return console.log(`Tried to execute command, but failed. Log: \"${status[1]}\"`);

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