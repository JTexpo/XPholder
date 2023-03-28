const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');

const { XPHOLDER_RETIRE_COLOUR, XPHOLDER_APPROVE_COLOUR, XPHOLDER_LEVEL_UP_COLOUR } = require("../../config.json");
const { buildCharacterEmbed, getActiveCharacterIndex, getTier, getLevelInfo } = require("../../utils");


module.exports = {
    data: new SlashCommandBuilder()
        .setName('xp')
        .setDescription('Shows Player Character XP')
        .addUserOption(option => option
            .setName("player")
            .setDescription("The Player Who's XP Sheet You Want To View")
            .setRequired(false))

        .addBooleanOption(option => option
            .setName("public")
            .setDescription("Show This Command To Everyone?")
            .setRequired(false))
    ,
    async execute(guildService, interaction) {
        /*
        -------------
        INITALIZATION
        -------------
        */
        const guild = interaction.member.guild
        const public = interaction.options.getBoolean("public");

        let user = interaction.options.getUser("player");
        if (!user) { user = interaction.user; }

        const player = await guild.members.fetch(user.id);
        const activeCharacterIndex = getActiveCharacterIndex(guildService.config, player._roles)
        /* 
        -------------------------
        BUILDING CHARACTER EMBEDS
        -------------------------
        */
        let characterEmbeds = []
        let embedCharacterIndex = 0
        const playerCharacters = await guildService.getAllCharacters(player.id);

        let index = 0;
        for (let character of playerCharacters) {

            if (!character["picture_url"]) { playerCharacters[index]["picture_url"] = player.user.avatarURL(); }

            if (character["character_index"] == activeCharacterIndex){ embedCharacterIndex = index;}
            characterEmbeds.push(buildCharacterEmbed(guildService, player, character, index));
            index++;
        }

        if (characterEmbeds.length == 0) {
            await interaction.editReply(`Sorry, ${player} has no active characters.`);
            return;
        }

        /*
        ----------------
        BUILDING BUTTONS
        ----------------
        */
        let characterButtons;
        if (player.id == interaction.user.id && !public) {
            characterButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('xp_previous')
                        .setLabel('<')
                        .setStyle('Secondary'),
                    new ButtonBuilder()
                        .setCustomId('xp_next')
                        .setLabel('>')
                        .setStyle('Secondary'),
                    new ButtonBuilder()
                        .setCustomId('xp_set')
                        .setLabel('Set')
                        .setStyle("Success"),
                    new ButtonBuilder()
                        .setCustomId("xp_retire")
                        .setLabel("Retire")
                        .setStyle("Danger")
                );
        } else {
            characterButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('xp_previous')
                        .setLabel('<')
                        .setStyle('Secondary'),
                    new ButtonBuilder()
                        .setCustomId('xp_next')
                        .setLabel('>')
                        .setStyle('Secondary')
                );
        }

        const replyMessage = await interaction.editReply({ embeds: [characterEmbeds[embedCharacterIndex]], components: [characterButtons] });

        createButtonEvents(guildService, interaction, player, replyMessage, playerCharacters, characterEmbeds, embedCharacterIndex);
    }
}

