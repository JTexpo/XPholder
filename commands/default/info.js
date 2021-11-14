const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { COLOUR, XPHOLDER_ICON_URL, DEV_SERVER_URL } = require('../../config.json');

module.exports = {
data: new SlashCommandBuilder()
	.setName('info')
	.setDescription('Brief Rundown Of The Bot'),
async execute(interaction) {
	const embed = new MessageEmbed()
        .setTitle("XPholder Info! [Click To Join Dev Server]")
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
