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
    let serverConfigObj;
    let serverRolesObj;
    let serverXpObj;
    let serverCharactersObj;
    try{
        const serverXpJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/xp.json`,'utf-8');
        serverXpObj = JSON.parse(serverXpJSON);
        const serverConfigJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/config.json`,'utf-8');
        serverConfigObj = JSON.parse(serverConfigJSON);
        const serverRolesJSON  = await fs.promises.readFile(`./servers/${interaction.guildId}/roles.json`,'utf-8');
        serverRolesObj = JSON.parse(serverRolesJSON);
        const serverCharactersJSON  = await fs.promises.readFile(`./servers/${interaction.guildId}/characters.json`,'utf-8');
        serverCharactersObj = JSON.parse(serverCharactersJSON);
    }catch (err){
        console.log(err)
        await interaction.editReply({ 
            content: `Looks Like This Server Isn't Registered. Please Contact <@${interaction.guild.ownerId}>, And Ask Them To Do \`/register\`!`,
            ephemeral: true,
    }); return;}

    // DETERMINING WHO'S XP IS BEING LOOKED AT
    let player = interaction.options.getUser("player");
    if (!player){ player = interaction.user; }
    player = await interaction.guild.members.fetch(player.id);

    // DETERMINING HOW MUCH THE USER GETS PER POST
    let roleBoost = 1;
    for (const role_id of player._roles){
        if ( !(role_id in serverRolesObj) ){ continue; }
        else if (serverRolesObj[role_id] > roleBoost){ roleBoost = serverRolesObj[role_id];}
        else if (serverRolesObj[role_id] == 0){ roleBoost = 0; break; }
    }

    // GRABBING A LIST OF ALL OF THE XP AND ROLES
    let characterList = [];
    for( const [key, id] of Object.entries(serverConfigObj["CHARACTER_ROLES"]) ){
        const characterId = `${player.id}-${id}`;
        let characterInfo;
        if (characterId in serverXpObj){ characterInfo = { "xp" : serverXpObj[characterId], "role" : id , "xpId": characterId, "roleBoost": roleBoost }; }
        else{ characterInfo = { "xp" : 0, "role" : id, "xpId": characterId, "roleBoost": roleBoost }; }
        if (characterId in serverCharactersObj){
            characterInfo['name'] = serverCharactersObj[characterId]['name'];
            characterInfo['sheet'] = serverCharactersObj[characterId]['sheet'];
            characterInfo['img'] = serverCharactersObj[characterId]['img'];
        }else{
            characterInfo['name'] = `${player.displayName}'s Character ${key[key.length - 1]}`;
            characterInfo['sheet'] = "";
            characterInfo['img'] = player.displayAvatarURL();
        }
        characterList.push(characterInfo);
    }

    // CREATING ALL OF THE EMBEDS
    let characterEmbeds = [];
    for (let index = 0; index < characterList.length; index ++){
        characterEmbeds.push( await buildCharacterEmbed(interaction, player, characterList, index, serverConfigObj) );
    }

    // SETTING THE ROW DEPENDING ON IF THE PLAYER IS LOOKING AT THEMSELVES OR SOMEONE ELSE
    let row;
    if (player.id == interaction.user.id){
        row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('xp_previous')
                    .setLabel('<')
                    .setStyle('SECONDARY'),
                new MessageButton()
                    .setCustomId('xp_next')
                    .setLabel('>')
                    .setStyle('SECONDARY'),
                new MessageButton()
                    .setCustomId('xp_set')
                    .setLabel('Set')
                    .setStyle("SUCCESS"),
                new MessageButton()
                    .setCustomId("xp_freeze")
                    .setLabel("Toggle Freeze")
                    .setStyle("PRIMARY"),
                new MessageButton()
                    .setCustomId("xp_retire")
                    .setLabel("Retire")
                    .setStyle("DANGER")
                    );
    }else{
        row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('xp_previous')
                    .setLabel('<')
                    .setStyle('SECONDARY'),
                new MessageButton()
                    .setCustomId('xp_next')
                    .setLabel('>')
                    .setStyle('SECONDARY')
                    );
    }
    const activeCharacter = getCharacterRoleIndex(interaction, serverConfigObj)

    // REPLYING BACK TO THE MESSAGE
    const replyMessage = await interaction.editReply({ embeds: [characterEmbeds[activeCharacter]], components: [row] });

    // CREATING THE EVENTS TO BE LISTENED TO
    createButtonEvents(interaction, replyMessage, player,  characterEmbeds, characterList, serverConfigObj, activeCharacter);
}}

