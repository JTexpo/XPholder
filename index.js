// Require the necessary discord.js classes
const { Client, Collection, Intents, MessageEmbed } = require('discord.js');
const { logCommand, logError, getServerInfo, awardXP, getCharacterRole, getPlayerLevel } = require('./xpholder/pkg.js');
const { LEVEL_UP_GIF, COLOUR, TIERS } = require('./config.json');

const dotenv = require('dotenv');
dotenv.config();

// Create a new client instance
const client = new Client({ intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES
] });
client.commands = new Collection();

// LOADING ALL OF THE COMMANDS
const fs = require('fs');
const commandsPath = [
    "default",
    "owner",
    "mod"
];
for (const path  of commandsPath) {
    const commandCollection = fs.readdirSync(`./commands/${path}`).filter(file => file.endsWith('.js'));
    for(const file of commandCollection){
        const command = require(`./commands/${path}/${file}`);
        client.commands.set(command.data.name, command);
    }
}

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
    console.log(client.commands);
});

// ON A COMMAND CREATED
client.on('interactionCreate', async interaction => {
    // IF INTERACTION IS NOT A COMMAND TO RETURN
	if (!interaction.isCommand()) return;
    // IF AN INTERACTION IS NOT INSIDE OF A GUILD
    if (!interaction.inGuild()) return;
    // GRABBING THE COMMAND
	const command = client.commands.get(interaction.commandName);
    // IF NO COMMAND EXISTS OR HAS BEEN LOADED
	if (!command) return;
	try {
        // LOGGING THE COMMAND INTO THE TESTING SERVER FOR DEBUGING PURPOSES
        logCommand(interaction);
        // HOLDING THE INTERACTION FOR 15 MINUETS
        await interaction.deferReply({ ephemeral: true });
        // EXECUTING THE COMMAND
		await command.execute(interaction);
	} catch (error) {
        try{ 
            // LOGGING THE ERROR
            logError(interaction,error) 
            // REPLYING BACK TO THE USER THAT SOMETHING WENT WROTN
        }catch{};
		console.log(error);
	}
});

client.on('messageCreate', async message => {
try{
    // NOT READING BOTS
    if (message.author.bot){ return; }

    // CHECKING IF THE SERVER IS REGISTERED
    try{ await fs.promises.access(`./servers/${message.guildId}`); }catch{ return; };
    
    // DETERMINING IF A POST GIVES XP OR NOT, AND LETTING THE USER KNOW
    if ( (message.content.split(' ').length <= 10) && !message.content.startsWith('!')){ return; }
    
    let serverInfo = await getServerInfo(message);
    const characterRole = getCharacterRole(message, serverInfo);
    const playerId = `${message.author.id}-${characterRole}`;

    if ( !(playerId in serverInfo["xp"]) ){ serverInfo["xp"][playerId] = 0; }

    const preLevel = getPlayerLevel(serverInfo["xp"][playerId])["level"];

    // GRABBING / LOGGING THE XP THE PLAYER WAS AWARDED
    serverInfo = awardXP(message, serverInfo, playerId);
    const serverXpJSON = JSON.stringify(serverInfo["xp"]);
    fs.writeFile(`./servers/${message.guildId}/xp.json`,serverXpJSON, err =>{
        if (err) {console.log(err); return}}
    )

    const postLevel = getPlayerLevel(serverInfo["xp"][playerId])["level"];

    if (postLevel != preLevel){try{
        const levelUpGuild = await client.guilds.fetch(message.guildId);
        const levelUpChannel = await levelUpGuild.channels.fetch(serverInfo["config"]["LEVEL_UP_CHANNEL"]);
        const charactersJson = await fs.promises.readFile(`./servers/${message.guildId}/characters.json`,"utf-8");
        const charactersObj = JSON.parse(charactersJson);
        const charId = `${message.author.id}-${characterRole}`;
        const characterName = charactersObj[charId] ? charactersObj[charId]['name'] : `${message.member.user}`
        const characterImg = charactersObj[charId] ? charactersObj[charId]['img'] : `${message.member.displayAvatarURL()}`
        const levelUpMessage = new MessageEmbed()
            .setTitle("Level Up!")
            .setDescription(`Congrats ${characterName} you are now **lv ${postLevel}**\n\n${serverInfo["config"]["LEVEL_UP_MESSAGE"]}`)
            .setImage(LEVEL_UP_GIF)
            .setThumbnail(characterImg)
            .setColor(COLOUR)
            .setFooter("Wanna Level Up Faster? XPholder Rewards Larger Posts With More XP!");

        if (levelUpChannel.isText()){
            levelUpChannel.send({ 
                content: `${message.member.user}`,
                embeds: [levelUpMessage] 
            });
        }} catch(err){ console.log(err); }

        if(postLevel in TIERS){
            let removeRoles = [];
            let addRoles = [];
            for(const [roleName, roleId] of Object.entries(serverInfo["config"]["TIER_ROLES"])){try {
                let role = await message.guild.roles.fetch(roleId);
                if (roleName == TIERS[postLevel]){ addRoles.push( role ); }
                else{ removeRoles.push( role ); }
            } catch(err){ console.log(err); }}
            const playerMember = await message.member.roles.remove( removeRoles );
            playerMember.roles.add(addRoles);
        }
    }
}catch(err){console.log(err);};
});
// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);