'use client';

import { useAppContext } from '@/lib/store';
import { Subject } from '@/lib/types';
import { clsx } from 'clsx';

const SUBJECTS: Subject[] = ['语文', '数学', '英语', '物理', '化学', '生物'];

export function SubjectSelector() {
  const { state, dispatch } = useAppContext();

  return (
    <div className="flex gap-2 p-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
      {SUBJECTS.map((sub) => (
        <button
          key={sub}
          onClick={() => dispatch({ type: 'SET_SUBJECT', payload: sub })}
          className={clsx(
            'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
            state.currentSubject === sub
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          {sub}
        </button>
      ))}
    </div>
  );
}
