const { EmbedBuilder } = require('discord.js');

const { XPHOLDER_COLOUR, XPHOLDER_ICON_URL, DEV_SERVER_URL, XPHOLDER_RETIRE_COLOUR, TESTING_SERVER_ID, LOGING_CHANNEL_ID, ERROR_CHANNEL_ID } = require("./config.json");

/*
------
AWARDS
------
*/
function awardCPs(startingXp, cp, levels) {
    for (; cp > 0; cp--) {
        startingXp += awardCP(startingXp, levels)
    }
    return startingXp;
}

function awardCP(xp, levels) {
    const levelInfo = getLevelInfo(levels, xp);

    if (parseInt(levelInfo["level"]) < 4) {
        return levelInfo["xpToNext"] / 4
    }
    return levelInfo["xpToNext"] / 8
}

/*
-------
MAPPERS
-------
*/
function mergeListOfObjects(listOfObjects){
    let myObject= {}
    for (const listObject of listOfObjects){
        for(const [myKey, myValue] of Object.entries(listObject)){
            myObject[myKey] = myValue
        }
    }
    return myObject;
}
function chunkArray(myArray, chunkSize) {
    let chukedArray = [];
    let index = 0;
    for (; index + chunkSize <= myArray.length; index += chunkSize) {
        chukedArray.push(myArray.slice(index, index + chunkSize));
    }
    if (myArray.length % chunkSize) { chukedArray.push(myArray.slice(index, myArray.length)); }
    return chukedArray;
}
function splitObjectToList(myObject) {
    let myArray = []
    for (const [myKey, myValue] of Object.entries(myObject)) {
        let subObject = {}
        subObject[myKey] = myValue;
        myArray.push(subObject);
}
return myArray;
}

function listOfObjsToObj(listOfObjs, key, value) {
    /*
    Parameters
    ----------
    listOfObjs : list of objects
    [
        {key : "key" , value : "value"},
        {key : "key2", value : "value2"},
        {key : "key3", value : "value3"},
    ]

    key   : string
    value : string

    Returns
    -------
    masterObj : object
    {
        "key"  : "value",
        "key2" : "value2",
        "key3" : "value3"
    }
    */
    let masterObj = {}
    for (const myObj of listOfObjs) { masterObj[myObj[key]] = myObj[value]; }
    return masterObj;
}

/*
-------
GETTERS
-------
*/
function getActiveCharacterIndex(serverConfig, userRoles) {
    /*
    Parameters
    ----------
    serverConfig : object
    {
        levelUpMessage: 'string',
        levelUpChannelId: '0',
        moderationRoleId: '0',
        approveLevel: '10',
        approveMessage: 'string',
        roleBonus: 'highest',
        xpPerPostFormula: 'exponential',
        xpPerPostDivisor: '100',
        characterCount: '10',
        tier4RoleId: '0',
        tier3RoleId: '0',
        tier2RoleId: '0',
        tier1RoleId: '0',
        xpFreezeRoleId: '0',
        character1RoleId: '0',
        character2RoleId: '0',
        character3RoleId: '0',
        character4RoleId: '0',
        character5RoleId: '0',
        character6RoleId: '0',
        character7RoleId: '0',
        character8RoleId: '0',
        character9RoleId: '0',
        character10RoleId: '0'
    }

    userRoles : list of strings
    [
        "0",
        ...
    ]

    Returns
    -------
    activeCharacterIndex : number
    deafult - 1
    */
    for (let characterId = 1; characterId <= serverConfig["characterCount"]; characterId++) {
        if (userRoles.includes(serverConfig[`character${characterId}RoleId`])) {
            return characterId;
        }
    }

    return 1;
}

function getLevelInfo(levelObj, xp) {
    /*
    Parameters
    ----------
    levelObj : object
    {
        "1" : 300, ( xp needed to level up )
        "2" : 600
    }

    xp : number

    Returns
    -------
    object : 
    {
        "level" : "stringLevel",
        "levelXp" : 0,
        "xpToNext" : 0
    }
    */
    for (const [lvl, xpToNext] of Object.entries(levelObj)) {
        // subtract the lower level xp
        xp -= xpToNext;
        // if the xp went into the negatives, than that means, this is the level the player is on
        if (xp < 0) {
            // adding back the xp and returning the object
            xp += xpToNext;
            return { "level": lvl, "levelXp": xp, "xpToNext": xpToNext }
        }
    }
    // if all the levels were itterated, and the player still has left over xp. Than they are max xp
    return { "level": "20", "levelXp": xp, "xpToNext": xp }
}

