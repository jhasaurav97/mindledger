// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Search,
  X,
  Check,
  Trash2,
  Shield,
  AlertCircle,
  Compass,
  Navigation,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import type { ReflectionLocation } from '../types';
import { validateReflectionLocation } from '../utils/locationValidator';
import { Button } from './ui/Button';

interface LocationPickerModalProps {
  isOpen: boolean;
  initialLocation: ReflectionLocation | null;
  onConfirm: (location: ReflectionLocation | null) => void;
  onClose: () => void;
}

// Preset mindful reflection settings for quick selection / testing when offline or without API key
const CURATED_REFLECTIVE_PLACES: Array<ReflectionLocation> = [
  {
    placeName: 'Cozy Neighborhood Cafe',
    formattedAddress: 'Quiet Corner Table, Local Coffeehouse',
    latitude: 37.7749,
    longitude: -122.4194,
    placeId: 'preset_cafe_1',
  },
  {
    placeName: 'Quiet Botanical Garden',
    formattedAddress: 'Under the Redwood Canopy, City Botanical Gardens',
    latitude: 37.7672,
    longitude: -122.4673,
    placeId: 'preset_garden_2',
  },
  {
    placeName: 'Home Study & Sanctuary',
    formattedAddress: 'Personal Writing Desk, Home',
    latitude: 40.7128,
    longitude: -74.006,
    placeId: 'preset_home_3',
  },
  {
    placeName: 'Coastal Trail Lookout',
    formattedAddress: 'Ocean Cliff Path, West Coast Trail',
    latitude: 36.6002,
    longitude: -121.8947,
    placeId: 'preset_trail_4',
  },
  {
    placeName: 'Downtown Central Library',
    formattedAddress: '4th Floor Reading Room, City Central Library',
    latitude: 47.6062,
    longitude: -122.3321,
    placeId: 'preset_library_5',
  },
];

// Inner component for Map viewport adjustment
const MapViewportHandler: React.FC<{ target: { lat: number; lng: number } }> = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (map && target) {
      map.setCenter(target);
      map.panTo(target);
      map.setZoom(15);
    }
  }, [map, target.lat, target.lng]);
  return null;
};

// Autocomplete Search Component using Google Places Library
interface PlacesAutocompleteInputProps {
  onSelectPlace: (location: ReflectionLocation) => void;
}

// Reverse-geocode coordinates using Google Maps Geocoder when available, or fallback to clean coordinates format
let isGeocodingServiceAvailable = true;

async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<{ placeName: string; formattedAddress?: string; placeId?: string }> {
  const fallbackResult = {
    placeName: 'Current Location',
    formattedAddress: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
  };

  if (!isGeocodingServiceAvailable) {
    return fallbackResult;
  }

  if (typeof window !== 'undefined' && (window as unknown as { google?: { maps?: { Geocoder?: any } } }).google?.maps?.Geocoder) {
    // Intercept console.error from Google Maps JS SDK if Geocoding API is not activated on the project
    const originalConsoleError = console.error;
    let hasRestoredConsole = false;
    const restoreConsole = () => {
      if (!hasRestoredConsole) {
        hasRestoredConsole = true;
        console.error = originalConsoleError;
      }
    };

    console.error = function (...args: unknown[]) {
      const firstArg = args[0] ? String(args[0]) : '';
      if (
        firstArg.includes('Geocoding Service') ||
        firstArg.includes('API is not activated') ||
        firstArg.includes('geocoding-backend')
      ) {
        isGeocodingServiceAvailable = false;
        console.warn('Google Maps Geocoding API is not activated on this project; using coordinates fallback.');
        return;
      }
      originalConsoleError.apply(console, args);
    };

    try {
      const GeocoderClass = (window as unknown as { google: { maps: { Geocoder: any } } }).google.maps.Geocoder;
      const geocoder = new GeocoderClass();

      const response = await new Promise<{ results: any[] } | null>((resolve) => {
        const timeout = setTimeout(() => resolve(null), 3000);
        try {
          geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
            clearTimeout(timeout);
            if (status === 'OK' && Array.isArray(results) && results.length > 0) {
              resolve({ results });
            } else {
              if (status === 'REQUEST_DENIED') {
                isGeocodingServiceAvailable = false;
              }
              resolve(null);
            }
          });
        } catch {
          clearTimeout(timeout);
          resolve(null);
        }
      });

      if (response && response.results && response.results.length > 0) {
        const top = response.results[0];
        let name = '';
        if (Array.isArray(top.address_components)) {
          const poi = top.address_components.find((c: { types?: string[]; long_name?: string }) =>
            c.types?.includes('point_of_interest') ||
            c.types?.includes('premise') ||
            c.types?.includes('establishment') ||
            c.types?.includes('neighborhood') ||
            c.types?.includes('sublocality')
          );
          if (poi?.long_name) {
            name = poi.long_name;
          }
        }
        if (!name && typeof top.formatted_address === 'string') {
          name = top.formatted_address.split(',')[0];
        }
        return {
          placeName: name || 'Current Location',
          formattedAddress: top.formatted_address || undefined,
          placeId: top.place_id || undefined,
        };
      }
    } catch (err) {
      isGeocodingServiceAvailable = false;
      console.warn('Reverse geocoding error:', err);
    } finally {
      // Delay restore briefly to ensure any asynchronous SDK warnings are safely caught
      setTimeout(restoreConsole, 1000);
    }
  }

  // Graceful fallback when geocoder is not loaded, offline, or disabled on the API key
  return fallbackResult;
}

