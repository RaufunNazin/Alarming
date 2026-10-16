import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../../core/theme';

interface GoogleRadialClockProps {
  selectedHour: number;     // 0-23
  selectedMinute: number;   // 0-59
  onTimeChange: (hour: number, minute: number) => void;
}

export const GoogleRadialClock: React.FC<GoogleRadialClockProps> = ({
  selectedHour,
  selectedMinute,
  onTimeChange,
}) => {
  const { colors, typography, radii } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  // Responsive +20% radius capped so it never overflows alarm toggle/display margins
  const containerWidth = Math.min(windowWidth, 420);
  const maxWidth = containerWidth - 32; // Limit matching marginHorizontal: 16 (16 each side)
  const RADIUS = Math.min(162, Math.floor(maxWidth / 2)); // 135 * 1.2 = 162
  const CLOCK_DIAMETER = RADIUS * 2;
  const PADDING = 28;
  const NUMBER_RADIUS = RADIUS - PADDING;

  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  const isAM = selectedHour < 12;

  // Refs for PanResponder stale closures
  const modeRef = useRef(mode);
  const isAMRef = useRef(isAM);
  const selectedHourRef = useRef(selectedHour);
  const selectedMinuteRef = useRef(selectedMinute);
  const radiusRef = useRef(RADIUS);

  useEffect(() => {
    modeRef.current = mode;
    isAMRef.current = isAM;
    selectedHourRef.current = selectedHour;
    selectedMinuteRef.current = selectedMinute;
    radiusRef.current = RADIUS;
  });

  const [fadeAnim] = useState(() => new Animated.Value(1));
  const clockCenterRef = useRef({ x: 0, y: 0 });

  const handleModeChange = (newMode: 'hour' | 'minute') => {
    if (newMode === modeRef.current) return;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setMode(newMode);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSetAM = () => {
    if (!isAM) {
      const newHour = Math.max(0, selectedHour - 12);
      onTimeChange(newHour, selectedMinute);
    }
  };

  const handleSetPM = () => {
    if (isAM) {
      const newHour = Math.min(23, selectedHour + 12);
      onTimeChange(newHour, selectedMinute);
    }
  };

  // 1-12 value for display
  const displayHour = selectedHour % 12 === 0 ? 12 : selectedHour % 12;

  // Angle for hand in degrees
  let currentAngle = 0;
  if (mode === 'hour') {
    currentAngle = displayHour * 30; // 360 / 12
  } else {
    currentAngle = selectedMinute * 6; // 360 / 60
  }

  const handleTouchOffset = (dx: number, dy: number) => {
    const angleRad = Math.atan2(dy, dx);
    let deg = angleRad * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;

    if (modeRef.current === 'hour') {
      let val = Math.round(deg / 30) % 12;
      if (val === 0) val = 12;

      const newHour = isAMRef.current
        ? val === 12
          ? 0
          : val
        : val === 12
          ? 12
          : val + 12;

      if (newHour !== selectedHourRef.current) {
        onTimeChange(newHour, selectedMinuteRef.current);
      }
    } else {
      const val = Math.round(deg / 6) % 60;
      if (val !== selectedMinuteRef.current) {
        onTimeChange(selectedHourRef.current, val);
      }
    }
  };

  const handleTouchOffsetRef = useRef(handleTouchOffset);
  handleTouchOffsetRef.current = handleTouchOffset;

  const handleModeChangeRef = useRef(handleModeChange);
  handleModeChangeRef.current = handleModeChange;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { pageX, pageY, locationX, locationY } = evt.nativeEvent;
        const currentR = radiusRef.current;
        clockCenterRef.current = {
          x: pageX - locationX + currentR,
          y: pageY - locationY + currentR,
        };
        handleTouchOffsetRef.current(locationX - currentR, locationY - currentR);
      },
      onPanResponderMove: (_evt, gestureState) => {
        const dx = gestureState.moveX - clockCenterRef.current.x;
        const dy = gestureState.moveY - clockCenterRef.current.y;
        handleTouchOffsetRef.current(dx, dy);
      },
      onPanResponderRelease: () => {
        if (modeRef.current === 'hour') {
          handleModeChangeRef.current('minute');
        }
      },
    })
  ).current;

  // Render dial numbers
  const renderNumbers = (isMask: boolean = false) => {
    const elements: React.ReactNode[] = [];
    const count = 12;

    for (let i = 1; i <= count; i++) {
      const val = mode === 'hour' ? i : i === 12 ? 0 : i * 5;
      const text = mode === 'hour' ? val.toString() : val.toString().padStart(2, '0');

      const angleDeg = i * 30 - 90;
      const angleRad = angleDeg * (Math.PI / 180);
      const x = RADIUS + Math.cos(angleRad) * NUMBER_RADIUS;
      const y = RADIUS + Math.sin(angleRad) * NUMBER_RADIUS;

      elements.push(
        <View
          key={i}
          style={[styles.numberContainer, { left: x - 16, top: y - 16 }]}
          pointerEvents="none"
        >
          <Text
            style={[
              styles.numberText,
              {
                color: isMask ? '#FFFFFF' : colors.dialNumberInactive,
                fontFamily: typography.numbersBold,
              },
            ]}
          >
            {text}
          </Text>
        </View>
      );
    }
    return elements;
  };

  const circleX =
    RADIUS + Math.cos((currentAngle - 90) * (Math.PI / 180)) * NUMBER_RADIUS - 20;
  const circleY =
    RADIUS + Math.sin((currentAngle - 90) * (Math.PI / 180)) * NUMBER_RADIUS - 20;

  return (
    <View style={styles.container}>
      {/* 12h Digital Display Header - Full width aligned with Alarm Selection bar */}
      <View style={styles.headerDisplay}>
        <View style={styles.timeGroup}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.headerTimeBtn,
              {
                backgroundColor: mode === 'hour' ? colors.primary + '25' : colors.surfaceSubtle,
                borderColor: mode === 'hour' ? colors.primary : colors.surfaceBorder,
                borderRadius: radii.cardInner,
              },
            ]}
            onPress={() => handleModeChange('hour')}
          >
            <Text
              style={[
                styles.timeText,
                {
                  color: mode === 'hour' ? colors.textPrimary : colors.textSecondary,
                  fontFamily: typography.numbersBold,
                },
              ]}
            >
              {displayHour.toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>

          <Text
            style={[
              styles.timeSeparator,
              { color: colors.textSecondary, fontFamily: typography.numbersBold },
            ]}
          >
            :
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.headerTimeBtn,
              {
                backgroundColor: mode === 'minute' ? colors.primary + '25' : colors.surfaceSubtle,
                borderColor: mode === 'minute' ? colors.primary : colors.surfaceBorder,
                borderRadius: radii.cardInner,
              },
            ]}
            onPress={() => handleModeChange('minute')}
          >
            <Text
              style={[
                styles.timeText,
                {
                  color: mode === 'minute' ? colors.textPrimary : colors.textSecondary,
                  fontFamily: typography.numbersBold,
                },
              ]}
            >
              {selectedMinute.toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vertical AM/PM Segmented Box */}
        <View
          style={[
            styles.amPmContainer,
            {
              borderColor: colors.surfaceBorder,
              backgroundColor: colors.surfaceSubtle,
              borderRadius: radii.cardInner,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.amPmBtn,
              isAM && { backgroundColor: colors.primary + '33' },
            ]}
            onPress={handleSetAM}
          >
            <Text
              style={[
                styles.amPmText,
                {
                  color: isAM ? colors.textPrimary : colors.textSecondary,
                  fontFamily: typography.numbersBold,
                },
              ]}
            >
              AM
            </Text>
          </TouchableOpacity>
          <View style={[styles.amPmDivider, { backgroundColor: colors.surfaceBorder }]} />
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.amPmBtn,
              !isAM && { backgroundColor: colors.primary + '33' },
            ]}
            onPress={handleSetPM}
          >
            <Text
              style={[
                styles.amPmText,
                {
                  color: !isAM ? colors.textPrimary : colors.textSecondary,
                  fontFamily: typography.numbersBold,
                },
              ]}
            >
              PM
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Radial Clock Face (+20% size, dynamic) */}
      <View
        style={[
          styles.clockFace,
          {
            width: CLOCK_DIAMETER,
            height: CLOCK_DIAMETER,
            borderRadius: RADIUS,
            backgroundColor: colors.dialFaceBg,
            borderColor: colors.surfaceBorder,
          },
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: fadeAnim,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          {renderNumbers(false)}

          {/* Hand Line Wrapper */}
          <View
            style={[
              styles.handWrapper,
              {
                height: NUMBER_RADIUS * 2,
                transform: [{ rotate: `${currentAngle}deg` }],
              },
            ]}
          >
            <View style={[styles.handLine, { backgroundColor: colors.dialHandColor }]} />
            <View style={styles.handLineSpacer} />
          </View>

          {/* Selection Circle at hand tip */}
          <View
            style={[
              styles.handCircle,
              {
                backgroundColor: colors.dialHandColor,
                left: circleX,
                top: circleY,
                overflow: 'hidden',
              },
            ]}
          >
            <View
              style={{
                position: 'absolute',
                left: -circleX,
                top: -circleY,
                width: CLOCK_DIAMETER,
                height: CLOCK_DIAMETER,
              }}
            >
              {renderNumbers(true)}
            </View>
          </View>

          {/* Center Dot */}
          <View
            style={[styles.centerDot, { backgroundColor: colors.dialCenterDot }]}
          />
        </Animated.View>

        {/* Touch Overlay spanning clock face */}
        <View
          {...panResponder.panHandlers}
          style={[styles.touchOverlay, { borderRadius: RADIUS }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  headerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  timeGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTimeBtn: {
    flex: 1,
    height: 74,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 50,
    lineHeight: 54,
  },
  timeSeparator: {
    fontSize: 36,
    lineHeight: 40,
    width: 14,
    textAlign: 'center',
    marginHorizontal: 1,
    marginBottom: 4,
  },
  amPmContainer: {
    width: 62,
    height: 74,
    borderWidth: 1,
    overflow: 'hidden',
  },
  amPmBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amPmText: {
    fontSize: 13,
  },
  amPmDivider: {
    height: 1,
    width: '100%',
  },
  clockFace: {
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  numberContainer: {
    position: 'absolute',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  numberText: {
    fontSize: 16,
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    zIndex: 3,
  },
  handWrapper: {
    position: 'absolute',
    width: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  handLine: {
    flex: 1,
    width: '100%',
  },
  handLineSpacer: {
    flex: 1,
  },
  handCircle: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
