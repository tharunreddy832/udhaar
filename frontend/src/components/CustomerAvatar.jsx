import React, { useState, useEffect } from 'react';
import api from '../api/axios';

// Palette matching "Paper Meets Intelligence" aesthetic for initials fallback
const AVATAR_PALETTES = [
  { bg: '#EAEFFC', text: '#2742BE', border: '#C7D7F9' }, // Cobalt
  { bg: '#E8F7F3', text: '#0F765E', border: '#A3E3D3' }, // Emerald
  { bg: '#FEF7EC', text: '#B46B10', border: '#FCD89E' }, // Amber
  { bg: '#F3EBF9', text: '#78359F', border: '#DFCAEE' }, // Purple
  { bg: '#FDEEE9', text: '#B84523', border: '#FAC8B8' }, // Terracotta
  { bg: '#EEF2F6', text: '#334155', border: '#CBD5E1' }, // Slate
];

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getPaletteForName = (name) => {
  if (!name) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
};

export const CustomerAvatar = ({
  customerId,
  name = '',
  hasPhoto = false,
  photoVersion = null,
  size = 'md', // 'xs' | 'sm' | 'md' | 'card' | 'lg' | 'xl' | '2xl'
  className = '',
  shape = 'rounded', // 'rounded' | 'circle'
}) => {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    if (hasPhoto && customerId) {
      setLoading(true);
      setError(false);

      const url = `/api/customers/${customerId}/photo${photoVersion ? `?v=${photoVersion}` : ''}`;
      api.get(url, { responseType: 'blob' })
        .then((res) => {
          if (!active) return;
          if (res.data && res.data.size > 0) {
            objectUrl = URL.createObjectURL(res.data);
            setPhotoUrl(objectUrl);
          } else {
            setError(true);
          }
        })
        .catch(() => {
          if (!active) return;
          setError(true);
          setPhotoUrl(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      setPhotoUrl(null);
      setLoading(false);
      setError(false);
    }

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [customerId, hasPhoto, photoVersion]);

  const palette = getPaletteForName(name);
  const initials = getInitials(name);
  const sizeClass = size === 'card' ? 'avatar-card' : `avatar-${size}`;
  const shapeClass = shape === 'circle' ? 'avatar-circle' : '';

  // If loading photo, display skeleton pulse with identical dimensions
  if (loading && !photoUrl) {
    return (
      <div
        className={`customer-avatar-box ${sizeClass} ${shapeClass} ${className}`}
        style={{ backgroundColor: '#E2E8F0', opacity: 0.7 }}
        aria-label={`Loading avatar for ${name}`}
      />
    );
  }

  // If we have a verified photo URL: display contained, centered, complete image
  if (photoUrl && !error) {
    return (
      <div
        className={`customer-avatar-box ${sizeClass} ${shapeClass} ${className}`}
        title={name}
      >
        <img
          src={photoUrl}
          alt={name ? `${name}'s identity photo` : 'Customer photo'}
          className="customer-avatar-img"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  // Fallback to neutral initials avatar with identical fixed dimensions
  return (
    <div
      className={`customer-avatar-box ${sizeClass} ${shapeClass} ${className}`}
      style={{
        backgroundColor: palette.bg,
        color: palette.text,
        borderColor: palette.border,
      }}
      title={name}
      aria-label={name}
    >
      <span className="customer-avatar-initials">
        {initials}
      </span>
    </div>
  );
};

export default CustomerAvatar;
