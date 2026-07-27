package com.karins

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.view.updatePadding
import com.facebook.react.bridge.WritableNativeMap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlin.math.abs

/**
 * App-owned face lock — enrollment shows the camera preview; unlock runs the front
 * camera in the background with an OS-style bottom sheet (no visible camera feed).
 */
class FaceLockCameraActivity : AppCompatActivity() {

  private lateinit var subtitleView: TextView
  private lateinit var analysisExecutor: ExecutorService
  private lateinit var faceDetector: FaceDetector

  private var cameraProvider: ProcessCameraProvider? = null
  private var imageAnalysis: ImageAnalysis? = null

  private var isEnrollMode = true
  private var finished = false
  private var consecutiveMatches = 0
  private val enrollSamples = mutableListOf<FaceTemplate>()

  override fun onCreate(savedInstanceState: Bundle?) {
    isEnrollMode = intent.getBooleanExtra(EXTRA_ENROLL_MODE, true)

    // Unlock uses a translucent sheet — enrollment keeps the full-screen camera UI.
    if (!isEnrollMode) {
      setTheme(R.style.FaceLockPassiveTheme)
    }

    // Avoid androidx.activity.enableEdgeToEdge() (deprecated bar-color / SHORT_EDGES APIs).
    super.onCreate(savedInstanceState)
    WindowCompat.setDecorFitsSystemWindows(window, false)
    WindowInsetsControllerCompat(window, window.decorView).apply {
      isAppearanceLightStatusBars = false
      isAppearanceLightNavigationBars = false
    }

    if (isEnrollMode) {
      setContentView(R.layout.activity_face_lock_camera)
    } else {
      setContentView(R.layout.activity_face_lock_passive)
    }
    applySystemBarInsets()

    val promptMessage = intent.getStringExtra(EXTRA_PROMPT_MESSAGE) ?: "Scan your face"

    findViewById<TextView>(R.id.faceTitle).text = promptMessage
    subtitleView = findViewById(R.id.faceSubtitle)
    subtitleView.text = if (isEnrollMode) {
      "Hold still while your face is scanned"
    } else {
      "Look at your device"
    }

    findViewById<TextView>(R.id.faceCancel).setOnClickListener {
      completeAndClose(false, "User cancellation")
    }

    if (!isEnrollMode && !FaceLockTemplateStorage.isEnrolled(this)) {
      completeAndClose(false, "Face lock is not set up")
      return
    }

    val detectorOptions = FaceDetectorOptions.Builder()
      .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
      .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
      .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
      .setMinFaceSize(if (isEnrollMode) 0.2f else 0.15f)
      .enableTracking()
      .build()
    faceDetector = FaceDetection.getClient(detectorOptions)
    analysisExecutor = Executors.newSingleThreadExecutor()

    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
      startCamera()
    } else {
      ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), REQUEST_CAMERA)
    }
  }

  /**
   * Camera preview stays full-bleed; only chrome (Cancel + bottom sheet) gets system-bar
   * padding so Android 15 edge-to-edge does not cover those controls.
   */
  private fun applySystemBarInsets() {
    val cancel = findViewById<View>(R.id.faceCancel)
    val bottomPanel = findViewById<View>(R.id.faceBottomPanel)
    val cancelBaseLeft = cancel.paddingLeft
    val cancelBaseTop = cancel.paddingTop
    val cancelBaseRight = cancel.paddingRight
    val cancelBaseBottom = cancel.paddingBottom
    val panelBaseLeft = bottomPanel.paddingLeft
    val panelBaseTop = bottomPanel.paddingTop
    val panelBaseRight = bottomPanel.paddingRight
    val panelBaseBottom = bottomPanel.paddingBottom

    ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.faceRoot)) { _, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      // Enroll Cancel is top-end chrome; passive Cancel lives inside the bottom sheet.
      if (isEnrollMode) {
        cancel.updatePadding(
          left = cancelBaseLeft,
          top = cancelBaseTop + bars.top,
          right = cancelBaseRight + bars.right,
          bottom = cancelBaseBottom,
        )
      }
      bottomPanel.updatePadding(
        left = panelBaseLeft + bars.left,
        top = panelBaseTop,
        right = panelBaseRight + bars.right,
        bottom = panelBaseBottom + bars.bottom,
      )
      insets
    }
  }

  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<out String>,
    grantResults: IntArray,
  ) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode == REQUEST_CAMERA) {
      val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
      if (granted) {
        startCamera()
      } else {
        completeAndClose(false, "Camera permission is required for face lock")
      }
    }
  }

  /**
   * Always binds Preview + ImageAnalysis — passive unlock uses a 1dp invisible preview
   * because some devices crash when ImageAnalysis is bound without a surface.
   */
  private fun startCamera() {
    if (isFinishing || isDestroyed) return

    val previewView = findViewById<PreviewView>(R.id.facePreview)
    val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
    cameraProviderFuture.addListener(
      {
        if (isFinishing || isDestroyed || finished) return@addListener

        try {
          val provider = cameraProviderFuture.get()
          cameraProvider = provider

          val preview = Preview.Builder().build().also {
            it.surfaceProvider = previewView.surfaceProvider
          }
          val analysis = buildImageAnalysis()
          imageAnalysis = analysis

          val cameraSelector = CameraSelector.Builder()
            .requireLensFacing(CameraSelector.LENS_FACING_FRONT)
            .build()

          provider.unbindAll()
          provider.bindToLifecycle(this, cameraSelector, preview, analysis)
        } catch (error: Exception) {
          runOnUiThreadSafe {
            completeAndClose(false, error.message ?: "Camera unavailable")
          }
        }
      },
      ContextCompat.getMainExecutor(this),
    )
  }

  private fun buildImageAnalysis(): ImageAnalysis {
    return ImageAnalysis.Builder()
      .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
      .build()
      .also { analysis ->
        analysis.setAnalyzer(analysisExecutor, ::analyzeFrame)
      }
  }

  private fun analyzeFrame(imageProxy: ImageProxy) {
    if (finished || isFinishing || isDestroyed) {
      imageProxy.close()
      return
    }

    val mediaImage = imageProxy.image
    if (mediaImage == null) {
      imageProxy.close()
      return
    }

    val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
    faceDetector.process(inputImage)
      .addOnSuccessListener { faces -> handleDetectedFaces(faces, imageProxy.width, imageProxy.height) }
      .addOnFailureListener {
        runOnUiThreadSafe {
          updateSubtitle("Could not read your face. Try better lighting.")
        }
      }
      .addOnCompleteListener { imageProxy.close() }
  }

  private fun handleDetectedFaces(faces: List<Face>, imageWidth: Int, imageHeight: Int) {
    if (finished || isFinishing || isDestroyed) return

    val validFace = faces.firstOrNull { isFacePoseValid(it) }
    if (validFace == null) {
      runOnUiThreadSafe {
        consecutiveMatches = 0
        updateSubtitle(
          if (isEnrollMode) {
            if (faces.isEmpty()) "Center your face in the camera"
            else "Look straight at the camera"
          } else {
            "Look at your device"
          },
        )
      }
      return
    }

    val template = FaceTemplate.fromFace(validFace, imageWidth, imageHeight) ?: return

    if (isEnrollMode) {
      handleEnrollSample(template)
      return
    }

    val storedTemplate = FaceLockTemplateStorage.load(this) ?: return
    val similarity = storedTemplate.similarity(template)

    runOnUiThreadSafe {
      if (similarity >= FaceTemplate.MATCH_THRESHOLD) {
        consecutiveMatches += 1
        updateSubtitle("Face recognized...")
        if (consecutiveMatches >= 2) {
          completeAndClose(true)
        }
      } else {
        consecutiveMatches = 0
        updateSubtitle("Face not recognized. Try again.")
      }
    }
  }

  private fun handleEnrollSample(template: FaceTemplate) {
    runOnUiThreadSafe {
      enrollSamples.add(template)
      val progress = enrollSamples.size
      updateSubtitle("Scanning face... $progress/${FaceTemplate.ENROLL_SAMPLE_COUNT}")

      if (progress >= FaceTemplate.ENROLL_SAMPLE_COUNT) {
        val averaged = enrollSamples.reduce { acc, sample -> acc.average(sample) }
        FaceLockTemplateStorage.save(this, averaged)
        completeAndClose(true)
      }
    }
  }

  private fun isFacePoseValid(face: Face): Boolean {
    val yaw = face.headEulerAngleY
    val pitch = face.headEulerAngleX
    val maxAngle = if (isEnrollMode) 18f else 25f
    return abs(yaw) <= maxAngle && abs(pitch) <= maxAngle
  }

  private fun updateSubtitle(message: String) {
    if (isFinishing || isDestroyed) return
    subtitleView.text = message
  }

  private fun runOnUiThreadSafe(action: () -> Unit) {
    if (isFinishing || isDestroyed) return
    runOnUiThread {
      if (!isFinishing && !isDestroyed) {
        action()
      }
    }
  }

  private fun completeAndClose(success: Boolean, error: String? = null) {
    if (finished) return
    finished = true
    stopCamera()
    finishFaceAuth(success, error)
    finish()
  }

  /** Release camera and stop frame analysis before the activity is destroyed. */
  private fun stopCamera() {
    imageAnalysis?.clearAnalyzer()
    imageAnalysis = null
    try {
      cameraProvider?.unbindAll()
    } catch (_: Exception) {
      // Camera may already be released if the activity is tearing down.
    }
    cameraProvider = null
  }

  override fun onDestroy() {
    stopCamera()
    if (::analysisExecutor.isInitialized) {
      analysisExecutor.shutdown()
    }
    if (::faceDetector.isInitialized) {
      faceDetector.close()
    }
    if (!finished && BiometricAuthModule.pendingFaceAuthPromise != null) {
      finishFaceAuth(false, "User cancellation")
    }
    super.onDestroy()
  }

  companion object {
    const val EXTRA_PROMPT_MESSAGE = "promptMessage"
    const val EXTRA_CANCEL_TEXT = "cancelButtonText"
    const val EXTRA_ENROLL_MODE = "enrollMode"
    private const val REQUEST_CAMERA = 4101

    fun finishFaceAuth(success: Boolean, error: String? = null) {
      BiometricAuthModule.isFaceLockActive = false
      val promise = BiometricAuthModule.pendingFaceAuthPromise ?: return
      BiometricAuthModule.pendingFaceAuthPromise = null

      val result = WritableNativeMap()
      result.putBoolean("success", success)
      if (error != null) {
        result.putString("error", error)
      }
      promise.resolve(result)
    }
  }
}
