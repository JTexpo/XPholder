const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');

const { XPHOLDER_COLOUR, XPHOLDER_ICON_URL, DEV_SERVER_URL, XPHOLDER_LEVEL_UP_COLOUR, XPHOLDER_RETIRE_COLOUR } = require("../../config.json");
const { getLevelInfo, getProgressionBar, awardCXPs } = require("../../utils")


module.exports = {
    data: new SlashCommandBuilder()
        .setName('award_xp')
        .setDescription('Rewards The Player With XP / CXP! [ MOD ]')

        .addUserOption(option => option
            .setName("player")
            .setDescription("The Player Wish To Edit")
            .setRequired(true))
        .addIntegerOption(option => option
            .setName("character")
            .setDescription("Which Character You Want To Approve ( 1 -> 10 )")
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(true))
        .addStringOption(option => option
            .setName("award_type")
            .setDescription("The Field That You Want To Manage Of A User")
            .addChoices(
                { name: "Set Level", value: "set_level" },
                { name: "Set XP", value: "set_xp" },
                { name: "Give XP", value: "give_xp" },
                { name: "Set CXP", value: "set_cxp" },
                { name: "Give CXP", value: "give_cxp" }
            )
            .setRequired(true))
        .addIntegerOption(option => option
            .setName("value")
            .setDescription("The Value For What Is Being Managed")
            .setRequired(true))
        .addStringOption(option => option
            .setName("memo")
            .setDescription("A Small Note On Why The Reward")
            .setRequired(false))

        .addBooleanOption(option => option
            .setName("public")
            .setDescription("Show This Command To Everyone?")
            .setRequired(false))
    ,
    async execute(guildService, interaction) {
        /*
        ----------
        VALIDATION
        ----------
        */
        if (!guildService.isMod(interaction.member._roles) &&
            interaction.user.id != interaction.guild.ownerId) {
            await interaction.editReply("Sorry, you do not have the right role to use this command.");
            return;
        }

        /*
        --------------
        INITALIZATIONS
        --------------
        */
        const player = interaction.options.getUser("player");
        const characterId = interaction.options.getInteger("character");
        const awardType = interaction.options.getString("award_type");
        const value = interaction.options.getInteger("value");
        const memo = interaction.options.getString("memo");

        const guild = interaction.member.guild;
        let character = await guildService.getCharacter(`${player.id}-${characterId}`);
        let awardChannel;

        /*
        -------------
        VALIDATION X2
        -------------
        */
        try {
            awardChannel = await guild.channels.fetch(guildService.config["levelUpChannelId"]);
        } catch (error) {
            const owner = await guild.members.fetch(guild.ownerId);
            await interaction.editReply(`Sorry, but I can't find the **level_up_channel**.\nPlease contact ${owner} and ask them to set a new **level_up_channel** with : \`/edit_config\``);
            return;
        }

        if (!character) {
            await interaction.editReply("Sorry, but that character does not exist");
            return;
        }

        // some more inits
        const oldXp = character["xp"];
        const oldLevelInfo = getLevelInfo(guildService.levels, oldXp)

        /*
        ------------
        XP ALGORITHM
        ------------
        */
        switch (awardType) {
            case "set_level":
                let newXp = 0
                for (const [level, xp] of Object.entries(guildService.levels)) {
                    if (parseInt(level) < value) { newXp += xp; }
                }
                character["xp"] = newXp;
                break;
            case "set_xp":
                character["xp"] = value;
                break;
            case "give_xp":
                character["xp"] += value;
                break;
            case "set_cxp":
                character["xp"] = awardCXPs(0, value, guildService.levels);
                break;
            case "give_cxp":
                character["xp"] = awardCXPs(character["xp"], value, guildService.levels);
                break;
        }

        /*
        ----------------
        UPDATE CHARACTER
        ----------------
        character - schema :
            character_id   : STRING
            character_index: NUMBER
            name           : STRING
            sheet_url      : STRING
            picture_url    : STRING
            player_id      : STRING
            xp             : NUMBER
        */
        const characterSchema = {
            "character_id": character["character_id"],
            "character_index": character["character_index"],
            "player_id": character["player_id"],
            "xp": character["xp"],
        };

        await guildService.setCharacterXP(characterSchema);

        /*
        -------------
        AWARD XP POST
        -------------
        */
        // useful inits
        const newXp = character["xp"];
        const newLevelInfo = getLevelInfo(guildService.levels, newXp);
        const progressBar = getProgressionBar(newLevelInfo["levelXp"], newLevelInfo["xpToNext"]);

        // embed inits
        let awardEmbed = new EmbedBuilder()
            .setDescription(memo)
            .setFooter({ text: `Like the bot? Click the title to visit the dev server!` })
            .setThumbnail((character["picture_url"] != "" && character["picture_url"] !== "null") ? character["picture_url"] : XPHOLDER_ICON_URL)
            .setURL(DEV_SERVER_URL)

        let levelFieldName = "Level";
        let levelFieldValue = newLevelInfo["level"];
        // determining if the player is a different level than before
        if (oldLevelInfo["level"] != newLevelInfo["level"]) {
            levelFieldName = "Level Up!";
            levelFieldValue = `${oldLevelInfo["level"]} --> **${newLevelInfo["level"]}**`;
            awardEmbed.setColor(XPHOLDER_LEVEL_UP_COLOUR);
        } else { awardEmbed.setColor(XPHOLDER_COLOUR); }

        switch (awardType) {
            case "set_level":
                awardEmbed.setTitle(`${character["name"]}'s Level Was Set`)
                awardEmbed.setFields(
                    { inline: true, name: "Delta", value: `${Math.floor(oldXp)} -> **${Math.floor(newXp)}**` },
                    { inline: true, name: "Level", value: newLevelInfo["level"] },
                    { inline: true, name: "Set By", value: `${interaction.user}` }
                )
                break;
            case "set_xp":
                awardEmbed.setTitle(`${character["name"]}'s XP Was Set`)
                awardEmbed.setFields(
                    { inline: true, name: "Delta", value: `${Math.floor(oldXp)} -> **${Math.floor(newXp)}**` },
                    { inline: true, name: "Level", value: newLevelInfo["level"] },
                    { inline: true, name: "Total XP", value: `${value}` },
                    { inline: true, name: "Set By", value: `${interaction.user}` },
                    { inline: false, name: "Progress", value: progressBar },
                )
                break;
            case "give_xp":
                awardEmbed.setTitle(`${character["name"]}'s Was Awarded XP`)
                awardEmbed.setFields(
                    { inline: true, name: "Delta", value: `${Math.floor(oldXp)} -> **${Math.floor(newXp)}**` },
                    { inline: true, name: levelFieldName, value: levelFieldValue },
                    { inline: true, name: "XP Recieved", value: `${value}` },
                    { inline: true, name: "Set By", value: `${interaction.user}` },
                    { inline: false, name: "Progress", value: progressBar },
                )
                break;
            case "set_cxp":
                awardEmbed.setTitle(`${character["name"]}'s CXP Was Set`)
                awardEmbed.setFields(
                    { inline: true, name: "Delta", value: `${Math.floor(oldXp)} -> **${Math.floor(newXp)}**` },
                    { inline: true, name: "Level", value: newLevelInfo["level"] },
                    { inline: true, name: "Total CXP", value: `${value}` },
                    { inline: true, name: "Set By", value: `${interaction.user}` },
                    { inline: false, name: "Progress", value: progressBar },
                )
                break;
            case "give_cxp":
                awardEmbed.setTitle(`${character["name"]}'s Was Awarded CXP`)
                awardEmbed.setFields(
                    { inline: true, name: "Delta", value: `${Math.floor(oldXp)} -> **${Math.floor(newXp)}**` },
                    { inline: true, name: levelFieldName, value: levelFieldValue },
                    { inline: true, name: "CXP Recieved", value: `${value}` },
                    { inline: true, name: "Set By", value: `${interaction.user}` },
                    { inline: false, name: "Progress", value: progressBar },
                )
                break;
        };

        /*
        ----------------
        BUILDING BUTTONS
        ----------------
        */
        const awardButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("awardxp_undo")
                    .setLabel("Undo")
                    .setStyle("Danger")
            );

        const awardMessage = await awardChannel.send({ content: `${player}`, embeds: [awardEmbed] , components: [awardButtons] });
        
        createButtonEvents(guildService, interaction, player, awardMessage, character, oldXp)

        await interaction.editReply("Success!");
    },
};

