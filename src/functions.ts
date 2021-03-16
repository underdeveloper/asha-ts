import Discord = require("discord.js");
import BotConf = require("./botconf.json");
import Canvas = require("canvas");

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

// Exported functions.

export async function caption(client: Discord.Client, msg: Discord.Message, args: string[], spoiler: Boolean): Promise<void> {
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

    if (msg.guild.me.hasPermission('MANAGE_MESSAGES')) await msg.delete({ reason: "Bot delete message A-NNA" }).catch(console.error);
    return;
}