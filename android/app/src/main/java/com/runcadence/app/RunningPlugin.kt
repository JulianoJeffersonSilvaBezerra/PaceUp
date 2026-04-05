package com.runcadence.app;

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.capacitor.JSObject
import com.capacitor.Plugin
import com.capacitor.PluginCall
import com.capacitor.annotation.CapacitorPlugin
import com.google.android.gms.location.*

@CapacitorPlugin(name = "RunningPlugin")
class RunningPlugin : Plugin() {
  
  private var fusedLocationClient: FusedLocationProviderClient? = null
  private var locationCallback: LocationCallback? = null
  private var isTracking = false
  private val route = mutableListOf<LatLngData>()
  
  data class LatLngData(val lat: Double, val lng: Double, val accuracy: Float)
  
  // ───────────────────────────────────────────────────────────────────────────
  // 1. INICIALIZAÇÃO
  // ───────────────────────────────────────────────────────────────────────────
  
  @PluginMethod
  fun startTracking(call: PluginCall) {
    try {
      if (isTracking) {
        call.reject("Rastreamento já ativo")
        return
      }
      
      if (!hasPermission("android.permission.ACCESS_FINE_LOCATION")) {
        requestPermission("android.permission.ACCESS_FINE_LOCATION", "LOCATION_REQUEST")
        call.reject("Permissão de localização não concedida")
        return
      }
      
      // ───── Criar cliente de localização (Fused Location Provider)
      fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
      
      // ───── Criar LocationRequest com alta precisão
      val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 500)
        .setMinUpdateIntervalMillis(500)
        .setMaxUpdateDelayMillis(1000)
        .build()
      
      // ───── Criar callback (chamado a cada atualização)
      locationCallback = object : LocationCallback() {
        override fun onLocationResult(locationResult: LocationResult) {
          for (location in locationResult.locations) {
            recordLocation(location)
          }
        }
      }
      
      // ───── Iniciar rastreamento
      fusedLocationClient!!.requestLocationUpdates(
        locationRequest,
        locationCallback!!,
        Looper.getMainLooper()
      )
      
      // ───── Iniciar serviço foreground
      startForegroundService()
      
      isTracking = true
      call.resolve(JSObject().apply { put("success", true) })
      
    } catch (e: SecurityException) {
      call.reject("Erro de permissão: ${e.message}")
    } catch (e: Exception) {
      call.reject("Erro ao iniciar rastreamento: ${e.message}")
    }
  }
  
  @PluginMethod
  fun stopTracking(call: PluginCall) {
    try {
      if (locationCallback != null && fusedLocationClient != null) {
        fusedLocationClient!!.removeLocationUpdates(locationCallback!!)
        locationCallback = null
      }
      
      stopForegroundService()
      isTracking = false
      
      call.resolve(JSObject().apply { put("success", true) })
    } catch (e: Exception) {
      call.reject("Erro ao parar rastreamento: ${e.message}")
    }
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // 2. REGISTRO DE LOCALIZAÇÃO
  // ───────────────────────────────────────────────────────────────────────────
  
  private fun recordLocation(location: Location) {
    route.add(LatLngData(location.latitude, location.longitude, location.accuracy))
    
    // ───── Emitir evento WebView em tempo real
    notifyListeners("location_update", JSObject().apply {
      put("lat", location.latitude)
      put("lng", location.longitude)
      put("accuracy", location.accuracy)
      put("altitude", location.altitude)
      put("bearing", location.bearing)
      put("speed", location.speed)
      put("timestamp", location.time)
    })
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // 3. CÁLCULO DE DISTÂNCIA (Haversine)
  // ───────────────────────────────────────────────────────────────────────────
  
  @PluginMethod
  fun getDistance(call: PluginCall) {
    try {
      val distance = haversineDistance()
      call.resolve(JSObject().apply {
        put("distance", distance)
        put("points", route.size)
      })
    } catch (e: Exception) {
      call.reject("Erro ao calcular distância: ${e.message}")
    }
  }
  
  private fun haversineDistance(): Double {
    if (route.size < 2) return 0.0
    
    var totalDistance = 0.0
    for (i in 1 until route.size) {
      val prev = route[i - 1]
      val curr = route[i]
      totalDistance += haversine(
        prev.lat, prev.lng,
        curr.lat, curr.lng
      )
    }
    return totalDistance
  }
  
  private fun haversine(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
    val R = 6371.0 // Terra em km
    val dLat = Math.toRadians(lat2 - lat1)
    val dLng = Math.toRadians(lng2 - lng1)
    
    val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
    
    val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c * 1000 // Retorna em metros
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // 4. ROTA COMPLETA
  // ───────────────────────────────────────────────────────────────────────────
  
  @PluginMethod
  fun getRoute(call: PluginCall) {
    try {
      val routeArray = mutableListOf<JSObject>()
      for (point in route) {
        routeArray.add(JSObject().apply {
          put("lat", point.lat)
          put("lng", point.lng)
          put("accuracy", point.accuracy)
        })
      }
      
      call.resolve(JSObject().apply {
        put("route", routeArray)
      })
    } catch (e: Exception) {
      call.reject("Erro ao obter rota: ${e.message}")
    }
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // 5. SERVIÇO FOREGROUND
  // ───────────────────────────────────────────────────────────────────────────
  
  private fun startForegroundService() {
    val intent = Intent(context, RunningService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(intent)
    } else {
      context.startService(intent)
    }
  }
  
  private fun stopForegroundService() {
    val intent = Intent(context, RunningService::class.java)
    context.stopService(intent)
  }
  
  // ───────────────────────────────────────────────────────────────────────────
  // 6. UTILITÁRIOS DE PERMISSÃO
  // ───────────────────────────────────────────────────────────────────────────
  
  private fun hasPermission(permission: String): Boolean {
    return ContextCompat.checkSelfPermission(context, permission) ==
           PackageManager.PERMISSION_GRANTED
  }
}
