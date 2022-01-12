const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { MessageEmbed } = require('discord.js');
const { COLOUR, XPHOLDER_ICON_URL, DEV_SERVER_URL } = require('../../config.json');

module.exports = {
data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('[Owner Only] Registers Server Into XPholder Database')
    .addRoleOption(option => option
        .setName("mod_role")
        .setDescription("Role Of The Moderators Of The Server")
        .setRequired(true))
    .addIntegerOption(option => option
        .setName("character_count")
        .setDescription("Must Be Between 1 and 3! The Amount Of Alternate Characters The Bot Will Support")
        .setChoices([
            ["1",1],
            ["2",2],
            ["3",3]
        ])
        .setRequired(true))
    .addChannelOption(option => option
        .setName("level_up_channel")
        .setDescription("The Channel To Announce Player Level Ups")
        .setRequired(true))
    .addStringOption(option => option
        .setName("level_up_message")
        .setDescription("The Message That A Player Will See On Level Up")
        .setRequired(true))
    .addIntegerOption(option => option
        .setName("approve_level")
        .setDescription("The Default Level To Approve People To")
        .setChoices([
            ["1",1],
            ["2",2],
            ["3",3],
            ["4",4],
            ["5",5],
            ["6",6],
            ["7",7],
            ["8",8],
            ["9",9],
            ["10",10],
            ["11",11],
            ["12",12],
            ["13",13],
            ["14",14],
            ["15",15],
            ["16",16],
            ["17",17],
            ["18",18],
            ["19",19],
            ["20",20]
        ])
        .setRequired(true))
    .addStringOption(option => option
        .setName("approve_message")
        .setDescription("The Message That The Approve Command Will Send")
        .setRequired(true))
        ,
async execute(interaction) {
    // RESTRICTING THE COMMAND TO ONLY THE OWNER FOR OBVIOUS REASONS
    if (interaction.user.id != interaction.guild.ownerId){
        await interaction.editReply({ 
            content: 'Only The Owner Of The Server Is Allowed To Use This Command',
            ephemeral: true,
        }); return;
    }

    // GRABBING ALL OPTIONS
    const charCount = interaction.options.getInteger("character_count");
    const modRole = interaction.options.getRole("mod_role");
    const approveLevel = interaction.options.getInteger("approve_level");
    const approveMessage = interaction.options.getString("approve_message");
    const levelUpChannel = interaction.options.getChannel("level_up_channel");
    const levelUpMessage = interaction.options.getString("level_up_message");
    

    // VALIDATING CHARACTER COUNT
    if (charCount > 3 || charCount < 1){
        await interaction.editReply({ 
            content: '[ERROR : INVALID NUMBER] Please Chose A Number Between 1 And 3 For The `character_count`',
            ephemeral: true,
        }); return;
    }

    if (approveLevel > 20 || approveLevel < 1){
        await interaction.editReply({ 
            content: '[ERROR : INVALID NUMBER] Please Chose A Number Between 1 And 20 For The `approve_level`',
            ephemeral: true,
        }); return;
    }

    // CREATING A FOLDER AND FILE FOR THE NEW GUILD
    fs.mkdirSync(`./servers/${interaction.guildId}/`, { recursive: true })
    const esentialFiles = ["xp","channels","characters"]
    for (const file of esentialFiles ){
        fs.writeFile(`./servers/${interaction.guildId}/${file}.json`,'{}', err =>{
            if (err) {console.log(err); return}}
        )
    }
    // CREATING THE ROLES FOR THE TIERS
    let tierRoles = {};
    tierRoles["TIER_4"] = await interaction.guild.roles.create({ name: "Tier 4", color: [120, 81, 169], hoist: true, mentionable: true })
    tierRoles["TIER_3"] = await interaction.guild.roles.create({ name: "Tier 3", color: [255, 215, 0], hoist: true, mentionable: true })
    tierRoles["TIER_2"] = await interaction.guild.roles.create({ name: "Tier 2", color: [192, 192, 192], hoist: true, mentionable: true })
    tierRoles["TIER_1"] = await interaction.guild.roles.create({ name: "Tier 1", color: [176, 141, 87], hoist: true, mentionable: true })

    // CREATING THE XP FREEZE ROLE
    const xpFreezeRole = await interaction.guild.roles.create({ name: "❄️XP Freeze ❄️", color: [223, 247, 250], hoist: true, mentionable: true })

    // CREATING CHARACTER ROLES FOR MULTIPLE CHARACTERS
    let characterRoles = {};
    for(let index = 1; index <= charCount; index++){
        characterRoles[`CHARACTER_${index}`] = await interaction.guild.roles.create({ name: `Character ${index}` })
    }

    // BUILDING THE OBJECT OF ALL THE IMPORTANT INFORMATION ON THE SERVER
    let configObject = {
        "XP_FREEZE_ROLE": xpFreezeRole.id,
        "MOD_ROLE": modRole.id,
        "APPROVE_LEVEL": approveLevel,
        "APPROVE_MESSAGE": approveMessage,
        "TIER_ROLES": {},
        "CHARACTER_ROLES":{},
        "LEVEL_UP_CHANNEL": levelUpChannel.id,
        "LEVEL_UP_MESSAGE": levelUpMessage
    };
    for (const [name, role] of Object.entries(tierRoles)){ configObject["TIER_ROLES"][name] = role.id; }
    for (const [name, role] of Object.entries(characterRoles)){ configObject["CHARACTER_ROLES"][name] = role.id; }

    // STRINGFYING THE JSON TO STORE IN A TXT FILE
    const configJSON = JSON.stringify(configObject,{},2);

    // WRITING INFORMATION TO THE APPROPERATE JSON FILE
    fs.writeFile(`./servers/${interaction.guildId}/config.json`,configJSON, err =>{
        if (err) {console.log(err); return}}
    )

    fs.writeFile(`./servers/${interaction.guildId}/roles.json`,`{"${xpFreezeRole.id}":0}`, err =>{
        if (err) {console.log(err); return}}
    )
    
    const embed = new MessageEmbed()
        .setTitle("Server Registered! [Click To Join Dev Server]")
        .setDescription(`Welcome to the XPholder community, we are happy to expand our service to other servers!

**Levels :** XPholder uses the Dungeon and Dragons system of leveling. That means that the xp required per level is the following
\`\`\`
Level Progression : XP Needed
-----------------------------
level 1 -> 2      : 300
level 2 -> 3      : 600
level 3 -> 4      : 1800
level 4 -> 5      : 3800
level 5 -> 6      : 7500
level 6 -> 7      : 9000
level 7 -> 8      : 11000
level 8 -> 9      : 14000
level 9 -> 10     : 16000
level 10 -> 11    : 21000
level 11 -> 12    : 15000
level 12 -> 13    : 20000
level 13 -> 14    : 20000
level 14 -> 15    : 25000
level 15 -> 16    : 30000
level 16 -> 17    : 30000
level 17 -> 18    : 40000
level 18 -> 19    : 40000
level 19 -> 20    : 50000
\`\`\`
**XP :** If you are a play by post (PBP) server, or wish to reward xp per post, please use the \`/set_game_xp\` to set channels a base amount of xp to award per post. The formula for xp is the following :
**(channel_xp + words / 100 ) * (1 + words / 100) * role**

**CP :** If you are an adventure league (AL) server, or wish to award check points (CP), please use the \`/manage_player\` command to reward and set CP. CP will be converted into XP that way even play by post servers can use this awesome check point system of progression!
`)
        .setColor(COLOUR)
        .setThumbnail(XPHOLDER_ICON_URL)
        .setURL(DEV_SERVER_URL);

    await interaction.editReply({embeds: [embed]});
}};

