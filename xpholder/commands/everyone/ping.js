const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

const { XPHOLDER_COLOUR, XPHOLDER_ICON_URL, DEV_SERVER_URL } = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies With Pong!')
        .addBooleanOption(option => option
            .setName("public")
            .setDescription("Show This Command To Everyone?")
            .setRequired(false))
    ,
    async execute(guildService, interaction) {
        const delta = Date.now() - interaction.createdTimestamp;
        const pingEmbed = new EmbedBuilder()
            .setTitle("🏓 Pong")
            .setFields({ inline: true, name: "Speed", value: `${delta} ms` },)
            .setFooter({ text: `Like the bot? Click 'Pong' to visit the dev server!` })
            .setColor(XPHOLDER_COLOUR)
            .setURL(DEV_SERVER_URL)

        await interaction.editReply({ embeds: [pingEmbed] });
    },
};