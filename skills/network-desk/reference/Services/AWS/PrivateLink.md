---
type: service
name: AWS PrivateLink
cloud: aws
category: networking
specialists: [cn_pl]
aliases: [PrivateLink, Endpoint Service, VPC Endpoint Service, AWS PrivateLink Service]
tags: [privatelink, endpoint-service, nlb, service-exposure]
status: stable
updated: 2026-06-01
---
# AWS PrivateLink (Producer / Endpoint Service)

Expose an NLB-fronted service to consumers in other VPCs, accounts, or organizations privately via AWS PrivateLink. This is the producer side; consumers connect through an [[VPC-Endpoint|interface VPC endpoint]]. This is the AWS analogue of [[Private-Link-Service|Azure Private Link Service]] and [[Service-Attachment|GCP Service Attachment]].

---

## Summary

A **[[VPC-Endpoint|VPC endpoint]] service** publishes one or more [[AWS-Network-Load-Balancer|Network Load Balancers]] as a PrivateLink service. Consumers in any allowed account create interface endpoints in their VPCs and reach the service over the AWS backbone — no internet gateway, no VPN, no peering required.

## When to use / when to avoid

**Use when:**
- You're a SaaS provider exposing a service to customers in other AWS accounts without internet egress.
- You're a platform team exposing a shared service across many spoke VPCs in your org.
- You need cross-account / cross-org private connectivity without VPC peering or [[Transit-Gateway|Transit Gateway]] sprawl.

**Avoid when:**
- The producer side isn't fronted by an NLB — only NLB is supported (ALB / GLB are not PrivateLink providers).
- A single-VPC consumer can directly use VPC peering or a [[Transit-Gateway|Transit Gateway]] more cheaply.

---

## Deployment

```bash
# Step 1: Create NLB with target group (skip if exists)
aws elbv2 create-load-balancer \
  --name my-nlb --type network \
  --subnets subnet-aaa subnet-bbb

# Step 2: Create VPC endpoint service
aws ec2 create-vpc-endpoint-service-configuration \
  --network-load-balancer-arns arn:aws:elasticloadbalancing:...:loadbalancer/net/my-nlb/... \
  --acceptance-required

# Step 3: Allow specific accounts to create endpoints
aws ec2 modify-vpc-endpoint-service-permissions \
  --service-id vpce-svc-0123456789abcdef0 \
  --add-allowed-principals "arn:aws:iam::123456789012:root" "arn:aws:iam::987654321098:root"

# Step 4: Accept consumer endpoint connection
aws ec2 accept-vpc-endpoint-connections \
  --service-id vpce-svc-0123456789abcdef0 \
  --vpc-endpoint-ids vpce-0123456789abcdef0
```

### Key Points

- **NLB only** — ALB and GLB cannot be PrivateLink providers.
- **Cross-region**: prefer same-region consumers for latency and data-transfer predictability, but AWS PrivateLink supports cross-Region endpoint service access when the provider enables allowed Regions and permissions such as `vpce:AllowMultiRegion`. Verify the current workflow before publishing: https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-share-your-services.html.
- **IP address type**: endpoint services and consumers can use IPv4, IPv6, or dualstack where the service, NLB, target groups, and client VPC subnets support it. Validate address-type support end-to-end before advertising IPv6 or dualstack access.
- **Private DNS name**: register a custom DNS name (e.g., `api.myservice.com`) and verify domain ownership ([[Route-53]]). Consumers can then use this name instead of the `vpce-*` DNS name.

---

## Approval Workflows

- **`--acceptance-required`** (recommended) — provider must explicitly accept each consumer endpoint connection.
- Without it, any account on the allow-list connects immediately.
- Use manual acceptance for cross-account / cross-org production scenarios; auto-accept inside your own org / account.

---

## Common pitfalls

1. **Forgetting `accept-vpc-endpoint-connections`** — consumer's endpoint stays in `pendingAcceptance` indefinitely; client connections fail with no obvious DNS error.
2. **NLB target spread vs endpoint AZs** — consumer endpoint ENIs live in specific AZs; if the NLB has no targets in those AZs, traffic blackholes. Spread NLB targets across all AZs the consumers use.
3. **Private DNS name without domain validation** — registering a custom DNS name requires verifying domain ownership via [[Route-53]] TXT record; until verified, consumers can't enable private DNS for the endpoint.
4. **Per-account quota** — [[VPC-Endpoint|VPC endpoint]] services + connections have per-account quotas; large SaaS deployments must request limit increases proactively.
5. **Cross-region cost surprise** — cross-region traffic over PrivateLink incurs inter-region data transfer charges that are easy to miss in cost modeling.

---

## Cross-references

- Cloud equivalents: [[Private-Link-Service|Azure Private Link Service]] · [[Service-Attachment|GCP Service Attachment]]
- Consumer side: [[VPC-Endpoint|AWS VPC Endpoint]]
- Pairs with: [[AWS-Network-Load-Balancer]] · [[Route-53]] · [[Private-Endpoint-DNS-Integration]]

**Analysis only — verify against vendor documentation before applying.**
