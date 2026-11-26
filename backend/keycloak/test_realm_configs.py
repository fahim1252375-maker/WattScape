import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOCAL = json.loads((ROOT / "backend/keycloak/wattscape-local-realm.json").read_text())
PRODUCTION = json.loads((ROOT / "deploy/keycloak/wattscape-production-realm.template.json").read_text())


class RealmConfigurationTest(unittest.TestCase):
    def find_client(self, realm, client_id):
        return next(client for client in realm["clients"] if client["clientId"] == client_id)

    def test_local_browser_client_uses_pkce_and_no_password_grant(self):
        client = self.find_client(LOCAL, "wattscape-local")
        self.assertTrue(client["standardFlowEnabled"])
        self.assertFalse(client["directAccessGrantsEnabled"])
        self.assertFalse(client["implicitFlowEnabled"])
        self.assertEqual("S256", client["attributes"]["pkce.code.challenge.method"])

    def test_password_grant_exists_only_on_separate_local_smoke_client(self):
        smoke = self.find_client(LOCAL, "wattscape-local-smoke")
        self.assertTrue(smoke["directAccessGrantsEnabled"])
        self.assertFalse(smoke["standardFlowEnabled"])
        self.assertEqual([], smoke["redirectUris"])
        self.assertEqual([], smoke["webOrigins"])
        production_ids = {item["clientId"] for item in PRODUCTION["clients"]}
        self.assertNotIn("wattscape-local-smoke", production_ids)

    def test_production_browser_client_is_strict_and_password_grant_free(self):
        client = self.find_client(PRODUCTION, "wattscape-web")
        self.assertTrue(client["standardFlowEnabled"])
        self.assertFalse(client["directAccessGrantsEnabled"])
        self.assertFalse(client["implicitFlowEnabled"])
        self.assertFalse(client["serviceAccountsEnabled"])
        self.assertEqual("S256", client["attributes"]["pkce.code.challenge.method"])
        self.assertTrue(all("*" not in item for item in client["redirectUris"]))
        self.assertTrue(all("*" not in item for item in client["webOrigins"]))

    def test_production_realm_enables_temporary_brute_force_protection(self):
        self.assertTrue(PRODUCTION["bruteForceProtected"])
        self.assertFalse(PRODUCTION["permanentLockout"])
        self.assertEqual("MULTIPLE", PRODUCTION["bruteForceStrategy"])
        self.assertEqual(5, PRODUCTION["failureFactor"])
        self.assertEqual(60, PRODUCTION["waitIncrementSeconds"])
        self.assertEqual(900, PRODUCTION["maxFailureWaitSeconds"])
        self.assertEqual(60, PRODUCTION["minimumQuickLoginWaitSeconds"])

    def test_production_uses_environment_placeholders_and_external_ssl(self):
        self.assertEqual("external", PRODUCTION["sslRequired"])
        client = self.find_client(PRODUCTION, "wattscape-web")
        self.assertTrue(all("${WATSCAPE_FRONTEND_ORIGIN}" in item for item in client["redirectUris"]))
        self.assertIn("${WATSCAPE_API_AUDIENCE}", client["protocolMappers"][0]["config"]["included.custom.audience"])
        self.assertEqual([], PRODUCTION["identityProviders"])


if __name__ == "__main__":
    unittest.main()
