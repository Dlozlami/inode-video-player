import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useVault } from "../store/VaultContext";
import styles from "./Settings.module.css";

export default function Settings() {
  const navigate = useNavigate();
  const {
    imageDuration,
    setImageDuration,
    vaultTags = [],
    addVaultTag,
    removeVaultTag,
  } = useVault();

  const [newTag, setNewTag] = useState("");
  const [tagError, setTagError] = useState("");
  const inputRef = useRef(null);

  const handleAddTag = () => {
    const items = newTag
      .split(/[\n,]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t && !vaultTags.includes(t));

    if (!items.length) {
      setTagError("No new tags to add");
      return;
    }

    items.forEach((tag) => addVaultTag(tag));
    setNewTag("");
    setTagError("");
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleAddTag();
    if (e.key === "Escape") setNewTag("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.back} onClick={() => navigate("/")}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <h1 className={styles.title}>Settings</h1>
        </div>

        {/* ── Tag Vocabulary ── */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Tag Vocabulary</div>
          <p className={styles.sectionDesc}>
            These tags are available in the player while watching. Stored in{" "}
            <code className={styles.code}>
              ~/.config/inode-media-pro/vault_tags.json
            </code>
          </p>

          {/* Add tag */}
          <div className={styles.addRow}>
            <input
              ref={inputRef}
              className={styles.addInput}
              placeholder="new tag name..."
              value={newTag}
              onChange={(e) => {
                setNewTag(e.target.value);
                setTagError("");
              }}
              onKeyDown={onKeyDown}
            />
            <button className={styles.addBtn} onClick={handleAddTag}>
              Add
            </button>
          </div>
          {tagError && <span className={styles.error}>{tagError}</span>}

          {/* Tag list */}
          <div className={styles.tagGrid}>
            {vaultTags.length === 0 ? (
              <p className={styles.empty}>
                No tags yet. Add your first one above.
              </p>
            ) : (
              vaultTags.map((tag) => (
                <div key={tag} className={styles.tagChip}>
                  <span className={styles.tagLabel}>{tag}</span>
                  <button
                    className={styles.tagDelete}
                    onClick={() => removeVaultTag(tag)}
                    title="Delete tag"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Playback ── */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Playback</div>

          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <span>Image display duration</span>
              <span className={styles.rowDesc}>
                Seconds each image shows before advancing
              </span>
            </div>
            <div className={styles.rowControl}>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={imageDuration}
                onChange={(e) => setImageDuration(parseInt(e.target.value))}
                className={styles.slider}
              />
              <input
                type="number"
                min="1"
                max="3600"
                value={imageDuration}
                onChange={(e) =>
                  setImageDuration(Math.max(1, parseInt(e.target.value) || 1))
                }
                className={styles.numInput}
              />
              <span className={styles.unit}>s</span>
            </div>
          </div>
        </section>

        {/* ── Shortcuts ── */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Keyboard Shortcuts</div>
          <div className={styles.shortcuts}>
            {[
              ["Space", "Play / Pause"],
              ["S", "Stop → back to library"],
              ["F", "Fullscreen"],
              ["→ / ←", "Next / Prev file"],
              ["Shift+→ / ←", "Seek ±3s"],
              ["Alt+→ / ←", "Seek ±10s"],
              ["Ctrl+→ / ←", "Seek ±60s"],
              ["↑ / ↓", "Volume ±5%"],
              ["M", "Mute"],
              ["L", "Loop toggle"],
              ["N / P", "Next / Prev"],
              ["E", "Next frame (paused)"],
            ].map(([key, desc]) => (
              <div key={key} className={styles.shortcutRow}>
                <code className={styles.key}>{key}</code>
                <span className={styles.rowDesc}>{desc}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
