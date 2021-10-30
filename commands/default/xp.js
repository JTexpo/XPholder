const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js');

const fs = require('fs');

const { getPlayerLevel } = require('../../xpholder/pkg.js');
const { COLOUR } = require('../../config.json');

module.exports = {
data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Shows XP Of All Characters')
    .addUserOption(option=>option
        .setName("player")
        .setDescription("Player Who's XP You Want To See")
        .setRequired(false))
        ,
async execute(interaction) {
    // GRABBING THE SERVER INFO / EXITING OUT IF NOT REGISTERED
    let serverInfo
    try{
        const xpJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/xp.json`,'utf-8');
        const configJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/config.json`,'utf-8');
        const roleJSON  = await fs.promises.readFile(`./servers/${interaction.guildId}/roles.json`,'utf-8');
        serverInfo = {
            "xp": JSON.parse(xpJSON),
            "config": JSON.parse(configJSON),
            "roles": JSON.parse(roleJSON)
        };

    }catch{
        await interaction.editReply({ 
            content: `Looks Like This Server Isn't Registered. Please Contact <@${interaction.guild.ownerId}>, And Ask Them To Do \`/register\`!`,
            ephemeral: true,
    }); return;}

    // DETERMINING WHO'S XP IS BEING LOOKED AT
    let player = interaction.options.getUser("player");
    if (!player){ player = interaction.user; }
    player = await interaction.guild.members.fetch(player.id);

    // GRABBING A LIST OF ALL OF THE XP AND ROLES
    let characterList = [];
    for( const [key, id] of Object.entries(serverInfo["config"]["CHARACTER_ROLES"]) ){
        const xpId = `${player.id}-${id}`;
        if (xpId in serverInfo["xp"]){ characterList.push( { "xp" : serverInfo["xp"][xpId], "role" : id , "xpId": xpId } ); }
        else{ characterList.push( { "xp" : 0, "role" : id, "xpId": xpId } ); }
    }

    // DETERMINING HOW MUCH THE USER GETS PER POST
    let roleBoost = 1;
    for (const role_id of player._roles){
        if ( !(role_id in serverInfo["roles"]) ){ continue; }
        else if (serverInfo["roles"][role_id] > roleBoost){ roleBoost = serverInfo["roles"][role_id];}
        else if (serverInfo["roles"][role_id] == 0){ roleBoost = 0; }
    }

    // CREATING ALL OF THE EMBEDS
    let characterEmbeds = [];
    for (let index = 0; index < characterList.length; index ++){
        characterEmbeds.push( await buildCharacterEmbed(interaction, player, characterList, index, roleBoost, serverInfo) );
    }

    // SETTING THE ROW DEPENDING ON IF THE PLAYER IS LOOKING AT THEMSELVES OR SOMEONE ELSE
    let row;
    if (player.id == interaction.user.id){
        row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('previous')
                    .setLabel('<')
                    .setStyle('SECONDARY'),
                new MessageButton()
                    .setCustomId('next')
                    .setLabel('>')
                    .setStyle('SECONDARY'),
                new MessageButton()
                    .setCustomId('set')
                    .setLabel('Set')
                    .setStyle("SUCCESS"),
                new MessageButton()
                    .setCustomId("freeze")
                    .setLabel("Toggle Freeze")
                    .setStyle("PRIMARY"),
                new MessageButton()
                    .setCustomId("retire")
                    .setLabel("Retire")
                    .setStyle("DANGER")
                    );
    }else{
        row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('previous')
                    .setLabel('<')
                    .setStyle('SECONDARY'),
                new MessageButton()
                    .setCustomId('next')
                    .setLabel('>')
                    .setStyle('SECONDARY')
                    );
    }
    
    // REPLYING BACK TO THE MESSAGE
    const replyMessage = await interaction.editReply({ embeds: [characterEmbeds[0]], components: [row] });

    // CREATING THE EVENTS TO BE LISTENED TO
    createButtonEvents(interaction, replyMessage, player,  characterEmbeds, characterList, serverInfo);
}}

async function buildCharacterEmbed(interaction, player, characterList, index, roleBoost, serverInfo){
    const playerLevel = getPlayerLevel(characterList[index]["xp"]);
    const intLevel = parseInt(playerLevel["level"]);
    let progressionName;
    let progressionRole;
    if (intLevel < 5){ 
        progressionName = "Next Tier Role";
        progressionRole = await interaction.guild.roles.fetch(serverInfo["config"]["TIER_ROLES"]["TIER_2"]);
    }else if (intLevel < 11){ 
        progressionName = "Next Tier Role";
        progressionRole = await interaction.guild.roles.fetch(serverInfo["config"]["TIER_ROLES"]["TIER_3"]);
    }else if (intLevel < 17){ 
        progressionName = "Next Tier Role";
        progressionRole = await interaction.guild.roles.fetch(serverInfo["config"]["TIER_ROLES"]["TIER_4"]);
    }else{
        progressionName = "Current Tier Role";
        progressionRole = await interaction.guild.roles.fetch(serverInfo["config"]["TIER_ROLES"]["TIER_4"]);
    }

    let progress_message = "```|";
    const progress = playerLevel["xp"] / playerLevel["nextLevelXp"];
    for (let i = 0; i < Math.round(progress * 15); i++){ progress_message += "█"; }
    for (let i = 0; i < Math.round((1 - progress) * 15); i++){ progress_message += "-"; }
    progress_message += `| ${Math.round(progress * 100)}% Complete\`\`\``

    return new MessageEmbed()
        .setTitle(`${player.displayName}'s Character ${index+1}`)
        .setThumbnail(player.displayAvatarURL())
        .setFooter("Wanna Level Up Faster? XPholder Rewards Larger Posts With More XP!")
        .setColor(COLOUR)
        .setFields(
            {inline: true, name: "Level", value: `${playerLevel["level"]}`},
            {inline: true, name: "Current XP", value: `${playerLevel["xp"]}`},
            {inline: true, name: "Next Level XP", value: `${playerLevel["nextLevelXp"]}`},
            {inline: true, name: "Role Boost", value: `${roleBoost}`},
            {inline: true, name: `${progressionName}`, value: `<@&${progressionRole.id}>`},
            {inline: false, name: `Progress`, value: `${progress_message}`}
            );
}

