const { SlashCommandBuilder } = require('@discordjs/builders');
const { AttachmentBuilder } = require('discord.js');
const { Buffer } = require("buffer")

const { XPHOLDER_COLOUR, XPHOLDER_ICON_URL, DEV_SERVER_URL } = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('export_characters_csv')
        .setDescription('CSV Dumps Characters')

        .addBooleanOption(option => option
            .setName("public")
            .setDescription("Show This Command To Everyone?")
            .setRequired(false))
    ,
    async execute(guildService, interaction) {

        /*
        --------------
        INITIALIZATION
        --------------
        */
        const response = await guildService.getAllGuildCharacters();
        let csv_string = "";
        let delimiter = "";

        /*
        ----------------
        CREATING HEADERS
        ----------------
        */
        for (key of Object.keys(response[0])){
            csv_string += `${delimiter}${key}`;
            delimiter = ",";
        }
        delimiter = "";

        /*
        ------------
        FILLING DATA
        ------------
        */
        for (character of response){
            csv_string += '\n';
            for (value of Object.values(character)){
                csv_string += `${delimiter}${value}`;
                delimiter = ",";
            }
            delimiter = "";
        }

        const csv_file = new AttachmentBuilder()
            .setFile(Buffer.from(csv_string))
            .setName("Guild_Characters_Export.csv");

        await interaction.editReply({files: [csv_file]});
    },
};