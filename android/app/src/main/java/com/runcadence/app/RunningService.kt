package com.runcadence.app

import android.app.Service
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class RunningService : Service() {
  
  companion object {
    private const val CHANNEL_ID = "running_service"
    private const val NOTIFICATION_ID = 1
  }
  
  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }
  
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val notification = createNotification()
    startForeground(NOTIFICATION_ID, notification)
    return START_STICKY
  }
  
  override fun onBind(intent: Intent?): IBinder? = null
  
  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Rastreamento de Corrida",
        NotificationManager.IMPORTANCE_DEFAULT
      ).apply {
        description = "RunCadence está rastreando sua corrida"
        setSound(null, null)
      }
      
      val manager = getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(channel)
    }
  }
  
  private fun createNotification(): Notification {
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("RunCadence")
      .setContentText("Rastreando corrida...")
      .setSmallIcon(android.R.drawable.ic_dialog_map)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
  }
}
