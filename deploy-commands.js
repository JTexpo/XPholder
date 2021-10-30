const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');

const dotenv = require('dotenv');
dotenv.config();

const {CLIENT_ID, TESTING_SERVER_ID} = require("./config.json");


const commands = [];
let commandsPath = [
    "default",
    "owner",
	"mod"
];
let commandCollection = [];

for (const path  of commandsPath) {
    commandCollection = fs.readdirSync(`./commands/${path}`).filter(file => file.endsWith('.js'));
    for(const file of commandCollection){
        const command = require(`./commands/${path}/${file}`);
        console.log(command);
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(
			//Routes.applicationGuildCommands(CLIENT_ID, TESTING_SERVER_ID),
			Routes.applicationCommands(CLIENT_ID),
			{ body: commands },
		);

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.log(error);
	}
})();