const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js');

const fs = require('fs');

module.exports = {
data: new SlashCommandBuilder()
    .setName('manage_character')
    .setDescription('Edit The Profile Of Your Character')
    .addIntegerOption(option => option
        .setName("character")
        .setDescription("Which Character You Are Editing")
        .setChoices([
            ["1",1],
            ["2",2],
            ["3",3]
        ])
        .setRequired(true))
    .addStringOption(option => option
        .setName("name")
        .setDescription("Name Of Character")
        .setRequired(false))
    .addStringOption(option => option
        .setName("sheet_url")
        .setDescription("URL To Character Sheet")
        .setRequired(false))
    .addStringOption(option => option
        .setName("img_url")
        .setDescription("URL Of Character Picture")
        .setRequired(false))
        ,
async execute(interaction) {
    // GRABBING THE SERVER INFO / EXITING OUT IF NOT REGISTERED
    let serverConfigObj;
    let characterObj;
    let characterJSON;
    try{
        const serverConfigJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/config.json`,"utf-8");
        serverConfigObj = JSON.parse(serverConfigJSON);  
        characterJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/characters.json`,"utf-8");
        characterObj =  JSON.parse(characterJSON);  
    }catch{
        await interaction.editReply({ 
            content: `Looks Like This Server Isn't Registered. Please Contact <@${interaction.guild.ownerId}>, And Ask Them To Do \`/register\`!`,
            ephemeral: true,
    }); return;}
    
    // GRABBING INPUTS
    const character = interaction.options.getInteger("character");
    const characterName = interaction.options.getString("name");
    let characterSheet = interaction.options.getString("sheet_url");
    let characterIMG = interaction.options.getString("img_url");

    const charId = serverConfigObj["CHARACTER_ROLES"][`CHARACTER_${character}`];
    if (!charId){
        await interaction.editReply({ 
            content: `Sorry But There Are Not ${character} Character Options In This Server`,
            ephemeral: true,
    }); return;}

    const characterId = `${interaction.user.id}-${serverConfigObj["CHARACTER_ROLES"][`CHARACTER_${character}`]}`;

    if ( (characterName? 1:0) + (characterSheet? 1:0) + (characterIMG? 1:0) == 0 ){
        delete characterObj[characterId]
        characterJSON = JSON.stringify(characterObj);
        fs.writeFile(`./servers/${interaction.guildId}/characters.json`, characterJSON, (err) => { if (err) { console.log(err); return; } });
        interaction.editReply("SUCCESS!");
        return;
    }

    if (characterSheet){if(!(
        characterSheet.startsWith("https://dicecloud.com/character/") ||
        characterSheet.startsWith("https://www.dndbeyond.com/profile/") ||
        characterSheet.startsWith("https://www.dndbeyond.com/characters/")||
        characterSheet.startsWith("https://ddb.ac/characters/") ||
        characterSheet.startsWith("https://docs.google.com/spreadsheets/")
        )){ characterSheet = ""; }}
    if (characterIMG){ characterIMG = characterIMG.startsWith("http")? characterIMG : ""; }

    if (characterId in characterObj){
        characterObj[characterId] = {
            "name": characterName ? characterName : characterObj[characterId]['name'],
            "sheet": characterSheet ? characterSheet : characterObj[characterId]['sheet'],
            "img": characterIMG ? characterIMG : characterObj[characterId]['img']
        };
    }else{
        characterObj[characterId] = {
            "name": characterName ? characterName : `Character ${character}`,
            "sheet": characterSheet ? characterSheet : "",
            "img": characterIMG ? characterIMG : `${interaction.member.displayAvatarURL()}`
        };
    }
    
    characterJSON = JSON.stringify(characterObj);
    fs.writeFile(`./servers/${interaction.guildId}/characters.json`, characterJSON, (err) => { if (err) { console.log(err); return; } });

    interaction.editReply("SUCCESS!");
}}