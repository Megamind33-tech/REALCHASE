import { useEffect, useRef, useState } from 'react';
import { useEditorBridge } from '@/context/EditorBridgeContext';

export function CompositeOutputPreview({ active, sourceName }: { active: boolean; sourceName: string | null }) {
  const { captureOutputStream } = useEditorBridge();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [detail, setDetail] = useState('Put a source on Program to preview the composite output.');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!active) {
      video.srcObject = null;
      setDetail('Put a source on Program to preview the composite output.');
      return;
    }

    const stream = captureOutputStream(15);
    const track = stream?.getVideoTracks()[0] ?? null;
    if (!stream || !track) {
      setDetail('Composite preview is unavailable because the render canvas is not active.');
      return;
    }

    video.srcObject = stream;
    void video.play().catch(() => {});
    const updateDetail = () => {
      const settings = track.getSettings();
      const width = video.videoWidth || settings.width || 0;
      const height = video.videoHeight || settings.height || 0;
      const dimensions = width && height ? `${width}x${height}` : 'canvas';
      setDetail(`${dimensions} composite preview at 15 fps${sourceName ? ` - ${sourceName}` : ''}`);
    };
    video.addEventListener('loadedmetadata', updateDetail);
    updateDetail();

    return () => {
      video.removeEventListener('loadedmetadata', updateDetail);
      video.srcObject = null;
      stream.getTracks().forEach((item) => item.stop());
    };
  }, [active, captureOutputStream, sourceName]);

  return (
    <div data-testid="composite-output-preview" style={{ marginBottom: 10 }}>
      <div className="section-label" style={{ marginBottom: 6 }}>Composite Preview</div>
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', borderRadius: 3, border: '1px solid var(--border-subtle)', background: 'var(--bg-viewport)' }}>
        <video
          ref={videoRef}
          data-testid="composite-output-video"
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: active ? 'block' : 'none' }}
        />
        {!active && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 10 }}>
            No Program composite
          </div>
        )}
      </div>
      <div data-testid="composite-output-detail" className="mono" style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 9 }}>{detail}</div>
    </div>
  );
}
