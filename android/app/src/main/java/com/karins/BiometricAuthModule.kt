package com.karins

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.module.annotations.ReactModule

/**
 * Android biometric bridge — fingerprint uses the OS sensor; face lock enrolls via
 * camera preview and unlocks passively with a hidden camera + in-app face matching.
 */
@ReactModule(name = BiometricAuthModule.NAME)
class BiometricAuthModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun getAvailability(promise: Promise) {
    try {
      val result = WritableNativeMap()
      val manager = BiometricManager.from(reactApplicationContext)
      val packageManager = reactApplicationContext.packageManager

      val hasFingerprintHardware =
        packageManager.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT)
      val hasFrontCamera =
        packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_FRONT) ||
          packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA)

      val fingerprintAvailable = hasFingerprintHardware &&
        manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) ==
        BiometricManager.BIOMETRIC_SUCCESS

      // Face lock only needs a front camera — recognition is handled inside the app.
      val faceLockAvailable = hasFrontCamera

      result.putBoolean("fingerprintAvailable", fingerprintAvailable)
      result.putBoolean("faceLockAvailable", faceLockAvailable)
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("BIOMETRIC_AVAILABILITY_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun clearFaceTemplate(promise: Promise) {
    FaceLockTemplateStorage.clear(reactApplicationContext)
    promise.resolve(true)
  }

  @ReactMethod
  fun authenticate(
    method: String,
    promptMessage: String,
    cancelButtonText: String,
    enroll: Boolean,
    promise: Promise,
  ) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      promise.resolve(buildResult(success = false, error = "Unsupported android version"))
      return
    }

    if (method == METHOD_FACE) {
      launchFaceLockCamera(promptMessage, cancelButtonText, enroll, promise)
      return
    }

    if (method != METHOD_FINGERPRINT) {
      promise.resolve(buildResult(success = false, error = "Unsupported biometric method"))
      return
    }

    val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG
    val manager = BiometricManager.from(reactApplicationContext)
    if (manager.canAuthenticate(authenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
      promise.resolve(buildResult(success = false, error = "Fingerprint is not set up on this device"))
      return
    }

    UiThreadUtil.runOnUiThread {
      try {
        val activity = reactApplicationContext.currentActivity as? FragmentActivity
        if (activity == null) {
          promise.resolve(buildResult(success = false, error = "Activity unavailable"))
          return@runOnUiThread
        }

        val executor = ContextCompat.getMainExecutor(reactApplicationContext)
        val prompt = BiometricPrompt(
          activity,
          executor,
          object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
              if (
                errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                errorCode == BiometricPrompt.ERROR_USER_CANCELED
              ) {
                promise.resolve(buildResult(success = false, error = "User cancellation"))
              } else {
                promise.resolve(buildResult(success = false, error = errString.toString()))
              }
            }

            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
              promise.resolve(buildResult(success = true))
            }

            override fun onAuthenticationFailed() {
              // Allow another fingerprint attempt.
            }
          },
        )

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
          .setTitle(promptMessage)
          .setSubtitle("Touch the fingerprint sensor")
          .setAllowedAuthenticators(authenticators)
          .setNegativeButtonText(cancelButtonText)
          .setConfirmationRequired(true)
          .build()

        prompt.authenticate(promptInfo)
      } catch (error: Exception) {
        promise.resolve(buildResult(success = false, error = error.message ?: "Prompt failed"))
      }
    }
  }

  private fun launchFaceLockCamera(
    promptMessage: String,
    cancelButtonText: String,
    enroll: Boolean,
    promise: Promise,
  ) {
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.resolve(buildResult(success = false, error = "Activity unavailable"))
        return@runOnUiThread
      }

      if (!enroll && !FaceLockTemplateStorage.isEnrolled(reactApplicationContext)) {
        promise.resolve(buildResult(success = false, error = "Face lock is not set up"))
        return@runOnUiThread
      }

      // Prevent a second launch while the passive unlock sheet is already open.
      if (isFaceLockActive) {
        promise.resolve(buildResult(success = false, error = "Face lock already in progress"))
        return@runOnUiThread
      }

      isFaceLockActive = true
      pendingFaceAuthPromise = promise
      val intent = Intent(activity, FaceLockCameraActivity::class.java).apply {
        putExtra(FaceLockCameraActivity.EXTRA_PROMPT_MESSAGE, promptMessage)
        putExtra(FaceLockCameraActivity.EXTRA_CANCEL_TEXT, cancelButtonText)
        putExtra(FaceLockCameraActivity.EXTRA_ENROLL_MODE, enroll)
      }
      activity.startActivity(intent)
    }
  }

  private fun buildResult(success: Boolean, error: String? = null): WritableNativeMap {
    val result = WritableNativeMap()
    result.putBoolean("success", success)
    if (error != null) {
      result.putString("error", error)
    }
    return result
  }

  companion object {
    const val NAME = "BiometricAuth"
    var pendingFaceAuthPromise: Promise? = null
    var isFaceLockActive = false
    private const val METHOD_FINGERPRINT = "fingerprint"
    private const val METHOD_FACE = "face"
  }
}
