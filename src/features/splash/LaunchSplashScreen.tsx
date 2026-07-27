import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Path, G } from 'react-native-svg';
import { Colors, FontFamily } from '../../theme';

/**
 * App-launch splash (~2.6s) — shown once when the app cold-starts, before login
 * or the restored session. Pure RN Animated (no video/Lottie).
 *
 * Brand lockup is text; the yellow route + truck clip is the fleet motif that
 * used to ship inside KarinsLogo and must stay visible on cold start.
 */

const C = {
  bgA: '#060B16', bgB: '#02060D', bgC: '#0B0A07',
  white: '#FFFFFF',
  green: '#28A745', greenBright: '#34C759',
  amber: '#FFC107',
  w88: 'rgba(255,255,255,0.88)', w90: 'rgba(255,255,255,0.90)',
  w46: 'rgba(255,255,255,0.46)', w42: 'rgba(255,255,255,0.42)',
  w34: 'rgba(255,255,255,0.34)', w30: 'rgba(255,255,255,0.50)',
  w24: 'rgba(255,255,255,0.42)',
};

const TRUCK_W = 34;

/** Compact truck silhouette used as the splash “vehicle clip” on the route. */
function SplashTruck({ color = Colors.yellow, cab = Colors.white }: { color?: string; cab?: string }) {
  return (
    <Svg width={TRUCK_W} height={18} viewBox="0 0 34 18">
      <G>
        <Rect x="1" y="4" width="22" height="10" rx="2" fill={color} />
        <Rect x="23" y="7" width="9" height="7" rx="1.5" fill={color} />
        <Path d="M4 14 a2.5 2.5 0 1 0 0.01 0z M27 14 a2.5 2.5 0 1 0 0.01 0z" fill={cab} />
      </G>
    </Svg>
  );
}

export function LaunchSplashScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const trackWidth = width * 0.6;
  // Truck travels the track; leave room so it does not clip past the end.
  const truckTravel = Math.max(0, trackWidth - TRUCK_W);
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const route = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
      // Route line + truck move together so the vehicle clip reads as “on the road”.
      Animated.timing(route, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(pulse, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(tagline, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
      Animated.delay(350),
    ]).start(() => onDone());
  }, [logoOpacity, logoScale, route, pulse, tagline, onDone]);

  const routeScale = route.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const truckX = route.interpolate({ inputRange: [0, 1], outputRange: [0, truckTravel] });
  const truckOpacity = route.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0, 1, 1] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] });

  return (
    <LinearGradient
      colors={[Colors.bg.d0, Colors.bg.d2, Colors.bg.d4]}
      style={[styles.fill, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.center}>
        <View>
          <Animated.View style={[styles.scanPulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
          <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
            <View style={styles.brandLockup}>
              <View style={styles.brandRow}>
                <Text style={styles.brandKarins}>Karins</Text>
                <Text style={styles.brandFleet}>fleet</Text>
              </View>
              <Text style={styles.brandTag}>FLEET INTELLIGENCE PLATFORM</Text>
            </View>
          </Animated.View>
        </View>

        <View style={[styles.routeScene, { width: trackWidth }]}>
          <View style={styles.routeTrackWrap}>
            <Animated.View style={[styles.routeTrack, { transform: [{ scaleX: routeScale }] }]} />
          </View>
          <Animated.View
            style={[
              styles.truckWrap,
              { opacity: truckOpacity, transform: [{ translateX: truckX }] },
            ]}
          >
            <SplashTruck />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.tag, { opacity: tagline }]}>
          Pulling fleets into the future
        </Animated.Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 24 },
  scanPulse: {
    position: 'absolute', alignSelf: 'center', top: '40%',
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: Colors.yellow,
  },
  brandLockup: { alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 6 },
  brandKarins: { fontFamily: FontFamily.logo, fontSize: 38, color: Colors.white, letterSpacing: -0.3, lineHeight: 40 },
  brandFleet: { fontSize: 20, fontWeight: '600', color: Colors.white, marginLeft: 10, marginBottom: 2 },
  brandTag: { fontSize: 9.5, color: Colors.white, letterSpacing: 1.2 },
  // Extra height so the truck sits on the route without overlapping the brand.
  routeScene: { height: 28, justifyContent: 'flex-end' },
  routeTrackWrap: { height: 2, overflow: 'hidden', borderRadius: 1 },
  routeTrack: { height: 2, width: '100%', backgroundColor: Colors.yellow, borderRadius: 1, opacity: 0.8 },
  truckWrap: { position: 'absolute', left: 0, bottom: 2 },
  tag: {
    color: Colors.white,
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '600',
    textAlign: 'center',
    alignSelf: 'stretch',
  },
});
