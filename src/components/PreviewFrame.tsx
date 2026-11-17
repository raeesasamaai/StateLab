import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { reportSchema, type Config, type FrameReport } from "../lib/model";
export default function PreviewFrame({
  config,
  onReport,
  onAction,
  fit,
}: {
  config: Config;
  onReport: (r: FrameReport | null) => void;
  onAction: (a: "retry" | "restore") => void;
  fit: boolean;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const token = useRef(crypto.randomUUID());
  const [available, setAvailable] = useState(800);
  const [height, setHeight] = useState(680);
  const latest = useRef({ config, onReport, onAction });
  latest.current = { config, onReport, onAction };
  function send() {
    iframe.current?.contentWindow?.postMessage(
      {
        channel: "statelab:config",
        token: token.current,
        config: latest.current.config,
      },
      location.origin,
    );
  }
  useLayoutEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) =>
      setAvailable(Math.max(200, entries[0].contentRect.width - 48)),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    token.current = crypto.randomUUID();
    onReport(null);
    send();
  }, [config]);
  useEffect(() => {
    function receive(e: MessageEvent) {
      if (
        e.source !== iframe.current?.contentWindow ||
        e.origin !== location.origin
      )
        return;
      if (e.data?.channel === "statelab:ready") {
        send();
        return;
      }
      if (e.data?.token !== token.current) return;
      if (e.data.channel === "statelab:report") {
        const r = reportSchema.safeParse(e.data.report);
        if (r.success) {
          setHeight(Math.max(350, Math.ceil(r.data.height)));
          latest.current.onReport(r.data);
        }
      }
      if (
        e.data.channel === "statelab:action" &&
        ["retry", "restore"].includes(e.data.action)
      )
        latest.current.onAction(e.data.action);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  const scale = fit ? Math.min(1, available / config.width) : 1;
  return (
    <div className="canvas-scroll" ref={container}>
      <div className="canvas-meta">
        <span>
          <i /> LIVE COMPONENT PREVIEW
        </span>
        <span>
          {config.width}px · {Math.round(scale * 100)}% zoom
        </span>
      </div>
      <div
        className="frame-space"
        style={{ width: config.width * scale, height: height * scale }}
      >
        <iframe
          title={`${config.component} component at ${config.width} pixels`}
          src="/preview.html"
          onLoad={send}
          ref={iframe}
          style={{
            width: config.width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
      <p className="canvas-caption">
        {fit && scale < 1
          ? "Scaled to fit this canvas. The component still renders at the selected CSS width."
          : "An actual viewport, not a static mockup."}
      </p>
    </div>
  );
}
