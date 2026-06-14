export interface AcquiredSourceMedia {
  stream: MediaStream;
  dispose: () => void;
}

type CapturableVideo = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  webkitCaptureStream?: () => MediaStream;
};

type RequestableCanvasTrack = MediaStreamTrack & { requestFrame?: () => void };

const MAX_IMAGE_EDGE = 1920;

function assertFileType(file: File, kind: 'video' | 'image') {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const allowed = kind === 'video'
    ? new Set(['mp4', 'mov', 'm4v', 'webm', 'ogg'])
    : new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']);
  if (!file.type.startsWith(`${kind}/`) && !allowed.has(extension)) {
    throw new Error(`${file.name} is not a supported ${kind} file.`);
  }
}

function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function waitForVideo(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('error', onError);
    };
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => {
      cleanup();
      reject(new Error(video.error?.message || 'The video file could not be decoded.'));
    };
    video.addEventListener('loadedmetadata', onReady, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

function stopTracks(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

function captureVideoWithCanvas(video: HTMLVideoElement): AcquiredSourceMedia {
  const size = fitWithin(video.videoWidth || 1280, video.videoHeight || 720, MAX_IMAGE_EDGE);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas video capture is unavailable in this environment.');

  const stream = canvas.captureStream(30);
  let frame = 0;
  const draw = () => {
    if (!video.paused && !video.ended) context.drawImage(video, 0, 0, canvas.width, canvas.height);
    frame = requestAnimationFrame(draw);
  };
  draw();

  return {
    stream,
    dispose: () => {
      cancelAnimationFrame(frame);
      stopTracks(stream);
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}

export async function acquireVideoFile(file: File): Promise<AcquiredSourceMedia> {
  assertFileType(file, 'video');
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video') as CapturableVideo;
  video.src = objectUrl;
  video.loop = true;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.style.cssText = 'position:fixed;right:0;bottom:0;width:16px;height:16px;opacity:0.01;z-index:0;pointer-events:none;';
  document.body.appendChild(video);

  let media: AcquiredSourceMedia | null = null;
  try {
    await waitForVideo(video);
    await video.play();
    const capture = video.captureStream ?? video.webkitCaptureStream;
    const directStream = capture?.call(video) ?? null;
    media = directStream?.getVideoTracks().length
      ? { stream: directStream, dispose: () => stopTracks(directStream) }
      : captureVideoWithCanvas(video);
    return {
      stream: media.stream,
      dispose: () => {
        media?.dispose();
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.remove();
        URL.revokeObjectURL(objectUrl);
      },
    };
  } catch (error) {
    media?.dispose();
    video.pause();
    video.remove();
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export async function acquireImageFile(file: File): Promise<AcquiredSourceMedia> {
  assertFileType(file, 'image');
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.src = objectUrl;

  try {
    await image.decode();
    const size = fitWithin(image.naturalWidth, image.naturalHeight, MAX_IMAGE_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas image capture is unavailable in this environment.');
    const stream = canvas.captureStream(1);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    (stream.getVideoTracks()[0] as RequestableCanvasTrack | undefined)?.requestFrame?.();
    if (!stream.getVideoTracks().length) throw new Error('This environment cannot turn images into live source tracks.');

    return {
      stream,
      dispose: () => {
        stopTracks(stream);
        image.removeAttribute('src');
        canvas.width = 0;
        canvas.height = 0;
        URL.revokeObjectURL(objectUrl);
      },
    };
  } catch (error) {
    image.removeAttribute('src');
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}
