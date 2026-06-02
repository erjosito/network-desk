---
type: vendor
name: GCP Cloud Firewall
vendor_kind: cloud-fw
roles: [firewall]
tags: [firewall, vendor, gcp, gcp-cloud-firewall, cloud-fw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# GCP Cloud Firewall

## Overview

GCP's network firewall service spans two generations: **legacy VPC firewall rules** (per-VPC, attached to network tags or service accounts, default-deny ingress / default-allow egress) and **Cloud NGFW** (hierarchical org/folder/network/project policies, Standard and Enterprise tiers — the Enterprise tier adds intrusion prevention powered by Palo Alto-managed threat signatures). Rules are evaluated top-down across the hierarchy. There is no separate firewall appliance — enforcement happens in the Andromeda virtual network stack at every VM/pod, so there is no inspection-throughput choke point and no per-endpoint cost; Cloud NGFW Enterprise IPS is the exception (regional endpoint resource billed per-hour + per-GB inspected).

## Config generation

```bash
# VPC firewall rule
gcloud compute firewall-rules create allow-dmz-to-db-mysql \
  --network=my-vpc \
  --priority=1000 \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:3306 \
  --source-ranges=10.1.2.0/24 \
  --destination-ranges=10.1.3.0/24 \
  --target-tags=db-servers \
  --enable-logging \
  --description="Allow DMZ web servers to MySQL"
```

## HA

```
VPC Routes → Internal TCP/UDP LB → NVA-1 (instance group)
                                  → NVA-2 (instance group)
```
- Use **Internal TCP/UDP Load Balancer** as next-hop for routes.
- Health checks determine active NVA.
- GCP Cloud Firewall is managed — no HA pattern needed.

## Policy design

- Zones map to VPC networks or target tags / service accounts.
- Priority-based rules; lower number = higher priority.
- Hierarchical firewall policies for organization-wide zone policy.

## Hardening

- Use **service account-based targeting** instead of network tags (more secure, less spoofable).
- Enable **Firewall Rules Logging** on all rules.
- Implement **hierarchical firewall policies** at the organization/folder level for baseline rules.
- Use **Firewall Insights** to identify overly permissive rules and shadowed rules.
- Set VPC-level default to **deny all ingress, allow all egress** (and tighten egress).
- Ref: [CIS Google Cloud Platform Benchmark](https://www.cisecurity.org/benchmark/google_cloud_computing_platform).

## Logging

```
# Denied traffic
resource.type="gce_subnetwork"
jsonPayload.disposition="DENIED"
| ORDER BY timestamp DESC
| LIMIT 50

# Top denied source IPs (via Log Analytics or BigQuery export)
SELECT jsonPayload.connection.src_ip, COUNT(*) as deny_count
FROM `project.dataset.compute_googleapis_com_firewall`
WHERE jsonPayload.disposition = 'DENIED'
GROUP BY jsonPayload.connection.src_ip
ORDER BY deny_count DESC
LIMIT 20
```

## Rule audit

```bash
# List firewall rules
gcloud compute firewall-rules list --format=json

# Firewall rule hit counts via Firewall Insights
# Enable Firewall Rules Logging first:
gcloud compute firewall-rules update <rule-name> --enable-logging

# Query logs in Cloud Logging
gcloud logging read 'resource.type="gce_subnetwork" AND jsonPayload.rule_details.reference:*' \
  --format=json --limit=1000
```

## Troubleshooting

```bash
# Check firewall rule evaluation
gcloud compute firewall-rules list --filter="name~allow" --format=table

# Connectivity test (simulates packet flow)
gcloud network-management connectivity-tests create test-dmz-to-db \
  --source-instance=projects/<proj>/zones/<zone>/instances/<src-vm> \
  --destination-instance=projects/<proj>/zones/<zone>/instances/<dst-vm> \
  --protocol=TCP --destination-port=3306

# VPC flow logs
gcloud logging read 'resource.type="gce_subnetwork" AND jsonPayload.connection.src_ip="10.1.2.5"' \
  --limit=20
```

## Common gotchas

- Legacy VPC firewall rules have an **implicit allow-egress** that surprises engineers from AWS/Azure backgrounds — add explicit deny-egress rules for any zero-trust design.
- Cloud NGFW Enterprise IPS requires Enterprise tier license + a regional endpoint resource — Standard tier does NOT include IPS.
- Network tags vs service accounts: tag-based targeting is mutable by anyone with `compute.instances.setTags`; service-account-based targeting is the secure default.
- Hierarchical firewall policies override VPC firewall rules — debugging requires checking all policy layers (org → folder → network → VPC) and the implicit ordering between them.
- The pre-built `goog-iap` source range (`35.235.240.0/20`) is required for Identity-Aware Proxy SSH/RDP — restrictive ingress policies can lock out admin access if this is missed.
- Firewall Insights (shadowed / redundant rule recommendations) is opt-in via the Recommender API — it is not surfaced in the firewall console by default.

## See also

- [[Topics/Firewall/Firewall-Config-Generation|Firewall Config Generation]]
- [[Topics/Firewall/Firewall-HA-Design|Firewall HA Design]]
- [[Topics/Firewall/Firewall-Hardening|Firewall Hardening]]
- [[Topics/Firewall/Firewall-Log-Analysis|Firewall Log Analysis]]
- [[Topics/Firewall/Firewall-Policy-Design|Firewall Policy Design]]
- [[Topics/Firewall/Firewall-Rule-Audit|Firewall Rule Audit]]
- [[Topics/Firewall/Firewall-Troubleshooting|Firewall Troubleshooting]]
- [[Topics/Firewall/Firewall-Vendor-Migration|Firewall vendor migration]] (multi-vendor)

---
Analysis only — verify against vendor documentation before applying.
