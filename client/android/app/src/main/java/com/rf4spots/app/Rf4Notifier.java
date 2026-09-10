package com.rf4spots.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.concurrent.atomic.AtomicInteger;

final class Rf4Notifier {
  static final String EXTRA_POST_ID = "postId";
  static final String ACTION_OPEN = "com.rf4spots.app.OPEN_POST";
  private static final String CHANNEL_ID = "rf4_activity";
  private static final AtomicInteger NEXT_ID = new AtomicInteger(1000);

  private Rf4Notifier() {}

  static void ensureChannel(Context context) {
    if (Build.VERSION.SDK_INT < 26) return;
    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
    NotificationChannel channel =
        new NotificationChannel(CHANNEL_ID, "Лента RF4 Spots", NotificationManager.IMPORTANCE_DEFAULT);
    channel.setDescription("Новые посты и комментарии");
    manager.createNotificationChannel(channel);
  }

  static boolean show(Context context, String title, String body, String postId, boolean silent) {
    ensureChannel(context);
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false;
    Intent open = new Intent(context, MainActivity.class);
    open.setAction(ACTION_OPEN);
    open.putExtra(EXTRA_POST_ID, postId == null ? "" : postId);
    open.addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK
            | Intent.FLAG_ACTIVITY_SINGLE_TOP
            | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_IMMUTABLE;
    int id = NEXT_ID.incrementAndGet();
    PendingIntent content = PendingIntent.getActivity(context, id, open, flags);
    NotificationCompat.Builder builder =
        new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setContentTitle(title == null || title.isEmpty() ? "RF4 Spots" : title)
            .setContentText(body == null ? "" : body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body == null ? "" : body))
            .setContentIntent(content)
            .setAutoCancel(true)
            .setColor(0xFFC9A35A)
            .setSilent(silent);
    NotificationManagerCompat.from(context).notify(id, builder.build());
    return true;
  }
}
