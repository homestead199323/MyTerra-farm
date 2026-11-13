/* Shopping list made by the earlier guided setup: ticked off on the jobs card, gone once everything is bought. */
export default function StarterKit({data,setData}) {
  const kit = data.starterKit;
  if (!kit || kit.dismissed || !Array.isArray(kit.items) || kit.items.length === 0) return null;
  const done = kit.items.filter(i => i.done).length, all = done === kit.items.length;
  const toggle = id => setData({...data, starterKit: {...kit, items: kit.items.map(i => i.id === id ? {...i, done: !i.done} : i)}});
  return <section className="mt-kit" aria-label="Starter kit">
    <div className="mt-kit-head">
      <span><strong>Your starter kit</strong><small>{all ? 'All set. Time to sow!' : `${done} of ${kit.items.length} ready · tick things off as you get them`}</small></span>
      {all && <button type="button" className="q-text-button" onClick={() => setData({...data, starterKit: {...kit, dismissed: true}})}>Hide</button>}
    </div>
    {kit.items.map(function(i) {
      return <label key={i.id} className={`mt-kit-item${i.done ? ' done' : ''}`}>
        <input type="checkbox" checked={!!i.done} onChange={function(){ toggle(i.id); }}/>
        <span><b>{i.label}</b>{i.detail && <small>{i.detail}</small>}</span>
      </label>;
    })}
  </section>;
}
