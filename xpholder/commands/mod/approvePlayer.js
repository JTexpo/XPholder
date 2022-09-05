const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

const { XPHOLDER_COLOUR, XPHOLDER_ICON_URL, DEV_SERVER_URL } = require("../../config.json");
const { sqlInjectionCheck, buildCharacterEmbed } = require("../../utils");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('approve_player')
        .setDescription('Approves A Player Character [ MOD ]')

        .addUserOption(option => option
            .setName("player")
            .setDescription("The Player You Want To Approve")
            .setRequired(true))
        .addIntegerOption(option => option
            .setName("character")
            .setDescription("Which Character You Want To Approve ( 1 -> 10 )")
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(true))
        .addStringOption(option => option
            .setName("character_name")
            .setDescription("Name Of The Character")
            .setRequired(true))

        .addStringOption(option => option
            .setName("sheet_url")
            .setDescription("A Link To Their Character Sheet")
            .setRequired(false))
        .addStringOption(option => option
            .setName("picture_url")
            .setDescription("A Link To The Character Picture")
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
        const user = interaction.options.getUser("player");
        const characterNumber = interaction.options.getInteger("character");
        const name = interaction.options.getString("character_name");
        const sheetUrl = interaction.options.getString("sheet_url");
        const pictureUrl = interaction.options.getString("picture_url");

        const guild = interaction.member.guild
        const player = await guild.members.fetch(user.id);

        let hasCharacter = await guildService.getCharacter(`${player.id}-${characterNumber}`);

        /*
        ------------
        VALIDATION 2
        ------------
        */
        if (characterNumber > guildService.config.characterCount) {
            await interaction.editReply(`Sorry, this server is configured for ${characterNumber} character(s). To change, please use \`/edit_config\``);
            return;
        }
        if (hasCharacter) {
            await interaction.editReply("Sorry, but that character exists. Please retire first.");
            return;
        }

        /*
        ----------------------------------------
        VALIDATING URLS ( MINIMIZE FISHY LINKS )
        ----------------------------------------
        */
        let characterSheet;
        if (sheetUrl) {
            if (!(
                sheetUrl.startsWith("https://ddb.ac/characters/") ||
                sheetUrl.startsWith("https://dicecloud.com/character/") ||
                sheetUrl.startsWith("https://www.dndbeyond.com/profile/") ||
                sheetUrl.startsWith("https://www.dndbeyond.com/characters/") ||
                sheetUrl.startsWith("https://docs.google.com/spreadsheets/")
            )) { characterSheet = ""; }
            else if (sqlInjectionCheck(sheetUrl)) {
                characterSheet = "";
            } else { characterSheet = sheetUrl; }
        } else { characterSheet = ""; }

        let characterUrl;
        if (pictureUrl) {
            if (sqlInjectionCheck(pictureUrl)) {
                characterUrl = "";
            } else { characterUrl = pictureUrl.startsWith("https") ? pictureUrl : ""; }
        } else { characterUrl = ""; }

        let characterName;
        if (sqlInjectionCheck(name)) {
            characterName = "Character";
        } else { characterName = name; }


        /*
        -------------------
        GETTING STARTING XP
        -------------------
        */
        let approveLevel = guildService.config.approveLevel;
        let levelObj = guildService.levels;
        let xp = 0;
        for (const [level, xpToNextLevel] of Object.entries(levelObj)) {
            if (parseInt(level) < approveLevel) {
                xp += xpToNextLevel;
            } else { break; }
        }

        /*
        --------------
        INIT CHARACTER
        --------------
        character - schema :
            character_id   : STRING
            character_index: NUMBER
            name           : STRING
            sheet_url      : STRING
            picture_url    : STRING
            player_id      : STRING
            xp             : NUMBER
        */
        const character = {
            "character_id": `${player.id}-${characterNumber}`,
            "character_index": `${characterNumber}`,
            "name": characterName,
            "sheet_url": characterSheet,
            "picture_url": characterUrl ? characterUrl : player.user.avatarURL(),
            "player_id": player.id,
            "xp": xp,
        }
        await guildService.insertCharacter(character);

        // CREATING THE MESSAGE TO NOTIFY THE PLAYER WITH
        const approveEmbed = new EmbedBuilder()
            .setTitle(`Welcome To ${interaction.guild.name}`)
            .setDescription(`${guildService.config["approveMessage"]}`)
            .setImage(interaction.guild.bannerURL({ size: 1024 }))
            .setColor(XPHOLDER_COLOUR);

        let characterEmbed = buildCharacterEmbed(guildService, player, character);

        // DMING THE PLAYER THAT THEY HAVE BEEN APPROVED
        try {
            await player.send({ embeds: [approveEmbed] });
            characterEmbed.setDescription(`<@${player.id}> Has Been Successfully Notified!`);
        }
        catch (error) {
            characterEmbed.setDescription(`<@${player.id}> Approved, But Was Unable To Be Notified!`);
            console.log(error);
        }

        await interaction.editReply({ embeds: [characterEmbed] });
    }
}
