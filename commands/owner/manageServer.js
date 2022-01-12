const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');

module.exports = {
data: new SlashCommandBuilder()
    .setName('manage_server')
    .setDescription('[Owner Only] Edit The Info You Registered The Server With')
    .addRoleOption(option => option
        .setName("mod_role")
        .setDescription("Role Of The Moderators Of The Server")
        .setRequired(false))
    .addRoleOption(option => option
        .setName("tier_1")
        .setDescription("The New Role For All Tier 1 Players")
        .setRequired(false))
    .addRoleOption(option => option
        .setName("tier_2")
        .setDescription("The New Role For All Tier 2 Players")
        .setRequired(false))
    .addRoleOption(option => option
        .setName("tier_3")
        .setDescription("The New Role For All Tier 3 Players")
        .setRequired(false))
    .addRoleOption(option => option
        .setName("tier_4")
        .setDescription("The New Role For All Tier 4 Players")
        .setRequired(false))
    .addRoleOption(option => option
        .setName("xp_freeze")
        .setDescription("The New Role For XP Freeze")
        .setRequired(false))
    .addChannelOption(option => option
        .setName("level_up_channel")
        .setDescription("The New Channel To Announce Player Level Ups")
        .setRequired(false))
    .addStringOption(option => option
        .setName("level_up_message")
        .setDescription("The New Message That A Player Will See On Level Up")
        .setRequired(false))
    .addIntegerOption(option => option
        .setName("approve_level")
        .setDescription("The New Default Level To Approve People To")
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
        .setRequired(false))
    .addStringOption(option => option
        .setName("approve_message")
        .setDescription("The New Message That The Approve Command Will Send")
        .setRequired(false))
    .addIntegerOption(option => option
            .setName("character_count")
            .setDescription("The New Max Characters Per One Player")
            .setChoices([
                ["1",1],
                ["2",2],
                ["3",3]
            ])
            .setRequired(false))
        ,
async execute(interaction) {
    // RESTRICTING THE COMMAND TO ONLY THE OWNER FOR OBVIOUS REASONS
    if (interaction.user.id != interaction.guild.ownerId){
        await interaction.editReply({ 
            content: 'Only The Owner Of The Server Is Allowed To Use This Command',
            ephemeral: true,
        }); return;
    }
    // LOADING INFORMATION ON THE SERVER TO MAKE SURE THAT IT IS REGISTERED
    let serverConfigJSON;
    let serverConfigObj;
    let rolesJSON;
    let rolesObj;
    let xpJSON;
    let xpObj;
    let charactersJSON;
    let charactersObj;
    try{ 
        serverConfigJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/config.json`,"utf-8");
        serverConfigObj = JSON.parse(serverConfigJSON);  
        rolesJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/roles.json`,"utf-8");
        rolesObj = JSON.parse(rolesJSON);  
        xpJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/xp.json`,"utf-8");
        xpObj = JSON.parse(xpJSON);  
        charactersJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/characters.json`,"utf-8");
        charactersObj = JSON.parse(charactersJSON);
    }catch{
        await interaction.editReply({ 
            content: "Looks Like This Server Isn't Registered. Please Do `/register` first!",
            ephemeral: true,
    }); return;}

    // GRABBING ALL OPTIONS
    const modRole = interaction.options.getRole("mod_role");
    const tier1 = interaction.options.getRole("tier_1");
    const tier2 = interaction.options.getRole("tier_2");
    const tier3 = interaction.options.getRole("tier_3");
    const tier4 = interaction.options.getRole("tier_4");
    const xpFreeze = interaction.options.getRole("xp_freeze");
    const approveLevel = interaction.options.getInteger("approve_level");
    const approveMessage = interaction.options.getString("approve_message");
    const levelUpChannel = interaction.options.getChannel("level_up_channel");
    const levelUpMessage = interaction.options.getString("level_up_message");
    const charCount = interaction.options.getInteger("character_count");


    // IF THE INPUT EXISTS TO POPULATE THE SERVER CONFIG WITH IT
    if (charCount){
        if (charCount > 3 || charCount < 1){
            await interaction.editReply({ 
                content: '[ERROR : INVALID NUMBER] Please Chose A Number Between 1 And 3 For The `character_count`',
                ephemeral: true,
            }); return;
        }
        // CREATING NEW CHARACTER ROLES
        let characterRoles = {};
        for(let index = 1; index <= charCount; index++){
            const role = await interaction.guild.roles.create({ name: `Character ${index}` });
            characterRoles[`CHARACTER_${index}`] = role.id;
        }

        let newXpObj = {};
        for (let [playerId, xp] of Object.entries(xpObj)){
            const playerInfo = playerId.split("-");
            for (const [roleName, roleId] of Object.entries(serverConfigObj["CHARACTER_ROLES"])){
                if (roleId == playerInfo[1]){
                    newXpObj[`${playerInfo[0]}-${characterRoles[roleName]}`] = xp;
                }
            }
        }

        let newCharactersObj = {};
        for (let [playerId, characterInfo] of Object.entries(charactersObj)){
            const playerInfo = playerId.split("-");
            for (const [roleName, roleId] of Object.entries(serverConfigObj["CHARACTER_ROLES"])){
                if (roleId == playerInfo[1]){
                    newCharactersObj[`${playerInfo[0]}-${characterRoles[roleName]}`] = characterInfo;
                }
            }
        }

        // TURNING OBJECT BACK INTO JSON
        xpJSON = JSON.stringify(newXpObj);
        charactersJSON = JSON.stringify(newCharactersObj);
        // WRITING INFORMATION TO THE XP JSON FILE
        fs.writeFile(`./servers/${interaction.guildId}/xp.json`,xpJSON, err =>{
            if (err) {console.log(err); return}}
        );
        fs.writeFile(`./servers/${interaction.guildId}/characters.json`,charactersJSON, err =>{
            if (err) {console.log(err); return}}
        );
        serverConfigObj["CHARACTER_ROLES"] = characterRoles
    }
    if (modRole){ serverConfigObj["MOD_ROLE"] = modRole.id; }
    if (tier1){ serverConfigObj["TIER_ROLES"]["TIER_1"] = tier1.id; }
    if (tier2){ serverConfigObj["TIER_ROLES"]["TIER_2"] = tier2.id; }
    if (tier3){ serverConfigObj["TIER_ROLES"]["TIER_3"] = tier3.id; }
    if (tier4){ serverConfigObj["TIER_ROLES"]["TIER_4"] = tier4.id; }
    if (levelUpChannel){ serverConfigObj["LEVEL_UP_CHANNEL"] = levelUpChannel.id; }
    if (levelUpMessage){ serverConfigObj["LEVEL_UP_MESSAGE"] = levelUpMessage; }
    if (approveMessage){ serverConfigObj["APPROVE_MESSAGE"] = approveMessage; }
    if (approveLevel){ serverConfigObj["APPROVE_LEVEL"] = approveLevel; }
    if (xpFreeze){ 
        serverConfigObj["XP_FREEZE_ROLE"] = xpFreeze.id; 
        rolesObj[xpFreeze.id] = 0;
        // TURNING OBJECT BACK INTO JSON
        rolesJSON = JSON.stringify(rolesObj);
        // WRITING INFORMATION TO THE ROLES JSON FILE
        fs.writeFile(`./servers/${interaction.guildId}/roles.json`,rolesJSON, err =>{
            if (err) {console.log(err); return}}
        );
    }

    // TURNING OBJECT BACK INTO JSON
    serverConfigJSON = JSON.stringify(serverConfigObj);
    
    // WRITING INFORMATION TO THE CONFIF JSON FILE
    fs.writeFile(`./servers/${interaction.guildId}/config.json`,serverConfigJSON, err =>{
        if (err) {console.log(err); return}}
    );

    
    
    await interaction.editReply('SUCCESS!');
}};