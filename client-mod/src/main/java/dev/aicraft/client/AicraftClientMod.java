package dev.aicraft.client;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Environment(EnvType.CLIENT)
public final class AicraftClientMod implements ClientModInitializer {
    public static final String MOD_ID = "aicraft_client";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    private AicraftConnector connector;

    @Override
    public void onInitializeClient() {
        AicraftConfig config = AicraftConfig.load();
        connector = new AicraftConnector(config);
        connector.start();

        AicraftCommands.register(connector);
    }

    public AicraftConnector connector() {
        return connector;
    }
}