async function buildCharacterEmbed(interaction, player, characterList, index, serverConfigObj){
    const playerLevel = getPlayerLevel(characterList[index]["xp"]);
    const intLevel = parseInt(playerLevel["level"]);
    let progressionName = "Next Tier Role";
    let progressionRole;
    if (intLevel < 5){  progressionRole = await interaction.guild.roles.fetch(serverConfigObj["TIER_ROLES"]["TIER_2"]);
    }else if (intLevel < 11){  progressionRole = await interaction.guild.roles.fetch(serverConfigObj["TIER_ROLES"]["TIER_3"]);
    }else if (intLevel < 17){  progressionRole = await interaction.guild.roles.fetch(serverConfigObj["TIER_ROLES"]["TIER_4"]);
    }else{
        progressionName = "Current Tier Role";
        progressionRole = await interaction.guild.roles.fetch(serverConfigObj["TIER_ROLES"]["TIER_4"]);
    }

    let progress_message = "```|";
    const progress = playerLevel["xp"] / playerLevel["nextLevelXp"];
    for (let i = 0; i < Math.round(progress * 15); i++){ progress_message += "█"; }
    for (let i = 0; i < Math.round((1 - progress) * 15); i++){ progress_message += "-"; }
    progress_message += `| ${Math.round(progress * 100)}% Complete\`\`\``

    return new MessageEmbed()
        .setTitle(`${characterList[index]["name"]}`)
        .setThumbnail(`${characterList[index]["img"]}`)
        .setURL(`${characterList[index]["sheet"]}`)
        .setFooter(`XPholder Rewards Larger Posts With More XP! Page (${index + 1}/${characterList.length})`)
        .setColor(COLOUR)
        .setFields(
            {inline: true, name: "Level", value: `${playerLevel["level"]}`},
            {inline: true, name: "Current XP", value: `${playerLevel["xp"]}`},
            {inline: true, name: "Next Level XP", value: `${playerLevel["nextLevelXp"]}`},
            {inline: true, name: "Role Boost", value: `${characterList[index]["roleBoost"]}`},
            {inline: true, name: `${progressionName}`, value: `<@&${progressionRole.id}>`},
            {inline: false, name: `Progress`, value: `${progress_message}`}
            );
}

