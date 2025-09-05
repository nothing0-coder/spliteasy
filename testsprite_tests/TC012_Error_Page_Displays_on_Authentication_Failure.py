import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_error_page_displays_on_auth_failure():
    """
    Verify the error handling page displays appropriately when authentication fails or
    an invalid login attempt is made.
    """
    error_page_url = f"{BASE_URL}/auth/error"
    # Simulate invalid login attempt by accessing a protected resource without valid auth
    try:
        # Attempt to access dashboard without authentication
        response = requests.get(f"{BASE_URL}/", timeout=TIMEOUT, allow_redirects=False)
        # Expected behavior: redirect to login or error page on unauthorized access
        assert response.status_code in (200, 302, 401, 403), \
            f"Unexpected status code for unauthenticated access to dashboard: {response.status_code}"

        if response.status_code == 200:
            # Check for indication of login or error content
            assert ("login" in response.text.lower() or "error" in response.text.lower() or "authentication" in response.text.lower()), \
                "Error or login content not found on dashboard page for auth failure"

        # If redirected, follow to check error page presence
        elif response.status_code == 302:
            redirect_location = response.headers.get("Location", "")
            # Visit redirected location
            redirect_response = requests.get(f"{BASE_URL}{redirect_location}", timeout=TIMEOUT)
            # Check for indication of error handling/login page content
            assert redirect_response.status_code == 200, \
                f"Redirect location did not load successfully, status: {redirect_response.status_code}"
            assert ("login" in redirect_response.text.lower()
                    or "error" in redirect_response.text.lower()
                    or "authentication" in redirect_response.text.lower()), \
                "Error or login content not found on redirect page for auth failure"

        # Additionally, directly test OAuth callback with invalid code param for error handling
        invalid_code = "invalid_auth_code_123"
        oauth_response = requests.get(f"{BASE_URL}/auth/callback?code={invalid_code}",
                                      allow_redirects=False, timeout=TIMEOUT)
        # The invalid code should NOT redirect to dashboard (302), possibly show error or 401/403
        assert oauth_response.status_code != 302, "Invalid OAuth code unexpectedly redirected to dashboard"
        # If server returns a page, check for error indications
        if oauth_response.status_code == 200:
            assert ("error" in oauth_response.text.lower()
                    or "invalid" in oauth_response.text.lower()
                    or "failed" in oauth_response.text.lower()), \
                "Expected error indication not found in OAuth callback response for invalid code"
        else:
            # For 4xx or 5xx status codes just validate these are authentication failure related
            assert oauth_response.status_code in (400, 401, 403, 404), \
                f"Unexpected status code for invalid OAuth callback: {oauth_response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed unexpectedly: {e}"

test_error_page_displays_on_auth_failure()
