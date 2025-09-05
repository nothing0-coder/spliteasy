import requests
import uuid
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json",
    # Assuming authentication is required, include auth token here if available.
    # "Authorization": "Bearer <token>"
}

def test_form_reset_behavior_after_successful_submission():
    group_id = None
    expense_id = None

    # Helper to create a group
    def create_group(name):
        payload = {
            "name": name,
            # Add other required fields if any
        }
        response = requests.post(f"{BASE_URL}/groups", json=payload, headers=HEADERS, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        return data.get("id")

    # Helper to delete a group
    def delete_group(gid):
        resp = requests.delete(f"{BASE_URL}/groups/{gid}", headers=HEADERS, timeout=TIMEOUT)
        if resp.status_code not in (200, 204):
            raise Exception(f"Cleanup failed: could not delete group {gid}")

    # Helper to add an expense to a group
    def add_expense(gid, title, amount, paid_by, participants):
        payload = {
            "title": title,
            "amount": amount,
            "paid_by": paid_by,
            "participants": participants
        }
        resp = requests.post(f"{BASE_URL}/groups/{gid}/expenses", json=payload, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json().get("id")

    # Helper to get form reset confirmation or check form reset state
    # Since API does not expose form state, simulate by checking if after submitting a resource,
    # creating it again with same payload succeeds, assuming stateless API.
    # Alternatively, check if last submission state is not persisted in error form data.
    # As API doesn't provide UI form state, we'll verify by submitting multiple times to ensure no residual errors.

    try:
        # 1. Create group - simulating Submit Group Creation Form
        unique_group_name = f"TestGroup-{uuid.uuid4()}"
        group_id = create_group(unique_group_name)
        assert group_id is not None, "Group creation failed, no id returned."

        # Submit same group creation again (simulate form reset allows new submission)
        group_id_2 = create_group(f"{unique_group_name}-2")
        assert group_id_2 is not None and group_id_2 != group_id, "Form did not reset properly; duplicate submission failed."

        # Clean second group after verification
        delete_group(group_id_2)

        # 2. Add expense to the created group - simulating Submit Expense Form
        expense_title = "Lunch"
        expense_amount = 50.0
        paid_by = "user@example.com"  # Simplification: must be a valid member; adjust if needed
        participants = ["user@example.com"]  # Should be group members in real scenario

        expense_id = add_expense(group_id, expense_title, expense_amount, paid_by, participants)
        assert expense_id is not None, "Expense creation failed, no id returned."

        # Submit another expense with same details to verify form reset after submission
        expense_id_2 = add_expense(group_id, f"{expense_title} 2", expense_amount, paid_by, participants)
        assert expense_id_2 is not None and expense_id_2 != expense_id, "Expense form did not reset properly; duplicate submission failed."

        # Cleanup second expense if API supports expense deletion (not specified, so skipping)
        # Assuming no expense deletion endpoint available from PRD

    finally:
        if expense_id:
            # No delete endpoint for expenses specified, so skipping
            pass
        if group_id:
            delete_group(group_id)

test_form_reset_behavior_after_successful_submission()