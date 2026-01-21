import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/study-plans`);
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Study Scheduler</Text>
        <Text style={styles.headerSubtitle}>Plan your success</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Feature Cards */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureCard}>
            <Ionicons name="calendar-outline" size={32} color="#4A90E2" />
            <Text style={styles.featureTitle}>Smart Scheduling</Text>
            <Text style={styles.featureText}>AI-powered schedule based on exam dates</Text>
          </View>
          
          <View style={styles.featureCard}>
            <Ionicons name="trending-up-outline" size={32} color="#50C878" />
            <Text style={styles.featureTitle}>Track Progress</Text>
            <Text style={styles.featureText}>Monitor your study sessions</Text>
          </View>
        </View>

        {/* Existing Plans */}
        {plans.length > 0 && (
          <View style={styles.plansSection}>
            <Text style={styles.sectionTitle}>Your Study Plans</Text>
            {plans.slice(0, 3).map((plan, index) => (
              <TouchableOpacity
                key={plan.id || index}
                style={styles.planCard}
                onPress={() => router.push(`/schedule/${plan.id}`)}
              >
                <View style={styles.planCardContent}>
                  <View>
                    <Text style={styles.planSubjects}>
                      {plan.subjects?.map(s => s.name).join(', ')}
                    </Text>
                    <Text style={styles.planDate}>
                      {plan.subjects?.length || 0} subjects • {plan.daily_hours}h daily
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                </View>
              </TouchableOpacity>
            ))}
            {plans.length > 3 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View all plans ({plans.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/create-plan')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#fff" style={styles.ctaIcon} />
          <Text style={styles.ctaText}>Create New Study Plan</Text>
        </TouchableOpacity>

        {plans.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No study plans yet</Text>
            <Text style={styles.emptySubtext}>Create your first plan to get started</Text>
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
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e3f2fd',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  plansSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  planCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planSubjects: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  planDate: {
    fontSize: 14,
    color: '#666',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  ctaButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  ctaIcon: {
    marginRight: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
});
