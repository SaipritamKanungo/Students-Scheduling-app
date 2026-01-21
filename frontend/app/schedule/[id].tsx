import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';

interface Session {
  subject: string;
  topic: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  completed: boolean;
}

interface Subject {
  name: string;
  exam_date: string;
  topics: any[];
  color: string;
}

interface StudyPlan {
  id: string;
  subjects: Subject[];
  daily_hours: number;
  start_date: string;
  sessions: Session[];
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchPlan();
  }, [id]);

  const fetchPlan = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/study-plans/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch study plan');
      }
      const data = await response.json();
      setPlan(data);
    } catch (error) {
      console.error('Error fetching plan:', error);
      Alert.alert('Error', 'Failed to load study plan');
    } finally {
      setLoading(false);
    }
  };

  const toggleSessionCompletion = async (session: Session) => {
    if (!plan) return;

    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/study-plans/${id}/sessions`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: session.date,
            subject: session.subject,
            topic: session.topic,
            completed: !session.completed,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update session');
      }

      const updatedPlan = await response.json();
      setPlan(updatedPlan);
    } catch (error) {
      console.error('Error updating session:', error);
      Alert.alert('Error', 'Failed to update session status');
    }
  };

  const getMarkedDates = () => {
    if (!plan) return {};

    const marked: any = {};
    plan.sessions.forEach((session) => {
      if (!marked[session.date]) {
        marked[session.date] = {
          marked: true,
          dots: [],
        };
      }

      const subject = plan.subjects.find((s) => s.name === session.subject);
      const color = subject?.color || '#4A90E2';

      marked[session.date].dots.push({
        color: session.completed ? '#50C878' : color,
      });
    });

    // Add selected date styling
    if (marked[selectedDate]) {
      marked[selectedDate].selected = true;
      marked[selectedDate].selectedColor = '#e3f2fd';
    } else {
      marked[selectedDate] = {
        selected: true,
        selectedColor: '#e3f2fd',
      };
    }

    return marked;
  };

  const getSessionsForDate = (date: string) => {
    if (!plan) return [];
    return plan.sessions.filter((s) => s.date === date);
  };

  const getProgressStats = () => {
    if (!plan) return { total: 0, completed: 0, percentage: 0 };

    const total = plan.sessions.length;
    const completed = plan.sessions.filter((s) => s.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percentage };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>Study plan not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sessionsForSelectedDate = getSessionsForDate(selectedDate);
  const stats = getProgressStats();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Study Schedule</Text>
          <Text style={styles.headerSubtitle}>
            {plan.subjects.map((s) => s.name).join(', ')}
          </Text>
        </View>
      </View>

      {/* Progress Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total - stats.completed}</Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#50C878' }]}>{stats.percentage}%</Text>
          <Text style={styles.statLabel}>Progress</Text>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'calendar' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={viewMode === 'calendar' ? '#fff' : '#666'}
          />
          <Text
            style={[
              styles.viewModeText,
              viewMode === 'calendar' && styles.viewModeTextActive,
            ]}
          >
            Calendar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={viewMode === 'list' ? '#fff' : '#666'}
          />
          <Text
            style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}
          >
            List
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {viewMode === 'calendar' ? (
          <>
            {/* Calendar */}
            <Calendar
              current={selectedDate}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={getMarkedDates()}
              markingType="multi-dot"
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#4A90E2',
                selectedDayBackgroundColor: '#4A90E2',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#4A90E2',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                dotColor: '#4A90E2',
                selectedDotColor: '#ffffff',
                arrowColor: '#4A90E2',
                monthTextColor: '#4A90E2',
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
            />

            {/* Sessions for Selected Date */}
            <View style={styles.daySessionsContainer}>
              <Text style={styles.daySessionsTitle}>
                {format(parseISO(selectedDate), 'MMMM d, yyyy')}
              </Text>

              {sessionsForSelectedDate.length === 0 ? (
                <View style={styles.noSessionsContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#ccc" />
                  <Text style={styles.noSessionsText}>No sessions scheduled</Text>
                </View>
              ) : (
                sessionsForSelectedDate.map((session, index) => {
                  const subject = plan.subjects.find((s) => s.name === session.subject);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.sessionCard,
                        session.completed && styles.sessionCardCompleted,
                        { borderLeftColor: subject?.color || '#4A90E2' },
                      ]}
                      onPress={() => toggleSessionCompletion(session)}
                    >
                      <View style={styles.sessionCardContent}>
                        <View style={styles.sessionInfo}>
                          <Text style={styles.sessionSubject}>{session.subject}</Text>
                          <Text style={styles.sessionTopic}>{session.topic}</Text>
                          <Text style={styles.sessionTime}>
                            {session.start_time} - {session.end_time} ({session.duration}h)
                          </Text>
                        </View>
                        <View style={styles.sessionStatus}>
                          <Ionicons
                            name={session.completed ? 'checkmark-circle' : 'ellipse-outline'}
                            size={32}
                            color={session.completed ? '#50C878' : '#ccc'}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        ) : (
          /* List View - All Sessions */
          <View style={styles.listContainer}>
            {plan.sessions.map((session, index) => {
              const subject = plan.subjects.find((s) => s.name === session.subject);
              const isToday = session.date === new Date().toISOString().split('T')[0];

              return (
                <View key={index}>
                  {(index === 0 ||
                    session.date !== plan.sessions[index - 1].date) && (
                    <Text style={[styles.listDateHeader, isToday && styles.listDateHeaderToday]}>
                      {format(parseISO(session.date), 'EEEE, MMMM d')}
                      {isToday && ' (Today)'}
                    </Text>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.listSessionCard,
                      session.completed && styles.sessionCardCompleted,
                      { borderLeftColor: subject?.color || '#4A90E2' },
                    ]}
                    onPress={() => toggleSessionCompletion(session)}
                  >
                    <View style={styles.sessionCardContent}>
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionSubject}>{session.subject}</Text>
                        <Text style={styles.sessionTopic}>{session.topic}</Text>
                        <Text style={styles.sessionTime}>
                          {session.start_time} - {session.end_time} ({session.duration}h)
                        </Text>
                      </View>
                      <View style={styles.sessionStatus}>
                        <Ionicons
                          name={session.completed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={32}
                          color={session.completed ? '#50C878' : '#ccc'}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e3f2fd',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  viewModeContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewModeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  viewModeTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  daySessionsContainer: {
    padding: 16,
  },
  daySessionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  noSessionsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noSessionsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionCardCompleted: {
    opacity: 0.6,
  },
  sessionCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sessionTopic: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 14,
    color: '#999',
  },
  sessionStatus: {
    marginLeft: 12,
  },
  listContainer: {
    padding: 16,
  },
  listDateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  listDateHeaderToday: {
    color: '#4A90E2',
  },
  listSessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});
