"use client";
// Delivery proof on /giao/<token>: rear camera (getUserMedia) with a native camera/file
// fallback, preview, retake, then POST the JPEG to /api/giao/<token>.
import { useEffect, useRef, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { deliveryCopy as t, deliveryErrorMessage, fmtDeliveredAt } from "../lib/copy";
import { captureVideoFrame, prepareFile, type PreparedPhoto } from "../lib/client-image";

type Phase = "choose" | "camera" | "preparing" | "preview" | "sending" | "done" | "closed";

/** Errors after which this note can no longer be confirmed from this page. */
const FINAL_ERRORS = new Set(["already_confirmed", "replaced", "not_found", "not_ready"]);

const BTN = "flex min-h-14 w-full items-center justify-center rounded-xl px-4 text-lg font-semibold disabled:opacity-50";
const PRIMARY = `${BTN} bg-green-700 text-white active:bg-green-800`;
const SECONDARY = `${BTN} border-2 border-zinc-400 bg-white text-zinc-900 active:bg-zinc-100`;
// The real file input is sr-only: its label shows the keyboard focus instead.
const FOCUS_WITHIN = "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-green-700";

export function PhotoCapture({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("choose");
  const [photo, setPhotoState] = useState<{ prepared: PreparedPhoto; url: string } | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };
  const stopCamera = () => {
    releaseStream();
    setStreaming(false);
  };

  // Object URL of the preview is revoked whenever the photo is replaced or the page closes.
  const photoUrlRef = useRef<string | null>(null);
  const setPhoto = (prepared: PreparedPhoto | null) => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    const url = prepared ? URL.createObjectURL(prepared.blob) : null;
    photoUrlRef.current = url;
    setPhotoState(prepared && url ? { prepared, url } : null);
  };

  useEffect(
    () => () => {
      releaseStream();
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (streaming && video && streamRef.current && video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
      void video.play().catch(() => undefined);
    }
  }, [streaming]);

  async function openCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) return setCameraFailed(true);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStreaming(true);
      setPhase("camera");
    } catch {
      setCameraFailed(true);
    }
  }

  function accept(prepared: PreparedPhoto) {
    const { width, height } = prepared;
    // 0x0 = browser could not decode it; the server checks that file instead.
    if (width > 0 && (Math.max(width, height) < 640 || Math.min(width, height) < 480)) {
      setError(t.errors.too_small);
      return setPhase("choose");
    }
    setPhoto(prepared);
    setPhase("preview");
  }

  async function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setPhase("preparing");
    try {
      const prepared = await captureVideoFrame(video);
      stopCamera();
      accept(prepared);
    } catch {
      setError(t.errors.server_error);
      setPhase("camera");
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    stopCamera();
    setPhase("preparing");
    accept(await prepareFile(file));
  }

  function retake() {
    setPhoto(null);
    setError(null);
    setPhase("choose");
  }

  async function send() {
    if (!photo) return;
    const { blob } = photo.prepared;
    setError(null);
    setPhase("sending");
    try {
      const res = await fetch(ROUTES.api.deliveryConfirm(token), {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
        credentials: "omit",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; confirmedAt?: string; error?: string };
      if (res.ok && body.ok) {
        setConfirmedAt(body.confirmedAt ?? new Date().toISOString());
        return setPhase("done");
      }
      setError(deliveryErrorMessage(body.error));
      setPhase(FINAL_ERRORS.has(body.error ?? "") ? "closed" : "preview");
    } catch {
      setError(t.errors.server_error);
      setPhase("preview");
    }
  }

  if (phase === "done") {
    return (
      <div role="status" className="space-y-2 rounded-xl bg-green-50 p-4 text-green-800">
        <p className="text-lg font-semibold">{t.success}</p>
        {confirmedAt ? <p>{t.deliveredAt.replace("{time}", fmtDeliveredAt(confirmedAt))}</p> : null}
      </div>
    );
  }

  const errorBox = error ? (
    <p role="alert" className="rounded-lg bg-red-50 p-3 text-base text-red-800">
      {error}
    </p>
  ) : null;

  if (phase === "closed") return errorBox;

  const fileInput = (
    <label className={`${phase === "choose" && !cameraFailed ? SECONDARY : PRIMARY} ${FOCUS_WITHIN}`}>
      {t.pickFile}
      <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onFile} />
    </label>
  );

  return (
    <div className="space-y-4">
      {errorBox}

      {phase === "choose" ? (
        <div className="space-y-3">
          <p className="text-zinc-700">{t.instructions}</p>
          {cameraFailed ? (
            <p className="text-sm text-amber-800">{t.cameraUnavailable}</p>
          ) : (
            <button type="button" className={PRIMARY} onClick={openCamera}>
              {t.openCamera}
            </button>
          )}
          {fileInput}
        </div>
      ) : null}

      {phase === "camera" || phase === "preparing" ? (
        <div className="space-y-3">
          {streaming ? (
            <video
              ref={videoRef}
              className="aspect-[3/4] w-full rounded-xl bg-black object-cover"
              aria-label={t.cameraLabel}
              autoPlay
              playsInline
              muted
            />
          ) : null}
          {phase === "preparing" ? (
            <p role="status" className="py-2 text-center text-zinc-600">
              {t.preparing}
            </p>
          ) : null}
          <button type="button" className={PRIMARY} onClick={takePhoto} disabled={phase !== "camera"}>
            {t.takePhoto}
          </button>
          <button
            type="button"
            className={SECONDARY}
            disabled={phase !== "camera"}
            onClick={() => {
              stopCamera();
              setPhase("choose");
            }}
          >
            {t.cancelCamera}
          </button>
        </div>
      ) : null}

      {(phase === "preview" || phase === "sending") && photo ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview */}
          <img src={photo.url} alt={t.previewAlt} className="max-h-[60vh] w-full rounded-xl object-contain" />
          <button type="button" className={PRIMARY} onClick={send} disabled={phase === "sending"}>
            {phase === "sending" ? t.sending : t.confirm}
          </button>
          <button type="button" className={SECONDARY} onClick={retake} disabled={phase === "sending"}>
            {t.retake}
          </button>
        </div>
      ) : null}
    </div>
  );
}
