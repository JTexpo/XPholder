const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { MessageEmbed } = require('discord.js');
const { LEVELS } = require('../../config.json');

module.exports = {
data: new SlashCommandBuilder()
    .setName('approve')
    .setDescription('Approves A Player To The Server')
    .addUserOption(option => option
        .setName("player")
        .setDescription("The Player To Be Approved")
        .setRequired(true))
    .addIntegerOption(option => option
        .setName("character")
        .setDescription("Which Character They Are Approving")
        .setRequired(true))
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

    // GRABING THE CHARACTER AND THE PLAYER FROM THE INPUT
    const character = interaction.options.getInteger("character");
    const player = interaction.options.getUser("player");

    // DETERMINING IF A VALID CHARACTER WAS SELECTED AND NOTIFYING THE USER IF NOT
    const charId = serverConfigObj["CHARACTER_ROLES"][`CHARACTER_${character}`];
    if (!charId){
        await interaction.editReply({ 
            content: `Sorry But There Are Not ${character} Character Options In This Server`,
            ephemeral: true,
    }); return;}

    // SETTING THE STARTING XP OF THE PLAYER
    let startingXP = 0;
    for (let lvl = 1; lvl < serverConfigObj["APPROVE_LEVEL"]; lvl++){ startingXP += LEVELS[`${lvl}`]; }

    // LOADING THE XP FILE AND UPDATING THE PLAYERS XP TO BE THE APPROVED LEVEL
    let serverXpJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/xp.json`,"utf-8");
    let serverXpObj = JSON.parse(serverXpJSON);
    serverXpObj[`${player.id}-${charId}`] = startingXP;
    serverXpJSON = JSON.stringify(serverXpObj);
    fs.writeFile(`./servers/${interaction.guildId}/xp.json`, serverXpJSON, (err) => { if (err) { console.log(err); return; } });

    // CREATING THE MESSAGE TO NOTIFY THE PLAYER WITH
    const embed = new MessageEmbed()
        .setTitle(`Welcome To ${interaction.guild.name}`)
        .setDescription(`${serverConfigObj["APPROVE_MESSAGE"]}`)
        .setImage(interaction.guild.bannerURL());
    
    // DMING THE PLAYER THAT THEY HAVE BEEN APPROVED
    await player.send({ embeds : [embed] });

    // CONFIRMATION MESSAGE
    await interaction.editReply({ content: `<@${player.id}> Has Been Successfully Notified!`, ephemeral: false });
}}