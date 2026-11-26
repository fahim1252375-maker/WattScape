#!/usr/bin/env python3
"""Configure the Keycloak Google or Apple broker from ignored backend/.env values."""
import argparse
import json
import urllib.parse
import urllib.request
from pathlib import Path
import sys


def read_env(path: Path):
    result = {}
    if not path.is_file():
        raise SystemExit(f'Environment file not found: {path}')
    for line in path.read_text(encoding='utf-8').splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            result[key.strip()] = value.strip().strip('"').strip("'")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('provider', choices=('google', 'apple'))
    parser.add_argument('--env-file', type=Path, default=Path(__file__).resolve().parents[1] / '.env',
                        help='existing Keycloak stack backend/.env; secret values are not printed')
    parser.add_argument('--confirm-target-realm', required=True,
                        help='must exactly match KEYCLOAK_REALM to confirm the intended isolated realm')
    args = parser.parse_args()
    alias = args.provider
    env = read_env(args.env_file.expanduser())
    if alias == 'google':
        client_id, client_secret = env.get('GOOGLE_CLIENT_ID'), env.get('GOOGLE_CLIENT_SECRET')
        if not client_id or not client_secret:
            raise SystemExit('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in ignored backend/.env first.')
        provider_id = 'google'
        config = {'clientId': client_id, 'clientSecret': client_secret, 'defaultScope': 'openid email profile',
                  'syncMode': 'IMPORT', 'trustEmail': 'false', 'storeToken': 'false', 'validateSignature': 'true'}
    else:
        required = ('APPLE_SERVICES_ID', 'APPLE_CLIENT_SECRET_JWT')
        missing = [key for key in required if not env.get(key)]
        if missing:
            raise SystemExit('Set Apple Services ID and renew the client-secret JWT before configuring this provider.')
        provider_id = 'oidc'
        config = {'clientId': env['APPLE_SERVICES_ID'], 'clientSecret': env['APPLE_CLIENT_SECRET_JWT'],
                  'authorizationUrl': 'https://appleid.apple.com/auth/authorize?response_mode=form_post',
                  'tokenUrl': 'https://appleid.apple.com/auth/token', 'jwksUrl': 'https://appleid.apple.com/auth/keys',
                  'issuer': 'https://appleid.apple.com', 'clientAuthMethod': 'client_secret_post',
                  'defaultScope': 'openid email', 'syncMode': 'IMPORT', 'trustEmail': 'false',
                  'storeToken': 'false', 'validateSignature': 'true', 'useJwksUrl': 'true', 'disableUserInfo': 'true'}

    base = env.get('KEYCLOAK_ADMIN_URL', 'http://localhost:8081').rstrip('/')
    public_base = env.get('KEYCLOAK_PUBLIC_URL', base).rstrip('/')
    public_parsed = urllib.parse.urlparse(public_base)
    if public_parsed.scheme != 'https' and public_parsed.hostname not in ('localhost', '127.0.0.1', '::1'):
        raise SystemExit('KEYCLOAK_PUBLIC_URL must use HTTPS outside local development.')
    parsed = urllib.parse.urlparse(base)
    if parsed.scheme != 'https' and parsed.hostname not in ('localhost', '127.0.0.1', '::1'):
        raise SystemExit('Refusing to send administrator credentials to non-local HTTP Keycloak; use HTTPS.')
    realm = env.get('KEYCLOAK_REALM', 'wattscape-local')
    if args.confirm_target_realm != realm:
        raise SystemExit('The confirmation does not match KEYCLOAK_REALM; no Keycloak changes were made.')
    admin_username = env.get('KC_BOOTSTRAP_ADMIN_USERNAME', '')
    admin_password = env.get('KC_BOOTSTRAP_ADMIN_PASSWORD', '')
    if not admin_username or not admin_password or 'generate-local-secret' in admin_password or 'REPLACE_WITH_SECRET' in admin_password:
        raise SystemExit('The selected env file must contain the existing Keycloak admin credentials; values are never printed.')
    form = urllib.parse.urlencode({'grant_type': 'password', 'client_id': 'admin-cli',
        'username': admin_username, 'password': admin_password}).encode()
    with urllib.request.urlopen(urllib.request.Request(base + '/realms/master/protocol/openid-connect/token',
        data=form, headers={'Content-Type': 'application/x-www-form-urlencoded'}), timeout=20) as response:
        token = json.loads(response.read())['access_token']
    path = '/admin/realms/' + urllib.parse.quote(realm, safe='') + '/identity-provider/instances'
    headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}
    def call(route, method='GET', data=None):
        raw = None if data is None else json.dumps(data).encode()
        request = urllib.request.Request(base + route, data=raw, headers=headers, method=method)
        with urllib.request.urlopen(request, timeout=20) as response: return response.status, response.read()
    _, raw = call(path)
    existing = next((item for item in json.loads(raw) if item.get('alias') == alias), None)
    representation = {'alias': alias, 'providerId': provider_id, 'enabled': True,
        'displayName': 'Sign in with Google' if alias == 'google' else 'Sign in with Apple',
        'firstBrokerLoginFlowAlias': 'first broker login', 'config': config}
    if existing:
        call(path + '/' + urllib.parse.quote(alias, safe=''), 'PUT', representation)
    else:
        call(path, 'POST', representation)
    _, raw = call(path + '/' + urllib.parse.quote(alias, safe=''))
    saved = json.loads(raw)
    saved_config = saved.get('config') or {}
    if not saved.get('enabled') or saved.get('providerId') != provider_id or saved_config.get('clientId') != config.get('clientId'):
        raise SystemExit('Keycloak did not persist the expected enabled identity-provider alias/client; provider remains unverified.')
    for key in ('authorizationUrl', 'tokenUrl', 'issuer', 'jwksUrl'):
        if key in config and saved_config.get(key) != config[key]:
            raise SystemExit(f'Keycloak did not persist the expected Apple OIDC setting: {key}.')
    callback_base = public_base
    callback = f'{callback_base}/realms/{realm}/broker/{alias}/endpoint'
    print('Configured Keycloak provider alias:', alias)
    print('Redirect URI to register with the upstream provider:', callback)
    print('Trust Email is disabled; Keycloak uses its first-login flow for explicit account linking.')
    print('Set the matching *_IDP_ENABLED=true in backend/.env only after testing this broker end to end, then restart the API.')


if __name__ == '__main__':
    main()
