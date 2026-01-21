import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Topic {
  name: string;
  difficulty: 'weak' | 'strong';
  hours_needed: number;
}

interface Subject {
  name: string;
  exam_date: string;
  topics: Topic[];
  color: string;
}

const COLORS = ['#4A90E2', '#50C878', '#FF6B6B', '#9B59B6', '#F39C12', '#1ABC9C'];

export default function CreatePlanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dailyHours, setDailyHours] = useState('4');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentExamDate, setCurrentExamDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentTopics, setCurrentTopics] = useState<Topic[]>([]);
  const [topicName, setTopicName] = useState('');
  const [topicHours, setTopicHours] = useState('2');
  const [topicDifficulty, setTopicDifficulty] = useState<'weak' | 'strong'>('weak');
  const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const addTopic = () => {
    if (!topicName.trim() || !topicHours) {
      Alert.alert('Error', 'Please fill in topic details');
      return;
    }

    const newTopic: Topic = {
      name: topicName.trim(),
      difficulty: topicDifficulty,
      hours_needed: parseFloat(topicHours),
    };

    setCurrentTopics([...currentTopics, newTopic]);
    setTopicName('');
    setTopicHours('2');
    setTopicDifficulty('weak');
  };

  const removeTopic = (index: number) => {
    setCurrentTopics(currentTopics.filter((_, i) => i !== index));
  };

  const addSubject = () => {
    if (!currentSubject.trim()) {
      Alert.alert('Error', 'Please enter subject name');
      return;
    }

    if (currentTopics.length === 0) {
      Alert.alert('Error', 'Please add at least one topic');
      return;
    }

    const newSubject: Subject = {
      name: currentSubject.trim(),
      exam_date: currentExamDate.toISOString().split('T')[0],
      topics: currentTopics,
      color: COLORS[subjects.length % COLORS.length],
    };

    setSubjects([...subjects, newSubject]);
    setCurrentSubject('');
    setCurrentExamDate(new Date());
    setCurrentTopics([]);
    Alert.alert('Success', 'Subject added!');
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const createPlan = async () => {
    if (subjects.length === 0) {
      Alert.alert('Error', 'Please add at least one subject');
      return;
    }

    if (!dailyHours || parseFloat(dailyHours) <= 0) {
      Alert.alert('Error', 'Please enter valid daily study hours');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/study-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjects,
          daily_hours: parseFloat(dailyHours),
          start_date: new Date().toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create study plan');
      }

      const data = await response.json();
      Alert.alert('Success', 'Study plan created!', [
        {
          text: 'View Schedule',
          onPress: () => router.replace(`/schedule/${data.id}`),
        },
      ]);
    } catch (error) {
      console.error('Error creating plan:', error);
      Alert.alert('Error', 'Failed to create study plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#4A90E2" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Study Plan</Text>
        </View>

        {/* Daily Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Study Hours</Text>
          <TextInput
            style={styles.input}
            value={dailyHours}
            onChangeText={setDailyHours}
            keyboardType="decimal-pad"
            placeholder="e.g., 4"
            placeholderTextColor="#999"
          />
        </View>

        {/* Add Subject Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Subject</Text>
          <TextInput
            style={styles.input}
            value={currentSubject}
            onChangeText={setCurrentSubject}
            placeholder="Subject name (e.g., Mathematics)"
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#4A90E2" />
            <Text style={styles.dateButtonText}>
              Exam Date: {currentExamDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={currentExamDate}
              mode="date"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setCurrentExamDate(selectedDate);
                }
              }}
            />
          )}

          {/* Add Topics */}
          <Text style={styles.subsectionTitle}>Topics</Text>
          <View style={styles.topicInputContainer}>
            <TextInput
              style={[styles.input, styles.topicNameInput]}
              value={topicName}
              onChangeText={setTopicName}
              placeholder="Topic name"
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, styles.topicHoursInput]}
              value={topicHours}
              onChangeText={setTopicHours}
              keyboardType="decimal-pad"
              placeholder="Hours"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.difficultyContainer}>
            <TouchableOpacity
              style={[
                styles.difficultyButton,
                topicDifficulty === 'weak' && styles.difficultyButtonActive,
              ]}
              onPress={() => setTopicDifficulty('weak')}
            >
              <Text
                style={[
                  styles.difficultyButtonText,
                  topicDifficulty === 'weak' && styles.difficultyButtonTextActive,
                ]}
              >
                Weak Topic
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.difficultyButton,
                topicDifficulty === 'strong' && styles.difficultyButtonActive,
              ]}
              onPress={() => setTopicDifficulty('strong')}
            >
              <Text
                style={[
                  styles.difficultyButtonText,
                  topicDifficulty === 'strong' && styles.difficultyButtonTextActive,
                ]}
              >
                Strong Topic
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={addTopic}>
            <Ionicons name="add" size={20} color="#4A90E2" />
            <Text style={styles.addButtonText}>Add Topic</Text>
          </TouchableOpacity>

          {/* Current Topics List */}
          {currentTopics.map((topic, index) => (
            <View key={index} style={styles.topicItem}>
              <View style={styles.topicInfo}>
                <Text style={styles.topicItemName}>{topic.name}</Text>
                <Text style={styles.topicItemDetails}>
                  {topic.hours_needed}h • {topic.difficulty === 'weak' ? '⚠️ Weak' : '✓ Strong'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeTopic(index)}>
                <Ionicons name="close-circle" size={24} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addSubjectButton} onPress={addSubject}>
            <Text style={styles.addSubjectButtonText}>Add Subject</Text>
          </TouchableOpacity>
        </View>

        {/* Added Subjects */}
        {subjects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Added Subjects ({subjects.length})</Text>
            {subjects.map((subject, index) => (
              <View key={index} style={[styles.subjectCard, { borderLeftColor: subject.color }]}>
                <View style={styles.subjectCardHeader}>
                  <View>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <Text style={styles.subjectDate}>
                      Exam: {new Date(subject.exam_date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.subjectTopics}>
                      {subject.topics.length} topics • {subject.topics.reduce((sum, t) => sum + t.hours_needed, 0)}h total
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeSubject(index)}>
                    <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Create Plan Button */}
        {subjects.length > 0 && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={createPlan}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Generate Study Schedule</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 48,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  topicInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topicNameInput: {
    flex: 1,
    marginRight: 8,
  },
  topicHoursInput: {
    width: 80,
  },
  difficultyContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  difficultyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  difficultyButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  difficultyButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  difficultyButtonTextActive: {
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  addButtonText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 4,
  },
  topicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  topicInfo: {
    flex: 1,
  },
  topicItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  topicItemDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  addSubjectButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addSubjectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subjectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subjectDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  subjectTopics: {
    fontSize: 14,
    color: '#999',
  },
  createButton: {
    backgroundColor: '#50C878',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#50C878',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
