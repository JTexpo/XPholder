const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge_player')
        .setDescription('*WARNING* Deletes all data on a player [OWNER]')
        .addUserOption(option => option
            .setName("player")
            .setDescription("The Player Is Getting Purged")
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
        if (interaction.user.id != interaction.guild.ownerId) {
            await interaction.editReply("Sorry, but you are not the owner of the server, and can not use this command.")
            return;
        }
        /*
        --------------
        INITALIZATIONS
        --------------
        */
        const player = interaction.options.getUser("player");
        const playerCharacters = await guildService.getAllCharacters(player.id);
        for (let character of playerCharacters){
            await guildService.deleteCharacter(character);
        }

        await interaction.editReply('Success!');
    },
};