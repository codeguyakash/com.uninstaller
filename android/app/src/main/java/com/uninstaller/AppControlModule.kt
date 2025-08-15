package com.uninstaller

import android.content.pm.PackageManager
import android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED_USER
import android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED
import android.content.pm.PackageManager.DONT_KILL_APP
import android.content.Intent
import android.net.Uri
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.*

class AppControlModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AppControl"

    // ───────────────── helpers ─────────────────
    private fun result(status: String, message: String? = null): WritableMap {
        val map = WritableNativeMap()
        map.putString("status", status) // ok | error | info
        if (message != null) map.putString("message", message)
        return map
    }

    private fun dpm(): DevicePolicyManager =
        reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

    private fun isOwner(): Boolean {
        val pkg = reactContext.packageName
        val mgr = dpm()
        return mgr.isDeviceOwnerApp(pkg) || mgr.isProfileOwnerApp(pkg)
    }

    private fun adminsForPackage(packageName: String): List<ComponentName> {
        val list = dpm().activeAdmins ?: return emptyList()
        return list.filter { it.packageName == packageName }
    }

    private fun promptUninstall(packageName: String) {
        val intent = Intent(Intent.ACTION_DELETE).apply {
            data = Uri.parse("package:$packageName")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(intent)
    }

    // ─────────────── Non-privileged best-effort (no Settings fallback) ───────────────
    // NOTE: On stock devices this may be ignored for other apps. We still return "ok" and message.
    @ReactMethod
    fun setAppEnabled(packageName: String, enabled: Boolean, promise: Promise) {
        try {
            val pm = reactContext.packageManager
            pm.setApplicationEnabledSetting(
                packageName,
                if (enabled) COMPONENT_ENABLED_STATE_ENABLED else COMPONENT_ENABLED_STATE_DISABLED_USER,
                DONT_KILL_APP
            )
            promise.resolve(result("ok", "Requested ${if (enabled) "enable" else "disable"} for $packageName"))
        } catch (se: SecurityException) {
            promise.resolve(result("ok", "Attempted, but OS may ignore for $packageName"))
        } catch (e: Exception) {
            promise.reject("TOGGLE_ERROR", e.message, e)
        }
    }

    // ─────────────── Device/Profile Owner paths ───────────────
    @ReactMethod
    fun setAppHidden(packageName: String, hidden: Boolean, promise: Promise) {
        try {
            if (!isOwner()) {
                promise.resolve(result("info", "Not device/profile owner"))
                return
            }
            val admin = ComponentName(reactContext, MyDeviceAdminReceiver::class.java)
            dpm().setApplicationHidden(admin, packageName, hidden)
            val nowHidden = dpm().isApplicationHidden(admin, packageName)
            promise.resolve(result("ok", "hidden=$nowHidden"))
        } catch (e: Exception) {
            promise.reject("DPM_HIDE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setAppSuspended(packageName: String, suspended: Boolean, promise: Promise) {
        try {
            if (android.os.Build.VERSION.SDK_INT < 24) {
                promise.resolve(result("error", "setPackagesSuspended requires API 24+"))
                return
            }
            if (!isOwner()) {
                promise.resolve(result("info", "Not device/profile owner"))
                return
            }
            val admin = ComponentName(reactContext, MyDeviceAdminReceiver::class.java)
            dpm().setPackagesSuspended(admin, arrayOf(packageName), suspended)
            promise.resolve(result("ok", "suspended=$suspended for $packageName"))
        } catch (se: SecurityException) {
            promise.reject("DPM_SUSPEND_ERROR", "Not permitted to suspend $packageName", se)
        } catch (e: Exception) {
            promise.reject("DPM_SUSPEND_ERROR", e.message, e)
        }
    }

    // List active admin receivers for a package (useful for UI)
    @ReactMethod
    fun listActiveAdmins(packageName: String, promise: Promise) {
        try {
            val arr = WritableNativeArray()
            for (cn in adminsForPackage(packageName)) {
                val m = WritableNativeMap()
                m.putString("package", cn.packageName)
                m.putString("class", cn.className)
                arr.pushMap(m)
            }
            promise.resolve(arr)
        } catch (e: Exception) {
            promise.reject("LIST_ADMINS_ERROR", e.message, e)
        }
    }

    // Deactivate target app’s admin(s) if owner, then open uninstall UI.
    @ReactMethod
    fun deactivateAdminsAndUninstall(packageName: String, promise: Promise) {
        try {
            var removed = 0
            if (isOwner()) {
                val mgr = dpm()
                for (admin in adminsForPackage(packageName)) {
                    try {
                        mgr.removeActiveAdmin(admin)
                        removed++
                    } catch (_: Exception) { /* continue */ }
                }
            }
            promptUninstall(packageName)
            val msg = if (removed > 0)
                "Removed $removed admin(s) and opened uninstall UI"
            else
                "Opened uninstall UI"
            promise.resolve(result("ok", msg))
        } catch (e: Exception) {
            promise.reject("UNINSTALL_FLOW_ERROR", e.message, e)
        }
    }

    // ─────────────── Smart wrapper ───────────────
    @ReactMethod
    fun toggleApp(packageName: String, enable: Boolean, promise: Promise) {
        if (isOwner()) {
            setAppHidden(packageName, !enable, promise) // owner path (authoritative)
        } else {
            setAppEnabled(packageName, enable, promise)  // best-effort, no Settings fallback
        }
    }
}
