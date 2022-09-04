const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

const { XPHOLDER_COLOUR, XPHOLDER_ICON_URL, DEV_SERVER_URL } = require("../../config.json");
const { getXp } = require("../../utils");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calculate_xp')
        .setDescription('Shows How Much XP Will Be Rewarded Under Conditions!')

        .addIntegerOption(option => option
            .setName("word_count")
            .setDescription("How Many Words In The Post")
            .setMinValue(0)
            .setRequired(true)
        )
        .addIntegerOption(option => option
            .setName("role_boost")
            .setDescription("The Multiplier Your Role Provides")
            .setMinValue(0)
            .setRequired(true)
        )
        .addIntegerOption(option => option
            .setName("channel_xp_per_post")
            .setDescription("The Channel's Awarded XP Per Post")
            .setMinValue(0)
            .setRequired(true)
        )
        .addIntegerOption(option => option
            .setName("xp_per_post_divisor")
            .setDescription("The Lower The More XP ( Suggested 100 )")
            .setMinValue(1)
            .setMaxValue(1000)
            .setRequired(true))

        .addBooleanOption(option => option
            .setName("public")
            .setDescription("Show This Command To Everyone?")
            .setRequired(false))
    ,
    async execute(guildService, interaction) {
        /*
        --------------
        INITALIZATIONS
        --------------
        */
        const wordCount = interaction.options.getInteger("word_count");
        const roleBoost = interaction.options.getInteger("role_boost");
        const channelXpPerPost = interaction.options.getInteger("channel_xp_per_post");
        const xpPerPostDivisor = interaction.options.getInteger("xp_per_post_divisor");

        let calculateEmbed = new EmbedBuilder()
            .setTitle("Calculate XP")
            .setFields(
                { inline: false, name: "Exponential", value: `\`( ${channelXpPerPost} [channel xp per post] + ${wordCount} [word count] / ${xpPerPostDivisor} [xp per post divisor] ) * (1 + ${wordCount} [word count] / ${xpPerPostDivisor} [xp per post divisor] ) * ${roleBoost} [role bonus]\`\n= **${getXp(wordCount, roleBoost, channelXpPerPost, xpPerPostDivisor, "exponential")}**` },
                { inline: false, name: "Flat", value: `\`${channelXpPerPost} [channel xp per post] * ${roleBoost} [role bonus]\`\n= **${getXp(wordCount, roleBoost, channelXpPerPost, xpPerPostDivisor, "flat")}**` },
                { inline: false, name: "Linear", value: `\`( ${channelXpPerPost} [channel xp per post] + ${wordCount} [word count]/ ${xpPerPostDivisor} [xp per post divisor] ) * ${roleBoost} [role bonus]\`\n= **${getXp(wordCount, roleBoost, channelXpPerPost, xpPerPostDivisor, "linear")}**` },
            )
            .setFooter({ text: `Like the bot? Click 'Calculate XP' to visit the dev server!` })
            .setThumbnail(XPHOLDER_ICON_URL)
            .setColor(XPHOLDER_COLOUR)
            .setURL(DEV_SERVER_URL)

        await interaction.editReply({ embeds: [calculateEmbed] });
    },
};