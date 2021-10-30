const { TESTING_SERVER_ID, LOGING_CHANNEL_ID, COLOUR, ERROR_COLOUR, LEVELS } = require("../config.json");
const { MessageEmbed } = require('discord.js');
const fs = require('fs');


async function logCommand(interaction){
    // CREATING THE LOG EMBED
    const logEmbed = new MessageEmbed()
        .setTitle("Command Was Used")
        .addFields(
            {inline: false, name: "Guild", value: `${interaction.guild.name}`},
            {inline: false, name: "Author", value: `${interaction.user.username}`},
            {inline: false, name: "Command", value: `${interaction.commandName}`},
            )
        .setTimestamp()
        .setColor(COLOUR)
        .setThumbnail(`${interaction.client.user.avatarURL()}`)
    // ADDING FIELDS FOR EACH OF THE OPTIONS PASSED THROUGH
    for(const option of interaction.options._hoistedOptions){
        logEmbed.addField(
            `${option["name"]}`,
            `${option["value"]}`,
            true
        )
    }

    // FETCHING THE TESTING SERVER AND LOG CHANNEL
    const testingServer = await interaction.client.guilds.fetch(TESTING_SERVER_ID);
    const loggingChannel = await testingServer.channels.fetch(LOGING_CHANNEL_ID);

    // SENDING LOG EMBED
    loggingChannel.send({
        embeds: [logEmbed]
    });
}

async function logError(interaction, error){
    // CREATING THE LOG ERROR EMBED
    const logErrorEmbed = new MessageEmbed()
        .setTitle("An Error Has Occured")
        .setDescription(`${error}`)
        .addFields(
            {inline: false, name: "Guild", value: `${interaction.guild.name}`},
            {inline: false, name: "Author", value: `${interaction.user.username}`},
            {inline: false, name: "Command", value: `${interaction.commandName}`},
            )
        .setTimestamp()
        .setColor(ERROR_COLOUR)
        .setThumbnail(`${interaction.client.user.avatarURL()}`)
    // ADDING FIELDS FOR EACH OF THE OPTIONS PASSED THROUGH
    for(const option of interaction.options._hoistedOptions){
        logErrorEmbed.addField(
            `${option["name"]}`,
            `${option["value"]}`,
            true
        )
    }

    // FETCHING THE TESTING SERVER AND LOG CHANNEL
    const testingServer = await interaction.client.guilds.fetch(TESTING_SERVER_ID);
    const loggingChannel = await testingServer.channels.fetch(LOGING_CHANNEL_ID);

    // REPORTING THE ERROR
    loggingChannel.send({
        embeds: [logErrorEmbed]
    });
}

async function getServerInfo(message){
    // BASE INFO FROM THE SERVER THAT WE NEED
    let serverInfo = {
        "channels" : {},
        "xp" : {},
        "roles" : {},
        "config": {}
    }

    // READING THROUGH ALL OF THE FILES IN THE SERVER FOLDER TO POPULATE THE SERVER INFO OBJECT
    try{
        for (const info in serverInfo ){
            const infoJSON = await fs.promises.readFile(`./servers/${message.guildId}/${info}.json`,"utf-8");
            serverInfo[info] = JSON.parse(infoJSON);
        }
    }catch(err){ console.log(err); }

    // SHRINKING DATA SLIGHTLY SO WERE NOT PASSING AROUND LARGE OBJECTS
    delete serverInfo["config"]["APPROVE_MESSAGE"];
    delete serverInfo["config"]["APPROVE_LEVEL"];
    delete serverInfo["config"]["MOD_ROLE"];

    // RETURNING THE OBJECT FOR USE IN CODE
    return serverInfo;
}

function getCharacterRole(message, serverInfo){
    // GETTING THE CHARACTER ROLES AND AUTHOR ROLES
    let role = serverInfo["config"]["CHARACTER_ROLES"]["CHARACTER_1"];
    const authorRoles = message.member._roles;
    // SEARCHING THROUGH THE ROLES, AND IF ONE IS FOUND THAN WE REASIGN ROLE TO THAT. ELSE DEFAULT TO CHARACTER_1
    for( const [roleName, roleId] of Object.entries(serverInfo["config"]["CHARACTER_ROLES"]) ){
        if ( authorRoles.indexOf(roleId) != -1 ){
            role = roleId;
            break;
        }
    }

    // RETURNING THE STRING FOR USE IN CODE
    return role;
}

function getPlayerLevel(totalXP){
    for (const lvl in LEVELS){
        totalXP -= LEVELS[lvl];
        if (totalXP < 0){
            totalXP += LEVELS[lvl];
            return {"level": lvl, "xp": totalXP, "nextLevelXp": LEVELS[lvl]};
        }
    }
    return {"level": "20", "xp": totalXP, "nextLevelXp": totalXP};
}

function awardXP(message, serverInfo, playerId){
    // HELPFUL INITS
    let channel = message.channel
    let roleBoost = 1;
    const wordMod = Math.floor( (message.content.split(' ').length) / 100 );

    // DETERMINING HOW MUCH THE USER GETS PER POST
    for (const role_id of message.member._roles){
        if ( !(role_id in serverInfo["roles"]) ){ continue; }
        else if (serverInfo["roles"][role_id] > roleBoost){ roleBoost = serverInfo["roles"][role_id];}
        else if (serverInfo["roles"][role_id] == 0){ roleBoost = 0; }
    }

    // LOOKING AT THE CHANNEL, AND IF THE CHANNEL IS NOT IN THE DATABASE THAN TO LOOK AT THE CATEGORY (THREADS WILL LOOK IN THREAD, THAN CHANNEL, THAN CATEGORY)
    while (channel){
        if ( channel.id in serverInfo["channels"] ){
            serverInfo["xp"][playerId] += ( serverInfo["channels"][channel.id] + wordMod ) * ( 1 + wordMod ) * roleBoost;
            break;
        }channel = message.guild.channels.cache.get(channel.parentId);
    }

    // RETURNING THE OBJECT FOR USE IN CODE
    return serverInfo;
}

module.exports = { logCommand, logError, getServerInfo, awardXP, getCharacterRole, getPlayerLevel }