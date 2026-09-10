package dev.aicraft.client;

import com.mojang.brigadier.arguments.StringArgumentType;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.minecraft.text.Text;

public final class AicraftCommands {
    private AicraftCommands() {
    }

    public static void register(AicraftConnector connector) {
        ClientCommandRegistrationCallback.EVENT.register((dispatcher, registryAccess) -> dispatcher.register(
                ClientCommandManager.literal("aicraft").then(
                        ClientCommandManager.literal("connect")
                                .then(ClientCommandManager.argument("endpoint", StringArgumentType.string())
                                        .then(ClientCommandManager.argument("pairingCode", StringArgumentType.string())
                                                .executes(context -> {
                                                    String endpoint = StringArgumentType.getString(context, "endpoint");
                                                    String pairingCode = StringArgumentType.getString(context, "pairingCode");
                                                    connector.reconnect(endpoint, pairingCode);
                                                    context.getSource().sendFeedback(Text.literal("aicraft connection requested"));
                                                    return 1;
                                                })))
                )
        ));
    }
}
