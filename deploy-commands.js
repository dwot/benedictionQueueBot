const { REST, SlashCommandBuilder, Routes } = require('discord.js');
const { clientId, token } = require('./config.json');

const commands = [
    new SlashCommandBuilder().setName('queue').setDescription('Replies with latest queue info from multidollar.company.'),
]
    .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

rest.put(Routes.applicationCommands(clientId), { body: commands })
    .then((data) => console.log(`Successfully registered ${data.length} application commands.`))
    .catch(console.error);