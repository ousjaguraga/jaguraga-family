import { Link } from 'react-router-dom';
import { getUrl } from 'aws-amplify/storage';
import { useEffect, useState } from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { Person, GENERATION_LABELS, type Generation } from '../types';
import { fullName, initials, formatDate } from '../utils/helpers';

const GEN_GRADIENT: Record<Generation, string> = {
  GREAT_GRANDPARENT: 'from-purple-500 to-violet-600',
  GRANDPARENT:       'from-blue-500 to-cyan-600',
  PARENT:            'from-emerald-500 to-teal-600',
  CURRENT:           'from-gold-400 to-amber-500',
  CHILD:             'from-orange-400 to-rose-500',
};

const GEN_BADGE: Record<Generation, string> = {
  GREAT_GRANDPARENT: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  GRANDPARENT:       'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  PARENT:            'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  CURRENT:           'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  CHILD:             'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
};

interface Props {
  person:   Person;
  compact?: boolean;
}

export default function PersonCard({ person, compact = false }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!person.photoKey) return;
    getUrl({ path: person.photoKey })
      .then(({ url }) => setPhotoUrl(url.toString()))
      .catch(() => {});
  }, [person.photoKey]);

  const gradient = GEN_GRADIENT[person.generation] ?? 'from-gray-400 to-gray-500';
  const badge    = GEN_BADGE[person.generation]    ?? 'bg-gray-100 text-gray-600';

  return (
    <Link
      to={`/person/${person.id}`}
      className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-100
        hover:shadow-[0_8px_30px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
      style={{ padding: compact ? '14px 16px' : '18px 20px' }}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 rounded-2xl overflow-hidden
        flex items-center justify-center font-bold text-white
        bg-gradient-to-br ${gradient}
        shadow-sm
        ${compact ? 'w-11 h-11 text-sm rounded-xl' : 'w-14 h-14 text-base'}`}>
        {photoUrl
          ? <img src={photoUrl} alt={fullName(person)} className="w-full h-full object-cover" />
          : <span>{initials(person)}</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`font-serif font-bold text-gray-900 group-hover:text-burgundy-700
            transition-colors truncate leading-tight
            ${compact ? 'text-sm' : 'text-[15px]'}`}>
            {fullName(person)}
          </h3>
          <span className={`badge flex-shrink-0 text-[10px] font-semibold ${badge}`}>
            {GENERATION_LABELS[person.generation]}
          </span>
        </div>

        {!compact && (
          <div className="space-y-0.5">
            {person.birthDate && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(person.birthDate)}{person.deathDate ? ` – ${formatDate(person.deathDate)}` : ''}</span>
              </div>
            )}
            {person.birthPlace && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{person.birthPlace}</span>
              </div>
            )}
          </div>
        )}

        {person.isDeceased && (
          <span className="text-[10px] text-gray-400 font-medium">† Deceased</span>
        )}
      </div>
    </Link>
  );
}
