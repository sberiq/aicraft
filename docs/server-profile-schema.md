# Server Profile Schema

```json
{
  "kind": "minecraft.server",
  "name": "Example server",
  "address": "play.example.com",
  "port": 25565,
  "minecraftVersion": "1.20.2",
  "authProfileId": "auth-profile-id",
  "clientProfileId": "client-profile-id",
  "automationPolicy": {
    "allowed": true,
    "source": "owner-confirmed"
  },
  "lobby": {
    "known": false,
    "procedureVersion": null
  },
  "trade": {
    "autonomousSpendingEnabled": false,
    "singleOperationLimit": 0,
    "dailyLimit": 0,
    "minimumBalance": 0
  },
  "plugins": []
}
```

Required fields: `name`, `address`, `port`, `minecraftVersion`, `authProfileId`, and `clientProfileId`.
