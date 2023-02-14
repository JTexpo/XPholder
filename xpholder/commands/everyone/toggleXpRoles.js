const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

const { XPHOLDER_COLOUR, XPHOLDER_ICON_URL, DEV_SERVER_URL } = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle_xp_roles')
        .setDescription('Toggles The XP Related Roles!')
        .addStringOption(option => option
            .setName("toggle_xp_role")
            .setDescription("Gives Or Removes XP Related Role")
            .addChoices(
                { name: "XP Freeze", value: "xp_freeze" },
                { name: "XP Share", value: "xp_share" },
            )
            .setRequired(true)
            )

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
        const optionsConfigIdMapping = {
            "xp_freeze": "xpFreezeRoleId",
            "xp_share": "xpShareRoleId"
        }
        const player = await guild.members.fetch(interaction.user.id);
        const toggleXpRole = interaction.options.getString("toggle_xp_role");

        /*
        --------------
        UPDATING ROLES
        --------------
        */

        const roleId = guildService.config[optionsConfigIdMapping[toggleXpRole]]
        const role = await guild.roles.fetch(roleId)

        if (player._roles.includes(roleId)){
            await player.roles.remove(role);
        }else{ 
            await player.roles.add(role); 
        }

        await interaction.editReply("Success!");
    },
};