import Discord from "discord.js";
import Sequelize from "sequelize";
import BotConf from "./botconf.json";
import * as ext from "./functions";

/* Database madness! */
/** Constructor for the Sequelize database used in this program. */
const Sqz = new Sequelize.Sequelize('asha-db', 'alekha', 'pASSword', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: './db/asha-db.sqlite'
});
/**  Tags table within Sqz. */
export const Tags = Sqz.define('tags', {
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

/** The context of a command. */
export class CommandContext {
    client: Discord.Client;
    message: Discord.Message;
    guild: Discord.Guild;

    constructor(client: Discord.Client, message: Discord.Message, guild: Discord.Guild) {
        this.client = client;
        this.message = message;
        this.guild = guild;
    }
};

/** A command request, sent by a user */
export class CommandRequest {
    name: string;
    options: string[];
    args: string[];
    author: Discord.User;

    /** Constructor for CommandRequest. */
    constructor(name: string, options: string[], args: string[], author: Discord.User, bot: boolean = false) {
        this.name = name;
        this.options = options;
        this.args = args;
        this.author = author;
    }
};

/** Extracts a CommandRequest from a Discord message. */
export function extract(message: Discord.Message, prefix: string): CommandRequest {

    // Cuts between command and arguments.
    var args: string[] = message.content.split(' ');
    var cmd: string = args[0].toLowerCase().slice(prefix.length)
    args.shift();

    // Finds additional 'option' arguments that start with '-'
    var options: string[] = [];
    while (args.length > 0 && args[0].startsWith('-')) {
        if (args[0].startsWith('-') && !options.includes(args[0])) {
            options.push(args[0]);
            args.shift()
        };
    };

    // Consructs a CommandRequest object.
    return new CommandRequest(cmd, options, args, message.author, message.author.bot ? true : false)
};

/** A parent class of all command functions in this bot. */
export class CommandFunction {
    /** Name of the command. Must be unique. */
    name: string;
    /** Help message for the command. */
    help: string;
    /** Aliases, if they exist, for the command. Must be unique. */
    aliases: string[];
    /** Specifies whether this command's request will be automatically deleted or not. */
    autoDel: boolean;
    /** Specifies whether this command is limited only to the bot owner or not. */
    restricted: boolean;

    constructor(name: string, help: string, aliases: string[] = [], autoDel: boolean = false, restricted: boolean = false) {
        this.name = name;
        this.help = help;
        this.aliases = aliases;
        this.autoDel = autoDel;
        this.restricted = restricted;
    };

    /** Runs the associated async function for this command. */
    async run(ctx: CommandContext, req: CommandRequest) {
        return;
    };

    /** Returns true when:
     * 
     * The command is intended to be for the owner and the requester is the owner
     * OR
     * the command is not restricted
     */
    checkRestriction(req: CommandRequest) {
        return (req.author.id === BotConf.ownerID || !this.restricted);
    }
};

class Ping extends CommandFunction {
    constructor() {
        super("ping", "Pings the client that is running the bot.")
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        var sent = await ctx.message.channel.send(`Pinging, hold on...`);
        await sent.edit(`Pong. Took ${sent.createdTimestamp - ctx.message.createdTimestamp}ms.`);
    };
};

class Echo extends CommandFunction {
    constructor() {
        super("echo", "Echoes the given message back to the requester.", [], true)
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        if (req.args.length<1) return
        else await ctx.message.channel.send(req.args.join(' '));
    };
};

class Cache extends CommandFunction {
    constructor() {
        super("cache", "Caches the last 100 messages in a given text channel.", [], true)
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        ctx.message.channel.messages.fetch({ limit: 100 }).catch(console.error);
        // @ts-expect-error The context is always within a TextChannel. DMChannel messages are ignored.
        console.log(`Cached the previous ${cacheCount} messages in [${ctx.message.guild.name}] #${ctx.message.channel.name}.`);
    }
};

class Clear extends CommandFunction {
    constructor() {
        super("clear", "Clears a specific amount of messages above the request.", ["bulkclear"])
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        ext.bulkClear(ctx.client, ctx.message, req.args);
    }
};

class Uptime extends CommandFunction {
    constructor() {
        super("uptime", "Returns the uptime of the current session in HH:MM:SS.", [], false, true)
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        var uptime = ext.checkUptime(ctx.client);
        await ctx.message.channel.send(`I have been running for ${uptime}.`);
    }
};

class Kill extends CommandFunction {
    constructor() {
        super("kill", "Kills the connection between the client and Discord, and stops the entire program.", ["stop", "cease"], true)
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        var uptime = ext.checkUptime(ctx.client);
        await ctx.message.channel.send(`Na, bis bald. Logging out now.\nFinal uptime: ${uptime}.`);
        console.log(`I have logged out. I ran for ${uptime} before stopping.`);
        ctx.client.destroy();
    }
};

class Caption extends CommandFunction {
    constructor() {
        super("caption", "Adds a caption to a static image.", [], true)
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        if (ctx.message.attachments.size < 1) {
            await ctx.message.channel.send(`What am I supposed to caption, exactly?`)
                .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
            return;
        } else if (req.args.length < 1) {
            await ctx.message.channel.send(`What text am I supposed to put on this?`)
                .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
            return;
        };
        var spoiler: boolean = false;
        if (req.options.includes('-spoiler') || req.options.includes('-s')) {
            spoiler = true;
        };
        ext.caption(ctx.client, ctx.message, req.args, spoiler);
    }
};

class SetNickname extends CommandFunction {
    constructor() {
        super("setnickname", "Sets the nickname of the bot within the context.", ["nick", "nickname"], true)
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        ext.setNickname(ctx.client, ctx.message, req.args);
    }
};

class SetActivity extends CommandFunction {
    constructor() {
        super("setactivity", "Sets the activity of the bot.", ["activity"], true)
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        ext.setActivity(ctx.client, ctx.message, req.args);
    }
};

class Emote extends CommandFunction {
    constructor() {
        super("emote", "Sends the appropriate emote(s) to a channel from a user's request.", ["e", "emoji"], true)
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        if (req.options.includes('-list') || req.options.includes('-l')) {
            await ext.sendEmoteList(ctx.client, ctx.message, (req.options.includes('-animated') || req.options.includes('-anim') ? false : true));
        }
        else if (req.args.length < 1) {
            ctx.message.channel.send(`I need something to work with here, add an emote name after the command.`)
                .then(reply => reply.delete({ timeout: 7500, reason: "Bot error A-URR" })).catch(console.error);
            return;
        }
        else if (req.args.length == 1) {
            await ext.searchEmote(ctx.client, ctx.message, req.args[0]);
        }
        else {
            await ext.sendEmoteBulk(ctx.client, ctx.message, req.args);
        };
    }
};

class React extends CommandFunction {
    constructor() {
        super("react", "Reacts to a specific message with an appropriate emote as requested by a user.", ["r"], true)
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        if (req.args.length < 1) {
            ctx.message.channel.send(`I need something to work with here, add an emote name after the command.`)
                .then(reply => reply.delete({ timeout: 7500, reason: "Bot error A-URR" })).catch(console.error);
            return;
        }
        else {
            await ext.reactToMessage(ctx.client, ctx.message, req.args);
        };
    }
};

class Tag extends CommandFunction {
    constructor() {
        super("tag", "The tag functionality. It can store text and images in a database and called at any time during the uptime.")
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        if (req.options.includes('-add') || req.options.includes('-a')) {
            if (req.args[0].length < 3) {
                ctx.message.channel.send(`The tag name needs to be longer than 2 characters long.`)
                    .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
            }
            ext.tagAdd(ctx.message, req.args, Tags);
        } else if (req.options.includes('-list') || req.options.includes('-l')) {
            ext.tagList(ctx.client, ctx.message, req.args, Tags);
        }
        else {
            if (req.args.length < 1) {
                ctx.message.channel.send(`You typed blank, love, I need something to work with here.`)
                    .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
            }
            else if (req.options.includes('-info') || req.options.includes('-i')) {
                ext.tagInfo(ctx.client, ctx.message, req.args, Tags);
            }
            else if (req.options.includes('-edit') || req.options.includes('-e')) {
                ext.tagEdit(ctx.message, req.args, Tags);
            } else if (req.options.includes('-remove') || req.options.includes('-r')) {
                ext.tagRemove(ctx.message, req.args, Tags);
            }
            else ext.tagFetch(ctx.message, req.args, Tags);
        }
    }
}

var allCommands: CommandFunction[] =
    [
        // General utility
        new Ping(),
        new Echo(),
        new Cache(),
        // Admin utility
        new Clear(),
        // Owner utility
        new Uptime(),
        new Kill(),
        new SetNickname(),
        new SetActivity(),
        // Fun stuff
        new Caption(),
        new Emote(),
        new React()
    ];

/** The command handler. Tries to execute a command requested by a user. 
 * @param {CommandContext} context - The context where the request was sent.
 * @param {CommandRequest} request - A request sent by a user via a command call.
 * @returns A pair of two values: a boolean and a string. The boolean value is true when the command is executed,
 * and false when it is not. When the boolean is false, the string value dictates what went wrong in the execution.
*/
export function execute(context: CommandContext, request: CommandRequest): [boolean, string] {
    var command: CommandFunction = allCommands.find(fx => fx.name === request.name) || allCommands.find(fx => fx.aliases.includes(request.name))
    if (!command) return [false, "No command of that name found."]
    else if (!command.checkRestriction(request)) {
        return [false, "Command is restricted to the owner."]
    }
    else {
        command.run(context, request).catch(console.error);
        if (command.autoDel && context.message.guild.me.hasPermission('MANAGE_MESSAGES')) context.message.delete({ reason: "A-NNA" }).catch(console.error);
        return [true, "Command ran successfully."]
    }
};