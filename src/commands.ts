import Discord from "discord.js";
import { isConstructorDeclaration } from "typescript";
import BotConf from "./botconf.json";
import * as ext from "./functions";

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
    /** Specifies whether this command is limited only to the bot owner or not. */
    restricted: boolean;
    /** Aliases, if they exist, for the command. Must be unique. */
    alias: string[];

    constructor(name: string, help: string, alias: string[] = [], restricted: boolean = false) {
        this.name = name;
        this.help = help;
        this.alias = alias;
        this.restricted = restricted;
    };

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
}

class Echo extends CommandFunction {
    constructor() {
        super("echo", "Echoes the given message back to the requester.")
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        if (req.args.length<1) return
        else await ctx.message.channel.send(req.args.join(' '));
    };
}

class Cache extends CommandFunction {
    constructor() {
        super("cache", "Caches the last 100 messages in a given text channel.")
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        ctx.message.channel.messages.fetch({ limit: 100 }).catch(console.error);
        // @ts-expect-error The context is always within a TextChannel. DMChannel messages are ignored.
        console.log(`Cached the previous ${cacheCount} messages in [${ctx.message.guild.name}] #${ctx.message.channel.name}.`);
        if (ctx.message.guild.me.hasPermission('MANAGE_MESSAGES')) await ctx.message.delete({ reason: "A-NNA" }).catch(console.error);
    }
}

class Uptime extends CommandFunction {
    constructor() {
        super("uptime", "Returns the uptime of the current session in HH:MM:SS.", [], true)
    }
    async run(ctx: CommandContext, req: CommandRequest) {
        var uptime = ext.checkUptime(ctx.client);
        await ctx.message.channel.send(`I have been running for ${uptime}.`);
    }
}

class Caption extends CommandFunction {
    constructor() {
        super("caption", "Adds a caption to a static image.")
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
}

var allCommands: CommandFunction[] =
    [
        new Ping(),
        new Echo(),
        new Cache(),
        new Uptime(),
        new Caption()
    ]

/** Tries to execute a command requested by a user. 
 * @param {CommandContext} context - The context where the request was sent.
 * @param {CommandRequest} request - The request itself.
 * @returns A pair of two values: a boolean and a string. The boolean value is true when the command is executed,
 * and false when it is not. When the boolean is false, the string value dictates what went wrong in the execution.
*/
export function execute(context: CommandContext, request: CommandRequest): [boolean, string] {
    var command: CommandFunction = allCommands.find(fx => fx.name === request.name);
    if (!command) return [false, "No command of that name found."]
    else if (!command.checkRestriction(request)) {
        return [false, "Command is restricted to the owner."]
    }
    else {
        command.run(context, request).catch(console.error);
        return [true, "Command ran successfully."]
    }
}