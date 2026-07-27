/**
 * Toll plaza map preview — embeds OpenStreetMap for the plaza coordinates
 * passed from the toll ledger row. Avoids a native maps SDK while still giving
 * operators a visual anchor for where the debit occurred.
 */

import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors, FontSize, Radius, Spacing } from '../../../theme';

interface TollPlazaMapProps {
  latitude?: string | null;
  longitude?: string | null;
  plazaName?: string;
}

/** Parse ledger coordinate strings; invalid values are treated as missing. */
function parseCoordinate(value?: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** OSM embed centred on the toll pin — staticmap.openstreetmap.de is no longer reachable. */
function buildOsmEmbedUrl(latitude: number, longitude: number): string {
  const pad = 0.018;
  const bbox = [
    longitude - pad,
    latitude - pad,
    longitude + pad,
    latitude + pad,
  ].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
}

/** Deep-link into the device maps app for turn-by-turn / full map view. */
function openInMaps(latitude: number, longitude: number, label?: string) {
  const query = encodeURIComponent(label ? `${label}@${latitude},${longitude}` : `${latitude},${longitude}`);
  const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
  Linking.openURL(url).catch(() => {
    Linking.openURL(`geo:${latitude},${longitude}?q=${latitude},${longitude}`);
  });
}

export default function TollPlazaMap({ latitude, longitude, plazaName }: TollPlazaMapProps) {
  const coords = useMemo(() => {
    const lat = parseCoordinate(latitude);
    const lng = parseCoordinate(longitude);
    if (lat == null || lng == null) return null;
    // Zero coordinates usually mean the backend had no GPS fix for the plaza.
    if (lat === 0 && lng === 0) return null;
    return { lat, lng };
  }, [latitude, longitude]);

  if (!coords) return null;

  const embedUrl = buildOsmEmbedUrl(coords.lat, coords.lng);

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openInMaps(coords.lat, coords.lng, plazaName)}
        accessibilityRole="button"
        accessibilityLabel="Open toll plaza location in maps"
      >
        <View style={styles.mapFrame}>
          <WebView
            source={{ uri: embedUrl }}
            style={styles.mapWebView}
            scrollEnabled={false}
            nestedScrollEnabled={false}
            pointerEvents="none"
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
          />

          <View style={styles.pinBadge}>
            <Text style={styles.pinBadgeText} numberOfLines={1}>📍 {plazaName ?? 'Toll Plaza'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Lat/lng are shown as separate rows on the detail screen — map stays visual-only. */}
      <Text style={styles.hint}>Tap map to open in Google Maps</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:       { gap: 6, marginTop: Spacing[1] },
  // Compact preview — operators already have plaza name + lat/lng above the map.
  mapFrame:      {
    height: 110,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glass.border,
    backgroundColor: Colors.glass.bg,
  },
  mapWebView:    { flex: 1, backgroundColor: Colors.glass.bg },
  pinBadge:      {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(8, 18, 40, 0.82)',
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pinBadgeText:  { fontSize: FontSize.xs, color: Colors.white, fontWeight: '600' },
  hint:          { fontSize: FontSize.xs, color: Colors.text.subtle },
});
