import Discord from "discord.js";
import BotConf from "./botconf.json";
import Canvas from "canvas";
import Sequelize from "sequelize";

// Local functions.

/** Does a "Word Wrap" on a piece of text, up to maxWidth characters long. */
function wordWrap (str: string, maxWidth: number = 64) {
    var newLineStr = "\n", done = false, res = '';
    while (str.length > maxWidth) {
        done = false;
        // Inserts new line at first whitespace of the line
        for (var i = maxWidth - 1; i >= 0; i--) {
            if (testWhite(str.charAt(i))) {
                res = res + [str.slice(0, i), newLineStr].join('');
                str = str.slice(i + 1);
                done = true;
                break;
            }
        }
        // Inserts new line at maxWidth position, the word is too long to wrap
        if (!done) {
            res += [str.slice(0, maxWidth), newLineStr].join('');
            str = str.slice(maxWidth);
        }

    }
    return res + str;
};

/** Takes a string and checks if it is a whitespace or not. */
function testWhite (str: string): boolean {
    var white = new RegExp(/^\s$/);
    return white.test(str.charAt(0));
}

/** Applies text to a Canvas canvas and ensmallens the text if it is too long. */
function applyText
    (canvas: Canvas.Canvas, inputtext: string, 
    defaultFontSize: number = 30, defaultType: string = 'sans-serif', 
    maxWidth: number = canvas.width) 
    {
    const ctx = canvas.getContext('2d');
    var text: string = inputtext;

    // Declare a base size of the font
    let fontSize = defaultFontSize;
    ctx.font = `${fontSize}px ${defaultType}`;
    while (ctx.measureText(text).width >= maxWidth - 10) {
        // Assign the font to the context and decrement it so it can be measured again
        ctx.font = `${fontSize -= 2}px ${defaultType}`;
        // Compare pixel width of the text to the canvas minus the approximate avatar size
    };

    // Return the result to use in the actual canvas
    return ctx.font;
};

/** Given a long text, splits it up into an array of "pages" made up of embeds with certain lines of the text. */
function embedPager
    (
        client: Discord.Client, msg: Discord.Message, 
        fulltext: string, title: string,
        perPageRequested: number = 12, delimiter: string = '\n',
        author: Discord.User = msg.author
    ) : Discord.MessageEmbed[] {
    
    if (fulltext.length < 1) return [];

    /** How many lines there are per text. */
    var perPageActual = perPageRequested < 8 ? 8 : (perPageRequested > 20 ? 20 : perPageRequested);
    /** The given text split based on the given delimiter. */
    var lines = fulltext.split(delimiter);
    /** Array of all the pages */
    var pageArray: string[] = [], page: string = ``, i: number;

    for (i = 0; i < lines.length; i++) {
        page += lines[i] + `\n`;
        if (i % perPageActual === (perPageActual - 1)) {
            pageArray.push(page);
            page = ``;
        } else if (i === lines.length - 1) {
            pageArray.push(page);
        };
    };

    /** Array of all the pages, in embed form. */
    var embedPageArray: Discord.MessageEmbed[] = []
    
    for (i = 0; i < pageArray.length; i++) {
        var pageEmbed = new Discord.MessageEmbed()
            .setTitle(title)
            .setDescription(pageArray[i])
            .setFooter(`Page ${i + 1}/${pageArray.length}`)
            .setColor(BotConf.embedColour)
            .setAuthor(author.username, author.avatarURL());
        embedPageArray.push(pageEmbed);
    };

    return embedPageArray;
}

// Exported functions.

/** Adds a black arial text caption onto an image sent by the requester. */
export async function caption (client: Discord.Client, msg: Discord.Message, args: string[], spoiler: Boolean): Promise<void> {
    var text = args.join(' ');
    text = wordWrap(text, 40);

    var macro = await Canvas.loadImage(msg.attachments.array()[0].url);

    var canvas = Canvas.createCanvas(macro.width, 250);
    var ctx = canvas.getContext('2d');

    ctx.font = applyText(canvas, text, 28, 'sans-serif');
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, ctx.measureText(text).actualBoundingBoxAscent + 20);

    let metrics = ctx.measureText(text);
    // let fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    let actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    let newImageWidth = canvas.width; // not rly needed since canvas width is based off original image width anyway
    let newImageHeight = canvas.width * macro.height/macro.width;

    canvas.height = (actualHeight + 40)
                    + newImageHeight;
    ctx = canvas.getContext('2d');
    ctx.fillStyle = "#ffffff"; //"#def2f8" was the jebakan one
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = applyText(canvas, text, 32, 'sans-serif');
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, ctx.measureText(text).actualBoundingBoxAscent + 20);

    ctx.drawImage(macro, 0, actualHeight + 40, newImageWidth, newImageHeight);

    var attachment = new Discord.MessageAttachment(canvas.toBuffer(), `${spoiler?`SPOILER_`:``}memefuny.png`);
    await msg.channel.send(`<@${msg.author.id}>`, attachment);

    if (msg.guild.me.hasPermission('MANAGE_MESSAGES')) await msg.delete({ reason: "A-NNA" }).catch(console.error);
    return;
};

