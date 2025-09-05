import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_form_validation_add_expense_and_group_creation():
    session = requests.Session()

    # Helper function to authenticate user - assuming a test user and token exist
    # As PRD does not provide auth endpoint details for token, skip auth here but include placeholders
    headers = {
        "Content-Type": "application/json",
        # "Authorization": "Bearer <token>",  # Add if needed
    }

    # 1. Test Group Creation Validation

    # Required field missing: empty payload
    group_creation_payloads = [
        {},  # empty payload
        {"name": ""},  # empty string required field
        {"name": "Valid Group", "description": 123},  # wrong type
    ]

    for payload in group_creation_payloads:
        resp = session.post(f"{BASE_URL}/groups", json=payload, headers=headers, timeout=TIMEOUT)
        # Expecting 400 Bad Request or similar validation error status code for invalid input
        assert resp.status_code in (400, 422), f"Expected validation error status for payload {payload}, got {resp.status_code}"
        json_resp = None
        try:
            json_resp = resp.json()
        except Exception:
            pass
        assert json_resp is None or "error" in json_resp or "message" in json_resp, "Expected error message in response for invalid group creation"

    # 2. Test Add Expense Validation

    # First, create a valid group to test adding expense within it
    valid_group_payload = {"name": "Test Group for Expense Validation"}
    create_group_resp = session.post(f"{BASE_URL}/groups", json=valid_group_payload, headers=headers, timeout=TIMEOUT)
    assert create_group_resp.status_code == 201 or create_group_resp.status_code == 200, "Failed to create group for expense tests"
    try:
        group_data = create_group_resp.json()
        group_id = group_data.get("id") or group_data.get("groupId")
        assert group_id, "Group ID not returned in creation response"
    except Exception as e:
        raise AssertionError("Failed to parse created group response") from e

    try:
        # Test invalid expense payloads (missing required fields, wrong formats)
        expense_payloads = [
            {},  # empty payload
            {"amount": "", "description": "Dinner"},  # empty amount
            {"amount": -10, "description": "Dinner"},  # negative amount
            {"amount": 25.50},  # missing description
            {"amount": 25.50, "description": ""},  # empty description
            {"amount": "twenty", "description": "Dinner"},  # amount string instead of number
            {"amount": 10, "description": "Dinner", "date": "invalid-date-format"},  # invalid date format
        ]

        for expense_payload in expense_payloads:
            resp = session.post(f"{BASE_URL}/groups/{group_id}/expenses", json=expense_payload, headers=headers, timeout=TIMEOUT)
            assert resp.status_code in (400, 422), f"Expected validation error status for expense payload: {expense_payload}, got {resp.status_code}"
            try:
                err_json = resp.json()
                assert "error" in err_json or "message" in err_json, "Expected error message in response for invalid expense data"
            except Exception:
                pass
    finally:
        # Cleanup - delete the created group to avoid pollution
        session.delete(f"{BASE_URL}/groups/{group_id}", headers=headers, timeout=TIMEOUT)

test_form_validation_add_expense_and_group_creation()