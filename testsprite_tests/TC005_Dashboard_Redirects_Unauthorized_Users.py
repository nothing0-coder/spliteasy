import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_dashboard_redirects_unauthorized_users():
    """
    Verify that unauthenticated users navigating to the dashboard are redirected to the login page.
    """
    dashboard_url = f"{BASE_URL}/"
    try:
        response = requests.get(dashboard_url, allow_redirects=False, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to dashboard failed with exception: {e}"

    # Expecting a redirect (302) status code to login page for unauthorized user
    assert response.status_code == 302, f"Expected 302 redirect, got {response.status_code}"

    # The Location header should point to the login page
    location = response.headers.get("Location") or response.headers.get("location")
    assert location is not None, "Redirect response missing 'Location' header"
    assert "/auth/login" in location or "/login" in location, f"Redirect location expected to be login page, got: {location}"

test_dashboard_redirects_unauthorized_users()