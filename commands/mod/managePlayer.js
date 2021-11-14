const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { LEVELS } = require('../../config.json');
const { getPlayerLevel } = require('../../xpholder/pkg.js')

module.exports = {
data: new SlashCommandBuilder()
    .setName('manage_player')
    .setDescription('[Mods Only] Edit Database Information On The Player')
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
            .setName("set_xp")
            .setDescription("The Amount Of XP To Set The Player To")
            .setRequired(false))
    .addIntegerOption(option => option
        .setName("give_xp")
        .setDescription("The Amount Of XP To Give The Player (Can Be Negative)")
        .setRequired(false))
    .addIntegerOption(option => option
        .setName("set_cp")
        .setDescription("The Adventure League CP To Set The Player To")
        .setRequired(false))
    .addIntegerOption(option => option
        .setName("give_cp")
        .setDescription("The Adventure League CP To Give The Player")
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
    const playerXP = interaction.options.getInteger("set_xp");
    const awardXP = interaction.options.getInteger("give_xp");
    const playerCP = interaction.options.getInteger("set_cp");
    const awardCP = interaction.options.getInteger("give_cp");

    // DETERMINING IF A VALID CHARACTER WAS SELECTED AND NOTIFYING THE USER IF NOT
    const charId = serverConfigObj["CHARACTER_ROLES"][`CHARACTER_${character}`];
    if (!charId){
        await interaction.editReply({ 
            content: `Sorry But There Are Not ${character} Character Options In This Server`,
            ephemeral: true,
    }); return;}

    // CHECKING TO MAKE SURE THAT WE HAVE ONLY ONE OF THE FOUR OPTIONS
    if ( ( (playerLevel? 1:0) + (awardXP? 1:0) + (playerCP? 1:0) + (awardCP? 1:0) + (playerXP? 1:0) ) > 1){
        await interaction.editReply({ 
            content: "You Provided Too Many Options, Please Only Chose One From : `set_level` `set_xp` `give_xp` `set_cp` `give_xp`",
            ephemeral: true
        }); return;
    }else if ( ( (playerLevel? 1:0) + (awardXP? 1:0) + (playerCP? 1:0) + (awardCP? 1:0) + (playerXP? 1:0) ) == 0){
        await interaction.editReply({ 
            content: "You Did Not Provide An Option, Please Only Chose One From : `set_level` `set_xp` `give_xp` `set_cp` `give_xp`",
            ephemeral: true
        }); return;
    }

    // LOADING THE XP FILE AND UPDATING THE PLAYERS XP TO BE THE APPROVED LEVEL
    let serverXpJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/xp.json`,"utf-8");
    let serverXpObj = JSON.parse(serverXpJSON);

    // LOGIC TO FIND WHAT THE NEW PLAYER XP NEEDS TO BE SET TO
    let newXP = 0;
    if (playerLevel){
        if (playerLevel > 20 || playerLevel < 1){
            await interaction.editReply({ 
                content: 'Please Chose A Number Between 1 And 20 For The `set_level`',
                ephemeral: true,
        }); return;}
        for (let lvl = 1; lvl < playerLevel; lvl++){ newXP += LEVELS[`${lvl}`]; }
    // SETTING THE PLAYERS XP TO THE INPUT XP
    }else if(playerXP){ newXP = playerXP;
    // ADDING THE NEW XP TO THE EXISTING XP
    }else if(awardXP){ newXP = serverXpObj[`${player.id}-${charId}`] + awardXP;
    // FOR LOOP TO BUILD THE NEW CP
    }else if(playerCP){ for( let CP = playerCP; CP > 0; CP-- ){ newXP += getLevelCP(newXP); }
    // GRABBING THE PLAYERS LEVEL AND THEN USING THE SAME FOR LOOP FOR SETTING THE CP
    }else if(awardCP){
        newXP = serverXpObj[`${player.id}-${charId}`];
        for( let CP = awardCP; CP > 0; CP-- ){ newXP += getLevelCP(newXP); }  
    }
    // SETTING THE PLAYERS LEVEL TO THAT XP
    serverXpObj[`${player.id}-${charId}`] = Math.floor(newXP);

    // STORING THE OBJECT BACK INTO THE SERVER JSON
    serverXpJSON = JSON.stringify(serverXpObj);
    fs.writeFile(`./servers/${interaction.guildId}/xp.json`, serverXpJSON, (err) => { if (err) { console.log(err); return; } });

    // RETURNING A MESSAGE OF CONFIRMATION
    await interaction.editReply(`<@${player.id}> Character ${character} XP is now ${serverXpObj[`${player.id}-${charId}`]}`);
}}

function getLevelCP(playerXP){
    // GETTING THE PLAYER LEVEL
    const playerLevel = getPlayerLevel(playerXP);

    // LEVELS 1->4 REWARD 1/4TH FOR CP WHERE LEVEL 5+ REWARD 1/8TH
    if ( parseInt(playerLevel["level"]) < 5){
        return LEVELS[playerLevel["level"]] / 4;
    }else{ return LEVELS[playerLevel["level"]] / 8; }
}