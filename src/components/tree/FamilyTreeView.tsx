import { useMemo } from 'react';
import { Person, Generation, GENERATION_LABELS, GENERATION_ORDER } from '../../types';
import { groupByGeneration } from '../../utils/helpers';
import PersonNode from './PersonNode';

interface Props {
  persons:      Person[];
  highlightId?: string;
}

const GENERATION_THEMES: Record<Generation, { bg: string; border: string; label: string }> = {
  GREAT_GRANDPARENT: { bg: 'bg-purple-50',  border: 'border-purple-200', label: 'text-purple-700' },
  GRANDPARENT:       { bg: 'bg-blue-50',    border: 'border-blue-200',   label: 'text-blue-700'   },
  PARENT:            { bg: 'bg-green-50',   border: 'border-green-200',  label: 'text-green-700'  },
  CURRENT:           { bg: 'bg-gold-50',    border: 'border-gold-200',   label: 'text-gold-700'   },
  CHILD:             { bg: 'bg-orange-50',  border: 'border-orange-200', label: 'text-orange-700' },
};

export default function FamilyTreeView({ persons, highlightId }: Props) {
  const grouped = useMemo(() => groupByGeneration(persons), [persons]);

  const activeGenerations = GENERATION_ORDER.filter(
    gen => (grouped.get(gen)?.length ?? 0) > 0,
  );

  if (persons.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">No family members found yet.</p>
        <p className="text-sm mt-1">Ancestors added by the admin will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto py-6">
      <div className="flex flex-col gap-0 min-w-max mx-auto" style={{ width: 'fit-content' }}>
        {activeGenerations.map((gen, genIdx) => {
          const members = grouped.get(gen) ?? [];
          const theme   = GENERATION_THEMES[gen];

          return (
            <div key={gen} className="flex flex-col items-center">
              {/* Generation header */}
              <div className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg mb-3 ${theme.bg} ${theme.border} border`}>
                <span className={`text-sm font-semibold ${theme.label}`}>
                  {GENERATION_LABELS[gen]}
                </span>
                <span className="text-xs text-gray-400">
                  ({members.length} {members.length === 1 ? 'person' : 'people'})
                </span>
              </div>

              {/* Person nodes in this generation */}
              <div className="flex flex-wrap justify-center gap-8 px-4">
                {members.map(person => (
                  <PersonNode
                    key={person.id}
                    person={person}
                    highlight={person.id === highlightId}
                  />
                ))}
              </div>

              {/* Connector line to next generation */}
              {genIdx < activeGenerations.length - 1 && (
                <div className="tree-connector-v h-8 mt-4" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
