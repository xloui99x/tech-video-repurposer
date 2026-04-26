import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type Format = {
  name: string;
  width: number;
  height: number;
  label: string;
};

type Highlight = {
  id: number;
  time: number;
  duration: number;
  note: string;
};

const formats: Format[] = [
  { name: "Full HD", width: 1920, height: 1080, label: "1920×1080" },
  { name: "4K", width: 3840, height: 2160, label: "3840×2160" },
  { name: "LinkedIn Square", width: 1080, height: 1080, label: "1080×1080" },
  { name: "Reels / TikTok", width: 1080, height: 1920, label: "1080×1920" },
];

function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ffmpegRef = useRef(new FFmpeg());

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<Format>(formats[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  const activeHighlight =
    highlights.find((highlight) => highlight.id === activeId) || highlights[0];

  async function loadFFmpeg() {
    const ffmpeg = ffmpegRef.current;

    if (ffmpeg.loaded) return;

    setExportStatus("Loading video engine...");

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });
  }

  function uploadVideo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setHighlights([]);
    setActiveId(null);
    setExportStatus("");
  }

  function markHighlight() {
    if (!videoRef.current) return;

    const newHighlight: Highlight = {
      id: Date.now(),
      time: videoRef.current.currentTime,
      duration: 15,
      note: "",
    };

    setHighlights((current) => [...current, newHighlight]);
    setActiveId(newHighlight.id);
  }

  function updateHighlight(id: number, updates: Partial<Highlight>) {
    setHighlights((current) =>
      current.map((highlight) =>
        highlight.id === id ? { ...highlight, ...updates } : highlight
      )
    );
  }

  function playHighlight(time: number) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    videoRef.current.play();
  }

  async function exportClip() {
    if (!videoFile || !activeHighlight) return;

    setIsExporting(true);
    setExportStatus("Preparing export...");

    try {
      await loadFFmpeg();

      const ffmpeg = ffmpegRef.current;
      const inputName = "input.mp4";
      const outputName = `clip-${activeHighlight.id}-${selectedFormat.width}x${selectedFormat.height}.mp4`;

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      setExportStatus("Rendering video clip...");

      await ffmpeg.exec([
        "-ss",
        String(activeHighlight.time),
        "-t",
        String(activeHighlight.duration),
        "-i",
        inputName,
        "-vf",
        `scale=${selectedFormat.width}:${selectedFormat.height}:force_original_aspect_ratio=increase,crop=${selectedFormat.width}:${selectedFormat.height}`,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "28",
        "-c:a",
        "aac",
        "-movflags",
        "faststart",
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = outputName;
      link.click();

      setExportStatus("Export complete.");
    } catch (error) {
      console.error(error);
      setExportStatus("Export failed. Try a shorter clip first.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <p style={styles.label}>Frontend / Media Tech Project</p>
        <h1 style={styles.h1}>Video Highlight Exporter</h1>
        <p style={styles.heroText}>
          Upload a long video, mark strong moments, describe why they matter,
          and export real video clips for Full HD, 4K, LinkedIn Square or Reels.
        </p>
      </section>

      <section style={styles.grid}>
        <div style={styles.card}>
          <h2>1. Upload video</h2>
          <input type="file" accept="video/*" onChange={uploadVideo} />

          {videoUrl && (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                style={styles.video}
              />

              <button style={styles.primaryButton} onClick={markHighlight}>
                Mark highlight at current time
              </button>
            </>
          )}

          <h2>2. Highlights</h2>

          {highlights.length === 0 ? (
            <p style={styles.muted}>
              Watch the video and click “Mark highlight” when you find a useful
              moment.
            </p>
          ) : (
            <div style={styles.list}>
              {highlights.map((highlight, index) => (
                <div
                  key={highlight.id}
                  onClick={() => setActiveId(highlight.id)}
                  style={{
                    ...styles.highlight,
                    borderColor:
                      highlight.id === activeId ? "#2563eb" : "#d1d5db",
                    background:
                      highlight.id === activeId ? "#eff6ff" : "#f9fafb",
                  }}
                >
                  <div style={styles.row}>
                    <strong>
                      Clip {index + 1} · {formatTime(highlight.time)}
                    </strong>

                    <button
                      style={styles.smallButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        playHighlight(highlight.time);
                      }}
                    >
                      Play
                    </button>
                  </div>

                  <label style={styles.labelSmall}>Why is this useful?</label>
                  <textarea
                    value={highlight.note}
                    placeholder="Example: explains how 5G improves media workflows"
                    onChange={(event) =>
                      updateHighlight(highlight.id, {
                        note: event.target.value,
                      })
                    }
                    style={styles.textarea}
                  />

                  <label style={styles.labelSmall}>Clip duration</label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    value={highlight.duration}
                    onChange={(event) =>
                      updateHighlight(highlight.id, {
                        duration: Number(event.target.value),
                      })
                    }
                    style={styles.input}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2>3. Export version</h2>

          <select
            value={selectedFormat.name}
            onChange={(event) => {
              const format = formats.find(
                (item) => item.name === event.target.value
              );
              if (format) setSelectedFormat(format);
            }}
            style={styles.select}
          >
            {formats.map((format) => (
              <option key={format.name} value={format.name}>
                {format.name} — {format.label}
              </option>
            ))}
          </select>

          <div style={styles.preview}>
            {videoUrl ? (
              <video src={videoUrl} muted autoPlay loop style={styles.previewVideo} />
            ) : (
              <div style={styles.empty}>Upload video first</div>
            )}

            {activeHighlight && (
              <div style={styles.overlay}>
                <strong>
                  {activeHighlight.note || "Selected highlight"}
                </strong>
                <span>
                  {formatTime(activeHighlight.time)} ·{" "}
                  {activeHighlight.duration}s · {selectedFormat.label}
                </span>
              </div>
            )}
          </div>

          <button
            style={styles.primaryButton}
            onClick={exportClip}
            disabled={!videoFile || !activeHighlight || isExporting}
          >
            {isExporting ? "Exporting..." : "Export real video clip"}
          </button>

          {exportStatus && <p style={styles.status}>{exportStatus}</p>}

          <div style={styles.infoBox}>
            <strong>What this solves:</strong>
            <p>
              Instead of manually searching, cutting and resizing clips, this
              tool lets a creator or media team mark moments while watching and
              export platform-ready formats quickly.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f4f5",
    color: "#111827",
    fontFamily: "Arial, sans-serif",
    padding: "40px 20px",
  },
  hero: {
    maxWidth: "1120px",
    margin: "0 auto 32px",
  },
  label: {
    color: "#2563eb",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  h1: {
    fontSize: "48px",
    margin: "0 0 12px",
  },
  heroText: {
    maxWidth: "820px",
    fontSize: "20px",
    lineHeight: 1.5,
  },
  grid: {
    maxWidth: "1120px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 460px",
    gap: "32px",
    alignItems: "start",
  },
  card: {
    background: "white",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  video: {
    width: "100%",
    marginTop: "18px",
    borderRadius: "16px",
  },
  primaryButton: {
    width: "100%",
    marginTop: "18px",
    border: 0,
    borderRadius: "12px",
    padding: "14px 16px",
    background: "#2563eb",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  muted: {
    color: "#6b7280",
    lineHeight: 1.5,
  },
  list: {
    display: "grid",
    gap: "14px",
  },
  highlight: {
    border: "1px solid",
    borderRadius: "16px",
    padding: "16px",
    cursor: "pointer",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
  },
  smallButton: {
    border: 0,
    borderRadius: "10px",
    padding: "8px 12px",
    background: "#111827",
    color: "white",
    cursor: "pointer",
  },
  labelSmall: {
    display: "block",
    marginTop: "12px",
    marginBottom: "6px",
    fontWeight: 700,
  },
  textarea: {
    width: "100%",
    minHeight: "80px",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    fontFamily: "inherit",
    fontSize: "15px",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
  },
  select: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
  },
  preview: {
    height: "420px",
    borderRadius: "28px",
    overflow: "hidden",
    background: "#020617",
    position: "relative",
    marginTop: "22px",
  },
  previewVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  empty: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9ca3af",
  },
  overlay: {
    position: "absolute",
    left: "18px",
    right: "18px",
    bottom: "18px",
    padding: "16px",
    borderRadius: "18px",
    background: "rgba(0,0,0,0.68)",
    color: "white",
    display: "grid",
    gap: "8px",
  },
  status: {
    marginTop: "12px",
    color: "#2563eb",
    fontWeight: 700,
  },
  infoBox: {
    marginTop: "24px",
    padding: "18px",
    borderRadius: "16px",
    background: "#f9fafb",
    lineHeight: 1.5,
  },
};