export async function pager
    (
        client: Discord.Client,
        msg: Discord.Message,
        pageArray: Array<any>
    ) {
    var page = 0;
    msg.channel.send((pageArray[page]))
        .then(async react_msg => {
            // Reacts to the initial page with menu options
            /** Menu options, array of emojis. */
            const menu: string[] = ['⬅', '➡', '❌', '⏹️'];
            menu.forEach(emoji => react_msg.react(emoji).catch(console.error));
            // Creates a filter for when the user is NOT a bot and reacts with appropriate emojis
            const filter = (reaction: Discord.MessageReaction, user: Discord.User) => (user.id === msg.author.id) && (menu.includes(reaction.emoji.name));
            // Collectors. I fucking hate javascript.
            var stop = 0; // 0 => deletes message, 1 => stops paginator (does not delete)
            const collector = new Discord.ReactionCollector(react_msg, filter, { time: 120000, dispose: true });
            collector.on("collect", (reaction: Discord.MessageReaction, user: Discord.User) => {
                switch (reaction.emoji.name) {
                    case '⬅':
                        if (page === 0) { page = pageArray.length - 1 } else { page = page - 1 };
                        react_msg.edit(pageArray[page]);
                        reaction.users.remove(msg.author);
                        break;
                    case '➡':
                        if (page === pageArray.length - 1) { page = 0 } else { page = page + 1 };
                        react_msg.edit(pageArray[page]);
                        reaction.users.remove(msg.author);
                        break;
                    case '⏹️':
                        stop = 1;
                    case '❌':
                        if (user === msg.author) collector.stop();
                        break;
                    default:
                        return;
                };
            });
            collector.on("end", async () => {
                if (stop === 1) {
                    return react_msg.reactions.removeAll();
                } else {
                    react_msg.reactions.removeAll();
                    react_msg.react(client.emojis.cache.find(emoji => emoji.name === "peepoLeave"));
                    // react_msg.edit(`${msg.member.displayName} called \`${msg.content}\` here.`)
                    return react_msg.delete({ timeout: 5000 });
                }
            });
        });
};

/** Clears out a certain number of messages above the user. */
export async function bulkClear(client: Discord.Client, msg: Discord.Message, args: string[]) {
    if (!msg.member.hasPermission('MANAGE_MESSAGES')) {
        msg.reply("You can't do that.")
            .then(message => message.delete({ timeout: 5000, reason: "A-URR" }))
    }
    else if (!msg.guild.me.hasPermission('MANAGE_MESSAGES')) {
        msg.reply("I can't do that.")
            .then(message => message.delete({ timeout: 5000, reason: "A-URR" }))
    }
    else if (!args[0] || isNaN(parseInt(args[0]))) {
        msg.channel.send(`Repeat message with how many messages you'd like me to clear. e.g. \`${BotConf.prefix}clear 5\``)
            .then(message => message.delete({ timeout: 5000, reason: "A-URR" }))
    }
    else {
        //@ts-expect-error
        msg.channel.bulkDelete(parseInt(args[0]) + 1).catch(console.error);
        return msg.channel.send(`Cleared ${args[0]} messages.`)
            .then(message => message.delete({ timeout: 5000, reason: "Bot delete message A-NNA" }))
            .catch(console.error);
    };
};

// The horrid world of emojis.
export function findEmote
(
    client: Discord.Client,
    emoteName: string,
    oldest: boolean = true // If false, will find youngest.
): Discord.GuildEmoji | null {
    var emojisSameName: Discord.GuildEmoji[] = client.emojis.cache.filter(emoji => emoji.name === emoteName).array();
    if (emojisSameName.length < 1) return null;
    else if (emojisSameName.length === 1) return emojisSameName[0];
    else {
        /** What will eventually be returned by the function. */
        var foundEmoji: Discord.GuildEmoji = emojisSameName[0];
        emojisSameName.shift();
        emojisSameName.forEach(emoji => {
            if (emoji.createdTimestamp < foundEmoji.createdTimestamp && oldest) foundEmoji = emoji
            else if (emoji.createdTimestamp > foundEmoji.createdTimestamp && !oldest) foundEmoji = emoji;
        })
        return foundEmoji;
    };

};

function listEmotes
(
    client: Discord.Client,
    /** Whether or not static emotes are included. */ includeStatic: boolean
) {
    /** Array of all emotes that will be returned. */
    var allEmojis: Discord.GuildEmoji[];

    if (includeStatic) {
        allEmojis = client.emojis.cache.map(emoji => emoji);
    } else {
        allEmojis = client.emojis.cache.filter(emoji => emoji.animated).array();
    };
    
    return allEmojis;
};

