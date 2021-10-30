const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');

module.exports = {
data: new SlashCommandBuilder()
    .setName('set_game_xp')
    .setDescription('Numbers 0+ Will Add To Database, All Negatives Will Delete Entity')
    .addIntegerOption(option => option
        .setName("amount")
        .setDescription("Amount Of XP Per Post OR Modifier For Role")
        .setRequired(true))
    .addChannelOption(option => option
        .setName("channel")
        .setDescription("Channel (And Child Channels) To Give XP")
        .setRequired(false))
    .addRoleOption(option => option
        .setName("role")
        .setDescription("Role XP Bonus Multiplier (All Channels)")
        .setRequired(false))
        ,
async execute(interaction) {
    // RESTRICTING THE COMMAND FOR ONLY THOSE WHO ARE THE MODS OF THE SERVER
    try{ 
        const serverConfigJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/config.json`,"utf-8");
        const serverConfigObj = JSON.parse(serverConfigJSON);  
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

    // GRABBING ALL OPTIONS
    const xpAmount = interaction.options.getInteger("amount");
    const xpChannel = interaction.options.getChannel("channel");
    const xpRole = interaction.options.getRole("role");

    // CHECKING TO MAKE SURE THAT WE HAVE EITHER A CHANNEL OR ROLE
    if (!xpChannel && !xpRole){
        await interaction.editReply({ 
            content: `You Did Not Provide A Role Or Channel In The \`options\`. Please Be Sure To Add Only One`,
            ephemeral: true,
        }); return;
    }else if (xpChannel && xpRole){
        await interaction.editReply({ 
            content: `You Provide Both A Role And Channel In The \`options\`. Please Be Sure To Add Only One`,
            ephemeral: true,
    }); return;}

    // IF A CHANNEL IS PROVIDED
    if (xpChannel){
        fs.readFile(`./servers/${interaction.guildId}/channels.json`, (err, channelsJSON)=>{
            if (err) { console.log(err); return; }

            // TURNING THE JSON INTO AN OBJECT
            let channelsObj = JSON.parse(channelsJSON);

            // IF THE AMOUNT IS 0 OR GREATER TO ADD INTO THE DATABASE, ELSE DELETE
            if (xpAmount >= 0){
                channelsObj[xpChannel.id] = xpAmount;
            }else{ delete channelsObj[xpChannel.id] }
            
            // CHANING THE OBJECT BACK INTO A JSON
            const updatedChannelsJSON = JSON.stringify(channelsObj,{},1);

            // WRITTING THE CHANGES
            fs.writeFile(`./servers/${interaction.guildId}/channels.json`,updatedChannelsJSON,err =>{
                if (err) {console.log(err); return}}
            );
        });
    // IF A ROLE IS PROVIDED
    }if (xpRole){
        fs.readFile(`./servers/${interaction.guildId}/roles.json`, (err, rolesJSON)=>{
            if (err) { console.log(err); return; }

            // TURNING THE JSON INTO AN OBJECT
            let rolesObj = JSON.parse(rolesJSON);

            // IF THE AMOUNT IS 0 OR GREATER TO ADD INTO THE DATABASE, ELSE DELETE
            if (xpAmount >= 0){
                rolesObj[xpRole.id] = xpAmount;
            }else{ delete rolesObj[xpRole.id]}

            // CHANING THE OBJECT BACK INTO A JSON
            const updatedRolesJSON = JSON.stringify(rolesObj,{},1);

            // WRITTING THE CHANGES
            fs.writeFile(`./servers/${interaction.guildId}/roles.json`,updatedRolesJSON,err =>{
                if (err) {console.log(err); return}}
            );
        });
    }

    interaction.editReply("Success! Please Feel Free To Check If Done Properly With `/view_game_xp`");
}};
