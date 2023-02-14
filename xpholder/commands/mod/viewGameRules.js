const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { XPHOLDER_COLOUR, XPHOLDER_ICON_URL, DEV_SERVER_URL } = require('../../config.json');
const { chunkArray, splitObjectToList, mergeListOfObjects } = require("../../utils");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('view_game_rules')
        .setDescription('Shows Server Game Details! [ MOD ]')

        .addStringOption(option => option
            .setName("view")
            .setDescription("Which Of The Game Details You Want To View.")
            .setChoices(
                { name: "Config", value: "config" },
                { name: "Channels", value: "channels" },
                { name: "Levels", value: "levels" },
                { name: "Roles", value: "roles", }
            )
            .setRequired(true))

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
        const view = interaction.options.getString("view")
        let gameEmbed;
        let gameChunk;
        /*
        ---------------
        CREATING EMBEDS
        ---------------
        */
        switch (view) {
            case "config":
                gameEmbed = [buildCongifEmbed(guildService.config)];
                break;
            case "channels":
                gameEmbed = [];
                gameChunks = chunkArray(splitObjectToList(guildService.channels), 18);
                for (const gameChunk of gameChunks) {
                    gameEmbed.push(await buildChannelEmbed(mergeListOfObjects(gameChunk), interaction, guildService))
                }
                break;
            case "levels":
                gameEmbed = [buildLevelEmbed(guildService.levels)];
                break;
            case "roles":
                gameEmbed = [];
                gameChunks = chunkArray(splitObjectToList(guildService.roles), 18);
                for (const gameChunk of gameChunks) {
                    gameEmbed.push(await buildRoleEmbed(mergeListOfObjects(gameChunk), interaction, guildService))
                }
                break;
        }

        if (gameEmbed.length > 1) {
            const viewButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('view_previous')
                        .setLabel('<')
                        .setStyle('Secondary'),
                    new ButtonBuilder()
                        .setCustomId('view_next')
                        .setLabel('>')
                        .setStyle('Secondary')
                );
            const replyMessage = await interaction.editReply({ embeds: [gameEmbed[0]], components: [viewButtons] });
            createButtonEvents(interaction, replyMessage, gameEmbed)
        } else {
            await interaction.editReply({ embeds: gameEmbed });
        };
    },
}

/*
------------
BUILD EMBEDS
------------
*/
function buildCongifEmbed(configObj) {
    return new EmbedBuilder()
        .setTitle("Config")
        .setDescription(`**Level Up Message :**
${configObj.levelUpMessage}

**Approve Message :**
${configObj.approveMessage}`)
        .setFields(
            { inline: true, name: "Approve Level", value: `${configObj.approveLevel}` },
            { inline: true, name: "Character 1", value: `<@&${configObj.character1RoleId}>` },
            { inline: true, name: "Character 2", value: `<@&${configObj.character2RoleId}>` },
            { inline: true, name: "Character 3", value: `<@&${configObj.character3RoleId}>` },
            { inline: true, name: "Character 4", value: `<@&${configObj.character4RoleId}>` },
            { inline: true, name: "Character 5", value: `<@&${configObj.character5RoleId}>` },
            { inline: true, name: "Character 6", value: `<@&${configObj.character6RoleId}>` },
            { inline: true, name: "Character 7", value: `<@&${configObj.character7RoleId}>` },
            { inline: true, name: "Character 8", value: `<@&${configObj.character8RoleId}>` },
            { inline: true, name: "Character 9", value: `<@&${configObj.character9RoleId}>` },
            { inline: true, name: "Character 10", value: `<@&${configObj.character10RoleId}>` },
            { inline: true, name: "Level-Up Channel", value: `<#${configObj.levelUpChannelId}>` },
            { inline: true, name: "Mod Role", value: `<@&${configObj.moderationRoleId}>` },
            { inline: true, name: "Role Bonus", value: `${configObj.roleBonus}` },
            { inline: true, name: "Tier 1", value: `<@&${configObj.tier1RoleId}>` },
            { inline: true, name: "Tier 2", value: `<@&${configObj.tier2RoleId}>` },
            { inline: true, name: "Tier 3", value: `<@&${configObj.tier3RoleId}>` },
            { inline: true, name: "Tier 4", value: `<@&${configObj.tier4RoleId}>` },
            { inline: true, name: "Allow Player Manage Xp", value: `${configObj.allowPlayerManageXp}` },
            { inline: true, name: "XP Freeze", value: `<@&${configObj.xpFreezeRoleId}>` },
            { inline: true, name: "XP Share", value: `<@&${configObj.xpShareRoleId}>` },
            { inline: true, name: "XP Per-Post Divisor", value: `${configObj.xpPerPostDivisor}` },
            { inline: true, name: "XP Per-Post Formula", value: `${configObj.xpPerPostFormula}` },
        )
        .setFooter({ text: `Dont Like What You See? Try : /edit_config` })
        .setThumbnail(XPHOLDER_ICON_URL)
        .setColor(XPHOLDER_COLOUR)
        .setURL(DEV_SERVER_URL);
}

