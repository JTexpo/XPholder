const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit_config')
        .setDescription('Changes Config Table In Server Database! [ OWNER ]')

        .addStringOption(option => option
            .setName("approve_message")
            .setDescription("The Message Players See Upon Approval")
            .setRequired(false))
        .addIntegerOption(option => option
            .setName("approve_level")
            .setDescription("The Level Players Are Upon Approval")
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false))

        .addStringOption(option => option
            .setName("level_up_message")
            .setDescription("The Message Players See Upon Level-Up")
            .setRequired(false))
        .addChannelOption(option => option
            .setName("level_up_channel")
            .setDescription("The Channel Where Level Up Messages Go")
            .setRequired(false))

        .addRoleOption(option => option
            .setName("moderation_role")
            .setDescription("A Role Which Allows Users To Use The Mod Roles")
            .setRequired(false))

        .addIntegerOption(option => option
            .setName("number_of_characters")
            .setDescription("The Amount Of Characters A Person Can Have ( 1 -> 10 )")
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false))

        .addStringOption(option => option
            .setName("role_bonus")
            .setDescription("How Role Bonus' Are Applied")
            .setChoices(
                {name: "Highest", value: "highest"},
                {name: "Sum", value: "sum"}
            )
            .setRequired(false))

        .addRoleOption(option => option
            .setName("tier_1_role")
            .setDescription("The Role For Tier 1")
            .setRequired(false))
        .addRoleOption(option => option
            .setName("tier_2_role")
            .setDescription("The Role For Tier 2")
            .setRequired(false))
        .addRoleOption(option => option
            .setName("tier_3_role")
            .setDescription("The Role For Tier 3")
            .setRequired(false))
        .addRoleOption(option => option
            .setName("tier_4_role")
            .setDescription("The Role For Tier 4")
            .setRequired(false))

        .addStringOption(option => option
            .setName("allow_player_manage_xp")
            .setDescription("Allows Players To Manage Their Own XP Without The Need Of A Mod")
            .setChoices(
                {name: "Off", value: "off"},
                {name: "On", value: "on"}
            )
            .setRequired(false))

        .addRoleOption(option => option
            .setName("xp_freeze_role")
            .setDescription("The Role For XP-Freeze")
            .setRequired(false))
        .addRoleOption(option => option
            .setName("xp_share_role")
            .setDescription("The Role For XP-Share")
            .setRequired(false))
        .addIntegerOption(option => option
            .setName("xp_per_post_divisor")
            .setDescription("The Lower The More XP ( Suggested 100 )")
            .setMinValue(1)
            .setMaxValue(1000)
            .setRequired(false))
        .addStringOption(option => option
            .setName("xp_per_post_formula")
            .setDescription("How XP Is Awarded")
            .setChoices(
                {name: "Exponential", value: "exponential"},
                {name: "Flat", value: "flat"},
                {name: "Linear", value: "linear"}
            )
            .setRequired(false))
        .addBooleanOption(option => option
            .setName("public")
            .setDescription("Show This Command To Everyone?")
            .setRequired(false))
    ,
    async execute(guildService, interaction) {
        /*
        ----------
        VALIDATION
        ----------
        */
        if (interaction.user.id != interaction.guild.ownerId) {
            await interaction.editReply("Sorry, but you are not the owner of the server, and can not use this command.")
            return;
        }

        /*
        --------------
        INITALIZATIONS
        --------------
        */
        const MAX_CHARS = 10;
        const ROLES = interaction.guild.roles;

        const approveMessage = interaction.options.getString("approve_message");
        const approveLevel = interaction.options.getInteger("approve_level");
        const levelUpMessage = interaction.options.getString("level_up_message");
        const levelUpChannel = interaction.options.getChannel("level_up_channel");
        const moderationRole = interaction.options.getRole("moderation_role");
        const numberOfCharacters = interaction.options.getInteger("number_of_characters");
        const roleBonus = interaction.options.getString("role_bonus");
        const tier1Role = interaction.options.getRole("tier_1_role");
        const tier2Role = interaction.options.getRole("tier_2_role");
        const tier3Role = interaction.options.getRole("tier_3_role");
        const tier4Role = interaction.options.getRole("tier_4_role");
        const allowPlayerManageXp = interaction.options.getString("allow_player_manage_xp");
        const xpFreezeRole = interaction.options.getRole("xp_freeze_role");
        const xpShareRole = interaction.options.getRole("xp_share_role");
        const xpPerPostDivisor = interaction.options.getInteger("xp_per_post_divisor");
        const xpPerPostFormula = interaction.options.getString("xp_per_post_formula");

        /*
        -------
        UPDATES
        -------
        */
        let config = {};
        if (approveMessage) { config["approveMessage"] = approveMessage; }
        if (approveLevel) { config["approveLevel"] = approveLevel; }
        if (levelUpMessage) { config["levelUpMessage"] = levelUpMessage; }
        if (levelUpChannel) { config["levelUpChannelId"] = levelUpChannel.id; }
        if (moderationRole) { config["moderationRoleId"] = moderationRole.id; }
        if (numberOfCharacters) {
            for (let index = 1; index <= MAX_CHARS; index++) {
                if (index <= numberOfCharacters) {
                    config[`character${index}RoleId`] = (await ROLES.create({ name: `Character ${index}` })).id;
                } else { config[`character${index}RoleId`] = 0; }
            }
            config["characterCount"] = numberOfCharacters;
        }
        if (roleBonus) { config["roleBonus"] = roleBonus; }
        if (tier1Role) { config["tier1RoleId"] = tier1Role.id; }
        if (tier2Role) { config["tier2RoleId"] = tier2Role.id; }
        if (tier3Role) { config["tier3RoleId"] = tier3Role.id; }
        if (tier4Role) { config["tier4RoleId"] = tier4Role.id; }
        if (allowPlayerManageXp) { config["allowPlayerManageXp"] = allowPlayerManageXp; }
        if (xpFreezeRole) { config["xpFreezeRoleId"] = xpFreezeRole.id; }
        if (xpShareRole) { config["xpShareRoleId"] = xpShareRole.id; }
        if (xpPerPostDivisor) { config["xpPerPostDivisor"] = xpPerPostDivisor; }
        if (xpPerPostFormula) { config["xpPerPostFormula"] = xpPerPostFormula; }

        /*
        ---------------
        UPDATING CONFIG
        ---------------
        config - schema :
            "levelUpMessage"        :   STRING
            "levelUpChannelId"      :   NUMBER
            "moderationRoleId"      :   NUMBER
            "approveLevel"          :   NUMBER
            "approveMessage"        :   STRING
            "roleBonus"             :   STRING
            "xpPerPostFormula"      :   STRING
            "xpPerPostDivisor"      :   NUMBER
            "allowPlayerManageXp"   :   STRING
            "tier4RoleId"           :   NUMBER
            "tier3RoleId"           :   NUMBER
            "tier2RoleId"           :   NUMBER
            "tier1RoleId"           :   NUMBER
            "xpFreezeRoleId"        :   NUMBER
            "xpShareRoleId"         :   NUMBER
            "character1RoleId"      :   NUMBER
            "character2RoleId"      :   NUMBER
            "character3RoleId"      :   NUMBER
            "character4RoleId"      :   NUMBER
            "character5RoleId"      :   NUMBER
            "characterCount"        :   NUMBER
        */
        await guildService.updateConfig(config);

        await interaction.editReply("Success!");
    }
}