function getRoleMultiplier(roleBonus, collectionOfGuildRoles, listOfPlayerRoles) {
    /*
    Parameters
    ----------
    roleBonus : string
        "highest"
        "sum"
    
    collectionOfGuildRoles : object 
    {
        "roleId"  : 1, ( role bonus )
        "roleId2" : 2,
    }

    listOfPlayerRoles : list of strings
    [
        "roleId",
        "roleId2"
    ]

    Returns
    -------
    roleMultiplier : number
    */
    let roleMultiplier = 1;
    switch (roleBonus) {
        case "highest":
            for (const roleId of listOfPlayerRoles) {
                // if the players role is not in the object of role bonus, skip
                if (!(roleId in collectionOfGuildRoles)) { continue; }
                // if the player does have a role that is in the collection, and the role is greater than the current role, set the current role to that
                if (collectionOfGuildRoles[roleId] > roleMultiplier) { roleMultiplier = collectionOfGuildRoles[roleId]; }
                // if the player has the xp freeze role, or any other role with 0 xp bonus, to set the role and return
                else if (collectionOfGuildRoles[roleId] == 0) { roleMultiplier = 0; break; }
            }
            break;
        case "sum":
            for (const roleId of listOfPlayerRoles) {
                // if the players role is not in the object of role bonus, skip
                if (!(roleId in collectionOfGuildRoles)) { continue; }
                // if the player has the xp freeze role, or any other role with 0 xp bonus, to set the role and return
                if (collectionOfGuildRoles[roleId] == 0) { roleMultiplier = 0; break; }
                // append the role to the roles
                roleMultiplier += collectionOfGuildRoles[roleId];
            }
            break;
    }
    return roleMultiplier;
}

function getTier(level) {
    /*
    Parameters
    ----------
    level : number

    Returns
    -------
    object :
    {
        "tier"     : 0, (current tier)
        "nextTier" : 1
    }
    */
    // WotC rules for which levels are in which tier
    if (level <= 4) { return { "tier": 1, "nextTier": 2 }; }
    else if (level <= 10) { return { "tier": 2, "nextTier": 3 }; }
    else if (level <= 17) { return { "tier": 3, "nextTier": 4 }; }
    return { "tier": 4, "nextTier": 4 };
}

function getXp(wordCount, roleBonus, channelXpPerPost, xpPerPostDivisor, xpPerPostFormula) {
    switch (xpPerPostFormula) {
        case "exponential":
            return (channelXpPerPost + wordCount / xpPerPostDivisor) * (1 + wordCount / xpPerPostDivisor) * roleBonus;
        case "flat":
            return channelXpPerPost * roleBonus;
        case "linear":
            return (channelXpPerPost + wordCount / xpPerPostDivisor) * roleBonus;
    }
    return 0;
}

/*
------------------------
BUILDING CHARACTER EMBED
------------------------
*/
function buildCharacterEmbed(guildService, player, characterObj) {
    /*
    Parameters
    ----------
    guildService : object
        /services/guild.js

    player : object
        GuildMember - https://discord.js.org/#/docs/discord.js/main/class/GuildMember

    characterObj : object
    {
        "character_id"   : player_id-character_index
        "character_index": 0 -> 10
        "name"           : "My Character"
        "sheet_url"      : "https://www.dndbeyond.com"
        "picture_url"    : "picture url"
        "player_id"      : "881210880887513139"
        "xp"             : 0
    }

    Returns
    -------
    characterEmbed : obj
        https://discord.js.org/#/docs/builders/main/class/EmbedBuilder
    */
    // { "level" : STRING, "levelXp" : NUMBER, "xpToNext" : NUMBER }
    const levelInfo = getLevelInfo(guildService.levels, characterObj["xp"]);

    const progress = getProgressionBar(levelInfo["levelXp"], levelInfo["xpToNext"]);
    let tierInfo = getTier(parseInt(levelInfo["level"]));

    const roleBonus = getRoleMultiplier(guildService.config["roleBonus"], guildService.roles, player._roles)

    let characterEmbed = new EmbedBuilder()
        .setTitle(characterObj["name"])
        .setThumbnail((characterObj["picture_url"] != "" && characterObj["picture_url"] !== "null")? characterObj["picture_url"] : XPHOLDER_ICON_URL )
        .setFields(
            { inline: true, name: "Level", value: `${levelInfo["level"]}` },
            { inline: true, name: "Role Boost", value: `${roleBonus}` },
            { inline: true, name: "Current Tier", value: `<@&${guildService.config[`tier${tierInfo["tier"]}RoleId`]}>` },

            { inline: true, name: "Total Character XP", value: `${Math.floor(characterObj["xp"])}` },
            { inline: true, name: "Current Level XP", value: `${Math.floor(levelInfo["levelXp"])}` },
            { inline: true, name: "Next Level XP", value: `${Math.floor(levelInfo["xpToNext"])}` },

            { inline: false, name: `Progress`, value: `${progress}` }
        )
        .setFooter({ text: `Dont Like What You See? Try /edit_character (${characterObj["character_index"]}/${guildService.config["characterCount"]})` })
        .setColor(XPHOLDER_COLOUR);

    if (characterObj["sheet_url"] != "") {
        characterEmbed.setURL(characterObj["sheet_url"]);
    }
    return characterEmbed;
}

