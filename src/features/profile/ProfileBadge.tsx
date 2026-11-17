import { useEffect, useState } from 'react';
import type { UserProfile } from '../../services/profile';

export function ProfileBadge({ profile }: { profile: UserProfile }) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const monogram = profile.firstName.trim().charAt(0).toUpperCase() || 'M';

  useEffect(() => setImageUnavailable(false), [profile.avatarUrl]);

  return (
    <div className="profile-badge">
      {profile.avatarUrl && !imageUnavailable
        ? <img className="avatar profile-avatar" src={profile.avatarUrl} alt={`${profile.name}'s profile`} onError={() => setImageUnavailable(true)} />
        : <div className="avatar avatar-monogram profile-avatar" aria-label={`${profile.name}'s monogram`}>{monogram}</div>}
      <div className="profile-details">
        <span className="profile-name">{profile.name}</span>
        <span className="profile-email">{profile.email}</span>
      </div>
    </div>
  );
}
