#!/usr/bin/env python3
"""Create an Apple Sign-In client-secret JWT and update the Keycloak broker."""
import argparse
import base64
import json
import os
import subprocess
import sys
import time
from pathlib import Path


def env_file(path: Path):
    path = path.expanduser()
    if not path.is_file():
        raise SystemExit(f'Environment file not found: {path}')
    values = {}
    for line in path.read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return path, values


def b64(value):
    return base64.urlsafe_b64encode(value).rstrip(b'=').decode()


def der_to_jose(signature):
    index = 0
    if signature[index] != 0x30:
        raise ValueError('OpenSSL returned an invalid ECDSA signature.')
    index += 1
    length = signature[index]
    index += 1
    if length & 0x80:
        count = length & 0x7f
        length = int.from_bytes(signature[index:index + count], 'big')
        index += count
    end = index + length
    components = []
    for _ in range(2):
        if signature[index] != 0x02:
            raise ValueError('OpenSSL returned an invalid ECDSA component.')
        index += 1
        size = signature[index]
        index += 1
        if size & 0x80:
            count = size & 0x7f
            size = int.from_bytes(signature[index:index + count], 'big')
            index += count
        number = signature[index:index + size]
        index += size
        number = number.lstrip(b'\x00')
        if len(number) > 32:
            raise ValueError('ECDSA signature component is too large.')
        components.append(number.rjust(32, b'\x00'))
    if index != end:
        raise ValueError('OpenSSL returned trailing ECDSA data.')
    return components[0] + components[1]


def set_env(path, values, name, value):
    lines = path.read_text().splitlines()
    prefix = name + '='
    lines = [line for line in lines if not line.startswith(prefix)]
    lines.append(prefix + value)
    path.write_text('\n'.join(lines) + '\n')
    os.chmod(path, 0o600)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', type=Path, default=Path(__file__).resolve().parents[1] / '.env',
                        help='existing Keycloak stack backend/.env; secret values are not printed')
    parser.add_argument('--confirm-target-realm', required=True,
                        help='must exactly match KEYCLOAK_REALM; never target a shared realm without owner approval')
    args = parser.parse_args()
    path, values = env_file(args.env_file)
    realm = values.get('KEYCLOAK_REALM', 'wattscape-local')
    if args.confirm_target_realm != realm:
        raise SystemExit('The confirmation does not match KEYCLOAK_REALM; no secret file or Keycloak realm was changed.')
    required = ('APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_SERVICES_ID', 'APPLE_PRIVATE_KEY_FILE')
    missing = [key for key in required if not values.get(key)]
    if missing:
        raise SystemExit('Configure the Apple Team ID, Key ID, Services ID, and private-key path in backend/.env.')
    key_path = Path(values['APPLE_PRIVATE_KEY_FILE']).expanduser()
    if not key_path.is_file():
        raise SystemExit('The Apple private key file was not found at APPLE_PRIVATE_KEY_FILE.')
    now = int(time.time())
    header = {'alg': 'ES256', 'kid': values['APPLE_KEY_ID'], 'typ': 'JWT'}
    claims = {'iss': values['APPLE_TEAM_ID'], 'iat': now, 'exp': now + 150 * 24 * 60 * 60,
              'aud': 'https://appleid.apple.com', 'sub': values['APPLE_SERVICES_ID']}
    encoded = b64(json.dumps(header, separators=(',', ':')).encode()) + '.' + b64(json.dumps(claims, separators=(',', ':')).encode())
    signed = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', str(key_path)], input=encoded.encode(),
                            check=True, capture_output=True).stdout
    secret = encoded + '.' + b64(der_to_jose(signed))
    set_env(path, values, 'APPLE_CLIENT_SECRET_JWT', secret)
    result = subprocess.run([sys.executable, str(Path(__file__).with_name('configure-identity-provider.py')), 'apple',
                             '--env-file', str(path), '--confirm-target-realm', args.confirm_target_realm], check=False)
    if result.returncode:
        raise SystemExit(result.returncode)
    print('Apple client-secret JWT renewed with a 150-day expiry and updated in Keycloak. Secret was not printed.')
    print('Schedule renewal before expiry; test an Apple login before enabling APPLE_IDP_ENABLED.')


if __name__ == '__main__':
    main()