export async function sendEmote
(
    client: Discord.Client,
    msg: Discord.Message,
    args: string[],
    oldest: boolean = true
) {
    var emoteMsg = ``, argCount = 0, reached2000 = false;
    var newArgs = args.join(" ").replace(/(?:\r\n|\r|\n)/g, ' \n ').split(" ");

    while (argCount < newArgs.length && !reached2000) {

        var emote = findEmote(client, newArgs[argCount], oldest);

        if (!emote) emoteMsg += newArgs[argCount] + " ";
        else emoteMsg += emote.toString() + " ";

        if (emoteMsg.length > 2000) reached2000 = true
        else argCount += 1;
    };

    emoteMsg = emoteMsg.substr(0, emoteMsg.lastIndexOf(" "));
    emoteMsg = emoteMsg.replace(/(?:\r\n|\r|\n )/g, '\n');

    msg.channel.send(emoteMsg).catch(console.error);
};

export async function sendEmoteList
(
    client: Discord.Client,
    msg: Discord.Message,
    includeStatic: boolean = true
) {
    var emotesStr = `This is a list of all emotes stored in my database:\n`, i = 0;
    var emotesArray = listEmotes(client, includeStatic);
    for (i; i < emotesArray.length; i++) {
        emotesStr += `- ${emotesArray[i]} ${emotesArray[i].name}${i === emotesArray.length - 1 ? '' : '\n'}`
    }
    var emotePages = embedPager(client, msg, emotesStr, "Global emote list.", 10, '\n');
    pager(client, msg, emotePages);
    return;
};

export async function reactToMessage
(
    client: Discord.Client, msg: Discord.Message, args: string[]
) {
    // Finding the emote to react with.
    var emote = findEmote(client, args[0]);
    if (!emote) {
        return msg.channel.send(`Don't seem to have an emote named \`${args[0]}\`, mister.`)
            .then(reply => reply.delete({ timeout: 7500, reason: "A-ENF" }))
    } else {
        // Finding which message to react to.
        var amount = (isNaN(parseInt(args[1])) ? 1 : parseInt(args[1])) + 1
        if (amount > 31) {
            return msg.channel.send(`Sorry, I can't go that far back. Maximum is 30 messages in the past.`)
                .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
        }
        else {
            return msg.channel.messages.fetch({ limit: amount })
                .then(messages => {
                    let reacted = Array.from(messages.values())[amount - 1];
                    reacted.react(emote).catch(console.error);
                    const filter = (reaction: Discord.MessageReaction, user: Discord.User) => user === msg.author && reaction.emoji.id === emote.id;
                    const collectorThis = new Discord.ReactionCollector(reacted, filter, { time: 60000, dispose: true });
                    collectorThis.on("collect", reaction => {
                        if (reaction.emoji.id === emote.id) {
                            reaction.users.remove(client.user);
                            if (msg.guild.me.hasPermission('MANAGE_MESSAGES')) msg.delete().catch(console.error);
                            collectorThis.stop()
                        }
                        return;
                    });
                    collectorThis.on("end", () => {return});
                })
                .catch(console.error);
        }
    }
};

// The wonderful world of tags.

export async function tagFetch
    (
        msg: Discord.Message, args: string[], 
    /** Table to be looked through. */ tags: Sequelize.ModelCtor<Sequelize.Model<any, any>>
    ) {

    const tag = await tags.findOne({ where: { name: args[0] } });
    if (!tag) {
        return msg.channel.send(`I could not find \`${args[0]}\` in the list.`)
            .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
    } else {
        tag.increment('usage_count');
        return msg.channel.send(tag.get('content'));
    };

};

export async function tagAdd
    (
        msg: Discord.Message, args: string[], 
    /** Table to be looked through. */ tags: Sequelize.ModelCtor<Sequelize.Model<any, any>>
    ) {
    
    /** Name of the tag to be added. */
    var tagName = args[0];
    args.shift();

    if (args.length < 1) {
        msg.channel.send(`Can't do that, mate. The text you sent is literally empty.`)
            .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
        return;
    };
    try {
        const tag = await tags.create({
            name: tagName,
            content: args.join(' '),
            authorid: msg.author.id,
            created_at: msg.createdAt
        });
        return msg.channel.send(`Your new tag \`${tag.get('name')}\` has been added!`);
    }
    catch (e) {
        if (e.name === 'SequelizeUniqueConstraintError') {
            return msg.channel.send('That tag already exists.')
                .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
        }
        else {
            console.log(e);
            return msg.channel.send('Something went wrong with adding that.')
                .then(reply => reply.delete({ timeout: 7500, reason: "A-DBE" }));
        }
    }
};

