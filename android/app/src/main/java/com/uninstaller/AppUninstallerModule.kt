package com.uninstaller

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.graphics.drawable.BitmapDrawable
import android.graphics.Bitmap
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import android.util.Base64


import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context

class AppUninstallerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AppUninstaller"
    }

    @ReactMethod
    fun getInstalledAppsOld(promise: Promise) {
        try {
            val pm: PackageManager = reactContext.packageManager
            val packages = pm.getInstalledApplications(PackageManager.GET_META_DATA)

            val appList = WritableNativeArray()
            for (app in packages) {
                val map = WritableNativeMap()
                map.putString("packageName", app.packageName)
                map.putString("appName", pm.getApplicationLabel(app).toString())
                map.putString("versionName", pm.getPackageInfo(app.packageName, 0).versionName)
                appList.pushMap(map)
            }
            promise.resolve(appList)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm: PackageManager = reactContext.packageManager
            val packages = pm.getInstalledApplications(PackageManager.GET_META_DATA)

            val appList = WritableNativeArray()

            for (app in packages) {
                val map = WritableNativeMap()
                map.putString("packageName", app.packageName)
                map.putString("appName", pm.getApplicationLabel(app).toString())
                map.putString("versionName", pm.getPackageInfo(app.packageName, 0).versionName)

                // Get icon as Base64
                val drawable = pm.getApplicationIcon(app.packageName)
                val bitmap = when (drawable) {
                    is BitmapDrawable -> drawable.bitmap
                    is android.graphics.drawable.AdaptiveIconDrawable -> {
                        val bitmap = Bitmap.createBitmap(
                            drawable.intrinsicWidth,
                            drawable.intrinsicHeight,
                            Bitmap.Config.ARGB_8888
                        )
                        val canvas = android.graphics.Canvas(bitmap)
                        drawable.setBounds(0, 0, canvas.width, canvas.height)
                        drawable.draw(canvas)
                        bitmap
                    }
                    else -> {
                        // Fallback for other drawable types
                        val bitmap = Bitmap.createBitmap(
                            drawable.intrinsicWidth,
                            drawable.intrinsicHeight,
                            Bitmap.Config.ARGB_8888
                        )
                        val canvas = android.graphics.Canvas(bitmap)
                        drawable.setBounds(0, 0, canvas.width, canvas.height)
                        drawable.draw(canvas)
                        bitmap
                    }
                }
                val outputStream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
                val iconBase64 = Base64.encodeToString(outputStream.toByteArray(), Base64.DEFAULT)
                map.putString("icon", "data:image/png;base64,$iconBase64")

                appList.pushMap(map)
            }

            promise.resolve(appList)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

   @ReactMethod
    fun uninstallApp(packageName: String, promise: Promise) {
        try {
            val currentActivity: Activity? = currentActivity
            val intent = Intent(Intent.ACTION_DELETE)
            intent.data = Uri.parse("package:$packageName")

            if (currentActivity != null) {
                currentActivity.startActivity(intent)
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun shareApp(packageName: String, promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            val srcApk = java.io.File(appInfo.sourceDir)

            // Copy to app cache so it’s under a configured FileProvider root
            val cacheDir = java.io.File(reactContext.cacheDir, "shared_apks")
            if (!cacheDir.exists()) cacheDir.mkdirs()

            val dstApk = java.io.File(cacheDir, "${appInfo.packageName}.apk")

            // Efficient copy (API 26+). For older, use streams.
            java.nio.file.Files.copy(
                srcApk.toPath(),
                dstApk.toPath(),
                java.nio.file.StandardCopyOption.REPLACE_EXISTING
            )

            val apkUri = androidx.core.content.FileProvider.getUriForFile(
                reactContext,
                reactContext.packageName + ".provider",
                dstApk
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/vnd.android.package-archive"
                putExtra(Intent.EXTRA_STREAM, apkUri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                // Optional: help some receivers honor the grant correctly
                clipData = android.content.ClipData.newRawUri("APK", apkUri)
            }

            // Grant read to all potential receivers in chooser (belt-and-suspenders)
            val resInfoList = reactContext.packageManager.queryIntentActivities(shareIntent, 0)
            for (resInfo in resInfoList) {
                val packageNameGrant = resInfo.activityInfo.packageName
                reactContext.grantUriPermission(
                    packageNameGrant,
                    apkUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }

            val chooser = Intent.createChooser(shareIntent, "Share App")
            val activity = currentActivity
            if (activity != null) {
                activity.startActivity(chooser)
            } else {
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(chooser)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHARE_ERROR", e)
        }
    }


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
