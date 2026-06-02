---
type: service
name: Azure Private Endpoint
cloud: azure
category: networking
specialists: [cn_pl]
aliases: [Private Endpoint, PE]
tags: [private-link, private-endpoint, dns, networking]
status: stable
updated: 2026-06-01
---
# Azure Private Endpoint

Design Azure Private Endpoint architecture — subnet placement, IP planning, groupId/subresource selection, approval workflows, and multi-region strategies.

> **Cloud equivalents:** [[VPC-Endpoint|AWS VPC Endpoint]] (Interface / Gateway) · [[Private-Service-Connect|GCP Private Service Connect]]

---

## Subnet Strategy

### Dedicated vs Shared Subnet

| Approach | Pros | Cons | Recommendation |
|---|---|---|---|
| **Dedicated PE subnet** | Clean NSG rules, easy auditing, clear IP accounting | Consumes address space, more subnets to manage | **Recommended for production** |
| **Shared with workload** | Fewer subnets, simpler topology | Mixed NSG rules, harder to track PE IPs | Acceptable for dev/test |

### Subnet Sizing

- Each PE consumes **one private IP** from the subnet.
- A single resource can have multiple PEs (e.g., one for blob, one for table on the same storage account) — each consumes a separate IP.
- Plan for growth: if you expect 50 PEs today, size for 100+.

| Subnet Size | Usable IPs (Azure reserves 5) | PEs Supported |
|---|---|---|
| /28 | 11 | Small workload, <10 PEs |
| /26 | 59 | Medium workload, 20-50 PEs |
| /24 | 251 | Large workload, 100+ PEs |
| /22 | 1019 | Enterprise, centralized PE hub |

### Placement Strategy

**Hub-spoke topology:**

```
Hub VNet (10.0.0.0/16)
├── GatewaySubnet (10.0.0.0/27)
├── AzureFirewallSubnet (10.0.1.0/26)
├── InboundDnsSubnet (10.0.2.0/28)
├── OutboundDnsSubnet (10.0.3.0/28)
└── PrivateEndpointSubnet (10.0.4.0/24) ← Centralized PEs

Spoke VNet 1 (10.1.0.0/16)
├── WorkloadSubnet (10.1.0.0/24)
└── (No PEs — uses hub PEs via peering + private DNS)

Spoke VNet 2 (10.2.0.0/16)
├── WorkloadSubnet (10.2.0.0/24)
└── LocalPESubnet (10.2.1.0/26) ← PEs for latency-sensitive workloads
```

**Centralized PEs (hub):**
- Single private DNS zone management.
- All traffic goes through hub (can inspect via firewall).
- Higher latency for spoke workloads (extra peering hop).

**Distributed PEs (spokes):**
- Lower latency — PE is in the same VNet as the workload.
- Requires private DNS zone links to every spoke VNet.
- More complex DNS management.

---

## GroupId / Subresource Selection

When creating an Azure Private Endpoint, you specify a `groupId` (also called `subresource`) that determines which part of the PaaS service gets a private endpoint.

| Service | groupId | Private DNS Zone |
|---|---|---|
| Storage — Blob | `blob` | `privatelink.blob.core.windows.net` |
| Storage — File | `file` | `privatelink.file.core.windows.net` |
| Storage — Table | `table` | `privatelink.table.core.windows.net` |
| Storage — Queue | `queue` | `privatelink.queue.core.windows.net` |
| Storage — DFS (Data Lake) | `dfs` | `privatelink.dfs.core.windows.net` |
| Azure SQL | `sqlServer` | `privatelink.database.windows.net` |
| Cosmos DB — SQL | `Sql` | `privatelink.documents.azure.com` |
| Key Vault | `vault` | `privatelink.vaultcore.azure.net` |
| ACR | `registry` | `privatelink.azurecr.io` |
| Event Hubs | `namespace` | `privatelink.servicebus.windows.net` |
| App Configuration | `configurationStores` | `privatelink.azconfig.io` |
| Cognitive Services | `account` | `privatelink.cognitiveservices.azure.com` |

```bash
# Create PE for blob storage
az network private-endpoint create \
  --resource-group myRG \
  --name myBlobPE \
  --vnet-name myVNet \
  --subnet PrivateEndpointSubnet \
  --private-connection-resource-id /subscriptions/.../storageAccounts/myStorage \
  --group-id blob \
  --connection-name myBlobConnection

# Create PE for table storage (same storage account, different PE)
az network private-endpoint create \
  --resource-group myRG \
  --name myTablePE \
  --vnet-name myVNet \
  --subnet PrivateEndpointSubnet \
  --private-connection-resource-id /subscriptions/.../storageAccounts/myStorage \
  --group-id table \
  --connection-name myTableConnection
```

---

## Approval Workflows

- **Auto-approval**: same subscription connects without prompts by default.
- **Manual approval**: configurable via `privateLinkServiceConnectionState`. Required for cross-subscription connections to a [[Private-Link-Service]].
- **Cross-tenant**: supported — the [[Private-Link-Service|PLS]] provider sets visibility and approval list by subscription ID.

```bash
# Approve a pending PE connection
az network private-endpoint-connection approve \
  --resource-name myStorage \
  --resource-group myRG \
  --type Microsoft.Storage/storageAccounts \
  --name myPEConnection \
  --description "Approved by network team"
```

---

## Common PE Design Mistakes

1. **Undersized PE subnet** — running out of IPs when adding new PEs. Always size for 2× current needs.
2. **Missing groupId** — creating a PE for `blob` but needing `table` and `queue` too. One PE per groupId.
3. **No automation** — manually creating PEs and DNS records doesn't scale. Use Terraform/Bicep + Azure Policy.
4. **Forgetting multi-region** — PEs are regional. Cross-region workloads need PEs in each region or use VNet peering.
5. **Not disabling public access** — PE alone doesn't block public access. Set `publicNetworkAccess: Disabled` separately.

---

## Cross-references

- Cloud equivalents: [[VPC-Endpoint|AWS VPC Endpoint]] · [[Private-Service-Connect|GCP Private Service Connect]]
- Producer side (publishing your own service): [[Private-Link-Service]]
- Pairs with: [[Private-Endpoint-DNS-Integration]] · [[Private-Endpoint-Security-Review]] · [[Private-Endpoint-Troubleshooting]]

**Analysis only — verify against vendor documentation before applying.**
