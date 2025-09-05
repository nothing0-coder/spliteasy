import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def authenticate_test_user():
    # For the sake of this test, assume there's an endpoint to login test user and get a session cookie or token.
    # Since authentication details are not provided, simulate authentication by returning a session with auth headers or cookies.
    # Replace with actual login flow if available.
    session = requests.Session()
    # Simulated auth: set a header or cookie here if needed.
    # For example: session.headers.update({"Authorization": "Bearer <token>"})
    return session

def create_group(session, group_name):
    url = f"{BASE_URL}/groups"
    payload = {
        "name": group_name,
        "description": "Test group for balance calculation"
    }
    headers = {
        "Content-Type": "application/json"
    }
    resp = session.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    group_data = resp.json()
    return group_data["id"]

def delete_group(session, group_id):
    url = f"{BASE_URL}/groups/{group_id}"
    resp = session.delete(url, timeout=TIMEOUT)
    # Deletion might return 204 No Content or 200 OK, or 404 if already deleted
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()

def add_member_to_group(session, group_id, member_email):
    url = f"{BASE_URL}/groups/{group_id}/members"
    payload = {
        "email": member_email
    }
    headers = {"Content-Type": "application/json"}
    resp = session.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    member_data = resp.json()
    return member_data["id"]

def add_expense(session, group_id, paid_by, amount, description, split_between):
    url = f"{BASE_URL}/groups/{group_id}/expenses"
    payload = {
        "paid_by": paid_by,
        "amount": amount,
        "description": description,
        "split_between": split_between
    }
    headers = {"Content-Type": "application/json"}
    resp = session.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    expense_data = resp.json()
    return expense_data["id"]

def get_group_balances(session, group_id):
    url = f"{BASE_URL}/groups/{group_id}/balances"
    resp = session.get(url, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()

def test_balance_calculations_accuracy():
    session = authenticate_test_user()
    group_id = None
    members = []
    try:
        group_id = create_group(session, f"TestGroup-{uuid.uuid4()}")
        assert group_id, "Failed to create group"

        # Add members to the group
        member_emails = [f"user1_{uuid.uuid4()}@example.com", f"user2_{uuid.uuid4()}@example.com", f"user3_{uuid.uuid4()}@example.com"]
        for email in member_emails:
            member_id = add_member_to_group(session, group_id, email)
            assert member_id, f"Failed to add member {email}"
            members.append({"email": email, "id": member_id})

        # Add expenses:
        # User1 pays $60 split equally among all three
        add_expense(session, group_id, members[0]["email"], 60, "Dinner", member_emails)
        # User2 pays $30 split between user2 and user3
        add_expense(session, group_id, members[1]["email"], 30, "Taxi", member_emails[1:3])
        # User3 pays $15 for user1 and user3
        add_expense(session, group_id, members[2]["email"], 15, "Snacks", [member_emails[0], member_emails[2]])

        # Retrieve balances
        balances = get_group_balances(session, group_id)
        assert isinstance(balances, dict), "Balances response is not a dict"
        # balances expected example schema:
        # {
        #   "owed": [
        #       {"from": "user_email", "to": "user_email", "amount": float},
        #       ...
        #   ]
        # }

        assert "owed" in balances, "'owed' key missing in balances response"
        owed_list = balances["owed"]
        assert isinstance(owed_list, list), "'owed' should be a list"

        # Calculate expected balances manually:
        # Expenses:
        # Dinner: $60 by user1 split 3 ways = each owes 20
        # Taxi: $30 by user2 split 2 ways (user2,user3) = each owes 15
        # Snacks: $15 by user3 split 2 ways (user1,user3) = each owes 7.5

        # Amounts paid:
        # user1 paid 60
        # user2 paid 30
        # user3 paid 15

        # Amounts owed:
        # user1 owes: dinner(20) + taxi(?) + snacks(7.5)
        # user2 owes: dinner(20) + taxi(15) + snacks(?)
        # user3 owes: dinner(20) + taxi(15) + snacks(7.5)

        # Calculate net balances per user:
        # user1 owes: dinner 20 (to self?), snacks 7.5 (split - user1 owes?), taxi costs not including user1
        # Actually, user1 is among snacks payers(2 people). User1 owes 7.5 to user3.
        # user2 owes: dinner 20, taxi 15 (user2 paid taxi, so owe none?), snacks none (user2 not in snacks)
        # user3 owes: dinner 20, taxi 15, snacks 7.5 paid
        # But better to calculate net amount per user:

        # Total shares for each user:
        shares = {
            member_emails[0]: 20 + 0 + 7.5,  # user1
            member_emails[1]: 20 + 15 + 0,   # user2
            member_emails[2]: 20 + 15 + 7.5  # user3
        }
        # Paid amounts:
        paid = {
            member_emails[0]: 60,
            member_emails[1]: 30,
            member_emails[2]: 15
        }
        # Net = paid - shares
        net_balances = {user: round(paid[user] - shares[user], 2) for user in shares}

        # Positive net => user is owed money
        # Negative net => user owes money

        # Prepare a map for quick lookup of who owes who from balances response
        # The "owed" array should confirm these balances, e.g. user who owes pays to who is owed.
        # For simplicity check sum of all amounts equals zero and check balances match net_balances sums

        total_owed_amount = sum(item["amount"] for item in owed_list)
        # floating point slight tolerance
        assert abs(total_owed_amount) < 0.01, "Total owed amounts do not sum to zero, invalid balances"

        # We can check each user net balance sum from owed list:
        owed_from = {}
        owed_to = {}
        for txn in owed_list:
            frm = txn.get("from")
            to = txn.get("to")
            amt = txn.get("amount")
            assert isinstance(frm, str) and isinstance(to, str), "Invalid 'from' or 'to' fields in balances"
            assert isinstance(amt, (int, float)) and amt >= 0, "Invalid amount in balances"
            owed_from[frm] = owed_from.get(frm, 0) + amt
            owed_to[to] = owed_to.get(to, 0) + amt

        # Calculate user net from owed_from - owed_to
        user_net = {}
        all_users = set(list(owed_from.keys()) + list(owed_to.keys()))
        for user in all_users:
            out_amt = owed_from.get(user, 0)
            in_amt = owed_to.get(user, 0)
            user_net[user] = round(in_amt - out_amt, 2)

        # user_net should match net_balances computed above, for the users in the group
        for user_email in net_balances:
            expected = net_balances[user_email]
            actual = user_net.get(user_email, 0)
            assert abs(actual - expected) < 0.05, f"Balance mismatch for user {user_email}: expected {expected}, got {actual}"

    finally:
        if group_id:
            try:
                delete_group(session, group_id)
            except Exception:
                pass

test_balance_calculations_accuracy()