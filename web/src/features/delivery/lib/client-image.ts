// Browser-side photo preparation: camera frame or picked file -> JPEG blob, longest edge at
// most MAX_EDGE (keeps uploads well under 10 MB). The server still checks everything.

const MAX_EDGE = 2560;
const QUALITY = 0.88;

export interface PreparedPhoto {
  blob: Blob;
  width: number;
  height: number;
}

export function fitSize(width: number, height: number, maxEdge = MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasToJpeg(source: CanvasImageSource, srcW: number, srcH: number): Promise<PreparedPhoto> {
  const { width, height } = fitSize(srcW, srcH);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("no 2d context"));
  ctx.drawImage(source, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, width, height }) : reject(new Error("encode failed"))),
      "image/jpeg",
      QUALITY,
    ),
  );
}

/** Current frame of a playing <video> (camera stream). */
export function captureVideoFrame(video: HTMLVideoElement): Promise<PreparedPhoto> {
  return canvasToJpeg(video, video.videoWidth, video.videoHeight);
}

/**
 * Picked/captured file. Decoded and re-encoded when the browser can (HEIC on Safari, EXIF
 * orientation); otherwise sent as-is and the server decides.
 */
export async function prepareFile(file: File): Promise<PreparedPhoto> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      return await canvasToJpeg(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  } catch {
    return { blob: file, width: 0, height: 0 };
  }
}
