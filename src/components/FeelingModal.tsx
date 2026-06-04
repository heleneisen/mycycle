import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SymptomIntensityRow, type Intensity } from '@/src/components/SymptomIntensityRow';
import { FreshFeminine, SPACING } from '@/src/constants/theme';

const PAIN_SYMPTOMS = [
  'Cramps',
  'Backache',
  'Mittelschmerz',
  'Breast tenderness',
  'Pelvic pain',
  'Migraine',
];
const VITALITY_SYMPTOMS = [
  'Fatigue',
  'Dizziness',
  'Insomnia',
  'Brain fog',
  'Bloating',
  'Nausea',
  'Diarrhea',
  'Constipation',
  'Cravings',
];
const MOOD_SKIN_SYMPTOMS = [
  'Irritability',
  'Anxiety',
  'Mood swings',
  'Sadness',
  'High energy',
  'Acne',
  'Hair loss',
];

type SymptomLevels = Record<string, Intensity>;

type FeelingModalProps = {
  visible: boolean;
  onClose: () => void;
  symptoms: SymptomLevels;
  setSymptom: (name: string, value: Intensity) => void;
  getSymptom: (name: string) => Intensity;
  customSymptom: string;
  setCustomSymptom: (value: string) => void;
  savedCustomSymptoms: string[];
  onAddCustomSymptom: (name: string) => void;
};

export function FeelingModal({
  visible,
  onClose,
  symptoms,
  setSymptom,
  getSymptom,
  customSymptom,
  setCustomSymptom,
  savedCustomSymptoms,
  onAddCustomSymptom,
}: FeelingModalProps) {
  const handleAdd = () => {
    const trimmed = customSymptom.trim();
    if (!trimmed) return;
    onAddCustomSymptom(trimmed);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Feeling</Text>
          <Pressable onPress={onClose} style={styles.doneBtn} hitSlop={12}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.hint}>Pain</Text>
          {PAIN_SYMPTOMS.map((name) => (
            <SymptomIntensityRow
              key={name}
              label={name}
              value={getSymptom(name)}
              onValueChange={(v) => setSymptom(name, v)}
            />
          ))}
          <Text style={styles.hint}>Vitality & digestion</Text>
          {VITALITY_SYMPTOMS.map((name) => (
            <SymptomIntensityRow
              key={name}
              label={name}
              value={getSymptom(name)}
              onValueChange={(v) => setSymptom(name, v)}
            />
          ))}
          <Text style={styles.hint}>Mood & skin</Text>
          {MOOD_SKIN_SYMPTOMS.map((name) => (
            <SymptomIntensityRow
              key={name}
              label={name}
              value={getSymptom(name)}
              onValueChange={(v) => setSymptom(name, v)}
            />
          ))}
          <Text style={styles.hint}>Custom</Text>
          {savedCustomSymptoms.map((name) => (
            <SymptomIntensityRow
              key={name}
              label={name}
              value={getSymptom(name)}
              onValueChange={(v) => setSymptom(name, v)}
            />
          ))}
          <View style={styles.addRow}>
            <TextInput
              style={styles.customInput}
              value={customSymptom}
              onChangeText={setCustomSymptom}
              onSubmitEditing={handleAdd}
              placeholder="Add your own…"
              placeholderTextColor={FreshFeminine.sage}
              returnKeyType="done"
            />
            <Pressable
              style={[styles.addBtn, !customSymptom.trim() && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!customSymptom.trim()}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreshFeminine.warmWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: FreshFeminine.sage,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: FreshFeminine.charcoal,
  },
  doneBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: FreshFeminine.sage,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: SPACING,
    paddingBottom: 40,
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    color: FreshFeminine.sage,
    marginTop: 8,
    marginBottom: 4,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: FreshFeminine.sage,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: FreshFeminine.charcoal,
  },
  addBtn: {
    backgroundColor: FreshFeminine.sage,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: FreshFeminine.warmWhite,
    fontWeight: '600',
    fontSize: 14,
  },
});