async function createButtonEvents(interaction, replyMessage, player,  characterEmbeds, characterList, serverInfo){
    // DEFAULT STARTING PAGE TO 0
    let index = 0;
    // READING COMMANDS THAT ARE ONLY OF BUTTON INTERACTION AND APART OF THE MESSAGE
    const filter = btnInteraction => (
        ['previous','next','set','freeze','retire'].includes(btnInteraction.customId) &&
        replyMessage.id == btnInteraction.message.id
    );
    // SETTING THE COLLECTOR TO A 1 MINUET WINDOW
    const collectorChannel = interaction.channel;
    if (!collectorChannel){ return; }
    const collector = collectorChannel.createMessageComponentCollector({ filter, time: 60000 });

    // WHEN RECIEVING THE MESSAGE
    collector.on('collect', async btnInteraction => {
        switch (btnInteraction.customId){
            // IF PREVIOUS DECREMENT THE COUNTER UNLESS THE INDEX IS OUT OF VIEW
            case "previous":
                index -= 1;
                if (index < 0){ index = 0; }
                break;
            // IF NEX INCREMENT THE COUNTER UNLESS THE INDEX IS OUT OF VIEW
            case "next":
                index += 1;
                if (index >= characterEmbeds.length){ index = characterEmbeds.length - 1;}      
                break;
            // IF SET, MODIFY THE PLAYERS ROLES TO THE ACTIVE CHARACTER SELECTED
            case "set":
                // CREATING A LIST OF ROLES TO ADD OR REMOVE
                let addRoles = [];
                let removeRoles = [];

                // GRABBING ALL OF THE ROLES FOR THE CHARACTER AND PLACING THEM IN EITHER ADD OR REMOVE
                for(let charIndex = 0; charIndex < characterList.length; charIndex++){
                    const role = await player.guild.roles.fetch(characterList[charIndex]["role"]);
                    if (charIndex == index){ addRoles.push(role); }
                    else{ removeRoles.push(role); }
                }

                // GRABBING THE SELECTED CHARACTERS TIER
                let tier;
                const playerLevel = getPlayerLevel(characterList[index]["xp"]);
                const intLevel = parseInt(playerLevel["level"]);
                if (intLevel < 5){ tier = "TIER_1";
                }else if (intLevel < 11){ tier = "TIER_2";
                }else if (intLevel < 17){ tier = "TIER_3";
                }else{ tier = "TIER_4"; }
                // GRABBING ALL OF THE ROLES FOR THE CHARACTER AND PLACING THEM IN EITHER ADD OR REMOVE
                for ( const [tierName, id] of Object.entries(serverInfo["config"]["TIER_ROLES"]) ){
                    const role = await player.guild.roles.fetch(id);
                    if (tierName == tier){ addRoles.push(role); }
                    else{ removeRoles.push(role); }
                }

                // AWAITING ONE PROMISE TO REMOVE AND USING THE RETUREN TO ADD, THIS IS BECAUSE 2 COMMANDS THIS CLOSE WILL LEAD TO ONE NOT BEING DONE
                const playerMember = await player.roles.remove(removeRoles);
                playerMember.roles.add(addRoles);                
                break;
            // IF FREEZE, TOGGLE THE FREEZE (REMOVE IF HAVE, GAIN IF NOT)
            case "freeze":
                const freezeRole = await player.guild.roles.fetch(serverInfo["config"]["XP_FREEZE_ROLE"]);
                if (player._roles.includes(serverInfo["config"]["XP_FREEZE_ROLE"])){
                    player.roles.remove(freezeRole);
                }else{ player.roles.add(freezeRole); }
                break;
            // IF RETIRE SET CHARACTER XP TO 0 AND REMOVE TIER ROLES
            case "retire":
                // LOADING THE JSON AND SETTING THE CURRECT SELECTED CHARACTER'S XP TO 0
                let xpJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/xp.json`,'utf-8');
                let xpObj = JSON.parse(xpJSON);
                xpObj[characterList[index]["xpId"]] = 0;
                xpJSON = JSON.stringify(xpObj)
                fs.writeFile(`./servers/${interaction.guildId}/xp.json`, xpJSON, (err) => { if (err) {console.log(err); return} });
                
                // PAGES DON'T UPDATE, SO THE CHARACTER IS REMOVED FROM THE EMBED LIST
                await btnInteraction.update({
                        embeds:[], components: [], content: `Retired Character ${index +1}`
                });

                // REMOVING THE ROLES OF TIERS FROM THE PLAYER
                let removeTiers = [];
                for (const [role, id] of Object.entries(serverInfo["config"]["TIER_ROLES"])){
                    const role = await player.guild.roles.fetch(id);
                    removeTiers.push(role);
                } player.roles.remove(removeTiers);
                return;
        }
        // ALWAYS UPDATING THE INTERACCTION THAT WAY DISCORD DOESN'T THIINK THAT THE COMMAND FAILED
        await btnInteraction.update({
            embeds:[ characterEmbeds[index] ]
        });
    });
}