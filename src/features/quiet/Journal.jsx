import { entryLabel } from "../../lib/diary";
export default function Journal({ data, setData, zoneId, plotId }) {
  const entries = (data.observations || [])
    // A walk note belongs to its crop. Older area-level notes (no plotId) still show on each crop they covered.
    .filter((e) => (plotId ? e.plotId === plotId || (!e.plotId && e.plotIds?.includes(plotId)) : e.zoneId === zoneId))
    .slice()
    .reverse();
  if (!entries.length) return null;
  return (
    <section className="q-journal">
      <div className="q-eyebrow">Your growing story</div>
      <h3>Field journal</h3>
      {!entries.length ? (
        <p>Checks, notes and photos from your walks will appear here.</p>
      ) : (
        entries.map((e) => (
          <article key={e.id}>
            <div className="q-row q-between">
              <strong>
                {entryLabel(e)}
              </strong>
              <small>{new Date(e.at).toLocaleDateString()}</small>
            </div>
            {e.note && <p>{e.note}</p>}
            {e.photo && (
              <>
                <img src={e.photo} alt={`Farm observation: ${e.note || e.status}`} loading="lazy" />
                {setData && (
                  <button
                    className="q-text-button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this photo? The check and text note will stay in your journal.",
                        )
                      )
                        setData({
                          ...data,
                          observations: data.observations.map((entry) =>
                            entry.id === e.id ? { ...entry, photo: null } : entry,
                          ),
                        });
                    }}
                  >
                    Remove photo
                  </button>
                )}
              </>
            )}
            {e.tasks?.length > 0 && (
              <small>
                {e.tasks.length} task{e.tasks.length === 1 ? "" : "s"} completed
              </small>
            )}
          </article>
        ))
      )}
    </section>
  );
}
