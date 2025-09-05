import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_google_oauth_authentication_success():
    """
    Ensure user can authenticate using Google OAuth and arrive at dashboard.
    The flow is simulated by invoking the OAuth callback endpoint with a sample valid code.
    Then verify redirection to dashboard (HTTP 302 with Location header).
    Finally, access dashboard page to confirm user groups are displayed (HTTP 200).
    """
    # NOTE: In real scenario, obtaining a valid 'code' from Google OAuth flow would be dynamic.
    # For this test, assume 'valid_oauth_code' is a placeholder for a valid OAuth code.
    valid_oauth_code = "sample_valid_oauth_code"

    session = requests.Session()

    try:
        # Step 1: Invoke OAuth callback endpoint with code parameter
        callback_url = f"{BASE_URL}/auth/callback"
        params = {"code": valid_oauth_code}
        response = session.get(callback_url, params=params, allow_redirects=False, timeout=TIMEOUT)
        
        # Expect 302 redirect to dashboard (according to PRD)
        assert response.status_code == 302, f"Expected 302 redirect, got {response.status_code}"
        location = response.headers.get("Location")
        assert location and location.endswith("/"), f"Expected redirect to dashboard, got: {location}"

        # Step 2: Follow redirection to dashboard page
        dashboard_url = f"{BASE_URL}/"
        dashboard_response = session.get(dashboard_url, timeout=TIMEOUT)

        # Dashboard should respond with 200 OK and HTML content
        assert dashboard_response.status_code == 200, f"Expected 200 OK on dashboard, got {dashboard_response.status_code}"
        content_type = dashboard_response.headers.get("Content-Type", "")
        assert "text/html" in content_type.lower(), f"Expected HTML content type, got {content_type}"

        # Basic content validation: dashboard likely contains certain keywords
        html_text = dashboard_response.text.lower()
        assert "dashboard" in html_text or "groups" in html_text, "Dashboard page does not contain expected content"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    finally:
        session.close()

test_google_oauth_authentication_success()