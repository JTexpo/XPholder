const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js');
const { COLOUR } = require('../../config.json');

module.exports = {
data: new SlashCommandBuilder()
    .setName('view_game_xp')
    .setDescription('[Mods Only] Brief Over View Of XP Rules Set Up'),
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
    let channelsJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/channels.json`,"utf-8");
    let rolesJSON = await fs.promises.readFile(`./servers/${interaction.guildId}/roles.json`,"utf-8");
    let channelsObj = JSON.parse(channelsJSON);
    let rolesObj = JSON.parse(rolesJSON);
    
    // ITTERATING THROUGH ALL OF THE ROLES AND CHANNELS TO POPULATE THE EMBED
    let embedFields = [];
    for (const [roleId, value] of Object.entries(rolesObj)){ try{ 
        const role = await interaction.guild.roles.fetch(roleId); 
        if (!role){ delete rolesObj[roleId]; }
        else{ embedFields.push({"name": `ID : ${roleId}`, "value": `**x${value}** XP\n<@&${roleId}>`, "inline": true}); }
    }catch { delete rolesObj[roleId]; } }
    
    for (const [channelId ,value] of Object.entries(channelsObj)){ try { 
        const channel = await interaction.guild.channels.fetch(channelId); 
        embedFields.push({"name": `ID : ${channelId}`, "value": `**${value}** XP Per Post\n<#${channelId}>`, "inline": true});
    }catch { delete channelsObj[channelId]; } }

    // UPDATING ALL OF THE ROLES / CHANNELS FOR THE ONES THAT WERE DELETED
    rolesJSON = JSON.stringify(rolesObj);
    channelsJSON = JSON.stringify(channelsObj);
    fs.writeFile(`./servers/${interaction.guildId}/roles.json`,rolesJSON, err =>{ if (err) {console.log(err); return}} );
    fs.writeFile(`./servers/${interaction.guildId}/channels.json`,channelsJSON, err =>{ if (err) {console.log(err); return}} );

    let viewEmbeds = [];
    for (let index = 0; index < Math.ceil(embedFields.length / 20); index++){
        viewEmbeds.push( createEmbed( interaction, embedFields.slice( index * 20 , ( index + 1 ) * 20 ) ) )
    }

    row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('vgr_previous')
                .setLabel('<')
                .setStyle('SECONDARY'),
            new MessageButton()
                .setCustomId('vgr_next')
                .setLabel('>')
                .setStyle('SECONDARY')
                );
    
    // REPLYING BACK TO THE MESSAGE
    const replyMessage = await interaction.editReply({ embeds: [viewEmbeds[0]], components: [row] });

     // CREATING THE EVENTS TO BE LISTENED TO
     createButtonEvents(interaction, replyMessage, viewEmbeds);
}};

function createEmbed(interaction, fields){
    let embed = new MessageEmbed()
    .setTitle(`${interaction.guild.name}'s Game Rules`)
    .setDescription(`**__Game Rules Explained__**
Bellow is a lot of information, so to help make it less intimidating, the following layout will be explained. To define what Role and Channel mean...

**Role :** The role is the multiplier of XP that a player will get. If you are wanting a role that gives someone double XP, make sure the role shows 2!

**Channel :** The channel is what channels will reward XP and their base amount. If a channel is a category, everything under that category will be awareded that much XP, unless told otherwise. Threads are Included In This XP!

The XP formula is : 
**(channel_xp + words / 100 ) * (1 + words / 100) * role**`)
    .setThumbnail(interaction.client.user.displayAvatarURL())
    .setFooter({text:"Don't Like What You See? Change It With /set_game_xp"})
    .setColor(COLOUR);
    for (const field of fields){ embed.addField(field["name"],field["value"],field["inline"]); }
    return embed;
}

async function createButtonEvents(interaction, replyMessage, viewEmbeds){
    // DEFAULT STARTING PAGE TO 0
    let index = 0;
    // READING COMMANDS THAT ARE ONLY OF BUTTON INTERACTION AND APART OF THE MESSAGE
    const filter = btnInteraction => (
        ['vgr_previous','vgr_next'].includes(btnInteraction.customId) &&
        replyMessage.id == btnInteraction.message.id
    );
    // SETTING THE COLLECTOR TO A 1 MINUET WINDOW
    const collectorChannel = interaction.channel;
    if (!collectorChannel){ return; }
    const collector = collectorChannel.createMessageComponentCollector({ filter, time: 60000 });

    // WHEN RECIEVING THE MESSAGE
    collector.on('collect', async btnInteraction => {
        try{
        switch (btnInteraction.customId){
            // IF PREVIOUS DECREMENT THE COUNTER UNLESS THE INDEX IS OUT OF VIEW
            case "vgr_previous":
                index -= 1;
                if (index < 0){ index = 0; }
                break;
            // IF NEX INCREMENT THE COUNTER UNLESS THE INDEX IS OUT OF VIEW
            case "vgr_next":
                index += 1;
                if (index >= viewEmbeds.length){ index = viewEmbeds.length - 1;}      
                break;
        }
        // ALWAYS UPDATING THE INTERACCTION THAT WAY DISCORD DOESN'T THIINK THAT THE COMMAND FAILED
        await btnInteraction.update({
            embeds:[ viewEmbeds[index] ]
        });
    }catch{}
    });
   
}