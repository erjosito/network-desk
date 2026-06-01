---
type: service
name: GCP Private Service Connect
cloud: gcp
category: networking
specialists: [cn_pl]
aliases: [Private Service Connect, PSC, PSC Endpoint]
tags: [psc, private-service-connect, private-connectivity, dns]
status: stable
updated: 2026-06-01
---
# GCP Private Service Connect (Consumer)

Private Service Connect (PSC) endpoints let workloads in a VPC reach Google APIs (all-apis bundle) or producer-published services privately, via a forwarding-rule IP allocated in a consumer subnet. This is the GCP analogue of [[Private-Endpoint|Azure Private Endpoint]] and [[VPC-Endpoint|AWS VPC Endpoint]].

---

## Summary

A PSC endpoint is a regional forwarding rule whose target is either:
- **`all-apis` bundle** — reach Google managed services (BigQuery, Cloud Storage, Pub/Sub, …) on a single private IP without exposing them on the internet.
- **[[Service-Attachment|Service Attachment]]** — reach a producer-published service (see [[Service-Attachment|GCP Service Attachment]] for the producer side).

## When to use / when to avoid

**Use when:**
- Workloads in a VPC need private access to Google APIs without Private Google Access at the subnet level.
- You consume a SaaS service published via [[Service-Attachment|Service Attachment]].
- You want a single private IP per service that you control (vs. the VIP-based Private Google Access).

**Avoid when:**
- You only need namespace resolution from on-prem (use [[Cloud-DNS|Cloud DNS]] private zones or forwarding instead).
- You don't need cross-VPC / cross-project — Private Google Access at the subnet level is simpler.

---

## Subnet Considerations

- Each PSC endpoint consumes **one forwarding-rule IP** from the consumer subnet.
- Use a dedicated subnet for PSC endpoints for clean firewall rules and easier IP accounting.
- The forwarding-rule IP is reachable via the regular VPC routing rules — including via [[Cloud-Interconnect|Cloud Interconnect]] / [[HA-VPN|HA VPN]] from on-premises.

---

## PSC Endpoint for Google APIs (all-apis)

```bash
# Reserve an IP address for PSC endpoint
gcloud compute addresses create my-psc-ip \
  --region=us-central1 \
  --subnet=psc-subnet \
  --addresses=10.3.0.10

# Create PSC endpoint for Google APIs (all-apis bundle)
gcloud compute forwarding-rules create my-psc-endpoint \
  --region=us-central1 \
  --network=my-vpc \
  --subnet=psc-subnet \
  --address=my-psc-ip \
  --target-google-apis-bundle=all-apis
```

---

## PSC Endpoint for a Published Service

```bash
# Create PSC endpoint for a published service
gcloud compute forwarding-rules create my-psc-producer \
  --region=us-central1 \
  --network=my-vpc \
  --subnet=psc-subnet \
  --address=my-psc-ip \
  --target-service-attachment=projects/producer-project/regions/us-central1/serviceAttachments/my-service
```

---

## Approval Workflows

- **`ACCEPT_AUTOMATIC`** on the producer's [[Service-Attachment|service attachment]] — consumer connections succeed immediately.
- **`ACCEPT_MANUAL`** with a project allow-list — producer must explicitly accept each consumer project.

```bash
# Producer-side: manage accept list on the service attachment
gcloud compute service-attachments update my-service \
  --region=us-central1 \
  --consumer-accept-list=consumer-project-id=10
```

---

## Common pitfalls

1. **Forgetting DNS overlay** — PSC gives you an IP, not a hostname. Pair with [[Cloud-DNS|Cloud DNS]] private zones so client SDKs resolve the service FQDN to the PSC IP.
2. **Regional endpoint, global client** — PSC forwarding rules are regional. Multi-region workloads need one PSC endpoint per region (and DNS to route clients to the right one).
3. **Consumer subnet sized too small** — every PSC endpoint consumes an IP; centralized PSC hubs need plenty of headroom.
4. **`all-apis` vs per-service** — the `all-apis` bundle is convenient but blanket; if you need to restrict which Google APIs a workload can reach, use per-service PSC endpoints or VPC Service Controls instead.
5. **Cross-project quota confusion** — PSC endpoint quota applies in the consumer project; service attachments and accept limits apply in the producer project. A connection failure can be caused by either side hitting a limit.

---

## Cross-references

- Cloud equivalents: [[Private-Endpoint|Azure Private Endpoint]] · [[VPC-Endpoint|AWS VPC Endpoint]]
- Producer side: [[Service-Attachment|GCP Service Attachment]]
- Pairs with: [[Cloud-DNS]] · [[Private-Endpoint-DNS-Integration]] · [[Private-Endpoint-Troubleshooting]]

**Analysis only — verify against vendor documentation before applying.**
