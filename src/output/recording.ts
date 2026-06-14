export type RecordingFormat = 'webm' | 'h264' | 'prores';

export interface RecordingCapability {
  format: RecordingFormat;
  label: string;
  available: boolean;
  mimeType: string | null;
  extension: 'webm' | 'mp4' | 'mov';
  detail: string;
}

const WEBM_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

const H264_TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
];

function firstSupported(types: string[]): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function getRecordingCapabilities(): RecordingCapability[] {
  const webm = firstSupported(WEBM_TYPES);
  const h264 = firstSupported(H264_TYPES);
  return [
    {
      format: 'webm',
      label: 'WebM',
      available: Boolean(webm),
      mimeType: webm,
      extension: 'webm',
      detail: webm ? `Native MediaRecorder: ${webm}` : 'MediaRecorder WebM is unavailable in this runtime.',
    },
    {
      format: 'h264',
      label: 'H.264 / MP4',
      available: Boolean(h264),
      mimeType: h264,
      extension: 'mp4',
      detail: h264 ? `Native MediaRecorder: ${h264}` : 'Unavailable here; requires MP4/AVC MediaRecorder support or a native ffmpeg bridge.',
    },
    {
      format: 'prores',
      label: 'ProRes / MOV',
      available: false,
      mimeType: null,
      extension: 'mov',
      detail: 'Unavailable here; ProRes requires a native ffmpeg bridge and a licensed encoder build.',
    },
  ];
}
