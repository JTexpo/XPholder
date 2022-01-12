const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { LEVELS, COLOUR, XPHOLDER_ICON_URL, LEVEL_UP_GIF } = require('../../config.json');
const { getPlayerLevel } = require('../../xpholder/pkg.js')
const { MessageEmbed } = require('discord.js');

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
        .setChoices([
            ["1",1],
            ["2",2],
            ["3",3]
        ])
        .setRequired(true))
    .addStringOption(option => option
        .setName("manage")
        .setDescription("The Field That You Want To Manage Of A User")
        .addChoices([
            ["Set Level","set_level"],
            ["Set XP","set_xp"],
            ["Give XP","give_xp"],
            ["Set CP","set_cp"],
            ["Give CP","give_cp"]
        ])
        .setRequired(true))
    .addIntegerOption(option => option
        .setName("value")
        .setDescription("The Value For What Is Being Managed")
        .setRequired(true))
    .addStringOption(option => option
        .setName("memo")
        .setDescription("A Small Note On Why The Reward")
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
    const manage = interaction.options.getString("manage")
    const memo = interaction.options.getString("memo");
    const value = interaction.options.getInteger("value");

    let embedDescription;
    let embedTitle;

    // DETERMINING IF A VALID CHARACTER WAS SELECTED AND NOTIFYING THE USER IF NOT
    const charId = serverConfigObj["CHARACTER_ROLES"][`CHARACTER_${character}`];
    if (!charId){
        await interaction.editReply({ 
            content: `Sorry But There Are Not ${character} Character Options In This Server`,
            ephemeral: true,
    }); return;}

    // LOADING THE XP FILE AND UPDATING THE PLAYERS XP TO BE THE APPROVED LEVEL
    let serverXpJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/xp.json`,"utf-8");
    let serverXpObj = JSON.parse(serverXpJSON);

    // LOGIC TO FIND WHAT THE NEW PLAYER XP NEEDS TO BE SET TO
    let newXP = 0;
    switch(manage){
        case "set_level":
            if (value > 20 || value < 1){
                await interaction.editReply({ 
                    content: 'Please Chose A Number Between 1 And 20 For The `set_level`',
                    ephemeral: true,
            }); return;}
            embedTitle = "Level Set!"
            embedDescription = `${interaction.user} Is Setting ${player}'s Level To **${value}**`;
            for (let lvl = 1; lvl < value; lvl++){ newXP += LEVELS[`${lvl}`]; }
            break;
        case "set_xp":
            embedTitle = "XP Set!"
            embedDescription = `${interaction.user} Is Setting ${player}'s XP To **${value}**`;
            newXP = value;
            break;
        case "give_xp":
            embedTitle = "XP Rewarded!"
            embedDescription = `${interaction.user} Is Awarding ${player} **${value} XP**`;
            newXP = serverXpObj[`${player.id}-${charId}`] + value;
            break;
        case "set_cp":
            embedTitle = "CP Set!"
            embedDescription = `${interaction.user} Is Setting ${player}'s CP To **${value}**`;
            for( let CP = value; CP > 0; CP-- ){ newXP += getLevelCP(newXP); }
            break;
        case "give_cp":
            embedTitle = "CP Rewarded!"
            embedDescription = `${interaction.user} Is Awarding ${player} **${value} CP**`;
            newXP = serverXpObj[`${player.id}-${charId}`];
            for( let CP = value; CP > 0; CP-- ){ newXP += getLevelCP(newXP); }  
            break
    }

    // SETTING THE PLAYERS LEVEL TO THAT XP
    old_level = getPlayerLevel(serverXpObj[`${player.id}-${charId}`]);
    serverXpObj[`${player.id}-${charId}`] = Math.ceil(newXP);
    new_level = getPlayerLevel(serverXpObj[`${player.id}-${charId}`]);

    let level_up = false;
    if (old_level["level"] != new_level["level"]){ level_up = true; }

    // STORING THE OBJECT BACK INTO THE SERVER JSON
    serverXpJSON = JSON.stringify(serverXpObj);
    fs.writeFile(`./servers/${interaction.guildId}/xp.json`, serverXpJSON, (err) => { if (err) { console.log(err); return; } });

    // RETURNING A MESSAGE OF CONFIRMATION
    await interaction.editReply(`<@${player.id}> Character ${character} XP is now ${serverXpObj[`${player.id}-${charId}`]}`);

    try{
    const levelUpChannel = await interaction.guild.channels.fetch(serverConfigObj["LEVEL_UP_CHANNEL"]);
    let levelUpMessage = new MessageEmbed()
            .setTitle(embedTitle)
            .setDescription(`${embedDescription}`)
            .setThumbnail(XPHOLDER_ICON_URL)
            .setColor(COLOUR);
    if (memo){ levelUpMessage.addField("memo",memo,false); }
    if (level_up) { 
        levelUpMessage.setDescription(`${embedDescription}\nCongrats, you are now lv **${new_level["level"]}**`);
        levelUpMessage.setImage(LEVEL_UP_GIF); 
    }
    if (levelUpChannel.isText()){
        levelUpChannel.send({ 
            content: `${player}`,
            embeds: [levelUpMessage] 
        });
    }} catch(err){ console.log(err); }
}}

function getLevelCP(playerXP){
    // GETTING THE PLAYER LEVEL
    const playerLevel = getPlayerLevel(playerXP);

    // LEVELS 1->4 REWARD 1/4TH FOR CP WHERE LEVEL 5+ REWARD 1/8TH
    if ( parseInt(playerLevel["level"]) < 5){
        return LEVELS[playerLevel["level"]] / 4;
    }else{ return LEVELS[playerLevel["level"]] / 8; }
}