const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit_channels')
        .setDescription('Adds / Removes Channel From Server Database! [ MOD ]')

        .addChannelOption(option => option
            .setName("channel")
            .setDescription("A Channel To Be Added / Removed")
            .setRequired(true))
        .addIntegerOption(option => option
            .setName("xp_per_post")
            .setDescription("Awareded XP Per-Post ( negatives remove from database )")
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
        const channel = interaction.options.getChannel("channel")
        const xpPerPost = interaction.options.getInteger("xp_per_post")

        await guildService.updateChannel(channel.id, xpPerPost);

        await interaction.editReply("Success!");
    }
}