const PlacesAutocompleteInput: React.FC<PlacesAutocompleteInputProps> = ({ onSelectPlace }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!places || !inputRef.current) return;

    try {
      const options = {
        fields: ['place_id', 'geometry', 'name', 'formatted_address'],
      };
      const auto = new places.Autocomplete(inputRef.current, options);
      setAutocomplete(auto);
    } catch (err) {
      console.warn('Google Maps Autocomplete could not be initialized:', err);
    }
  }, [places]);

  useEffect(() => {
    if (!autocomplete) return;

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place || !place.geometry?.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const name = place.name || place.formatted_address || 'Selected Place';
      const address = place.formatted_address;
      const placeId = place.place_id;

      const validated = validateReflectionLocation({
        latitude: lat,
        longitude: lng,
        placeName: name,
        formattedAddress: address,
        placeId,
      });

      if (validated) {
        onSelectPlace(validated);
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [autocomplete, onSelectPlace]);

  return (
    <div className="relative w-full">
      <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        id="places-search-input"
        placeholder="Search for a place or address with Google Places..."
        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
      />
    </div>
  );
};

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  initialLocation,
  onConfirm,
  onClose,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<ReflectionLocation | null>(
    initialLocation
  );
  const [manualPlaceName, setManualPlaceName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<{
    code?: number;
    message: string;
    instructions?: string;
  } | null>(null);

  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

  // Initialize or reset selected location
  useEffect(() => {
    setSelectedLocation(initialLocation);
    if (initialLocation) {
      setManualPlaceName(initialLocation.placeName);
      setManualAddress(initialLocation.formattedAddress || '');
    } else {
      setManualPlaceName('');
      setManualAddress('');
    }
    setMapError(null);
    setGeoError(null);
    setIsLocating(false);
  }, [initialLocation, isOpen]);

  if (!isOpen) return null;

  const currentCoords = selectedLocation
    ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude }
    : { lat: 37.7749, lng: -122.4194 }; // Default to San Francisco

  const handleSelectPreset = (preset: ReflectionLocation) => {
    setSelectedLocation(preset);
    setManualPlaceName(preset.placeName);
    setManualAddress(preset.formattedAddress || '');
  };

  const handleApplyManual = () => {
    if (!manualPlaceName.trim()) return;

    const validated = validateReflectionLocation({
      latitude: selectedLocation?.latitude || 37.7749,
      longitude: selectedLocation?.longitude || -122.4194,
      placeName: manualPlaceName.trim(),
      formattedAddress: manualAddress.trim() || undefined,
    });

    if (validated) {
      setSelectedLocation(validated);
    }
  };

  const handleUseCurrentLocation = () => {
    setGeoError(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoError({
        message: 'Geolocation is not supported by your browser or device environment.',
        instructions: 'You can still search for places with Google Places or select a mindful setting below.',
      });
      return;
    }

    setIsLocating(true);

    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (import.meta.env.DEV) {
      console.log('[Geolocation Diagnostic] Geolocation request started by user click, inIframe:', isInIframe);
    }

    const onGeoSuccess = async (position: GeolocationPosition) => {
      if (import.meta.env.DEV) {
        console.log('[Geolocation Diagnostic] Geolocation request succeeded:', position.coords);
      }

      try {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const geocoded = await reverseGeocodeCoordinates(lat, lng);
        const validated = validateReflectionLocation({
          latitude: lat,
          longitude: lng,
          placeName: geocoded.placeName,
          formattedAddress: geocoded.formattedAddress,
          placeId: geocoded.placeId,
        });

        if (validated) {
          setSelectedLocation(validated);
          setManualPlaceName(validated.placeName);
          setManualAddress(validated.formattedAddress || '');
          setGeoError(null);
        } else {
          setGeoError({
            message: 'Received invalid coordinates from location service.',
            instructions: 'Please select a place or enter your location manually below.',
          });
        }
      } catch (err) {
        console.warn('Location reverse geocode error:', err);
        setGeoError({
          message: 'Failed to reverse geocode device coordinates.',
          instructions: 'Coordinates acquired, but address lookup failed. You can name your place manually.',
        });
      } finally {
        setIsLocating(false);
      }
    };

    const onGeoError = (err: GeolocationPositionError) => {
      setIsLocating(false);

      if (import.meta.env.DEV) {
        console.warn('[Geolocation Diagnostic] Geolocation error received:', {
          code: err.code,
          message: err.message,
          isInIframe,
        });
      }

      switch (err.code) {
        case 1: // PERMISSION_DENIED
          if (isInIframe) {
            setGeoError({
              code: 1,
              message: 'Location access is restricted in this embedded preview iframe.',
              instructions:
                'Browsers block geolocation inside preview iframes by default. Open MindLedger in a full browser tab to grant location permissions, or choose a mindful preset place below.',
            });
          } else {
            setGeoError({
              code: 1,
              message: 'Location permission was denied in your browser settings.',
              instructions:
                'To enable: Click the lock or site settings icon in your browser address bar and set Location to "Allow", then click "Use My Current Location" again. You can also search or pick a place below.',
            });
          }
          break;

        case 2: // POSITION_UNAVAILABLE
          setGeoError({
            code: 2,
            message: 'Location information is currently unavailable from your device or network (Position Unavailable).',
            instructions:
              'Your device could not acquire a position fix. Ensure Wi-Fi/location services are enabled, or select a preset location below.',
          });
          break;

        case 3: // TIMEOUT
          setGeoError({
            code: 3,
            message: 'The location request timed out before retrieving your coordinates (Request Timeout).',
            instructions:
              'Acquiring a position fix took too long. Click "Use My Current Location" to try again, or search/type a place manually.',
          });
          break;

        default:
          setGeoError({
            code: err.code,
            message: err.message || 'Could not retrieve your current location.',
            instructions: 'You can search or enter your place name manually below.',
          });
          break;
      }
    };

    // Use standard accuracy first with generous timeout for faster, reliable desktop/laptop resolution
    navigator.geolocation.getCurrentPosition(
      onGeoSuccess,
      (firstErr) => {
        // If timeout or position unavailable, attempt a single retry with high accuracy if on mobile
        if (firstErr.code === 3 || firstErr.code === 2) {
          navigator.geolocation.getCurrentPosition(
            onGeoSuccess,
            onGeoError,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        } else {
          onGeoError(firstErr);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  };

  const handleConfirm = () => {
    let toAttach = selectedLocation;
    if (manualPlaceName.trim()) {
      toAttach = validateReflectionLocation({
        latitude: selectedLocation?.latitude || 37.7749,
        longitude: selectedLocation?.longitude || -122.4194,
        placeName: manualPlaceName.trim(),
        formattedAddress: manualAddress.trim() || undefined,
        placeId: selectedLocation?.placeId,
      });
    }
    onConfirm(toAttach);
    onClose();
  };

  const handleRemoveLocation = () => {
    setSelectedLocation(null);
    onConfirm(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-picker-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 id="location-picker-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Attach Location to Reflection
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ground your reflections with a meaningful place or setting.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close location picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Privacy Notice Banner */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 px-5 py-2.5 flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-300">
          <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-[11px] leading-tight">
            <strong>Privacy Guarantee:</strong> Location is optional and saved only with this reflection. MindLedger does not track your live location.
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Google Maps Search & Interactive Preview */}
          {apiKey ? (
            <div className="space-y-3">
              <APIProvider
                apiKey={apiKey}
                solutionChannel="GMP_devsite_samples_v3_rgmautocomplete"
                onError={(err) => {
                  console.warn('APIProvider error:', err);
                  setMapError('Unable to load Google Maps. You can still enter or pick a location manually.');
                }}
              >
                {/* Places Autocomplete & Use Current Location Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <PlacesAutocompleteInput
                      onSelectPlace={(loc) => {
                        setSelectedLocation(loc);
                        setManualPlaceName(loc.placeName);
                        setManualAddress(loc.formattedAddress || '');
                        setGeoError(null);
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    id="use-current-location-btn"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/90 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Detect and attach your current device location"
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                        <span>Locating...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Use My Current Location</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Geolocation Error Alert if any */}
                {geoError && (
                  <div
                    id="geo-error-alert"
                    className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex flex-col gap-2.5 animate-fadeIn"
                    role="alert"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold leading-snug">{geoError.message}</p>
                          {geoError.instructions && (
                            <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                              {geoError.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGeoError(null)}
                        className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 p-0.5 rounded cursor-pointer transition-colors shrink-0"
                        title="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick-action recovery buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-rose-200/60 dark:border-rose-800/60 flex-wrap">
                      {typeof window !== 'undefined' && window.self !== window.top && (
                        <a
                          href={window.location.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] transition-colors shadow-2xs"
                        >
                          <span>Open in New Tab</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          handleSelectPreset(CURATED_REFLECTIVE_PLACES[0]);
                          setGeoError(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-[11px] transition-colors cursor-pointer"
                      >
                        <span>Use Mindful Preset</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGeoError(null);
                          const input = document.getElementById('manual-place-name-input');
                          if (input) input.focus();
                        }}
                        className="px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-[11px] underline cursor-pointer"
                      >
                        Type location manually
                      </button>
                    </div>
                  </div>
                )}

                {/* Map Display */}
                <div className="relative w-full h-56 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 shadow-2xs">
                  <Map
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    defaultZoom={13}
                    defaultCenter={currentCoords}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    className="w-full h-full"
                  >
                    {selectedLocation && (
                      <AdvancedMarker position={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}>
                        <Pin background="#4f46e5" borderColor="#312e81" glyphColor="#ffffff" />
                      </AdvancedMarker>
                    )}
                    {selectedLocation && (
                      <MapViewportHandler
                        target={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
                      />
                    )}
                  </Map>
                </div>
              </APIProvider>
            </div>
          ) : (
            /* Non-API Key / Fallback Mode Notice */
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Google Maps API Key Not Detected</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                Add <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded text-[10px] font-mono">VITE_GOOGLE_MAPS_API_KEY</code> to enable full interactive Google Maps & Places Autocomplete. Meanwhile, you can enter any place name directly, choose from curated reflective settings below, or use your current location.
              </p>
              <div className="pt-0.5 flex items-center gap-2">
                <button
                  type="button"
                  id="use-current-location-fallback-btn"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-100/90 dark:bg-amber-950/50 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Detect and attach your current device location"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-800 dark:text-amber-300" />
                      <span>Locating...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5 text-amber-800 dark:text-amber-300" />
                      <span>Use My Current Location</span>
                    </>
                  )}
                </button>
              </div>
              {geoError && (
                <div
                  id="geo-error-fallback-alert"
                  className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex flex-col gap-2.5"
                  role="alert"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold leading-snug">{geoError.message}</p>
                        {geoError.instructions && (
                          <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                            {geoError.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGeoError(null)}
                      className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 p-0.5 rounded cursor-pointer shrink-0"
                      title="Dismiss alert"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Fallback recovery links */}
                  <div className="flex items-center gap-2 pt-1 border-t border-rose-200/60 dark:border-rose-800/60 flex-wrap">
                    {typeof window !== 'undefined' && window.self !== window.top && (
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] transition-colors shadow-2xs"
                      >
                        <span>Open in New Tab</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectPreset(CURATED_REFLECTIVE_PLACES[0]);
                        setGeoError(null);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-[11px] transition-colors cursor-pointer"
                    >
                      <span>Use Mindful Preset</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current Selection / Manual Input Details Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {selectedLocation ? 'Selected Location' : 'Place Details'}
              </span>
              {selectedLocation && (
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Attached
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="custom-place-name" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Place Name</label>
                <input
                  id="custom-place-name"
                  type="text"
                  placeholder="e.g. Quiet Library, Mountain Retreat"
                  value={manualPlaceName}
                  onChange={(e) => setManualPlaceName(e.target.value)}
                  onBlur={handleApplyManual}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="custom-address" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Address / Description (Optional)</label>
                <input
                  id="custom-address"
                  type="text"
                  placeholder="e.g. 100 Peaceful Way, Room 204"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  onBlur={handleApplyManual}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {selectedLocation && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Coordinates: {selectedLocation.latitude.toFixed(4)}°, {selectedLocation.longitude.toFixed(4)}°
                  </span>
                </div>
                {selectedLocation.placeId && (
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                    ID: {selectedLocation.placeId}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick Presets / Curated Reflective Places */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Quick Pick Reflective Places
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CURATED_REFLECTIVE_PLACES.map((preset) => {
                const isSelected = selectedLocation?.placeName === preset.placeName;
                return (
                  <button
                    key={preset.placeName}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                      isSelected
                        ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{preset.placeName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{preset.formattedAddress}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/80">
          <div>
            {initialLocation && (
              <Button
                id="remove-location-modal-btn"
                variant="ghost"
                size="sm"
                onClick={handleRemoveLocation}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/40"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Remove Location
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              id="confirm-attach-location-btn"
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={!manualPlaceName.trim() && !selectedLocation}
              leftIcon={<Check className="w-3.5 h-3.5 text-amber-300" />}
            >
              Attach Location
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
