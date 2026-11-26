# Keycloak local authentication setup

This guide configures a disposable local Keycloak 26.8.2 realm without deleting its volume. It is for development only; the bundled terms copy is not approved legal policy.

> **Safety boundary:** Run this setup only for a dedicated disposable local Keycloak instance with synthetic users/data. The owner’s currently running Keycloak at `localhost:8081` is shared with earlier local work and was already updated by the owner; do not rerun this guide’s `docker compose up` or realm updater against that shared infrastructure. Do not reset or recreate persistent volumes.


## Start and configure

From the project root, create the ignored local environment once and start the stack:

```sh
./backend/scripts/create-local-env.sh
docker compose --env-file backend/.env config --quiet
docker compose --env-file backend/.env up -d --build
python3 backend/keycloak/configure-local-realm.py --confirm-isolated-local-realm wattscape-local
```

The script reads the local administrator settings from `backend/.env`, updates realm configuration through supported Keycloak Admin REST endpoints, and does not print credentials or remove volumes. It enables registration, verified email, password reset, unique email addresses, the 12-character mixed password policy, and MEMBER as the default role. It enables the built-in required-action alias `TERMS_AND_CONDITIONS` and marks the registration flow's Terms and Conditions execution `REQUIRED`.

The script prints a verification summary. Confirm terms action is enabled and the registration execution is REQUIRED. The checked-in WattScape theme contains development-only placeholder Terms/Privacy text. Replace it with legally reviewed documents before inviting real users. No real-user registration/consent test was run as part of this change, so mandatory acceptance is configured but end-to-end acceptance remains unverified.

## Manual console fallback

If Keycloak's API refuses the flow update, visit `http://localhost:8081/admin/`, choose `wattscape-local`, then:

1. **Authentication → Required actions**: enable **Terms and Conditions**. Do not set it as a default action for all existing users unless required by policy.
2. **Authentication → Flows → Registration**: open the registration flow and set the **Terms and conditions** execution requirement to **Required**.
3. **Realm settings → Login**: verify user registration, email verification and forgot password are enabled.
4. **Realm settings → Email**: verify local SMTP points to Mailpit.

Read the flow back after saving. Do not call terms acceptance active solely because the theme or realm export contains terms text.

## Account management

Users can manage profile details, password, and linked identity providers using the Keycloak account console linked in WattScape's Account & access panel. In local development it is available from the Keycloak realm account URL. Passwords and provider credentials remain on Keycloak, never in the React application.
