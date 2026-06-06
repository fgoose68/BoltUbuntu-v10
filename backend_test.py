#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class BoltUbuntuAPITester:
    def __init__(self, base_url="http://localhost:3061"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = {
            "test": name,
            "status": "PASS" if success else "FAIL",
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status} - {name}: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    response_data = response.json()
                    details += f", Response: {json.dumps(response_data, indent=2)[:200]}..."
                except:
                    details += f", Response: {response.text[:100]}..."
            else:
                details += f", Expected: {expected_status}, Response: {response.text[:200]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.text else {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test health endpoint (no auth required)"""
        print("\n🔍 Testing Health Endpoint...")
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_login(self, email="admin@dashboard.local", password="admin123"):
        """Test login functionality"""
        print("\n🔍 Testing Login...")
        success, response = self.run_test(
            "Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.log_test("Token Extraction", True, f"Token received: {self.token[:20]}...")
            return True
        else:
            self.log_test("Token Extraction", False, "No token in response")
            return False

    def test_register(self, email="test@dashboard.local", password="test123", name="Test User"):
        """Test user registration"""
        print("\n🔍 Testing Registration...")
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data={"email": email, "password": password, "name": name}
        )
        return success

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        print("\n🔍 Testing Auth Me...")
        if not self.token:
            self.log_test("Auth Me", False, "No token available")
            return False
            
        success, response = self.run_test(
            "Auth Me",
            "GET",
            "api/auth/me",
            200
        )
        return success

    def test_metrics_current(self):
        """Test current metrics endpoint (requires auth)"""
        print("\n🔍 Testing Current Metrics...")
        if not self.token:
            self.log_test("Current Metrics", False, "No token available")
            return False
            
        success, response = self.run_test(
            "Current Metrics",
            "GET",
            "api/metrics/current",
            200
        )
        
        if success and 'metrics' in response:
            metrics = response['metrics']
            # Validate metrics structure
            required_keys = ['cpu', 'ram', 'disk', 'temperature', 'network']
            missing_keys = [key for key in required_keys if key not in metrics]
            
            if not missing_keys:
                self.log_test("Metrics Structure", True, f"All required metrics present: {required_keys}")
            else:
                self.log_test("Metrics Structure", False, f"Missing metrics: {missing_keys}")
        
        return success

    def test_metrics_history(self):
        """Test metrics history endpoint"""
        print("\n🔍 Testing Metrics History...")
        if not self.token:
            self.log_test("Metrics History", False, "No token available")
            return False
            
        success, response = self.run_test(
            "Metrics History",
            "GET",
            "api/metrics/history?hours=1",
            200
        )
        return success

    def test_docker_containers(self):
        """Test Docker containers endpoint (requires auth)"""
        print("\n🔍 Testing Docker Containers...")
        if not self.token:
            self.log_test("Docker Containers", False, "No token available")
            return False
            
        success, response = self.run_test(
            "Docker Containers",
            "GET",
            "api/docker/containers",
            200
        )
        return success

    def test_files_list(self):
        """Test files list endpoint (requires auth)"""
        print("\n🔍 Testing Files List...")
        if not self.token:
            self.log_test("Files List", False, "No token available")
            return False
            
        success, response = self.run_test(
            "Files List",
            "GET",
            "api/files/list",
            200
        )
        return success

    def test_unauthorized_access(self):
        """Test that protected endpoints require authentication"""
        print("\n🔍 Testing Unauthorized Access...")
        
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        endpoints = [
            ("api/metrics/current", "Metrics Current"),
            ("api/docker/containers", "Docker Containers"),
            ("api/files/list", "Files List")
        ]
        
        all_passed = True
        for endpoint, name in endpoints:
            success, _ = self.run_test(
                f"Unauthorized {name}",
                "GET",
                endpoint,
                401  # Should return 401 Unauthorized
            )
            if not success:
                all_passed = False
        
        # Restore token
        self.token = original_token
        return all_passed

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting BoltUbuntu API Test Suite")
        print("=" * 50)
        
        # Test health endpoint first
        self.test_health_endpoint()
        
        # Test authentication
        login_success = self.test_login()
        
        if login_success:
            # Test authenticated endpoints
            self.test_auth_me()
            self.test_metrics_current()
            self.test_metrics_history()
            self.test_docker_containers()
            self.test_files_list()
            
            # Test unauthorized access
            self.test_unauthorized_access()
        else:
            print("❌ Login failed - skipping authenticated endpoint tests")
        
        # Test registration (might fail if user exists)
        self.test_register()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed")
            return 1

    def save_results(self, filename="/app/test_reports/backend_test_results.json"):
        """Save test results to file"""
        results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run)*100 if self.tests_run > 0 else 0,
            "test_details": self.test_results
        }
        
        try:
            with open(filename, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"📄 Test results saved to {filename}")
        except Exception as e:
            print(f"❌ Failed to save results: {e}")

def main():
    tester = BoltUbuntuAPITester()
    exit_code = tester.run_all_tests()
    tester.save_results()
    return exit_code

if __name__ == "__main__":
    sys.exit(main())