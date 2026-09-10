package dev.aicraft.client;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.option.GameOptions;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

public final class AicraftNavigationController {
    private final ScheduledExecutorService scheduler;
    private final AtomicReference<ScheduledFuture<?>> task = new AtomicReference<>();
    private volatile CompletableFuture<NavigationResult> currentFuture;
    private volatile boolean active;

    public AicraftNavigationController() {
        this.scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "aicraft-navigation");
            thread.setDaemon(true);
            return thread;
        });
    }

    public synchronized CompletableFuture<NavigationResult> start(
            double targetX,
            double targetZ,
            double tolerance,
            long timeoutMs
    ) {
        cancelCurrent("Navigation replaced by a new request");
        CompletableFuture<NavigationResult> future = new CompletableFuture<>();
        this.currentFuture = future;
        this.active = true;
        long deadline = System.currentTimeMillis() + timeoutMs;

        ScheduledFuture<?> scheduled = scheduler.scheduleAtFixedRate(
                () -> tick(future, targetX, targetZ, tolerance, deadline),
                0,
                100,
                TimeUnit.MILLISECONDS
        );
        task.set(scheduled);
        return future;
    }

    public synchronized void cancel() {
        cancelCurrent("Navigation cancelled");
    }

    private void tick(
            CompletableFuture<NavigationResult> future,
            double targetX,
            double targetZ,
            double tolerance,
            long deadline
    ) {
        if (!active || future.isDone()) {
            return;
        }

        MinecraftClient.getInstance().execute(() -> {
            if (!active || future.isDone()) {
                return;
            }

            MinecraftClient client = MinecraftClient.getInstance();
            ClientPlayerEntity player = client.player;
            if (player == null) {
                complete(future, false, "Player is unavailable");
                return;
            }

            double deltaX = targetX - player.getX();
            double deltaZ = targetZ - player.getZ();
            double distance = Math.hypot(deltaX, deltaZ);
            if (distance <= tolerance) {
                complete(future, true, String.format("Reached target within %.2f blocks", distance));
                return;
            }

            if (System.currentTimeMillis() > deadline) {
                complete(future, false, String.format("Navigation timed out %.2f blocks away", distance));
                return;
            }

            float yaw = (float) (Math.toDegrees(Math.atan2(deltaZ, deltaX)) - 90.0);
            player.setYaw(yaw);
            GameOptions options = client.options;
            options.forwardKey.setPressed(true);
            options.backKey.setPressed(false);
            options.leftKey.setPressed(false);
            options.rightKey.setPressed(false);
            options.sprintKey.setPressed(distance > 8.0);
            options.jumpKey.setPressed(false);
            options.sneakKey.setPressed(false);
        });
    }

    private void complete(
            CompletableFuture<NavigationResult> future,
            boolean success,
            String result
    ) {
        active = false;
        ScheduledFuture<?> currentTask = task.get();
        if (currentTask != null) {
            currentTask.cancel(false);
            task.set(null);
        }

        MinecraftClient.getInstance().execute(this::releaseMovementKeys);
        future.complete(new NavigationResult(success, result));
    }

    private void cancelCurrent(String result) {
        CompletableFuture<NavigationResult> future = currentFuture;
        active = false;
        ScheduledFuture<?> currentTask = task.get();
        if (currentTask != null) {
            currentTask.cancel(false);
            task.set(null);
        }

        MinecraftClient.getInstance().execute(this::releaseMovementKeys);
        if (future != null && !future.isDone()) {
            future.complete(new NavigationResult(false, result));
        }
    }

    private void releaseMovementKeys() {
        MinecraftClient client = MinecraftClient.getInstance();
        GameOptions options = client.options;
        options.forwardKey.setPressed(false);
        options.backKey.setPressed(false);
        options.leftKey.setPressed(false);
        options.rightKey.setPressed(false);
        options.sprintKey.setPressed(false);
        options.jumpKey.setPressed(false);
        options.sneakKey.setPressed(false);
    }

    public record NavigationResult(boolean success, String result) {
    }
}
