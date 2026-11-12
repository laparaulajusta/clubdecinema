'use client';
import { useState } from 'react';
import { MESOS, ANYS } from '@/lib/constants';

export default function ArchiveSection({ onArchive, numPelisVotacio }) {
  const [selectedMonth, setSelectedMonth] = useState(MESOS[0]);
  const [selectedYear, setSelectedYear] = useState(ANYS[0]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const roundName = `${selectedMonth} ${selectedYear}`;
    try {
      const res = await onArchive(roundName);
      if (res && !res.success) {
        setMessage({ success: false, text: res.error });
      } else {
        setMessage({ success: true, text: 'Ronda tancada i arxivada correctament!' });
      }
    } catch (err) {
      setMessage({ success: false, text: 'S\'ha produït un error en arxivar.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-amber-950/30 border border-amber-600/30 p-6 rounded-2xl shadow-xl space-y-4">
      <h2 className="text-xl font-bold text-amber-300">Tancar Mes Actual i Arxivar a l'Històric</h2>
      <p className="text-xs text-amber-200/70">Selecciona el mes i l'any per arxivar les {numPelisVotacio} pel·lícules en votació de manera robusta sense duplicats.</p>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-center">
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)} 
          className="bg-slate-950 border border-amber-600/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
        >
          {MESOS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(Number(e.target.value))} 
          className="bg-slate-950 border border-amber-600/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
        >
          {ANYS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-sm font-semibold px-5 py-2.5 rounded-xl transition text-slate-950 disabled:opacity-50">
          {loading ? 'Arxivant...' : 'Tancar i Arxivar'}
        </button>
      </form>
      {message && (
        <div className={`text-xs p-3 rounded-xl border ${message.success ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'}`}>
          {message.text}
        </div>
      )}
    </section>
  );
}