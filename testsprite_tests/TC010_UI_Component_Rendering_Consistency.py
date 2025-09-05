import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_ui_component_rendering_consistency():
    """
    Verify that reusable UI components such as buttons, cards, inputs, and labels render correctly across multiple pages.
    This test will check main pages in SplitEasy app for presence of expected UI components' HTML markers.
    """

    # Pages to check for UI components consistency
    pages = [
        "/",  # Dashboard page (user groups and main UI)
        "/groups/sample-group-id",  # Group details page (replace sample-group-id with existing or dummy)
        "/groups/sample-group-id/balances",  # Group balances page
        "/auth/callback?code=dummycode"  # OAuth callback page (though it redirects, check content if any)
    ]

    # The test focuses on UI component rendering presence in HTML response strings.

    component_markers = {
        "button": ['<button', 'class="btn"', 'class="Button"'],
        "card": ['class="card"', 'class="bg-white"'],
        "input": ['<input', 'class="input"', 'class="Input"'],
        "label": ['<label', 'class="label"', 'class="Label"']
    }

    session = requests.Session()

    for page in pages:
        try:
            response = session.get(f"{BASE_URL}{page}", timeout=TIMEOUT, allow_redirects=True)
        except requests.RequestException as e:
            assert False, f"Request to {page} failed: {e}"

        # If redirected to login page for authenticated pages, the test fails as UI components cannot be checked properly
        if response.url.endswith("/login"):
            assert False, f"Unauthorized redirect to login detected when accessing {page}"

        # Check response status code
        assert response.status_code == 200, f"Unexpected status code {response.status_code} on page {page}"

        content = response.text

        # Check for each UI component's presence via at least one marker string in content
        for component_name, markers in component_markers.items():
            found = any(marker in content for marker in markers)
            assert found, f"{component_name} UI component not found on page {page}"

test_ui_component_rendering_consistency()