function getProgressionBar(xp, xpToNext) {
    /*
    Parameters
    ----------
    xp : number
    0

    xpToNext : number
    0

    Returns
    -------
    progressMessage : string
    |█████----------| 33% Complete
    */
    let progressMessage = "```|";
    const progress = xp / xpToNext;

    for (let i = 0; i < Math.round(progress * 15); i++) { progressMessage += "█"; }
    for (let i = 0; i < Math.round((1 - progress) * 15); i++) { progressMessage += "-"; }
    progressMessage += `| ${Math.round(progress * 100)}% Complete\`\`\``

    return progressMessage;
}

/*
-------
LOGGING
-------
*/
async function logCommand(interaction){
    // CREATING THE LOG EMBED
    const logEmbed = new EmbedBuilder()
        .setTitle("Command Was Used")
        .setFields(
            {inline: false, name: "Guild", value: `${interaction.guild.name}`},
            {inline: false, name: "Guild Id", value: `${interaction.guild.id}`},
            {inline: false, name: "Author", value: `${interaction.user.username}`},
            {inline: false, name: "Author Id", value: `${interaction.user.id}`},
            {inline: false, name: "Command", value: `${interaction.commandName}`},
            )
        .setTimestamp()
        .setColor(XPHOLDER_COLOUR)
        .setThumbnail(`${interaction.client.user.avatarURL()}`)
    // ADDING FIELDS FOR EACH OF THE OPTIONS PASSED THROUGH
    for(const option of interaction.options._hoistedOptions){
        logEmbed.addFields(
            {inline: true, name: `${option["name"]}`, value: `${option["value"]}`},
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
    const logErrorEmbed = new EmbedBuilder()
        .setTitle("An Error Has Occured")
        .setDescription(`${error}`)
        .setFields(
            {inline: false, name: "Guild", value: `${interaction.guild.name}`},
            {inline: false, name: "Guild Id", value: `${interaction.guild.id}`},
            {inline: false, name: "Author", value: `${interaction.user.username}`},
            {inline: false, name: "Author Id", value: `${interaction.user.id}`},
            {inline: false, name: "Command", value: `${interaction.commandName}`},
            )
        .setTimestamp()
        .setColor(XPHOLDER_RETIRE_COLOUR)
        .setThumbnail(`${interaction.client.user.avatarURL()}`)
    // ADDING FIELDS FOR EACH OF THE OPTIONS PASSED THROUGH
    for(const option of interaction.options._hoistedOptions){
        logErrorEmbed.addFields(
            {inline: true, name: `${option["name"]}`, value: `${option["value"]}`},
        )
    }

    // FETCHING THE TESTING SERVER AND LOG CHANNEL
    const testingServer = await interaction.client.guilds.fetch(TESTING_SERVER_ID);
    const loggingChannel = await testingServer.channels.fetch(ERROR_CHANNEL_ID);

    // REPORTING THE ERROR
    loggingChannel.send({
        embeds: [logErrorEmbed]
    });
}

/*
--------
SECURITY
--------
*/

function sqlInjectionCheck(myString) {
    return (
        myString.includes("`") ||
        myString.includes("'") ||
        myString.includes('"') ||
        myString.includes(';') ||
        myString.includes(',') ||
        myString.toLowerCase().includes("drop") ||
        myString.toLowerCase().includes("delete") ||
        myString.toLowerCase().includes("remove") ||
        myString.toLowerCase().includes("update") ||
        myString.toLowerCase().includes("create") ||
        myString.toLowerCase().includes("insert")
    )
}

module.exports = {
    awardCPs,
    getActiveCharacterIndex,
    getLevelInfo,
    getRoleMultiplier,
    getTier,
    getXp,
    buildCharacterEmbed,
    getProgressionBar,
    sqlInjectionCheck,
    splitObjectToList,
    chunkArray,
    mergeListOfObjects,
    logCommand,
    logError,
    listOfObjsToObj
}