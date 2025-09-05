import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_ui_consistency_during_navigation_and_authentication():
    session = requests.Session()
    try:
        # Step 1: Access login page (simulate visiting login page)
        login_response = session.get(f"{BASE_URL}/auth/login", timeout=TIMEOUT)
        assert login_response.status_code == 200
        assert "login" in login_response.text.lower()  # Check page content contains login form hints

        # Step 2: Simulate login via email magic link
        dummy_oauth_code = "dummy_code_for_testing"

        # OAuth callback to trigger login redirect
        callback_response = session.get(f"{BASE_URL}/auth/callback", params={"code": dummy_oauth_code}, allow_redirects=False, timeout=TIMEOUT)
        # Expecting a 302 redirect to dashboard on success
        assert callback_response.status_code == 302
        assert "Location" in callback_response.headers
        redirect_location = callback_response.headers["Location"]
        # PRD specifies redirect to dashboard (root path '/') after successful authentication
        assert redirect_location == "/"

        # Step 3: Follow redirect to dashboard
        dashboard_url = BASE_URL + redirect_location
        dashboard_response = session.get(dashboard_url, timeout=TIMEOUT)
        assert dashboard_response.status_code == 200
        assert "groups" in dashboard_response.text.lower() or "dashboard" in dashboard_response.text.lower()

        # Step 4: Assume user has at least one group; parse group IDs from dashboard page.
        # Since HTML parsing is required (not detailed), we search for group URL pattern "/groups/{groupId}"
        import re
        group_ids = re.findall(r'/groups/([\w-]+)', dashboard_response.text)
        assert group_ids, "No groups found on dashboard for navigating"

        # Use the first group ID for navigation
        group_id = group_ids[0]

        # Step 5: Access group details page
        group_response = session.get(f"{BASE_URL}/groups/{group_id}", timeout=TIMEOUT)
        assert group_response.status_code == 200
        assert "group" in group_response.text.lower()

        # Step 6: Access group balances page
        balances_response = session.get(f"{BASE_URL}/groups/{group_id}/balances", timeout=TIMEOUT)
        assert balances_response.status_code == 200
        assert "balance" in balances_response.text.lower()

        # Step 7: Validate consistent UI components by checking repeated presence of UI keywords or markers
        # These are placeholders - in real UI test, we would check React components or CSS classes
        ui_markers = ["button", "card", "input", "label"]
        for marker in ui_markers:
            assert marker in dashboard_response.text.lower()
            assert marker in group_response.text.lower()
            assert marker in balances_response.text.lower()
    except RequestException as e:
        assert False, f"Request failed: {e}"

test_ui_consistency_during_navigation_and_authentication()