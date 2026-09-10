# Authentication Profiles

## `MICROSOFT`

Used for servers that verify Mojang/Microsoft accounts. The controller stores account references and token secrets separately. Tokens are refreshed without exposing them to the brain or logs.

## `OFFLINE_SERVER`

Used only when a Minecraft server intentionally runs in offline mode.

The profile stores:

- server address
- configured nickname
- optional server login plugin secret

Boundaries:

- the user supplies a legitimate client installation;
- the project does not distribute cracked clients;
- the project does not bypass Microsoft authentication;
- nick is not proof of administrative identity;
- agent rights require dashboard or trusted-channel confirmation.

## Server Login Plugins

Known login plugins such as AuthMe use controlled chat procedures. Their secrets stay in secret storage and are never sent to the LLM.
Secret values are encrypted with AES-256-GCM. The controller stores only a `server_login` action with the secret ID; the plaintext is decrypted only when constructing the wire command for the already paired client.
