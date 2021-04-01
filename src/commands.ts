import Discord from "discord.js";

/** A command message, sent by a user */
export class CommandMessage {
    name: string;
    options: string[];
    args: string[];
    author: Discord.User;
    bot: boolean;

    /** Constructor for CommandMessage. */
    constructor(name: string, options: string[], args: string[], author: Discord.User, bot: boolean = false) {
        this.name = name;
        this.options = options;
        this.args = args;
        this.author = author;
        this.bot = bot;
    }
};

export class CommandContext {
    message: Discord.Message;
    guild: Discord.Guild;
}

/** Extracts a CommandMessage from a Discord message. */
export function extract(message: Discord.Message, prefix: string): CommandMessage {

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

    // Consructs a CommandMessage object.
    return new CommandMessage(cmd, options, args, message.author, message.author.bot ? true : false)
}