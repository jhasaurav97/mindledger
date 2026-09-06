import type { ReflectionLocation } from '../types';

/**
 * Validates and sanitizes a ReflectionLocation object.
 * Enforces OWASP A03 / Input Validation principles:
 * - Latitude must be a finite number in [-90, 90]
 * - Longitude must be a finite number in [-180, 180]
 * - placeName must be a non-empty string <= 200 characters
 * - formattedAddress (if present) must be a string <= 500 characters
 * - placeId (if present) must be a string <= 200 characters
 * Returns a sanitized ReflectionLocation or null if invalid.
 */
export function validateReflectionLocation(data: unknown): ReflectionLocation | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const candidate = data as Record<string, unknown>;

  // Validate latitude
  const lat = typeof candidate.latitude === 'number' ? candidate.latitude : Number(candidate.latitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return null;
  }

  // Validate longitude
  const lng = typeof candidate.longitude === 'number' ? candidate.longitude : Number(candidate.longitude);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return null;
  }

  // Validate placeName
  if (typeof candidate.placeName !== 'string') {
    return null;
  }
  const placeName = candidate.placeName.trim().slice(0, 200);
  if (!placeName) {
    return null;
  }

  // Sanitize formattedAddress if present
  let formattedAddress: string | undefined = undefined;
  if (typeof candidate.formattedAddress === 'string') {
    const trimmed = candidate.formattedAddress.trim().slice(0, 500);
    if (trimmed) {
      formattedAddress = trimmed;
    }
  }

  // Sanitize placeId if present
  let placeId: string | undefined = undefined;
  if (typeof candidate.placeId === 'string') {
    const trimmed = candidate.placeId.trim().slice(0, 200);
    if (trimmed) {
      placeId = trimmed;
    }
  }

  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    placeName,
    ...(formattedAddress ? { formattedAddress } : {}),
    ...(placeId ? { placeId } : {}),
  };
}
