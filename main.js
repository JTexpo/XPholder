const dotenv = require('dotenv');
const fs = require('fs');

const { Client, Collection, GatewayIntentBits, Partials, EmbedBuilder, InteractionType, ChannelType } = require('discord.js');
const sqlite3 = require("sqlite3");

const { guildService } = require("./xpholder/services/guild");
const { sqlLite3DatabaseService } = require("./xpholder/database/sqlite");

const { getActiveCharacterIndex, getXp, getRoleMultiplier, getLevelInfo, getTier, logCommand, logError } = require("./xpholder/utils");
const { XPHOLDER_COLOUR } = require("./xpholder/config.json")
/*
-----------------------
LOADING ENV VARS (.env)
-----------------------
*/
dotenv.config();
/*
---------------------------
LOADING DISCORD PREMISSIONS
---------------------------
*/
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel]
});
client.commands = new Collection();
/*
----------------
LOADING COMMANDS
----------------
*/
const commandsPath = [
    "everyone",
    "mod",
    "owner",
];
for (const path of commandsPath) {
    const commandCollection = fs.readdirSync(`./xpholder/commands/${path}`).filter(file => file.endsWith('.js'));
    for (const file of commandCollection) {
        const command = require(`./xpholder/commands/${path}/${file}`);
        client.commands.set(command.data.name, command);
    }
}

/*
------------
BOT COMMANDS
------------
*/
client.once('ready', () => {
    //clearGuildCache();
    console.log("ready");
    console.log(client.commands);
});

client.on('interactionCreate', async interaction => {
    /*
    -------------------------------------
    VALIDATIONS FOR INTERACTION EXECUTION
    -------------------------------------
    */
    if (!interaction.isCommand() ||
        !interaction.inGuild()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    const guildId = `${interaction.guildId}`;

    // LOADING GUILD SERVICE
    gService = new guildService(
        await new sqlLite3DatabaseService(sqlite3, `./guilds/${guildId}.db`)
    )
    await gService.init();
    if (!await gService.isRegistered()) {
        // Try Catch on the reply, because this is a restful call, and errors can be found
        try {
            await interaction.reply({
                content: `Sorry, but your server is not registerd, please contact <@${interaction.guild.ownerId}> and ask them todo \`/register\`.`,
                ephemeral: true
            });
        } catch (error) { };
        return;
    }
    /*
    -----------------
    EXECUTING COMMAND
    -----------------
    */
    try {
        logCommand(interaction);
    } catch (error) {
        console.log(error);
    }
    try {
        let is_public = !interaction.options.getBoolean("public");
        await interaction.deferReply({ ephemeral: is_public });
        await command.execute(gService, interaction);
    } catch (error) {
        try {
            logError(interaction);
        } catch (error) {
            console.log(error);
        }
        console.log(error);
    }
});

/*
-----------
XP PER POST
-----------
*/
client.on('messageCreate', async message => {
    try {

        /*
        ----------
        VALIDATION
        ----------
        */
        if (!message.inGuild()) { return; }
        if (message.author.bot) { return; }
        if ((message.content.split(/\s+/).length <= 10) && !message.content.startsWith('!')) { return; }
        /*
        --------------------------------
        LOADING GUILD INTO CACHED GUILDS
        --------------------------------
        */
        const guildId = `${message.guildId}`;
        gService = new guildService(
            await new sqlLite3DatabaseService(sqlite3, `./guilds/${guildId}.db`)
        )
        await gService.init();
        if (!await gService.isRegistered()) { return; }
        /*
        --------------
        INITALIZATIONS
        --------------
        */
        const messageCount = message.content.split(/\s+/).length;
        const guild = await client.guilds.fetch(guildId);
        const player = await guild.members.fetch(message.author.id);

        const roleBonus = getRoleMultiplier(gService.config["roleBonus"], gService.roles, player._roles);

        const characterIndex = getActiveCharacterIndex(gService.config, player._roles);
        const character = await gService.getCharacter(player.id, characterIndex)
        if (!character) { return; }


        let channel = await guild.channels.fetch(message.channelId);

        while (channel) {
            if (channel.id in gService.channels) { break; }
            channel = guild.channels.fetch(channel.parentId);
        }
        if (!channel) { return; }

        const xp = getXp(messageCount, roleBonus, gService.channels[channel.id], gService.config["xpPerPostDivisor"], gService.config["xpPerPostFormula"]);

        gService.updateCharacterXP(character, xp);

        const oldLevelInfo = getLevelInfo(gService.levels, character["xp"]);
        const newLevelInfo = getLevelInfo(gService.levels, character["xp"] + xp);

        if (oldLevelInfo["level"] != newLevelInfo["level"]) {
            const tier = getTier(newLevelInfo["level"]);
            let awardChannel;
            try {
                awardChannel = await guild.channels.fetch(gService.config["levelUpChannelId"]);
            } catch (error) { return; }

            let levelUpEmbed = new EmbedBuilder()
                .setTitle(`${character["name"]} Leveled Up`)
                .setFields(
                    { name: "Level Up!", value: `${oldLevelInfo["level"]} --> **${newLevelInfo["level"]}**`, inline: true },
                    { name: "Total Character XP", value: `${Math.floor(character["xp"] + xp)}`, inline: true },
                    { name: "Tier", value: `<@&${gService.config[`tier${tier["tier"]}RoleId`]}>`, inline: true }
                )
                .setThumbnail(character["picture_url"] != "" ? character["picture_url"] : player.user.avatarURL())
                .setColor(XPHOLDER_COLOUR)
                .setFooter({ text: "You can view your characters with /xp" })

            if (character["sheet_url"] != "") {
                levelUpEmbed.setURL(characterObj["sheet_url"]);
            }

            awardChannel.send({ content: `${player}`, embeds: [levelUpEmbed] });
        }

    } catch (error) { console.log(error); }
});

/*
---------------------
LOGING THE BOT ONLINE
---------------------
*/
client.login(process.env.DISCORD_TOKEN);