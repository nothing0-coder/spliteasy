import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_oauth_callback_redirect_handling():
    # A valid OAuth authentication code for testing purpose (in reality this would be obtained dynamically)
    valid_auth_code = "valid_test_auth_code_123456"

    # Construct the request URL with the authentication code
    url = f"{BASE_URL}/auth/callback"
    params = {"code": valid_auth_code}

    try:
        response = requests.get(url, params=params, allow_redirects=False, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to OAuth callback endpoint failed: {e}"

    # Assert that a redirect (302) response is received
    assert response.status_code == 302, f"Expected 302 redirect, got {response.status_code}"

    # Validate the Location header for redirection to dashboard or expected destination
    redirect_location = response.headers.get("Location")
    assert redirect_location is not None, "Redirect location header missing"
    assert redirect_location.endswith("/"), f"Redirect location expected to end with '/', got: {redirect_location}"
    # Typically, OAuth callback after successful login redirects to dashboard '/' or '/dashboard'
    assert redirect_location in ["/", "/dashboard"], f"Unexpected redirect location: {redirect_location}"

test_oauth_callback_redirect_handling()