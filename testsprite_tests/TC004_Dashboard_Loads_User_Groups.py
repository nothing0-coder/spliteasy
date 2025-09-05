import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_dashboard_loads_user_groups():
    session = requests.Session()
    try:
        auth_token = "Bearer test_valid_user_token"
        headers = {
            "Authorization": auth_token
        }
        dashboard_resp = session.get(f"{BASE_URL}/", headers=headers, timeout=TIMEOUT, allow_redirects=False)
        assert dashboard_resp.status_code == 200, f"Expected 200 OK from dashboard, got {dashboard_resp.status_code}"
        content = dashboard_resp.text
        assert len(content.strip()) > 0, "Dashboard page content is empty"
    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"
    finally:
        session.close()

test_dashboard_loads_user_groups()
