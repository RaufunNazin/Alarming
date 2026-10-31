import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  LayoutChangeEvent,
  PanResponder,
  Platform,
} from 'react-native';

const useNativeDriver = Platform.OS !== 'web';
const TOP_SWIPE_ZONE_RATIO = 0.25;
const MIN_TOP_SWIPE_ZONE_PX = 88;

export function useSheetModalGesture(visible: boolean, onClose: () => void) {
  const translateY = useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const wasVisibleRef = useRef(false);
  const isClosingRef = useRef(false);
  const sheetLayoutRef = useRef({ y: 0, height: 0 });
  const startedInTopZoneRef = useRef(false);

  // Reset translateY synchronously when transitioning from hidden -> visible
  // so the first rendered frame of the opened modal is always at y=0,
  // and never reset translateY to 0 while closing (which caused the close flicker).
  if (visible && !wasVisibleRef.current) {
    translateY.stopAnimation();
    translateY.setValue(0);
    isClosingRef.current = false;
  }
  wasVisibleRef.current = visible;

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      translateY.stopAnimation();
      translateY.setValue(0);
    } else {
      setKeyboardHeight(0);
      startedInTopZoneRef.current = false;
    }
  }, [visible, translateY]);

  useEffect(() => {
    if (!visible || Platform.OS === 'web') return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const onSheetLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    sheetLayoutRef.current = { y, height };
  }, []);

  const finishSwipeClose = useCallback(
    (vy: number = 0) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      Keyboard.dismiss();

      const windowHeight = Dimensions.get('window').height || 850;
      const measuredHeight = sheetLayoutRef.current.height;
      const closeDistance = Math.max(measuredHeight + 48, windowHeight);
      const velocityBoost = Math.min(100, Math.max(0, Math.round(vy * 35)));
      const duration = Math.max(120, 200 - velocityBoost);

      Animated.timing(translateY, {
        toValue: closeDistance,
        duration,
        useNativeDriver,
      }).start(({ finished }) => {
        if (finished) {
          // Do NOT call translateY.setValue(0) here — keeping the sheet off-screen
          // while React unmounts the Modal prevents any 1-frame snap-back flicker.
          onCloseRef.current();
        } else {
          isClosingRef.current = false;
        }
      });
    },
    [translateY]
  );

  const springBackToTop = useCallback(() => {
    if (isClosingRef.current) return;
    Animated.spring(translateY, {
      toValue: 0,
      tension: 85,
      friction: 12,
      useNativeDriver,
    }).start();
  }, [translateY]);

  const handleRelease = useCallback(
    (dy: number, vy: number) => {
      const sheetHeight = sheetLayoutRef.current.height || 600;
      const distanceThreshold = Math.min(80, Math.max(48, sheetHeight * 0.12));
      if (dy > distanceThreshold || (dy > 20 && vy > 0.45)) {
        finishSwipeClose(vy);
      } else {
        springBackToTop();
      }
    },
    [finishSwipeClose, springBackToTop]
  );

  // Dedicated PanResponder for the top drag handle zone
  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isClosingRef.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isClosingRef.current) return false;
        return (
          gestureState.dy > 4 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (isClosingRef.current) return;
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        } else {
          translateY.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        handleRelease(gestureState.dy, gestureState.vy);
      },
      onPanResponderTerminate: () => {
        springBackToTop();
      },
    })
  ).current;

  // Sheet-wide PanResponder that captures downward swipes starting in the top 25% of the modal
  // while allowing normal taps, buttons, and upward scrolling inside that top 25%.
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt) => {
        if (isClosingRef.current) {
          startedInTopZoneRef.current = false;
          return false;
        }
        const windowHeight = Dimensions.get('window').height || 850;
        const { y: measuredTopY, height: measuredHeight } = sheetLayoutRef.current;
        const effectiveHeight = measuredHeight > 0 ? measuredHeight : windowHeight * 0.75;
        const effectiveTopY =
          measuredTopY > 0 ? measuredTopY : Math.max(0, windowHeight - effectiveHeight);

        const touchPageY = evt.nativeEvent.pageY;
        const offsetFromSheetTop = touchPageY - effectiveTopY;
        const allowedTopZonePx = Math.max(
          MIN_TOP_SWIPE_ZONE_PX,
          effectiveHeight * TOP_SWIPE_ZONE_RATIO
        );

        startedInTopZoneRef.current =
          offsetFromSheetTop >= -20 && offsetFromSheetTop <= allowedTopZonePx;

        // Return false on start so taps on buttons/tabs in the top 25% still work normally
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (isClosingRef.current || !startedInTopZoneRef.current) {
          return false;
        }
        // Only capture when swiping downward with clear vertical intent
        return (
          gestureState.dy > 6 &&
          gestureState.dy > Math.abs(gestureState.dx) * 1.2
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (isClosingRef.current) return;
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        } else {
          translateY.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        startedInTopZoneRef.current = false;
        handleRelease(gestureState.dy, gestureState.vy);
      },
      onPanResponderTerminate: () => {
        startedInTopZoneRef.current = false;
        springBackToTop();
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const backdropOpacity = useRef(
    translateY.interpolate({
      inputRange: [0, 380],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    })
  ).current;

  return {
    translateY,
    backdropOpacity,
    keyboardHeight,
    onSheetLayout,
    dragHandlePanHandlers: handlePanResponder.panHandlers,
    sheetPanHandlers: sheetPanResponder.panHandlers,
  };
}
