import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUrl } from 'aws-amplify/storage';
import { Person } from '../../types';
import { fullName, initials } from '../../utils/helpers';

interface Props {
  person:    Person;
  highlight?: boolean;
}

export default function PersonNode({ person, highlight = false }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!person.photoKey) return;
    getUrl({ path: person.photoKey })
      .then(({ url }) => setPhotoUrl(url.toString()))
      .catch(() => {});
  }, [person.photoKey]);

  return (
    <Link
      to={`/person/${person.id}`}
      className={`flex flex-col items-center gap-1.5 group cursor-pointer
        ${highlight ? 'scale-105' : ''}`}
    >
      {/* Avatar circle */}
      <div className={`w-14 h-14 rounded-full overflow-hidden border-3 flex items-center justify-center
        font-bold text-sm transition-all group-hover:scale-110
        ${highlight
          ? 'border-gold-500 bg-gold-100 text-gold-800 shadow-lg shadow-gold-200'
          : 'border-burgundy-300 bg-burgundy-100 text-burgundy-700'
        }`}
        style={{ borderWidth: '3px' }}
      >
        {photoUrl
          ? <img src={photoUrl} alt={fullName(person)} className="w-full h-full object-cover" />
          : <span>{initials(person)}</span>
        }
      </div>

      {/* Name */}
      <div className="text-center max-w-[90px]">
        <p className="text-xs font-semibold leading-tight text-gray-800 group-hover:text-burgundy-700 whitespace-normal break-words">
          {person.firstName}
        </p>
        <p className="text-xs text-gray-500 whitespace-normal break-words">
          {person.lastName}
        </p>
      </div>

      {/* Deceased indicator */}
      {person.isDeceased && (
        <span className="text-xs text-gray-400">رحمه الله</span>
      )}
    </Link>
  );
}
