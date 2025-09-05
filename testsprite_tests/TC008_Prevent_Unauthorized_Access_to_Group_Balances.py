import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_prevent_unauthorized_access_to_group_balances():
    # This test will:
    # 1. Register and authenticate two users: one group member and one non-member.
    # 2. The member user creates a group.
    # 3. The non-member user tries to access the group's balances endpoint.
    # 4. The request should return HTTP 403 Forbidden for the non-member user.

    # For the purposes of this test, assume the API has endpoints to:
    # - register/login users with email magic link or similar
    # - create groups (POST /groups)
    # - retrieve balances (GET /groups/{groupId}/balances)
    # Since no concrete auth API details are given beyond OAuth callback,
    # we'll simulate login by obtaining authentication tokens via a dummy login endpoint.

    # We'll simulate login by calling a hypothetical login endpoint that returns an auth token.
    # If unavailable, a bearer token or cookie for authentication should be set.
    # Since not specified, we'll assume bearer token auth with Authorization header.

    # Helper function for user login simulation:
    def login_user(email):
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email}, timeout=TIMEOUT)
        resp.raise_for_status()
        # Expecting response JSON with access_token
        token = resp.json().get("access_token")
        if not token:
            raise ValueError("Login failed to return access token")
        return token

    # Helper function to create group
    def create_group(token, group_name="Test Group Unauthorized Access"):
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"name": group_name}
        resp = requests.post(f"{BASE_URL}/groups", json=payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        group = resp.json()
        group_id = group.get("id")
        if not group_id:
            raise ValueError("Group creation did not return group id")
        return group_id

    # LOGIN: create two users
    user_member_email = "member_testuser@example.com"
    user_nonmember_email = "nonmember_testuser@example.com"

    # Login users and get their tokens
    token_member = login_user(user_member_email)
    token_nonmember = login_user(user_nonmember_email)

    # Create a group with member user
    group_id = None
    try:
        group_id = create_group(token_member)

        # Non-member tries to access balances of the group
        headers_nonmember = {"Authorization": f"Bearer {token_nonmember}"}
        url = f"{BASE_URL}/groups/{group_id}/balances"
        response = requests.get(url, headers=headers_nonmember, timeout=TIMEOUT)

        # Assert forbidden status code 403
        assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}"

    finally:
        # Cleanup: delete the group with member token if group_id exists
        if group_id:
            headers_member = {"Authorization": f"Bearer {token_member}"}
            try:
                requests.delete(f"{BASE_URL}/groups/{group_id}", headers=headers_member, timeout=TIMEOUT)
            except Exception:
                pass

test_prevent_unauthorized_access_to_group_balances()