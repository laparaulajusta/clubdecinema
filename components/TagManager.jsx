'use client';
import { useState } from "react";
import { useFormStatus } from "react-dom";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

function AfegirCategoriaButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
        pending
          ? "bg-emerald-700 text-emerald-200 cursor-wait"
          : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
      }`}
    >
      {pending && <span className="w-3 h-3 border-2 border-emerald-200 border-t-transparent rounded-full animate-spin" />}
      {pending ? "Afegint..." : "➕ Afegir"}
    </button>
  );
}

export default function TagManager({ tags, afegirTag, eliminarTag }) {
  const [tagToDelete, setTagToDelete] = useState(null);

  const eliminarCategoria = () => {
    const formData = new FormData();
    formData.append("id", tagToDelete._id);
    return eliminarTag(formData);
  };

  return (
    <>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg h-fit">
        <h4 className="font-bold text-sm text-slate-200 mb-4">
          Afegir categories
        </h4>
        <form action={afegirTag} className="flex gap-4 mb-6">
          <input
            type="text"
            name="name"
            placeholder="Nova categoria (ex: Acció...)"
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 flex-1 shadow-inner"
          />
          <AfegirCategoriaButton />
        </form>

        <div>
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Categories existents:
          </h5>
          <div className="flex flex-wrap gap-2">
            {tags.length > 0 ? (
              tags.map((tag) => (
                <span
                  key={tag._id}
                  className="bg-slate-900 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm flex items-center gap-2"
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => setTagToDelete(tag)}
                    className="text-slate-500 hover:text-rose-400 transition cursor-pointer leading-none"
                    title="Eliminar categoria"
                  >
                    ✕
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500">
                No hi ha categories creades.
              </span>
            )}
          </div>
        </div>
      </div>

      {tagToDelete && (
        <ConfirmDeleteModal
          title="Eliminar categoria"
          onConfirm={eliminarCategoria}
          onClose={() => setTagToDelete(null)}
        >
          Segur que vols eliminar la categoria <span className="text-slate-200 font-medium">{tagToDelete.name}</span>? Aquesta acció no es pot desfer i les pel·lícules que la tenien assignada es quedaran sense categoria.
        </ConfirmDeleteModal>
      )}
    </>
  );
}