function createButtonEvents(guildService, interaction, player, replyMessage, playerCharacters, characterEmbeds, embedCharacterIndex) {
    /*
    -------------
    INITALIZATION
    -------------
    */
    const guild = interaction.member.guild;

    let pageIndex = embedCharacterIndex;
    let retire = false

    /*
    ------------------
    CREATING COLLECTOR
    ------------------
    */
    const filter = btnInteraction => (
        ['xp_previous', 'xp_next', 'xp_set', 'xp_freeze', 'xp_retire'].includes(btnInteraction.customId) &&
        replyMessage.id == btnInteraction.message.id
    );
    const collectorChannel = interaction.channel;
    if (!collectorChannel) { return; }
    const collector = collectorChannel.createMessageComponentCollector({ filter, time: 60_000 });


    collector.on('collect', async btnInteraction => {
        try {
            let removeRoles = [];
            let addRoles = [];
            let characterEmbedData;
            let copyOfEmbed;
            let freezeMessage = "";

            switch (btnInteraction.customId) {
                case "xp_previous":
                    retire = false;
                    pageIndex = (pageIndex - 1) < 0 ? 0 : (pageIndex - 1);
                    await btnInteraction.update({ embeds: [characterEmbeds[pageIndex]] });
                    break;
                case "xp_next":
                    retire = false;
                    pageIndex = (pageIndex + 1) >= characterEmbeds.length ? (characterEmbeds.length - 1) : (pageIndex + 1);
                    await btnInteraction.update({ embeds: [characterEmbeds[pageIndex]] });
                    break;
                case "xp_set":
                    retire = false;
                    /*
                    -------------
                    INITALIZATION
                    -------------
                    */
                    const oldCharacter = playerCharacters[embedCharacterIndex];
                    const oldCharacterLevelInfo = getLevelInfo(guildService.levels, oldCharacter["xp"]);
                    const oldCharacterTier = getTier(parseInt(oldCharacterLevelInfo["level"]));
                    
                    const newCharacter = playerCharacters[pageIndex]
                    const newCharacterLevelInfo = getLevelInfo(guildService.levels, newCharacter["xp"]);
                    const newCharacterTier = getTier(parseInt(newCharacterLevelInfo["level"]));

                    
                    /*
                    ------------------------
                    SWAPPING CHARACTER ROLES
                    ------------------------
                    */
                    for (let charIndex = 1; charIndex <= guildService.config.characterCount; charIndex++){
                        if (charIndex == parseInt(newCharacter["character_index"])){ continue; }
                        removeRoles.push(await guild.roles.fetch(guildService.config[`character${charIndex}RoleId`]));
                    }
                    addRoles.push(await guild.roles.fetch(guildService.config[`character${newCharacter["character_index"]}RoleId`]));

                    /*
                    -------------------
                    SWAPPING TIER ROLES
                    -------------------
                    */
                    for (let tierIndex = 1; tierIndex <= 4; tierIndex++){
                        if (tierIndex == newCharacterTier["tier"]){ continue; }
                        removeRoles.push(await guild.roles.fetch(guildService.config[`tier${tierIndex}RoleId`]));
                    }
                    addRoles.push(await guild.roles.fetch(guildService.config[`tier${newCharacterTier["tier"]}RoleId`]));

                    const updatedPlayer = await player.roles.remove(removeRoles);
                    await updatedPlayer.roles.add(addRoles);

                    embedCharacterIndex = pageIndex;

                    /*
                    --------------
                    BUILDING EMBED
                    --------------
                    */
                    characterEmbedData = characterEmbeds[pageIndex].data;
                    copyOfEmbed = new EmbedBuilder()
                        .setTitle(characterEmbedData.title)
                        .setDescription("**SUCCESS:** Character Role Added")
                        .setFields(characterEmbedData.fields)
                        .setThumbnail(characterEmbedData.thumbnail.url)
                        .setFooter(characterEmbedData.footer)
                        .setColor(XPHOLDER_APPROVE_COLOUR);

                    await btnInteraction.update({ embeds: [copyOfEmbed] });

                    break;
                
                case "xp_freeze":
                    retire = false;
                    const xpFreezeRoleId = guildService.config["xpFreezeRoleId"]
                    const xpFreezeRole = await guild.roles.fetch(xpFreezeRoleId);

                    if (player._roles.includes(xpFreezeRoleId)){
                        await player.roles.remove(xpFreezeRole);
                        freezeMessage = "Removed";
                    }else{ 
                        await player.roles.add(xpFreezeRole); 
                        freezeMessage = "Added";
                    }

                    /*
                    --------------
                    BUILDING EMBED
                    --------------
                    */
                    characterEmbedData = characterEmbeds[pageIndex].data;
                    copyOfEmbed = new EmbedBuilder()
                        .setTitle(characterEmbedData.title)
                        .setDescription(`**SUCCESS:** XP Freeze Role ${freezeMessage}`)
                        .setFields(characterEmbedData.fields)
                        .setThumbnail(characterEmbedData.thumbnail.url)
                        .setFooter(characterEmbedData.footer)
                        .setColor(XPHOLDER_LEVEL_UP_COLOUR);

                    await btnInteraction.update({ embeds: [copyOfEmbed] });

                    break;
                
                case "xp_retire":
                    if (!retire){
                        retire = true;

                        characterEmbedData = characterEmbeds[pageIndex].data;
                        copyOfEmbed = new EmbedBuilder()
                            .setTitle(characterEmbedData.title)
                            .setDescription("**WARNING:** Are you sure you want to retire?\n\nClick \`retire\` again to retire. Else, click other button to cancel.")
                            .setFields(characterEmbedData.fields)
                            .setThumbnail(characterEmbedData.thumbnail.url)
                            .setFooter(characterEmbedData.footer)
                            .setColor(XPHOLDER_RETIRE_COLOUR);

                        await btnInteraction.update({ embeds: [copyOfEmbed] });
                    }else{
                        await guildService.deleteCharacter(playerCharacters[pageIndex]);

                        copyOfEmbed = characterEmbeds[pageIndex];
                        let awardChannel;
                        removeRoles = []
                        /*
                        ----------
                        VALIDATION
                        ----------
                        */
                        try {
                            awardChannel = await guild.channels.fetch(guildService.config["levelUpChannelId"]);
                        } catch (error) {
                            const owner = await guild.members.fetch(guild.ownerId);
                            await btnInteraction.update({content:`Sorry, but I can't find the **level_up_channel**.\nPlease contact ${owner} and ask them to set a new **level_up_channel** with : \`/edit_config\``});
                            return;
                        }
                        /*
                        ------------------------
                        REMOVING CHARACTER ROLES
                        ------------------------
                        */
                        for (let charIndex = 1; charIndex <= guildService.config.characterCount; charIndex++){
                            removeRoles.push(await guild.roles.fetch(guildService.config[`character${charIndex}RoleId`]));
                        }
                        for (let tierIndex = 1; tierIndex <= 4; tierIndex++){
                            removeRoles.push(await guild.roles.fetch(guildService.config[`tier${tierIndex}RoleId`]));
                        }

                        copyOfEmbed.setDescription("**RETIRED**")
                        copyOfEmbed.setColor(XPHOLDER_RETIRE_COLOUR);
                        
                        await player.roles.remove(removeRoles);

                        await awardChannel.send({ content: `${player} <@&${guildService.config["moderationRoleId"]}>`, embeds: [copyOfEmbed] });
                        await btnInteraction.update({embeds: [copyOfEmbed], components: []});
                    }
                    break;

            }

        } catch (error) { console.log(error); }
    });
}