package com.karins

import android.content.Context
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceLandmark
import kotlin.math.abs

/** Normalized landmark snapshot used to match the enrolled face inside the app. */
data class FaceTemplate(
  val leftEyeX: Float,
  val leftEyeY: Float,
  val rightEyeX: Float,
  val rightEyeY: Float,
  val noseX: Float,
  val noseY: Float,
  val faceWidthRatio: Float,
  val faceHeightRatio: Float,
) {
  fun similarity(other: FaceTemplate): Float {
    val diffs = listOf(
      abs(leftEyeX - other.leftEyeX),
      abs(leftEyeY - other.leftEyeY),
      abs(rightEyeX - other.rightEyeX),
      abs(rightEyeY - other.rightEyeY),
      abs(noseX - other.noseX),
      abs(noseY - other.noseY),
      abs(faceWidthRatio - other.faceWidthRatio),
      abs(faceHeightRatio - other.faceHeightRatio),
    )
    val averageDiff = diffs.average().toFloat()
    return (1f - averageDiff * 4.5f).coerceIn(0f, 1f)
  }

  fun average(other: FaceTemplate): FaceTemplate {
    return FaceTemplate(
      leftEyeX = (leftEyeX + other.leftEyeX) / 2f,
      leftEyeY = (leftEyeY + other.leftEyeY) / 2f,
      rightEyeX = (rightEyeX + other.rightEyeX) / 2f,
      rightEyeY = (rightEyeY + other.rightEyeY) / 2f,
      noseX = (noseX + other.noseX) / 2f,
      noseY = (noseY + other.noseY) / 2f,
      faceWidthRatio = (faceWidthRatio + other.faceWidthRatio) / 2f,
      faceHeightRatio = (faceHeightRatio + other.faceHeightRatio) / 2f,
    )
  }

  companion object {
    const val MATCH_THRESHOLD = 0.72f
    const val ENROLL_SAMPLE_COUNT = 8

    fun fromFace(face: Face, imageWidth: Int, imageHeight: Int): FaceTemplate? {
      val bounds = face.boundingBox
      val width = bounds.width().toFloat()
      val height = bounds.height().toFloat()
      if (width <= 0f || height <= 0f || imageWidth <= 0 || imageHeight <= 0) return null

      val leftEye = face.getLandmark(FaceLandmark.LEFT_EYE)?.position ?: return null
      val rightEye = face.getLandmark(FaceLandmark.RIGHT_EYE)?.position ?: return null
      val nose = face.getLandmark(FaceLandmark.NOSE_BASE)?.position ?: return null

      fun normalize(value: Float, origin: Int, span: Float): Float {
        return ((value - origin) / span).coerceIn(0f, 1f)
      }

      return FaceTemplate(
        leftEyeX = normalize(leftEye.x, bounds.left, width),
        leftEyeY = normalize(leftEye.y, bounds.top, height),
        rightEyeX = normalize(rightEye.x, bounds.left, width),
        rightEyeY = normalize(rightEye.y, bounds.top, height),
        noseX = normalize(nose.x, bounds.left, width),
        noseY = normalize(nose.y, bounds.top, height),
        faceWidthRatio = (width / imageWidth.toFloat()).coerceIn(0f, 1f),
        faceHeightRatio = (height / imageHeight.toFloat()).coerceIn(0f, 1f),
      )
    }
  }
}

object FaceLockTemplateStorage {
  private const val PREFS = "karins_face_lock_template"

  fun save(context: Context, template: FaceTemplate) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putFloat("leftEyeX", template.leftEyeX)
      .putFloat("leftEyeY", template.leftEyeY)
      .putFloat("rightEyeX", template.rightEyeX)
      .putFloat("rightEyeY", template.rightEyeY)
      .putFloat("noseX", template.noseX)
      .putFloat("noseY", template.noseY)
      .putFloat("faceWidthRatio", template.faceWidthRatio)
      .putFloat("faceHeightRatio", template.faceHeightRatio)
      .putBoolean("enrolled", true)
      .apply()
  }

  fun load(context: Context): FaceTemplate? {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (!prefs.getBoolean("enrolled", false)) return null

    return FaceTemplate(
      leftEyeX = prefs.getFloat("leftEyeX", 0f),
      leftEyeY = prefs.getFloat("leftEyeY", 0f),
      rightEyeX = prefs.getFloat("rightEyeX", 0f),
      rightEyeY = prefs.getFloat("rightEyeY", 0f),
      noseX = prefs.getFloat("noseX", 0f),
      noseY = prefs.getFloat("noseY", 0f),
      faceWidthRatio = prefs.getFloat("faceWidthRatio", 0f),
      faceHeightRatio = prefs.getFloat("faceHeightRatio", 0f),
    )
  }

  fun isEnrolled(context: Context): Boolean {
    return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("enrolled", false)
  }

  fun clear(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
  }
}