async function createButtonEvents(interaction, replyMessage, player,  characterEmbeds, characterList, serverConfigObj, activeCharacter){
    // DEFAULT STARTING PAGE TO 0
    let index = activeCharacter;
    // READING COMMANDS THAT ARE ONLY OF BUTTON INTERACTION AND APART OF THE MESSAGE
    const filter = btnInteraction => (
        ['xp_previous','xp_next','xp_set','xp_freeze','xp_retire'].includes(btnInteraction.customId) &&
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
            case "xp_previous":
                index -= 1;
                if (index < 0){ index = 0; }
                break;
            // IF NEX INCREMENT THE COUNTER UNLESS THE INDEX IS OUT OF VIEW
            case "xp_next":
                index += 1;
                if (index >= characterEmbeds.length){ index = characterEmbeds.length - 1;}      
                break;
            // IF SET, MODIFY THE PLAYERS ROLES TO THE ACTIVE CHARACTER SELECTED
            case "xp_set":
                // CREATING A LIST OF ROLES TO ADD OR REMOVE
                let addRoles = [];
                let removeRoles = [];

                // GRABBING ALL OF THE ROLES FOR THE CHARACTER AND PLACING THEM IN EITHER ADD OR REMOVE
                for(let charIndex = 0; charIndex < characterList.length; charIndex++){
                    const role = await player.guild.roles.fetch(characterList[charIndex]["role"]);
                    if (!role){ continue; }
                    else if (charIndex == index){ addRoles.push(role); }
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
                for ( const [tierName, id] of Object.entries(serverConfigObj["TIER_ROLES"]) ){
                    const role = await player.guild.roles.fetch(id);
                    if (!role){ continue; }
                    else if (tierName == tier){ addRoles.push(role); }
                    else{ removeRoles.push(role); }
                }

                // AWAITING ONE PROMISE TO REMOVE AND USING THE RETUREN TO ADD, THIS IS BECAUSE 2 COMMANDS THIS CLOSE WILL LEAD TO ONE NOT BEING DONE
                const playerMember = await player.roles.remove(removeRoles);
                playerMember.roles.add(addRoles);                
                break;
            // IF FREEZE, TOGGLE THE FREEZE (REMOVE IF HAVE, GAIN IF NOT)
            case "xp_freeze":
                const freezeRole = await player.guild.roles.fetch(serverConfigObj["XP_FREEZE_ROLE"]);
                if (!freezeRole){ break; }
                if (player._roles.includes(serverConfigObj["XP_FREEZE_ROLE"])){
                    player.roles.remove(freezeRole);
                }else{ player.roles.add(freezeRole); }
                break;
            // IF RETIRE SET CHARACTER XP TO 0 AND REMOVE TIER ROLES
            case "xp_retire":
                // LOADING THE JSON AND SETTING THE CURRECT SELECTED CHARACTER'S XP TO 0
                let xpJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/xp.json`,'utf-8');
                let xpObj = JSON.parse(xpJSON);
                let charactersJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/characters.json`,'utf-8');
                let charactersObj = JSON.parse(charactersJSON);
                delete charactersObj[characterList[index]["xpId"]];
                xpObj[characterList[index]["xpId"]] = 0;
                xpJSON = JSON.stringify(xpObj);
                fs.writeFile(`./servers/${interaction.guildId}/xp.json`, xpJSON, (err) => { if (err) {console.log(err); return} });
                charactersJSON = JSON.stringify(charactersObj);
                fs.writeFile(`./servers/${interaction.guildId}/characters.json`, charactersJSON, (err) => { if (err) {console.log(err); return} });
                
                // PAGES DON'T UPDATE, SO THE CHARACTER IS REMOVED FROM THE EMBED LIST
                await btnInteraction.update({
                        embeds:[], components: [], content: `Retired Character ${index +1}`
                });

                // REMOVING THE ROLES OF TIERS FROM THE PLAYER
                let removeTiers = [];
                for (const [roleName, id] of Object.entries(serverConfigObj["TIER_ROLES"])){
                    const role = await player.guild.roles.fetch(id);
                    if (!role){ continue; }
                    removeTiers.push(role);
                } player.roles.remove(removeTiers);
                return;
        }
        // ALWAYS UPDATING THE INTERACCTION THAT WAY DISCORD DOESN'T THIINK THAT THE COMMAND FAILED
        try{
        await btnInteraction.update({
            embeds:[ characterEmbeds[index] ]
        });} catch(err){
            console.log(err);
            await btnInteraction.update({
                embeds:[], components: [], content: `[ERROR] ${err}`
        }); return;}
    });
}

function getCharacterRoleIndex(interaction, serverConfigObj){
    let index = 0;
    // GETTING THE CHARACTER ROLES AND AUTHOR ROLES
    const authorRoles = interaction.member._roles;
    // SEARCHING THROUGH THE ROLES, AND IF ONE IS FOUND THAN WE REASIGN ROLE TO THAT. ELSE DEFAULT TO CHARACTER_1
    for( const [roleName, roleId] of Object.entries(serverConfigObj["CHARACTER_ROLES"]) ){
        if ( authorRoles.indexOf(roleId) != -1 ){
            return index;
        }index++
    }

    // RETURNING THE STRING FOR USE IN CODE
    return 0;
}