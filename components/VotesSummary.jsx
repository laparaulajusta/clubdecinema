export default function VotesSummary({ pelis }) {
  if (pelis.length === 0) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg space-y-3">
      <div>
        <h3 className="text-xl font-bold text-slate-100">Resum de vots</h3>
        <p className="text-xs text-slate-400 mt-1">Qui ha votat cada pel·lícula de la ronda actual.</p>
      </div>

      <ul className="divide-y divide-slate-700/60">
        {pelis.map(peli => {
          const votsSenseUsuari = peli.votes - peli.votants.length;
          return (
            <li key={peli._id} className="py-3 flex gap-3 items-start">
              {peli.poster ? (
                <img src={`https://image.tmdb.org/t/p/w92${peli.poster}`} alt={peli.title} className="w-8 h-12 object-cover rounded shadow flex-shrink-0" />
              ) : (
                <div className="w-8 h-12 bg-slate-700 rounded flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-slate-100 truncate">{peli.title}</h4>
                  {peli.guanyadora && (
                    <span title="Guanyadora" className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium">🏆</span>
                  )}
                  <span className="ms-auto text-sm font-bold text-emerald-400 flex-shrink-0">⭐ {peli.votes}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {peli.votants.map(votant => (
                    <span
                      key={votant.username}
                      title={`@${votant.username}`}
                      className="text-[11px] bg-slate-900 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md"
                    >
                      {votant.name}
                    </span>
                  ))}
                  {votsSenseUsuari > 0 && (
                    <span title="Vots sense usuari associat (correccions manuals o vots anteriors al login)" className="text-[11px] text-slate-500 italic py-0.5">
                      +{votsSenseUsuari} sense usuari
                    </span>
                  )}
                  {peli.votes === 0 && peli.votants.length === 0 && (
                    <span className="text-[11px] text-slate-500 py-0.5">Encara cap vot</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
