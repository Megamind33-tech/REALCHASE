// Real WebRTC output via WHIP (WebRTC-HTTP Ingestion Protocol, IETF draft).
// The Program MediaStream is published to a standards-compliant ingest server
// (MediaMTX, Cloudflare Stream, Janus, etc.) over a single HTTP POST that
// exchanges SDP. No vendor SDK, no signalling socket — this is the same path a
// browser-based encoder uses to go on air for real.

export interface WhipSession {
  /** Tear the publish down: closes the PeerConnection and DELETEs the resource. */
  close: () => Promise<void>;
  /** The live PeerConnection (for state inspection / stats). */
  pc: RTCPeerConnection;
  /** The WHIP resource URL the server allocated (used for DELETE on close). */
  resource: string | null;
}

export interface WhipOptions {
  /** Optional bearer token for servers that require auth on the ingest path. */
  token?: string;
  /** ICE servers (STUN/TURN). Defaults to no servers — fine for LAN / loopback. */
  iceServers?: RTCIceServer[];
  /** Abort the ICE-gathering wait after this many ms (default 4000). */
  gatherTimeoutMs?: number;
}

/**
 * Wait until ICE gathering finishes (so the offer carries all host/srflx
 * candidates) or the timeout elapses. WHIP uses non-trickle ICE: the single
 * POST must already contain the candidates.
 */
function waitForIceGathering(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      pc.removeEventListener('icegatheringstatechange', onChange);
      clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') done();
    };
    pc.addEventListener('icegatheringstatechange', onChange);
    // Belt-and-braces: some engines fire the null candidate but not the state
    // change. Resolve on either signal, and never hang past the timeout.
    pc.addEventListener('icecandidate', (e) => { if (!e.candidate) done(); });
    const timer = setTimeout(done, timeoutMs);
  });
}

/**
 * Publish a MediaStream to a WHIP endpoint and return a live session.
 * Throws if the server rejects the offer (non-2xx) so callers can surface a
 * real error to the operator instead of a fake "on air".
 */
export async function whipPublish(
  endpoint: string,
  stream: MediaStream,
  options: WhipOptions = {},
): Promise<WhipSession> {
  const pc = new RTCPeerConnection({ iceServers: options.iceServers ?? [] });

  // Send-only transceivers for every track in the Program stream. Adding the
  // tracks via addTransceiver (rather than addTrack) lets us pin the direction
  // so the server never tries to send media back to the studio.
  for (const track of stream.getTracks()) {
    pc.addTransceiver(track, { direction: 'sendonly', streams: [stream] });
  }

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGathering(pc, options.gatherTimeoutMs ?? 4000);

  const sdp = pc.localDescription?.sdp;
  if (!sdp) {
    pc.close();
    throw new Error('Failed to create local SDP offer');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/sdp' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let res: Response;
  try {
    res = await fetch(endpoint, { method: 'POST', headers, body: sdp });
  } catch (err) {
    pc.close();
    throw new Error(`WHIP request failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!res.ok) {
    pc.close();
    const detail = await res.text().catch(() => '');
    throw new Error(`WHIP server rejected publish: ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 200)}` : ''}`);
  }

  const answer = await res.text();
  if (!answer.includes('v=0')) {
    pc.close();
    throw new Error('WHIP server returned an invalid SDP answer');
  }
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });

  // The server allocates a resource URL in the Location header; DELETE on it
  // ends the session cleanly. Resolve it against the endpoint for relative paths.
  const location = res.headers.get('Location');
  let resource: string | null = null;
  if (location) {
    try { resource = new URL(location, endpoint).toString(); } catch { resource = location; }
  }

  const close = async () => {
    if (resource) {
      try {
        await fetch(resource, {
          method: 'DELETE',
          headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
        });
      } catch { /* server may already have reaped the session */ }
    }
    pc.close();
  };

  return { close, pc, resource };
}
