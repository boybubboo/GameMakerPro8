import React from 'react';
import { Plus, X } from 'lucide-react';
import { EntityKindMeta, EntitySectionMeta } from '../../data/registries';
import type { EntityKind } from '../../types/maker';
import { AssetThumbnail } from './AssetThumbnail';

export const AddEntityModal: React.FC<{
  onClose: () => void;
  onAdd: (kind: EntityKind, name: string) => void;
}> = ({ onClose, onAdd }) => {
  const allKinds = Object.keys(EntityKindMeta) as EntityKind[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-50 dark:bg-[#12151E] text-slate-900 dark:text-[#F3F5FA] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/[0.1] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#171A23] border-b border-slate-200/80 dark:border-white/[0.08]">
          <div>
            <h2 className="text-lg font-extrabold">Add to this level</h2>
            <p className="text-xs text-slate-500 dark:text-[#949BB0]">
              Pick anything to drop onto your island.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1F2430] flex items-center justify-center text-slate-500 dark:text-[#949BB0] hover:text-slate-900 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto maker-scroll">
          {EntitySectionMeta.map((section) => {
            const kinds = allKinds.filter(
              (k) => EntityKindMeta[k].section === section.id && EntityKindMeta[k].isAddable
            );
            if (kinds.length === 0) return null;
            return (
              <div key={section.id} className="space-y-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-[#8E96AB]">
                  {section.title}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {kinds.map((kind) => {
                    const meta = EntityKindMeta[kind];
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => {
                          onAdd(kind, meta.defaultName);
                          onClose();
                        }}
                        className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white dark:bg-[#171A23] border border-slate-200/80 dark:border-white/[0.08] hover:border-[#7C5CFF] text-left transition-all group"
                      >
                        <AssetThumbnail kind={kind} size={46} rounded="rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">{meta.defaultName}</div>
                          <div className="text-[11px] text-slate-500 dark:text-[#8E96AB] truncate">
                            {meta.title}
                          </div>
                        </div>
                        <Plus
                          size={14}
                          className="shrink-0 text-slate-400 dark:text-[#6B7285] group-hover:text-[#7C5CFF]"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
