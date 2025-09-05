import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_email_magic_link_authentication_success():
    session = requests.Session()
    try:
        # Step 1: Access dashboard without authentication: expect redirect to login (302)
        dashboard_response_before_auth = session.get(f"{BASE_URL}/", timeout=TIMEOUT, allow_redirects=False)
        assert dashboard_response_before_auth.status_code == 302, "Expected redirect to login before authentication"

        # Step 2: Simulate OAuth callback with code query parameter
        # According to PRD, GET /auth/callback?code=string returns 302 redirect to dashboard
        code = "testcode"
        auth_callback_response = session.get(f"{BASE_URL}/auth/callback", params={"code": code}, timeout=TIMEOUT, allow_redirects=False)
        assert auth_callback_response.status_code == 302, "Expected redirect to dashboard after auth callback"

        # Step 3: Access dashboard after authentication callback
        dashboard_response = session.get(f"{BASE_URL}/", timeout=TIMEOUT)
        assert dashboard_response.status_code == 200, "Dashboard not accessible after authentication"
        # The content should contain dashboard info - user groups, etc. The PRD says content-type text/html with string body
        assert "dashboard" in dashboard_response.text.lower(), "Dashboard content does not appear correct"
    finally:
        session.close()


test_email_magic_link_authentication_success()