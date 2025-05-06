// commands/admin.js
const fs = require('fs');
const path = require('path');
const { PermissionsBitField, MessageEmbed } = require('discord.js');

module.exports = {
  name: 'admin',
  // Usage: !nexus trigger <eventId> | !nexus reset | !nexus help
  async execute(message, args, client, memory, saveMemory) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only admins can use Weaver admin commands.");
    }
    const sub = args.shift();
    if (sub === 'trigger') {
      const eventId = args[0];
      if (!eventId) {
        return message.reply("Specify an event ID to trigger.");
      }
      // Find event definition in puzzles
      const puzzle = require(path.join(__dirname, '..', 'data', 'puzzles.json'))
                       .find(p => p.id === eventId);
      if (!puzzle) {
        return message.reply("Invalid event ID.");
      }
      // Call the triggerEvent helper from main
      const main = client; // main client holds function
      message.reply(`Triggering event **${eventId}**...`);
      // We need reference to triggerEvent defined in index.js
      // For simplicity, we simulate via sending content here
      let text = puzzle.text;
      if (puzzle.file) {
        const files = Array.isArray(puzzle.file) ? puzzle.file : [puzzle.file];
        for (const file of files) {
          const attachment = new MessageAttachment(path.join(__dirname, '..', 'data', 'assets', file));
          message.channel.send({ content: text, files: [attachment] });
        }
      } else {
        message.channel.send(text);
      }
      // Unlock if needed
      if (puzzle.unlocks) {
        puzzle.unlocks.forEach(chName => {
          const ch = message.guild.channels.cache.find(c => c.name === chName);
          if (ch) {
            ch.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: true })
              .catch(err => console.error("Unlock error:", err));
          }
        });
      }
      // Record triggered
      memory.triggered = memory.triggered || [];
      if (!memory.triggered.includes(eventId)) {
        memory.triggered.push(eventId);
        saveMemory();
      }
    }
    else if (sub === 'reset') {
      // Reset memory and relock channels
      memory.users = {};
      memory.triggered = [];
      saveMemory();
      message.reply("Game memory cleared. All players can replay from start.");
      // Optionally relock channels (assuming we know them)
      const guild = message.guild;
      ['hidden-clues', 'offline-dreams'].forEach(chName => {
        const ch = guild.channels.cache.find(c => c.name === chName);
        if (ch) {
          ch.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false })
            .catch(err => console.error("Relock error:", err));
        }
      });
    }
    else if (sub === 'help') {
      const embed = new MessageEmbed()
        .setTitle("Weaver Admin Commands")
        .setDescription("`!nexus trigger <eventId>` – force a puzzle/event\n`!nexus reset` – wipe progress and relock channels")
        .setColor('PURPLE');
      message.channel.send({ embeds: [embed] });
    }
    else {
      message.reply("Unknown admin command. Use `!nexus help`.");
    }
  }
};
