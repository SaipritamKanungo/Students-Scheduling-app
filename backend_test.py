#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Student Study Scheduler
Tests all backend endpoints with various scenarios including edge cases
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import time

# Backend URL from frontend/.env
BASE_URL = "https://study-optimizer-2.preview.emergentagent.com/api"

class StudySchedulerTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.created_plan_ids = []
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name, success, message=""):
        """Log test results"""
        if success:
            print(f"✅ {test_name}: PASSED")
            self.test_results["passed"] += 1
        else:
            print(f"❌ {test_name}: FAILED - {message}")
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {message}")
    
    def test_api_health(self):
        """Test if API is accessible"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                self.log_result("API Health Check", True)
                return True
            else:
                self.log_result("API Health Check", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("API Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def create_sample_study_plan(self, plan_name="Test Plan"):
        """Create a sample study plan for testing"""
        # Calculate dates
        start_date = datetime.now().date().isoformat()
        exam_date_1 = (datetime.now() + timedelta(days=25)).date().isoformat()  # Physics - closer exam
        exam_date_2 = (datetime.now() + timedelta(days=30)).date().isoformat()  # Math - later exam
        
        sample_data = {
            "subjects": [
                {
                    "name": "Mathematics",
                    "exam_date": exam_date_2,
                    "topics": [
                        {"name": "Calculus", "difficulty": "weak", "hours_needed": 3},
                        {"name": "Algebra", "difficulty": "strong", "hours_needed": 2}
                    ],
                    "color": "#4A90E2"
                },
                {
                    "name": "Physics", 
                    "exam_date": exam_date_1,
                    "topics": [
                        {"name": "Mechanics", "difficulty": "weak", "hours_needed": 4},
                        {"name": "Thermodynamics", "difficulty": "strong", "hours_needed": 2}
                    ],
                    "color": "#50C878"
                }
            ],
            "daily_hours": 5,
            "start_date": start_date
        }
        return sample_data
    
    def test_create_study_plan(self):
        """Test POST /api/study-plans with various scenarios"""
        print("\n=== Testing Study Plan Creation ===")
        
        # Test 1: Valid plan with multiple subjects
        try:
            sample_data = self.create_sample_study_plan()
            response = requests.post(f"{self.base_url}/study-plans", 
                                   json=sample_data, timeout=15)
            
            if response.status_code == 200:
                plan = response.json()
                if 'id' in plan and 'sessions' in plan:
                    self.created_plan_ids.append(plan['id'])
                    
                    # Verify scheduling algorithm
                    sessions = plan['sessions']
                    if len(sessions) > 0:
                        # Check if Physics (closer exam) appears before Math in schedule
                        physics_sessions = [s for s in sessions if s['subject'] == 'Physics']
                        math_sessions = [s for s in sessions if s['subject'] == 'Mathematics']
                        
                        if physics_sessions and math_sessions:
                            first_physics = min(physics_sessions, key=lambda x: x['date'])
                            first_math = min(math_sessions, key=lambda x: x['date'])
                            
                            if first_physics['date'] <= first_math['date']:
                                self.log_result("Create Plan - Priority Algorithm", True)
                            else:
                                self.log_result("Create Plan - Priority Algorithm", False, 
                                              "Physics (closer exam) should be scheduled before Math")
                        
                        # Check weak vs strong topic allocation
                        weak_sessions = [s for s in sessions if any(
                            topic['name'] == s['topic'] and topic['difficulty'] == 'weak' 
                            for subj in sample_data['subjects'] for topic in subj['topics']
                        )]
                        strong_sessions = [s for s in sessions if any(
                            topic['name'] == s['topic'] and topic['difficulty'] == 'strong'
                            for subj in sample_data['subjects'] for topic in subj['topics']
                        )]
                        
                        weak_total_time = sum(s['duration'] for s in weak_sessions)
                        strong_total_time = sum(s['duration'] for s in strong_sessions)
                        
                        if weak_total_time > strong_total_time:
                            self.log_result("Create Plan - Weak Topic Priority", True)
                        else:
                            self.log_result("Create Plan - Weak Topic Priority", False,
                                          f"Weak topics time: {weak_total_time}, Strong topics time: {strong_total_time}")
                        
                        # Check time slots (9 AM - 9 PM)
                        valid_times = all(
                            9 <= int(s['start_time'].split(':')[0]) <= 21 and
                            9 <= int(s['end_time'].split(':')[0]) <= 21
                            for s in sessions
                        )
                        
                        if valid_times:
                            self.log_result("Create Plan - Valid Time Slots", True)
                        else:
                            self.log_result("Create Plan - Valid Time Slots", False,
                                          "Some sessions outside 9 AM - 9 PM range")
                        
                        self.log_result("Create Plan - Basic Functionality", True)
                    else:
                        self.log_result("Create Plan - Basic Functionality", False, "No sessions generated")
                else:
                    self.log_result("Create Plan - Basic Functionality", False, "Missing id or sessions in response")
            else:
                self.log_result("Create Plan - Basic Functionality", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Plan - Basic Functionality", False, f"Exception: {str(e)}")
        
        # Test 2: Single subject plan
        try:
            single_subject_data = {
                "subjects": [
                    {
                        "name": "Chemistry",
                        "exam_date": (datetime.now() + timedelta(days=20)).date().isoformat(),
                        "topics": [
                            {"name": "Organic Chemistry", "difficulty": "weak", "hours_needed": 5}
                        ],
                        "color": "#FF6B6B"
                    }
                ],
                "daily_hours": 3,
                "start_date": datetime.now().date().isoformat()
            }
            
            response = requests.post(f"{self.base_url}/study-plans", 
                                   json=single_subject_data, timeout=15)
            
            if response.status_code == 200:
                plan = response.json()
                if 'id' in plan:
                    self.created_plan_ids.append(plan['id'])
                self.log_result("Create Plan - Single Subject", True)
            else:
                self.log_result("Create Plan - Single Subject", False, 
                              f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Create Plan - Single Subject", False, f"Exception: {str(e)}")
        
        # Test 3: Plan without start_date (should use current date)
        try:
            no_start_date = {
                "subjects": [
                    {
                        "name": "Biology",
                        "exam_date": (datetime.now() + timedelta(days=15)).date().isoformat(),
                        "topics": [
                            {"name": "Cell Biology", "difficulty": "strong", "hours_needed": 2}
                        ],
                        "color": "#9B59B6"
                    }
                ],
                "daily_hours": 4
            }
            
            response = requests.post(f"{self.base_url}/study-plans", 
                                   json=no_start_date, timeout=15)
            
            if response.status_code == 200:
                plan = response.json()
                if 'id' in plan:
                    self.created_plan_ids.append(plan['id'])
                self.log_result("Create Plan - Default Start Date", True)
            else:
                self.log_result("Create Plan - Default Start Date", False, 
                              f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Create Plan - Default Start Date", False, f"Exception: {str(e)}")
    
    def test_get_all_plans(self):
        """Test GET /api/study-plans"""
        print("\n=== Testing Get All Plans ===")
        
        try:
            response = requests.get(f"{self.base_url}/study-plans", timeout=10)
            
            if response.status_code == 200:
                plans = response.json()
                if isinstance(plans, list):
                    if len(plans) >= len(self.created_plan_ids):
                        # Check if plans are sorted by creation date (newest first)
                        if len(plans) > 1:
                            dates_sorted = all(
                                plans[i]['created_at'] >= plans[i+1]['created_at'] 
                                for i in range(len(plans)-1)
                            )
                            if dates_sorted:
                                self.log_result("Get All Plans - Sorting", True)
                            else:
                                self.log_result("Get All Plans - Sorting", False, "Plans not sorted by creation date")
                        
                        self.log_result("Get All Plans - Basic Functionality", True)
                    else:
                        self.log_result("Get All Plans - Basic Functionality", False, 
                                      f"Expected at least {len(self.created_plan_ids)} plans, got {len(plans)}")
                else:
                    self.log_result("Get All Plans - Basic Functionality", False, "Response is not a list")
            else:
                self.log_result("Get All Plans - Basic Functionality", False, 
                              f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get All Plans - Basic Functionality", False, f"Exception: {str(e)}")
    
    def test_get_single_plan(self):
        """Test GET /api/study-plans/{plan_id}"""
        print("\n=== Testing Get Single Plan ===")
        
        if not self.created_plan_ids:
            self.log_result("Get Single Plan - Valid ID", False, "No plans created for testing")
            return
        
        # Test with valid plan_id
        try:
            plan_id = self.created_plan_ids[0]
            response = requests.get(f"{self.base_url}/study-plans/{plan_id}", timeout=10)
            
            if response.status_code == 200:
                plan = response.json()
                if 'id' in plan and plan['id'] == plan_id:
                    self.log_result("Get Single Plan - Valid ID", True)
                else:
                    self.log_result("Get Single Plan - Valid ID", False, "Plan ID mismatch")
            else:
                self.log_result("Get Single Plan - Valid ID", False, 
                              f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Single Plan - Valid ID", False, f"Exception: {str(e)}")
        
        # Test with invalid plan_id
        try:
            invalid_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but non-existent
            response = requests.get(f"{self.base_url}/study-plans/{invalid_id}", timeout=10)
            
            if response.status_code == 404:
                self.log_result("Get Single Plan - Invalid ID", True)
            else:
                self.log_result("Get Single Plan - Invalid ID", False, 
                              f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Get Single Plan - Invalid ID", False, f"Exception: {str(e)}")
    
    def test_update_session_status(self):
        """Test PUT /api/study-plans/{plan_id}/sessions"""
        print("\n=== Testing Update Session Status ===")
        
        if not self.created_plan_ids:
            self.log_result("Update Session - Valid Request", False, "No plans created for testing")
            return
        
        # Get a plan with sessions
        try:
            plan_id = self.created_plan_ids[0]
            response = requests.get(f"{self.base_url}/study-plans/{plan_id}", timeout=10)
            
            if response.status_code == 200:
                plan = response.json()
                sessions = plan.get('sessions', [])
                
                if sessions:
                    # Test updating first session
                    first_session = sessions[0]
                    update_data = {
                        "date": first_session['date'],
                        "subject": first_session['subject'],
                        "topic": first_session['topic'],
                        "completed": True
                    }
                    
                    update_response = requests.put(
                        f"{self.base_url}/study-plans/{plan_id}/sessions",
                        json=update_data,
                        timeout=10
                    )
                    
                    if update_response.status_code == 200:
                        updated_plan = update_response.json()
                        updated_sessions = updated_plan.get('sessions', [])
                        
                        # Find the updated session
                        updated_session = next(
                            (s for s in updated_sessions 
                             if s['date'] == update_data['date'] and 
                                s['subject'] == update_data['subject'] and 
                                s['topic'] == update_data['topic']), 
                            None
                        )
                        
                        if updated_session and updated_session['completed'] == True:
                            self.log_result("Update Session - Valid Request", True)
                        else:
                            self.log_result("Update Session - Valid Request", False, 
                                          "Session completion status not updated")
                    else:
                        self.log_result("Update Session - Valid Request", False, 
                                      f"Status: {update_response.status_code}")
                else:
                    self.log_result("Update Session - Valid Request", False, "No sessions found in plan")
            else:
                self.log_result("Update Session - Valid Request", False, 
                              f"Could not fetch plan: {response.status_code}")
        except Exception as e:
            self.log_result("Update Session - Valid Request", False, f"Exception: {str(e)}")
        
        # Test with invalid plan_id
        try:
            invalid_id = "507f1f77bcf86cd799439011"
            update_data = {
                "date": "2025-01-21",
                "subject": "Test Subject",
                "topic": "Test Topic",
                "completed": True
            }
            
            response = requests.put(
                f"{self.base_url}/study-plans/{invalid_id}/sessions",
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 404:
                self.log_result("Update Session - Invalid Plan ID", True)
            else:
                self.log_result("Update Session - Invalid Plan ID", False, 
                              f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Update Session - Invalid Plan ID", False, f"Exception: {str(e)}")
    
    def test_delete_plan(self):
        """Test DELETE /api/study-plans/{plan_id}"""
        print("\n=== Testing Delete Plan ===")
        
        if not self.created_plan_ids:
            self.log_result("Delete Plan - Valid ID", False, "No plans created for testing")
            return
        
        # Test deleting a valid plan
        try:
            plan_id = self.created_plan_ids.pop()  # Remove from list so we don't try to delete again
            response = requests.delete(f"{self.base_url}/study-plans/{plan_id}", timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if 'message' in result:
                    # Verify plan is actually deleted
                    get_response = requests.get(f"{self.base_url}/study-plans/{plan_id}", timeout=10)
                    if get_response.status_code == 404:
                        self.log_result("Delete Plan - Valid ID", True)
                    else:
                        self.log_result("Delete Plan - Valid ID", False, "Plan still exists after deletion")
                else:
                    self.log_result("Delete Plan - Valid ID", False, "No success message in response")
            else:
                self.log_result("Delete Plan - Valid ID", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Delete Plan - Valid ID", False, f"Exception: {str(e)}")
        
        # Test deleting with invalid plan_id
        try:
            invalid_id = "507f1f77bcf86cd799439011"
            response = requests.delete(f"{self.base_url}/study-plans/{invalid_id}", timeout=10)
            
            if response.status_code == 404:
                self.log_result("Delete Plan - Invalid ID", True)
            else:
                self.log_result("Delete Plan - Invalid ID", False, 
                              f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Delete Plan - Invalid ID", False, f"Exception: {str(e)}")
    
    def cleanup(self):
        """Clean up any remaining test data"""
        print("\n=== Cleaning Up Test Data ===")
        for plan_id in self.created_plan_ids:
            try:
                requests.delete(f"{self.base_url}/study-plans/{plan_id}", timeout=5)
                print(f"Cleaned up plan: {plan_id}")
            except:
                pass
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Student Study Scheduler Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Run all tests
        self.test_create_study_plan()
        self.test_get_all_plans()
        self.test_get_single_plan()
        self.test_update_session_status()
        self.test_delete_plan()
        
        # Cleanup
        self.cleanup()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print("\n🔍 FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"  • {error}")
        
        success_rate = (self.test_results['passed'] / 
                       (self.test_results['passed'] + self.test_results['failed'])) * 100
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        return self.test_results['failed'] == 0

if __name__ == "__main__":
    tester = StudySchedulerTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)