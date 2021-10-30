const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { MessageEmbed } = require('discord.js');

module.exports = {
data: new SlashCommandBuilder()
    .setName('view_game_xp')
    .setDescription('Brief Over View Of XP Rules Set Up'),
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

    // LOADING ALL OF THE CHANNELS AND ROLES
    const channelsJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/channels.json`,"utf-8");
    const rolesJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/roles.json`,"utf-8");
    const channelsObj = JSON.parse(channelsJSON);
    const rolesObj = JSON.parse(rolesJSON);

    // CREATING THE EMBED
    let viewEmbed = new MessageEmbed()
        .setTitle(`${interaction.guild.name}'s Game Rules`)
        .setDescription(`**__Game Rules Explained__**
    Bellow is a lot of information, so to help make it less intimidating, the following layout will be explained. To define what Role and Channel mean...

**Role :** The role is the multiplier of XP that a player will get. If you are wanting a role that gives someone double XP, make sure the role shows 2!

**Channel :** The channel is what channels will reward XP and their base amount. If a channel is a category, everything under that category will be awareded that much XP, unless told otherwise. Threads are Included In This XP!

The XP formula is : 
**(channel_xp + words / 100 ) * (1 + words / 100) * role**`)
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setFooter("Don't Like What You See? Change It With /set_game_xp");
    
    // ITTERATING THROUGH ALL OF THE ROLES AND CHANNELS TO POPULATE THE EMBED
    for (const [roleId, value] of Object.entries(rolesObj)){
        viewEmbed.addField(`ID : ${roleId}`, `x${value} XP\n<@&${roleId}>`, true);
    }for (const [channelId ,value] of Object.entries(channelsObj)){
        viewEmbed.addField(`ID : ${channelId}`, `${value} XP Per Post\n<#${channelId}>`, true);
    }

    await interaction.editReply({ embeds: [viewEmbed]});
}};