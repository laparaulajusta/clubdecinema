'use client';
import { useState, useTransition } from 'react';
import { afegirComentari, editarComentari } from '@/app/actions/comments';
import { obrirModalLogin } from '@/lib/events';
import { MAX_CARACTERS_COMENTARI } from '@/lib/constants';

const botoTextClass = 'text-slate-400 hover:text-indigo-300 transition cursor-pointer';

function TextResaltat({ text, cerca }) {
  const terme = cerca.trim().toLowerCase();
  if (!terme) return text;

  const textMinuscules = text.toLowerCase();
  const trossos = [];
  let inici = 0;
  for (let index = textMinuscules.indexOf(terme); index !== -1; index = textMinuscules.indexOf(terme, inici)) {
    if (index > inici) trossos.push(text.slice(inici, index));
    trossos.push(
      <mark key={index} className="bg-amber-400/30 text-amber-100 rounded-sm">
        {text.slice(index, index + terme.length)}
      </mark>
    );
    inici = index + terme.length;
  }
  trossos.push(text.slice(inici));
  return <>{trossos}</>;
}

function FormulariText({ valorInicial = '', placeholder, textBoto, textPendent, onDesar, onTancar }) {
  const [text, setText] = useState(valorInicial);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const net = text.trim();
  const senseCanvis = !net || net === valorInicial.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (senseCanvis) return;
    setError('');
    startTransition(async () => {
      try {
        const res = await onDesar(net);
        if (res?.success) onTancar();
        else setError(res?.error || "No s'han pogut desar els canvis.");
      } catch {
        setError("S'ha produït un error inesperat.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 mt-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_CARACTERS_COMENTARI}
        rows={2}
        placeholder={placeholder}
        autoFocus
        disabled={isPending}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 shadow-inner resize-y disabled:opacity-60"
      />
      {error && (
        <div className="p-2.5 rounded-xl text-xs font-medium border bg-rose-500/10 border-rose-500/30 text-rose-300">{error}</div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onTancar}
          disabled={isPending}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-slate-600 hover:bg-slate-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel·lar
        </button>
        <button
          type="submit"
          disabled={isPending || senseCanvis}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            isPending
              ? 'bg-slate-600 text-slate-300 cursor-wait'
              : senseCanvis
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
          }`}
        >
          {isPending && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {isPending ? textPendent : textBoto}
        </button>
      </div>
    </form>
  );
}

function Comentari({ comentari, modeAdmin, destacat, cerca, onRespondre, onEliminar }) {
  const [editant, setEditant] = useState(false);
  const potEliminar = modeAdmin || comentari.editable;
  const potEditar = !modeAdmin && comentari.editable;

  const desarEdicio = (text) => {
    const formData = new FormData();
    formData.append('id', comentari._id);
    formData.append('text', text);
    return editarComentari(formData);
  };

  return (
    <div
      id={`comentari-${comentari._id}`}
      className={`rounded-lg outline-2 outline-offset-4 transition-[outline-color] duration-700 ${
        destacat === comentari._id ? 'outline-indigo-500/60' : 'outline-transparent'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-sm">
          <span className="font-semibold text-slate-100">{comentari.user?.name ?? 'Usuari eliminat'}</span>
          {comentari.user && <span className="text-xs text-slate-500 ml-1.5">@{comentari.user.username}</span>}
        </p>
        <span className="text-[11px] text-slate-500">
          {comentari.data}
          {comentari.editat && <span className="italic"> · editat</span>}
        </span>
      </div>

      {editant ? (
        <FormulariText
          valorInicial={comentari.text}
          textBoto="Desar"
          textPendent="Desant..."
          onDesar={desarEdicio}
          onTancar={() => setEditant(false)}
        />
      ) : (
        <p className="text-sm text-slate-300 leading-relaxed mt-1 whitespace-pre-line break-words">
          <TextResaltat text={comentari.text} cerca={cerca} />
        </p>
      )}

      {!editant && (onRespondre || potEditar || potEliminar) && (
        <div className="flex gap-4 mt-1.5 text-[11px] font-medium">
          {onRespondre && <button type="button" onClick={onRespondre} className={botoTextClass}>↩ Respon</button>}
          {potEditar && <button type="button" onClick={() => setEditant(true)} className={botoTextClass}>✏️ Editar</button>}
          {potEliminar && (
            <button type="button" onClick={() => onEliminar(comentari)} className="text-slate-400 hover:text-rose-300 transition cursor-pointer">
              🗑️ Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommentThread({ fil, usuari, modeAdmin = false, destacat, cerca = '', onEliminar }) {
  const [responent, setResponent] = useState(false);

  const obrirResposta = () => {
    if (!usuari) {
      obrirModalLogin("Per respondre comentaris has d'iniciar sessió o registrar-te.");
      return;
    }
    setResponent(true);
  };

  const desarResposta = (text) => {
    const formData = new FormData();
    formData.append('parentId', fil._id);
    formData.append('text', text);
    return afegirComentari(formData);
  };

  return (
    <article className="p-4">
      <Comentari
        comentari={fil}
        modeAdmin={modeAdmin}
        destacat={destacat}
        cerca={cerca}
        onRespondre={modeAdmin ? null : obrirResposta}
        onEliminar={onEliminar}
      />

      {(fil.respostes.length > 0 || responent) && (
        <div className="mt-3 ml-2 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-slate-700 space-y-4">
          {fil.respostes.map(resposta => (
            <Comentari
              key={resposta._id}
              comentari={resposta}
              modeAdmin={modeAdmin}
              destacat={destacat}
              cerca={cerca}
              onEliminar={onEliminar}
            />
          ))}
          {responent && (
            <FormulariText
              placeholder={`Respon a ${fil.user?.name ?? 'aquest comentari'}...`}
              textBoto="Respondre"
              textPendent="Enviant..."
              onDesar={desarResposta}
              onTancar={() => setResponent(false)}
            />
          )}
        </div>
      )}
    </article>
  );
}