export async function tagEdit
    (
        msg: Discord.Message, args: string[],
    /** Table to be looked through. */ tags: Sequelize.ModelCtor<Sequelize.Model<any, any>>
    ) {

    /** Name of the tag to be edited. */
    var tagName = args[0];
    args.shift();

    if (args.length < 1) {
        msg.channel.send(`Can't do that, mate. If you want to delete the tag, try \`${BotConf.prefix}tag -delete ${tagName}\`.`)
            .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
        return;
    };
    try {
        const affectedRows = await tags.update({ content: args.join(' ') }, { where: { name: tagName, authorid: msg.author.id } });
        if (affectedRows[0] > 0) {
            return msg.channel.send(`Your tag \`${tagName}\` has been adjusted!`);
        } else {
            return msg.channel.send(`There is no tag called \`${tagName}\`, or if there is, you do not own it.`)
                .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
        }
    }
    catch {
        return msg.channel.send('Something went wrong with editing that.')
            .then(reply => reply.delete({ timeout: 7500, reason: "A-DBE" }));
    }
};

export async function tagDelete
    (
        msg: Discord.Message, args: string[],
    /** Table to be looked through. */ tags: Sequelize.ModelCtor<Sequelize.Model<any, any>>
    ) {

    /** Name of the tag to be deleted. */
    var tagName = args[0];

    try {
        const affectedRows = await tags.destroy({ where: { name: tagName, authorid: msg.author.id } });
        if (affectedRows > 0) {
            return msg.channel.send(`Your tag \`${tagName}\` has been deleted.`);
        } else {
            return msg.channel.send(`There is no tag called \`${tagName}\`, or if there is, you do not own it.`)
                .then(reply => reply.delete({ timeout: 7500, reason: "A-URR" }));
        }
    }
    catch {
        return msg.channel.send('Something went wrong with editing that.')
            .then(reply => reply.delete({ timeout: 7500, reason: "A-DBE" }));
    }
};

export async function tagList
    (
        client: Discord.Client,
        msg: Discord.Message, args: string[],
    /** Table to be looked through. */ tags: Sequelize.ModelCtor<Sequelize.Model<any, any>>
    ) {
    const tagList = await tags.findAll({ attributes: ['name'] });
    const tagArray = tagList.map(t => t.get('name')) || [];
    if (tagArray.length < 1) {
        msg.channel.send("There's no tags yet.")
            .then(reply => reply.delete({ timeout: 7500, reason: "Bot error A-NNA" }));
        return;
    }
    var tagsStr = `This is a list of all tags stored in my database:\n`, i = 0;
    for (i; i < tagArray.length; i++) {
        var tag = await tags.findOne({ where: { name: tagArray[i] } });
        // (made by ${msg.guild.members.cache.find(member => member.id == tag.get('authorid')).user.username})
        // ^ used to find the username of the tagmaker
        tagsStr += `- ${tagArray[i]}${i === tagArray.length - 1 ? '' : '\n'}`
    }
    var tagPages = embedPager(client, msg, tagsStr, "Global tag list.", 10, '\n');
    pager(client, msg, tagPages);
    return;
};

export async function tagInfo
    (
        client: Discord.Client,
        msg: Discord.Message, args: string[],
    /** Table to be looked through. */ tags: Sequelize.ModelCtor<Sequelize.Model<any, any>>
    ) {

    /** Name of the tag to be fetched its info. */
    var tagName = args[0];

    const tag = await tags.findOne({ where: { name: tagName } });
    if (!tag) {
        return msg.channel.send(`I could not find \`${tagName}\` in the list.`)
            .then(reply => reply.delete({ timeout: 7500, reason: "Bot error A-NNA" }));
    } else {
        var tagAuthor = msg.guild.members.cache.find(member => member.id == tag.get('authorid'))
        // HOW DO I DECLARE THIS???
        // var tagCreatedAt: Sequelize.DateDataTypeConstructor = tag.get('created_at');
        // console.log(tag.get('created_at'));
        // console.log(typeof(tag.get('created_at')));
        return msg.channel.send(
            new Discord.MessageEmbed()
                .setTitle(`Info on the tag '${tagName}'`)
                .addField(`NAME`, `${tag.get('name')}\n`, true)
                .addField(`USAGE COUNT`, `${tag.get('usage_count')}`, true)
                .addField(`AUTHOR`, `${tagAuthor.user.username}#${tagAuthor.user.discriminator}`, true)
                .addField(`CREATED AT`, `${tag.get('created_at')}`, true)
                .addField(`CONTENT`, `${tag.get('content')}`, false)
                .setColor(BotConf.embedColour)
                .setAuthor(msg.author.username, msg.author.avatarURL())
        );
    };
};