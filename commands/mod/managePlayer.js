const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { LEVELS } = require('../../config.json');

module.exports = {
data: new SlashCommandBuilder()
    .setName('manage_player')
    .setDescription('Edit Database Information On The Player')
    .addUserOption(option => option
        .setName("player")
        .setDescription("The Player Wish To Edit")
        .setRequired(true))
    .addIntegerOption(option => option
        .setName("character")
        .setDescription("The Player's Character To Be Edited")
        .setRequired(true))
    .addIntegerOption(option => option
        .setName("set_level")
        .setDescription("The Level To Set The Player To")
        .setRequired(false))
    .addIntegerOption(option => option
        .setName("give_xp")
        .setDescription("The Amount Of XP To Give The Player (Can Be Negative)")
        .setRequired(false))
    ,
async execute(interaction) {
    // RESTRICTING THE COMMAND FOR ONLY THOSE WHO ARE THE MODS OF THE SERVER
    let serverConfigObj = {};
    try{ 
        const serverConfigJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/config.json`,"utf-8");
        serverConfigObj = JSON.parse(serverConfigJSON);  
        if (!interaction.member._roles.includes(serverConfigObj["MOD_ROLE"])){
            await interaction.editReply({ 
                content: `Only The <@&${serverConfigObj["MOD_ROLE"]}> Of The Server Is Allowed To Use This Command`,
                ephemeral: true,
            }); return;
        }
    }catch{
        await interaction.editReply({ 
            content: `Looks Like This Server Isn't Registered. Please Contact <@${interaction.guild.ownerId}>, And Ask Them To Do \`/register\`!`,
            ephemeral: true,
    }); return;}

    // GRABING THE INPUTS
    const character = interaction.options.getInteger("character");
    const player = interaction.options.getUser("player");
    const playerLevel = interaction.options.getInteger("set_level");
    const awardXP = interaction.options.getInteger("give_xp");

    // DETERMINING IF A VALID CHARACTER WAS SELECTED AND NOTIFYING THE USER IF NOT
    const charId = serverConfigObj["CHARACTER_ROLES"][`CHARACTER_${character}`];
    if (!charId){
        await interaction.editReply({ 
            content: `Sorry But There Are Not ${character} Character Options In This Server`,
            ephemeral: true,
    }); return;}

    // CHECKING TO MAKE SURE THAT WE HAVE EITHER A LEVEL OR XP
    if (!playerLevel && !awardXP){
        await interaction.editReply({ 
            content: `You Did Not Provide A Level Or XP Reward In The \`options\`. Please Be Sure To Add Only One`,
            ephemeral: true,
        }); return;
    }else if (playerLevel && awardXP){
        await interaction.editReply({ 
            content: `You Provide Both A Level And XP Reward In The \`options\`. Please Be Sure To Add Only One`,
            ephemeral: true,
    }); return;}

    // LOADING THE XP FILE AND UPDATING THE PLAYERS XP TO BE THE APPROVED LEVEL
    let serverXpJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/xp.json`,"utf-8");
    let serverXpObj = JSON.parse(serverXpJSON);

    if (playerLevel){
        if (playerLevel > 20 || playerLevel < 1){
            await interaction.editReply({ 
                content: 'Please Chose A Number Between 1 And 20 For The `set_level`',
                ephemeral: true,
        }); return;}
        let newXP = 0;
        for (let lvl = 1; lvl < playerLevel; lvl++){ newXP += LEVELS[`${lvl}`]; }
        serverXpObj[`${player.id}-${charId}`] = newXP;
    }if(awardXP){
        serverXpObj[`${player.id}-${charId}`] += awardXP;
    }

    serverXpJSON = JSON.stringify(serverXpObj);
    fs.writeFile(`./servers/${interaction.guildId}/xp.json`, serverXpJSON, (err) => { if (err) { console.log(err); return; } });

    await interaction.editReply(`<@${player.id}> Character ${character} XP is now ${serverXpObj[`${player.id}-${charId}`]}`);
}}