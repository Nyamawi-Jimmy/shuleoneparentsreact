// LiveBusMap — the parent's live bus map, the native twin of the web
// LiveBusMap in lms-react.
//
// Both surfaces read the SAME payload (/api/parent/children/{id}/transport/live),
// so the bus, the child's stop, the school and — the point of it — the real road
// route from Google Directions all match what the web shows. The backend sends
// `routePolyline` as a Google-encoded overview polyline; we decode it here.
//
// When Directions is unavailable (no key, quota, stale fix) the backend omits
// the polyline and we join bus->stop with a dashed straight line instead, so the
// map always shows *a* route. `routeFromDirections` on the web payload is the
// flag that tells the two apart; here the presence of routePolyline is.
//
// Native note: react-native-maps needs a native build. On Android it renders
// Google Maps and requires an API key in app.json; on iOS it falls back to Apple
// Maps, which needs no key.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { getTransportLive } from '../api/transport';
import { TransportLive } from '../api/transport.types';

const POLL_MS = 8000;

type LatLng = { latitude: number; longitude: number };

/**
 * Decode a Google-encoded polyline into coordinates.
 *
 * Inlined rather than pulling in @mapbox/polyline: it is ~25 lines, has no
 * native side, and avoids another dependency in a build that already needs a
 * native rebuild for the map itself.
 */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

function pt(p: { latitude: number | null; longitude: number | null } | null | undefined): LatLng | null {
  if (!p || p.latitude == null || p.longitude == null) return null;
  return { latitude: Number(p.latitude), longitude: Number(p.longitude) };
}

/** Frame that comfortably contains every supplied point. */
function regionFor(points: LatLng[]): Region | null {
  if (!points.length) return null;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    // Pad so pins are not flush against the edge; floor it so a single point
    // does not zoom to maximum.
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.01),
  };
}

export default function LiveBusMap({
  studentId,
  accessToken,
}: {
  studentId: number;
  accessToken: string;
}) {
  const [live, setLive] = useState<TransportLive | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView | null>(null);
  const framedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      try {
        const d = await getTransportLive(accessToken, studentId);
        if (!cancelled) { setLive(d); setLoading(false); }
      } catch {
        // Keep the last good fix on screen rather than blanking the map on a
        // transient network error; the next poll recovers.
        if (!cancelled) setLoading(false);
      }
    };

    tick();
    timer = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      framedRef.current = false;
    };
  }, [studentId, accessToken]);

  const bus = pt(live);
  const stop = pt(live?.pickupPoint);
  const school = pt(live?.school);

  // Prefer Google's road geometry; fall back to a straight bus->stop line.
  const route = useMemo<LatLng[]>(() => {
    if (live?.routePolyline) {
      try {
        const decoded = decodePolyline(live.routePolyline);
        if (decoded.length >= 2) return decoded;
      } catch {
        // Malformed polyline — fall through to the straight line below.
      }
    }
    return bus && stop ? [bus, stop] : [];
  }, [live?.routePolyline, bus?.latitude, bus?.longitude, stop?.latitude, stop?.longitude]);

  const usingRoads = !!live?.routePolyline && route.length > 2;

  // Frame once, then leave the camera alone so panning is not fought.
  useEffect(() => {
    if (framedRef.current || !mapRef.current) return;
    const region = regionFor([bus, stop, school].filter(Boolean) as LatLng[]);
    if (region) {
      mapRef.current.animateToRegion(region, 600);
      framedRef.current = true;
    }
  }, [bus?.latitude, stop?.latitude, school?.latitude]);

  if (loading) {
    return (
      <View style={[styles.wrap, styles.centre]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!bus) {
    return (
      <View style={[styles.wrap, styles.centre]}>
        <Text style={styles.muted}>
          {live?.active ? 'Waiting for the bus’s first location…' : 'Bus not on the road yet'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={regionFor([bus, stop, school].filter(Boolean) as LatLng[]) ?? undefined}
      >
        {route.length >= 2 && (
          <Polyline
            coordinates={route}
            strokeColor="#16a34a"
            strokeWidth={usingRoads ? 5 : 3}
            // Dashed while it is only an approximation, solid once it follows roads.
            lineDashPattern={usingRoads ? undefined : [8, 6]}
          />
        )}
        {school && <Marker coordinate={school} title={live?.school?.name ?? 'School'} pinColor="#0ea5e9" />}
        {stop && <Marker coordinate={stop} title={live?.pickupPoint?.name ?? 'Pickup'} pinColor="#16a34a" />}
        <Marker
          coordinate={bus}
          title={live?.vehiclePlate ?? 'Bus'}
          description={live?.etaMinutes != null ? `~${live.etaMinutes} min away` : undefined}
          pinColor={live?.stale ? '#f59e0b' : '#db2777'}
          rotation={live?.heading ?? 0}
          flat
        />
      </MapView>

      <View style={styles.pills} pointerEvents="none">
        <View style={[styles.pill, live?.stale ? styles.pillStale : styles.pillLive]}>
          <Text style={styles.pillText}>
            {live?.stale ? 'Signal delayed' : 'Live'}
            {live?.vehiclePlate ? ` · ${live.vehiclePlate}` : ''}
          </Text>
        </View>
        {live?.etaMinutes != null && !live?.stale && (
          <View style={[styles.pill, styles.pillEta]}>
            <Text style={styles.pillText}>
              ~{live.etaMinutes} min{live.etaTargetName ? ` to ${live.etaTargetName}` : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 280, borderRadius: 18, overflow: 'hidden', backgroundColor: '#eef2f6' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#64748b', fontSize: 13, paddingHorizontal: 24, textAlign: 'center' },
  pills: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  pillLive: { backgroundColor: '#db2777' },
  pillStale: { backgroundColor: '#f59e0b' },
  pillEta: { backgroundColor: '#059669' },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
