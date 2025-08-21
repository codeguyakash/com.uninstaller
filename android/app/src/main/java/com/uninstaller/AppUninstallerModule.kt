package com.uninstaller

import android.app.admin.DevicePolicyManager
import android.content.ClipData
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.net.Uri
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.channels.FileChannel
import androidx.core.content.FileProvider

class AppUninstallerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppUninstaller"

  // ---------- List Apps ----------
  @ReactMethod
  fun getInstalledApps(promise: Promise) {
    try {
      val pm = reactContext.packageManager
      val packages = pm.getInstalledApplications(PackageManager.GET_META_DATA)
      val appList = WritableNativeArray()

      for (app in packages) {
        val map = WritableNativeMap()
        map.putString("packageName", app.packageName)
        map.putString("appName", pm.getApplicationLabel(app).toString())
        map.putString("versionName", pm.getPackageInfo(app.packageName, 0).versionName)

        val drawable = pm.getApplicationIcon(app.packageName)
        val bitmap = when (drawable) {
          is BitmapDrawable -> drawable.bitmap
          is android.graphics.drawable.AdaptiveIconDrawable -> {
            val bmp = Bitmap.createBitmap(
              drawable.intrinsicWidth, drawable.intrinsicHeight, Bitmap.Config.ARGB_8888
            )
            val canvas = android.graphics.Canvas(bmp)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
            bmp
          }
          else -> {
            val bmp = Bitmap.createBitmap(
              drawable.intrinsicWidth, drawable.intrinsicHeight, Bitmap.Config.ARGB_8888
            )
            val canvas = android.graphics.Canvas(bmp)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
            bmp
          }
        }
        val os = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, os)
        val iconBase64 = Base64.encodeToString(os.toByteArray(), Base64.DEFAULT)
        map.putString("icon", "data:image/png;base64,$iconBase64")
        appList.pushMap(map)
      }
      promise.resolve(appList)
    } catch (e: Exception) {
      promise.reject("ERROR", e)
    }
  }

  // ---------- Uninstall ----------
  @ReactMethod
  fun uninstallApp(packageName: String, promise: Promise) {
    try {
      val intent = Intent(Intent.ACTION_DELETE).apply {
        data = Uri.parse("package:$packageName")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ERROR", e)
    }
  }

  // ---------- SHARE (always single .apk) ----------
  @ReactMethod
  fun shareApp(packageName: String, promise: Promise) {
    try {
      val pm = reactContext.packageManager
      val appInfo = pm.getApplicationInfo(packageName, 0)

      val baseApk = File(appInfo.sourceDir) // sirf base APK
      val cacheDir = File(reactContext.cacheDir, "shared_apk")
      if (!cacheDir.exists()) cacheDir.mkdirs()

      val out = File(cacheDir, "${appInfo.packageName}.apk")
      copyFile(baseApk, out)

      val shareUri = FileProvider.getUriForFile(
        reactContext,
        reactContext.packageName + ".provider",
        out
      )

      val shareIntent = Intent(Intent.ACTION_SEND).apply {
        type = "application/vnd.android.package-archive"
        putExtra(Intent.EXTRA_STREAM, shareUri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        clipData = ClipData.newRawUri(out.name, shareUri)
      }

      // Grant URI permission to all receivers
      val resInfos = reactContext.packageManager.queryIntentActivities(shareIntent, 0)
      for (ri in resInfos) {
        reactContext.grantUriPermission(
          ri.activityInfo.packageName, shareUri, Intent.FLAG_GRANT_READ_URI_PERMISSION
        )
      }

      val chooser = Intent.createChooser(shareIntent, "Share App")
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(chooser)

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("SHARE_ERROR", e)
    }
  }

  // ---------- Helpers ----------
  private fun copyFile(src: File, dst: File) {
    FileInputStream(src).channel.use { inCh: FileChannel ->
      FileOutputStream(dst).channel.use { outCh: FileChannel ->
        inCh.transferTo(0, inCh.size(), outCh)
      }
    }
  }

  // ---------- Device Admin ----------
  @ReactMethod
  fun deactivateDeviceAdmin(promise: Promise) {
    try {
      val context = reactApplicationContext
      val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
      val componentName = ComponentName(context, MyDeviceAdminReceiver::class.java)
      if (dpm.isAdminActive(componentName)) {
        dpm.removeActiveAdmin(componentName)
        promise.resolve(true)
      } else {
        promise.resolve(false)
      }
    } catch (e: Exception) {
      promise.reject("DEVICE_ADMIN_ERROR", e)
    }
  }
}
