import { Link } from 'react-router-dom';
import { getUrl } from 'aws-amplify/storage';
import { useEffect, useState } from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { Person, GENERATION_LABELS } from '../types';
import { fullName, initials, formatDate } from '../utils/helpers';

const GENERATION_COLORS: Record<string, string> = {
  GREAT_GRANDPARENT: 'bg-purple-100 text-purple-800',
  GRANDPARENT:       'bg-blue-100 text-blue-800',
  PARENT:            'bg-green-100 text-green-800',
  CURRENT:           'bg-gold-100 text-gold-800',
  CHILD:             'bg-orange-100 text-orange-800',
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

  const badgeColor = GENERATION_COLORS[person.generation] ?? 'bg-gray-100 text-gray-700';

  return (
    <Link
      to={`/person/${person.id}`}
      className={`card hover:shadow-md transition-shadow group flex gap-4 ${compact ? 'p-4' : 'p-5'}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 rounded-full overflow-hidden bg-burgundy-100 flex items-center justify-center
        ${compact ? 'w-12 h-12 text-sm' : 'w-16 h-16 text-lg'} font-bold text-burgundy-700`}>
        {photoUrl
          ? <img src={photoUrl} alt={fullName(person)} className="w-full h-full object-cover" />
          : <span>{initials(person)}</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-serif font-semibold text-gray-900 group-hover:text-burgundy-800 transition-colors truncate
            ${compact ? 'text-base' : 'text-lg'}`}>
            {fullName(person)}
          </h3>
          <span className={`badge flex-shrink-0 ${badgeColor}`}>
            {GENERATION_LABELS[person.generation]}
          </span>
        </div>

        {!compact && (
          <div className="mt-1.5 space-y-1">
            {person.birthDate && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(person.birthDate)}{person.deathDate ? ` — ${formatDate(person.deathDate)}` : ''}</span>
              </div>
            )}
            {person.birthPlace && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{person.birthPlace}</span>
              </div>
            )}
          </div>
        )}

        {person.isDeceased && (
          <span className="badge bg-gray-100 text-gray-600 mt-1 text-xs">Deceased</span>
        )}
      </div>
    </Link>
  );
}
