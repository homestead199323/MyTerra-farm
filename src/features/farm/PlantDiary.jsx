import { useRef, useState } from "react";
import { Droplets, Sprout, TriangleAlert, NotebookPen, Camera, Check, X } from "lucide-react";
import { addDiary, removeDiary, diaryOf, diaryDate, entryLabel, openIssues, PHOTO_BUDGET } from "../../lib/diary";
import { compressPhoto } from "../../lib/photo";
import { uid } from "../../lib/storage";
import { toast } from "../../lib/toast";

/* ═══════════════════════════════════════════
   PLANT DIARY — on the crop card (2026-11-11)
   One tap for Watered and Fed; Problem and Note take a line of text; Photo opens the camera.
   Photos line up oldest to newest (the plant growing up); every entry is in the list under them,
   together with the checks from the morning walk.
   ═══════════════════════════════════════════ */
const ICON = { water: Droplets, feed: Sprout, issue: TriangleAlert, note: NotebookPen, photo: Camera, ok: Check };
const SHOWN = 5;

export default function PlantDiary({ data, setData, plot }) {
  const [mode, setMode] = useState(null); // "note" | "issue": the line of text is open
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [all, setAll] = useState(false);
  const [big, setBig] = useState(null);
  const file = useRef(null);

  const entries = diaryOf(data, plot.id);
  const photos = entries.filter(function (e) { return e.photo; }).slice().reverse();
  const open = openIssues(data.observations).filter(function (e) { return e.plotId === plot.id; });
  const shown = all ? entries : entries.slice(0, SHOWN);
  const bigEntry = big ? photos.find(function (e) { return e.id === big; }) : null;

  function add(fields) { setData(addDiary(data, plot, fields, new Date().toISOString(), uid())); }
  function quick(kind) { add({ kind }); toast(entryLabel({ kind })); }
  function write(kind) { setError(""); setText(""); setMode(mode === kind ? null : kind); }
  function save(e) {
    e.preventDefault();
    if (mode === "note" && !text.trim()) return;
    add({ kind: mode, note: text });
    setMode(null); setText("");
  }
  async function onPhoto(e) {
    const picked = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!picked) return;
    setBusy(true); setError("");
    try {
      const photo = await compressPhoto(picked);
      if (JSON.stringify(data).length + photo.length > PHOTO_BUDGET) setError("Photo storage is full. Remove older photos first.");
      else add({ kind: "photo", photo });
    } catch {
      setError("This photo could not be read. Try a JPEG or PNG.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pd" aria-label="Diary">
      {setData && (
        <div className="pd-actions">
          <button type="button" onClick={function () { quick("water"); }}><Droplets size={20} />Watered</button>
          <button type="button" onClick={function () { quick("feed"); }}><Sprout size={20} />Fed</button>
          <button type="button" className="warn" aria-expanded={mode === "issue"} onClick={function () { write("issue"); }}><TriangleAlert size={20} />Problem</button>
          <button type="button" aria-expanded={mode === "note"} onClick={function () { write("note"); }}><NotebookPen size={20} />Note</button>
          <button type="button" disabled={busy} onClick={function () { if (file.current) file.current.click(); }}><Camera size={20} />Photo</button>
          <input ref={file} type="file" accept="image/*" hidden onChange={onPhoto} aria-label="Add a photo" />
        </div>
      )}
      {mode && (
        <form className="pd-write" onSubmit={save}>
          <input autoFocus value={text} maxLength={500} onChange={function (e) { setText(e.target.value); }} placeholder={mode === "issue" ? "What is wrong?" : "Note"} aria-label={mode === "issue" ? "What is wrong?" : "Note"} />
          <button type="submit" className="q-button">Save</button>
        </form>
      )}
      {error && <p className="pd-error" role="alert">{error}</p>}
      {photos.length > 0 && (
        <div className="pd-photos">
          {photos.map(function (e) {
            return (
              <button type="button" key={e.id} className={big === e.id ? "on" : ""} aria-pressed={big === e.id} onClick={function () { setBig(big === e.id ? null : e.id); }}>
                <img src={e.photo} alt={(plot.name || plot.crop) + ", " + diaryDate(e.at)} loading="lazy" />
                <small>{diaryDate(e.at)}</small>
              </button>
            );
          })}
        </div>
      )}
      {bigEntry && <img className="pd-big" src={bigEntry.photo} alt={(plot.name || plot.crop) + ", " + diaryDate(bigEntry.at)} />}
      {entries.length > 0 && (
        <ul className="pd-list">
          {shown.map(function (e) {
            const Icon = ICON[e.kind] || Check;
            const isOpen = open.some(function (o) { return o.id === e.id; });
            return (
              <li key={e.id} className={e.status === "issue" ? "issue" : ""}>
                <Icon size={18} aria-hidden="true" />
                <span className="pd-what"><strong>{entryLabel(e)}</strong>{e.note ? <span>{e.note}</span> : null}</span>
                {isOpen && setData && <button type="button" className="pd-sorted" onClick={function () { add({ kind: "ok" }); }}>Mark resolved</button>}
                <small>{diaryDate(e.at)}</small>
                {e.kind && setData && <button type="button" className="pd-x" aria-label={"Remove " + entryLabel(e) + ", " + diaryDate(e.at)} onClick={function () { if (big === e.id) setBig(null); setData(removeDiary(data, e.id)); }}><X size={16} /></button>}
              </li>
            );
          })}
        </ul>
      )}
      {entries.length > SHOWN && <button type="button" className="q-text-button" onClick={function () { setAll(!all); }}>{all ? "Show less" : "All " + entries.length + " entries"}</button>}
    </section>
  );
}
