import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def authenticate_user():
    """
    Dummy authentication function.
    Replace this with actual authentication to get a valid session or token.
    For this test, assume session cookie or auth token is acquired here.
    """
    # Example: Login with email magic link or Google OAuth would be here.
    # For simplicity, we simulate login by sending credentials to a hypothetical login endpoint
    # and returning a session cookie or auth token.

    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {
        "email": "testuser@example.com"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post(login_url, json=login_payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        # Assume the response sets a session cookie or returns a token
        # Here we simulate retrieval of a cookie called 'sessionid'
        cookies = resp.cookies
        token = resp.json().get("access_token")  # or get cookie from resp.cookies
        return cookies, token
    except Exception:
        # If no real auth is implemented, return empty cookies and None token
        return None, None

def create_group(auth_cookies, auth_token):
    url = f"{BASE_URL}/groups"
    headers = {
        "Content-Type": "application/json"
    }
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    payload = {
        "name": "Test Group for TC007"
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, cookies=auth_cookies, timeout=TIMEOUT)
        resp.raise_for_status()
        # Expect response json or header to contain the created group ID
        json_resp = resp.json()
        group_id = json_resp.get("id")
        if not group_id:
            raise ValueError("Group ID not returned from create group API")
        return group_id
    except RequestException as e:
        raise RuntimeError(f"Failed to create group: {e}")

def delete_group(group_id, auth_cookies, auth_token):
    url = f"{BASE_URL}/groups/{group_id}"
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    try:
        resp = requests.delete(url, headers=headers, cookies=auth_cookies, timeout=TIMEOUT)
        # Deleting might return 204 No Content or 200 OK
        if resp.status_code not in (200, 204):
            raise RuntimeError(f"Failed to delete group with status code {resp.status_code}")
    except RequestException as e:
        raise RuntimeError(f"Failed to delete group: {e}")

def test_access_specific_group_details():
    # Authenticate and get cookies or token
    auth_cookies, auth_token = authenticate_user()
    if auth_cookies is None and auth_token is None:
        # If no real authentication, skip this test because group access requires auth
        raise RuntimeError("Authentication failed or not implemented")

    group_id = None
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    try:
        # Create a group to access
        group_id = create_group(auth_cookies, auth_token)

        # Access the group's detail page
        url = f"{BASE_URL}/groups/{group_id}"
        resp = requests.get(url, headers=headers, cookies=auth_cookies, timeout=TIMEOUT)

        assert resp.status_code == 200, f"Expected status code 200, got {resp.status_code}"
        content_type = resp.headers.get("Content-Type", "")
        assert "text/html" in content_type, f"Expected 'text/html' content, got {content_type}"
        assert resp.text and len(resp.text) > 0, "Group details page response body is empty"

    finally:
        # Cleanup - delete the created group if created
        if group_id:
            try:
                delete_group(group_id, auth_cookies, auth_token)
            except Exception:
                pass  # Ignore cleanup errors

test_access_specific_group_details()