function createButtonEvents(guildService, interaction, player, replyMessage, character, oldXp){
    /*
    -------------
    INITALIZATION
    -------------
    */
    const guild = interaction.member.guild;

    const characterSchema = {
        "character_id": character["character_id"],
        "character_index": character["character_index"],
        "player_id": character["player_id"],
        "xp": oldXp,
    };

    let undoAwardEmbed = new EmbedBuilder()
        .setDescription("XP Reward Undone")
        .setFooter({ text: `Like the bot? Click the title to visit the dev server!` })
        .setThumbnail((character["picture_url"] != "" && character["picture_url"] !== "null") ? character["picture_url"] : XPHOLDER_ICON_URL)
        .setURL(DEV_SERVER_URL)
        .setColor(XPHOLDER_RETIRE_COLOUR);
    undoAwardEmbed.setFields(
        { inline: true, name: "XP", value: `${Math.floor(oldXp)}` },
        { inline: true, name: "Undone By", value: `${interaction.user}` },
    );
    /*
    ------------------
    CREATING COLLECTOR
    ------------------
    */
    const filter = btnInteraction => (
        ['awardxp_undo'].includes(btnInteraction.customId) &&
        replyMessage.id == btnInteraction.message.id &&
        interaction.user.id == btnInteraction.user.id
    );
    const collectorChannel = interaction.channel;
    if (!collectorChannel) { return; }
    const collector = collectorChannel.createMessageComponentCollector({ filter, time: 3_600_000 });

    collector.on('collect', async btnInteraction => {
        try {
            switch (btnInteraction.customId) {
                case "awardxp_undo":
                    await guildService.setCharacterXP(characterSchema);
                    await btnInteraction.update({embeds: [undoAwardEmbed], components: []});
                    break;
            }
        }catch(error){console.log(error)}
    });
}