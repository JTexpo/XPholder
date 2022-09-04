const fs = require('fs');
const sqlite3 = require("sqlite3");
const { guildService } = require("../../xpholder/services/guild");
const { sqlLite3DatabaseService } = require("../../xpholder/database/sqlite");



let migrateGuildId = [
    "902947334198026263",
];

(async () => {
    for (const guildId of migrateGuildId) {
        let guildDataCollection = fs.readdirSync(`./legacyData/${guildId}`).filter(file => file.endsWith('.json'));
        let gService = new guildService(
            new sqlLite3DatabaseService(sqlite3, `./data/${guildId}.db`)
        )
        let legacyData = {}

        for (const file of guildDataCollection) {
            let legacyJson = require(`./legacyData/${guildId}/${file}`);
            legacyData[file.split(".json")[0]] = legacyJson;
        }

        console.log(legacyData);

        let configDataSchema = {
            "levelUpMessage": legacyData["config"]["LEVEL_UP_MESSAGE"],
            "levelUpChannelId": legacyData["config"]["LEVEL_UP_CHANNEL"],
            "moderationRoleId": legacyData["config"]["MOD_ROLE"],
            "approveLevel": legacyData["config"]["APPROVE_LEVEL"],
            "approveMessage": legacyData["config"]["APPROVE_MESSAGE"],
            "roleBonus": "highest",
            "xpPerPostFormula": "exponential",
            "xpPerPostDivisor": 100,
            "allowPlayerManageXp": "off",
            "tier4RoleId": legacyData["config"]["TIER_ROLES"]["TIER_4"],
            "tier3RoleId": legacyData["config"]["TIER_ROLES"]["TIER_3"],
            "tier2RoleId": legacyData["config"]["TIER_ROLES"]["TIER_2"],
            "tier1RoleId": legacyData["config"]["TIER_ROLES"]["TIER_1"],
            "xpFreezeRoleId": legacyData["config"]["XP_FREEZE_ROLE"],
            "character1RoleId": 0,
            "character2RoleId": 0,
            "character3RoleId": 0,
            "character4RoleId": 0,
            "character5RoleId": 0,
            "character6RoleId": 0,
            "character7RoleId": 0,
            "character8RoleId": 0,
            "character9RoleId": 0,
            "character10RoleId": 0,
            "characterCount": Object.keys(legacyData["config"]["CHARACTER_ROLES"]).length
        }

        let index = 1;
        for (const [characterKey, characterId] of Object.entries(legacyData["config"]["CHARACTER_ROLES"])) {
            configDataSchema[`character${index}RoleId`] = characterId;
            index++;
        };

        console.log(configDataSchema)

        await gService.registerServer(configDataSchema);
        await gService.init();

        for (const [channelId, channelXp] of Object.entries(legacyData["channels"])) {
            await gService.updateChannel(`${channelId}`, channelXp);
        }
        for (const [roleId, roleBonus] of Object.entries(legacyData["roles"])) {
            await gService.updateRole(`${roleId}`, roleBonus);
        }

        for (const [characterId, characterXp] of Object.entries(legacyData["xp"])) {
            let characterIds = characterId.split("-");
            let characterIndex = 1;
            for (const [characterKey, characterId] of Object.entries(legacyData["config"]["CHARACTER_ROLES"])) {
                if (characterId == characterIds[1]) {
                    break;
                }
                characterIndex++;
            }
            let characterSchema = {
                "character_id": characterIndex,
                "name": `Character ${characterIndex}`,
                "sheet_url": "",
                "picture_url": "",
                "player_id": characterIds[0],
                "xp": characterXp,
            }
            if (characterId in legacyData["characters"]) {
                characterSchema["name"] = legacyData["characters"][characterId]["name"];
                characterSchema["sheet_url"] = legacyData["characters"][characterId]["sheet"];
                characterSchema["picture_url"] = legacyData["characters"][characterId]["img"];
            }

            await gService.insertCharacter(characterSchema);
        }

    }
})();