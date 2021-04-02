/* Asha, or Alekha, is ready for migration! */

/* Dependencies and external JSONs */
import Discord from "discord.js";
import BotConf from "./botconf.json";

/* External modules */
import * as ext from "./functions";
import * as cmd from "./commands";

/* Constants, etc */
/** Discord client of the bot. */
const Client = new Discord.Client({disableMentions: "everyone"});

/* Client login. */
Client.login(BotConf.token);

/* Runs at the beginning. */
Client.once('ready', () => {
    // Logs login data into console.
    console.log(`This is asha_ts@${BotConf.version}!`);
    Client.user.setActivity(`TypeScript`, { type: "PLAYING" })
        .then(presence => console.log(`Activity set to "${presence.activities[0].name}"`));
    console.log(`Currently in ${Client.guilds.cache.size} servers.`);

    // Synchronises tables in databases managed within this bot.
    cmd.Tags.sync();
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