async function buildChannelEmbed(channelObj, interaction, guildService) {
    let channelEmbed = new EmbedBuilder()
        .setTitle("Channel")
        .setFooter({ text: `Dont Like What You See? Try : /edit_channels` })
        .setThumbnail(XPHOLDER_ICON_URL)
        .setColor(XPHOLDER_COLOUR)
        .setURL(DEV_SERVER_URL);

    for (const [channelId, xpPerPost] of Object.entries(channelObj)) {
        let channel;
        try{
            channel = await interaction.guild.channels.fetch(channelId)
        }catch(error){
            await guildService.updateChannel(channelId, -1);
            continue;
        }
        channelEmbed.addFields({name:`ID : ${channelId}`, value:`${channel}\n**XP Per Post :** ${xpPerPost}`, inline:true});
    }

    return channelEmbed;
}

function buildLevelEmbed(levelObj) {
    let levelEmbed = new EmbedBuilder()
        .setTitle("Levels")
        .setFooter({ text: `Dont Like What You See? Try : /edit_levels` })
        .setThumbnail(XPHOLDER_ICON_URL)
        .setColor(XPHOLDER_COLOUR)
        .setURL(DEV_SERVER_URL);

    let requiredXp = 0;
    for (const [level, xpToNextLevel] of Object.entries(levelObj)) {
        levelEmbed.addFields({name:`lv ${level}`, value:`**Start xp:** ${requiredXp}\n**XP to lv:** ${xpToNextLevel}`, inline:true});
        requiredXp += xpToNextLevel;
    }

    return levelEmbed;
}

async function buildRoleEmbed(roleObj, interaction, guildService) {
    let roleEmbed = new EmbedBuilder()
        .setTitle("Roles")
        .setFooter({ text: `Dont Like What You See? Try : /edit_roles` })
        .setThumbnail(XPHOLDER_ICON_URL)
        .setColor(XPHOLDER_COLOUR)
        .setURL(DEV_SERVER_URL);

    for (const [roleId, bonus] of Object.entries(roleObj)) {
        const role = await interaction.guild.roles.fetch(roleId)
        if (role == null){
            await guildService.updateRole(roleId, -1);
            continue;
        }
        roleEmbed.addFields({name:`ID : ${roleId}`, value:`${role}\n**XP Bonus :** ${bonus}`, inline:true});
    }

    return roleEmbed;
}

/*

*/
function createButtonEvents(interaction, replyMessage, gameEmbed) {
    /*
    -------------
    INITALIZATION
    -------------
    */

    let pageIndex = 0;
    let retire = false

    /*
    ------------------
    CREATING COLLECTOR
    ------------------
    */
    const filter = btnInteraction => (
        ['view_previous', 'view_next'].includes(btnInteraction.customId) &&
        replyMessage.id == btnInteraction.message.id
    );
    const collectorChannel = interaction.channel;
    if (!collectorChannel) { return; }
    const collector = collectorChannel.createMessageComponentCollector({ filter, time: 60_000 });


    collector.on('collect', async btnInteraction => {
        try {
            switch (btnInteraction.customId) {
                case "view_previous":
                    retire = false;
                    pageIndex = (pageIndex - 1) < 0 ? 0 : (pageIndex - 1);
                    await btnInteraction.update({ embeds: [gameEmbed[pageIndex]] });
                    break;
                case "view_next":
                    retire = false;
                    pageIndex = (pageIndex + 1) > gameEmbed.length ? (gameEmbed.length - 1) : (pageIndex + 1);
                    await btnInteraction.update({ embeds: [gameEmbed[pageIndex]] });
                    break;
            }
        } catch (error) { console.log(error); }
    });
}