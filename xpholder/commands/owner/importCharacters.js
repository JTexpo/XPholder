const { SlashCommandBuilder } = require('@discordjs/builders');
const { sqlInjectionCheck } = require('../../utils');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const { XPHOLDER_COLOUR, XPHOLDER_ICON_URL, DEV_SERVER_URL } = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('import_characters_csv')
        .setDescription('CSV Loads Characters')
    
        .addAttachmentOption(option => option
            .setName("csv_file")
            .setDescription("File Created From /export_characters_csv [ OWNER ]")
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
        INITIALIZATION
        --------------
        */
        const csvFile = interaction.options.getAttachment("csv_file");
        // API call to discord to grab the data
        const response = await fetch(csvFile.url);

        const csvContent = await response.text();
        const csvRows = csvContent.split('\n');
        const csvHeaders = csvRows[0].split(',');

        /*
        --------------
        IMPORTING DATA
        --------------
        */
        for (csvRow of csvRows.slice(1,csvRows.length)){
            const csvRowValues = csvRow.split(',');
            let csvData = {};
            for (rowValueIndex in csvRowValues){
                if ( sqlInjectionCheck(csvHeaders[rowValueIndex]) ||  
                     sqlInjectionCheck(csvRowValues[rowValueIndex])){
                        await interaction.editReply(`Malicious Data Found : ${csvHeaders[rowValueIndex]} - ${csvRowValues[rowValueIndex]}\nEnding Process`);
                        return;
                     }
                csvData[`${csvHeaders[rowValueIndex]}`] = csvRowValues[rowValueIndex];
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
                "character_id": csvData["character_id"],
                "character_index": csvData["character_index"],
                "name": csvData["name"],
                "sheet_url": csvData["sheet_url"],
                "picture_url": csvData["picture_url"],
                "player_id": csvData["player_id"],
                "xp": csvData["xp"]
            };

            let existingCharacter = await guildService.getCharacter(`${character["character_id"]}`);

            if (!existingCharacter) {
                await guildService.insertCharacter(character);
            }else{
                await guildService.updateCharacterInfo(character);
                await guildService.setCharacterXP(character);
            }
            
        }

        await interaction.editReply("success");
    },
};