import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Sun, Moon, Edit3, Heart } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useAlarmStore } from '../store/alarmStore';

export const GreetingHeader: React.FC = () => {
  const { colors, typography, radii, spacing, mode, toggleTheme } = useTheme();
  const { loveNoteGreeting, setLoveNoteGreeting } = useAlarmStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(loveNoteGreeting);

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const handleSave = () => {
    if (editText.trim()) {
      setLoveNoteGreeting(editText.trim());
    }
    setIsEditing(false);
  };

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
      <View style={styles.topRow}>
        <View style={styles.dateBadge}>
          <Text style={[styles.dateText, { color: colors.textSecondary, fontFamily: typography.numbersRegular }]}>
            {todayStr}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleTheme}
          style={[styles.themeBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.surfaceBorder }]}
          accessibilityLabel="Toggle theme"
        >
          {mode === 'dark' ? (
            <Sun size={18} color={colors.accentGold} strokeWidth={2.2} />
          ) : (
            <Moon size={18} color={colors.primary} strokeWidth={2.2} />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setEditText(loveNoteGreeting);
          setIsEditing(true);
        }}
        style={styles.greetingRow}
      >
        <Text
          style={[
            styles.greetingText,
            {
              color: colors.textPrimary,
              fontFamily: typography.cursive,
            },
          ]}
          numberOfLines={2}
        >
          {loveNoteGreeting}
        </Text>
        <View style={styles.editIconWrapper}>
          <Edit3 size={15} color={colors.textSecondary} strokeWidth={2} />
        </View>
      </TouchableOpacity>

      {/* Love Note Edit Modal */}
      <Modal visible={isEditing} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlayBackdrop }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.surfaceBorder,
                borderRadius: radii.modalOuter,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Heart size={20} color={colors.primary} strokeWidth={2.2} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: typography.numbersBold }]}>
                Personalize Morning Note
              </Text>
            </View>

            <TextInput
              value={editText}
              onChangeText={setEditText}
              placeholder="e.g. Good morning, my sunshine"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.surfaceBorder,
                  color: colors.textPrimary,
                  fontFamily: typography.cursive,
                  fontSize: 22,
                  borderRadius: radii.modalInnerContainer,
                },
              ]}
              autoFocus
              maxLength={60}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setIsEditing(false)}
                style={[styles.modalCancelBtn, { borderColor: colors.surfaceBorder }]}
              >
                <Text style={{ color: colors.textMuted, fontFamily: typography.numbersRegular }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary, borderRadius: radii.buttonMedium }]}
              >
                <Text style={{ color: colors.textOnPrimary, fontFamily: typography.numbersBold }}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateBadge: {
    paddingVertical: 2,
  },
  dateText: {
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  greetingText: {
    fontSize: 34,
    lineHeight: 40,
    flexShrink: 1,
  },
  editIconWrapper: {
    marginLeft: 8,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    padding: 24,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
  },
  modalInput: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
