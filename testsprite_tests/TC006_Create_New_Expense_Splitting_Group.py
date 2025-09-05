import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Removed authentication due to no /auth/login endpoint

def test_create_new_expense_splitting_group():
    group_id = None
    group_name = f"Test Group {uuid.uuid4()}"
    payload = {
        "name": group_name,
        "description": "Group created by automated test for expense splitting."
    }

    headers = {"Content-Type": "application/json"}

    try:
        # Create new expense splitting group
        create_resp = requests.post(
            f"{BASE_URL}/groups",
            headers=headers,
            json=payload,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Expected 201 Created, got {create_resp.status_code}"
        create_resp_json = create_resp.json()
        group_id = create_resp_json.get("id")
        assert group_id, "Response JSON does not include 'id' of the created group"
        assert create_resp_json.get("name") == group_name, "Group name in response does not match request"

        # Retrieve the group to verify it was created successfully
        get_resp = requests.get(
            f"{BASE_URL}/groups/{group_id}",
            headers=headers,
            timeout=TIMEOUT
        )
        assert get_resp.status_code == 200, f"Expected 200 OK for group retrieval, got {get_resp.status_code}"
        group_html = get_resp.text
        assert group_name in group_html, "Group name not found in group details page"

    finally:
        # Cleanup: delete the created group to maintain test environment
        if group_id:
            try:
                del_resp = requests.delete(
                    f"{BASE_URL}/groups/{group_id}",
                    headers=headers,
                    timeout=TIMEOUT
                )
                # Accept 200 OK or 204 No Content as successful deletion
                assert del_resp.status_code in (200, 204), f"Failed to delete test group, status code {del_resp.status_code}"
            except Exception as cleanup_err:
                print(f"Warning: could not delete test group {group_id}. Exception: {cleanup_err}")

test_create_new_expense_splitting_group()
