"""Authentificateur WebAuthn simulé pour les tests : passkey ES256, attestation « none ».

Produit les réponses qu'un navigateur renverrait après navigator.credentials
.create() et .get() (format PublicKeyCredential.toJSON()), signées avec une
vraie clé ECDSA P-256. Aucune biométrie : les drapeaux UP et UV sont posés à
la demande, pour tester les refus.
"""

import base64
import hashlib
import json
import os
import struct
from dataclasses import dataclass, field

import cbor2
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec

ORIGIN = "http://localhost:8080"
RP_ID = "localhost"
# Drapeaux des données d'authentificateur (WebAuthn) : présence, vérification,
# passkey sauvegardable et sauvegardée, données de la passkey jointes.
UP, UV, BE, BS, AT = 0x01, 0x04, 0x08, 0x10, 0x40


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def unb64url(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


@dataclass
class SoftAuthenticator:
    """Une passkey sur un appareil simulé."""

    synced: bool = False
    credential_id: bytes = field(default_factory=lambda: os.urandom(32))
    key: ec.EllipticCurvePrivateKey = field(default_factory=lambda: ec.generate_private_key(ec.SECP256R1()))
    sign_count: int = 0
    user_handle: bytes | None = None

    def _cose_public_key(self) -> bytes:
        numbers = self.key.public_key().public_numbers()
        # Clé EC2 (kty 2), ES256 (alg -7), courbe P-256 (crv 1).
        return cbor2.dumps({1: 2, 3: -7, -1: 1, -2: numbers.x.to_bytes(32, "big"),
                            -3: numbers.y.to_bytes(32, "big")})

    def _flags(self, user_verified: bool, extra: int = 0) -> int:
        flags = UP | extra | (UV if user_verified else 0)
        return flags | (BE | BS if self.synced else 0)

    def _next_count(self) -> int:
        # Une passkey synchronisée renvoie toujours 0 ; une clé matérielle compte.
        if self.synced:
            return 0
        self.sign_count += 1
        return self.sign_count

    @staticmethod
    def _client_data(kind: str, options: dict, origin: str) -> bytes:
        return json.dumps({"type": kind, "challenge": options["challenge"], "origin": origin,
                           "crossOrigin": False}).encode()

    def create(self, options: dict, *, origin: str = ORIGIN, rp_id: str | None = None,
               user_verified: bool = True) -> dict:
        """Réponse de navigator.credentials.create(options)."""
        self.user_handle = unb64url(options["user"]["id"])
        rp_hash = hashlib.sha256((rp_id or options["rp"]["id"]).encode()).digest()
        attested = (bytes(16) + struct.pack(">H", len(self.credential_id)) + self.credential_id
                    + self._cose_public_key())
        auth_data = (rp_hash + bytes([self._flags(user_verified, AT)]) + struct.pack(">I", self._next_count())
                     + attested)
        attestation = cbor2.dumps({"fmt": "none", "attStmt": {}, "authData": auth_data})
        return {"id": b64url(self.credential_id), "rawId": b64url(self.credential_id), "type": "public-key",
                "response": {"clientDataJSON": b64url(self._client_data("webauthn.create", options, origin)),
                             "attestationObject": b64url(attestation), "transports": ["internal"]},
                "clientExtensionResults": {}, "authenticatorAttachment": "platform"}

    def get(self, options: dict, *, origin: str = ORIGIN, rp_id: str | None = None, user_verified: bool = True,
            user_handle: bytes | None = None, sign_count: int | None = None) -> dict:
        """Réponse de navigator.credentials.get(options)."""
        rp_hash = hashlib.sha256((rp_id or options["rpId"]).encode()).digest()
        count = self._next_count() if sign_count is None else sign_count
        auth_data = rp_hash + bytes([self._flags(user_verified)]) + struct.pack(">I", count)
        client_data = self._client_data("webauthn.get", options, origin)
        signature = self.key.sign(auth_data + hashlib.sha256(client_data).digest(), ec.ECDSA(hashes.SHA256()))
        handle = user_handle if user_handle is not None else self.user_handle
        return {"id": b64url(self.credential_id), "rawId": b64url(self.credential_id), "type": "public-key",
                "response": {"clientDataJSON": b64url(client_data), "authenticatorData": b64url(auth_data),
                             "signature": b64url(signature),
                             "userHandle": b64url(handle) if handle is not None else None},
                "clientExtensionResults": {}, "authenticatorAttachment": "platform"}
