---
type: service
name: Azure Private Link Service
cloud: azure
category: networking
specialists: [cn_pl]
aliases: [Private Link Service, PLS]
tags: [private-link, alias, service-exposure]
status: stable
updated: 2026-06-01
---
# Azure Private Link Service

Expose your own services privately to consumers in other VNets, subscriptions, tenants — or other clouds — using Azure Private Link Service (PLS). Consumers connect via [[Private-Endpoint|Azure Private Endpoints]].

> **Cloud equivalents:** [[PrivateLink|AWS PrivateLink]] ([[PrivateLink|endpoint service]]) · [[Service-Attachment|GCP Service Attachment]]

---

## When to Use Service Exposure

| Scenario | Solution |
|---|---|
| SaaS provider sharing service with customers privately | Private Link Service / [[PrivateLink|PrivateLink]] / [[Service-Attachment|PSC Service Attachment]] |
| Internal shared service consumed by multiple business units | Private Link Service across subscriptions |
| Cross-cloud private API access | Private Link + VPN / [[ExpressRoute]] / [[Cloud-Interconnect|Interconnect]] |
| Partner integration without public internet | Cross-tenant Private Link |

---

## Architecture

Azure Private Link Service exposes a service behind a **Standard Load Balancer** so consumers in other VNets/subscriptions/tenants can connect via [[Private-Endpoint|Private Endpoints]].

```
Producer VNet                          Consumer VNet
┌────────────────────────┐             ┌──────────────────────┐
│ Standard Load Balancer │             │                      │
│ ┌──────────────────┐   │             │  Private Endpoint    │
│ │ Backend Pool     │   │  NAT        │  (10.2.0.5)          │
│ │ (VMs / VMSS)     │◄──┼────────────◄┤                      │
│ └──────────────────┘   │             │  Consumer connects   │
│                        │             │  to 10.2.0.5         │
│ Private Link Service   │             └──────────────────────┘
│ (NAT to 10.1.0.0/24)   │
└────────────────────────┘
```

---

## Deployment

```bash
# Step 1: Create Standard Load Balancer with backend pool (skip if exists)
az network lb create \
  --resource-group myRG --name myLB --sku Standard \
  --frontend-ip-name myFrontend --backend-pool-name myBackend \
  --vnet-name producerVNet --subnet workloadSubnet

# Step 2: Create the Private Link Service
az network private-link-service create \
  --resource-group myRG \
  --name myPLS \
  --vnet-name producerVNet \
  --subnet natSubnet \
  --lb-name myLB \
  --lb-frontend-ip-configs myFrontend \
  --location eastus

# Step 3: Configure visibility and auto-approval
az network private-link-service update \
  --resource-group myRG \
  --name myPLS \
  --visibility "*" \
  --auto-approval "subscription-id-1" "subscription-id-2"
```

**Key requirements:**
- **Standard Load Balancer** is mandatory (Basic LB not supported).
- **NAT subnet**: a dedicated subnet for the PLS. The PLS NATs consumer [[Private-Endpoint|PE]] IPs to IPs in this subnet.
- **Visibility**: controls who can discover the PLS. Use `*` for any subscription or restrict to specific subscription IDs.
- **Auto-approval**: subscriptions listed here can create PEs without manual approval.
- **TCP proxy protocol v2**: optionally enable to pass the consumer's [[Private-Endpoint|private endpoint]] IP to your backend (for logging, access control).

---

## Consumer Side (Creating [[Private-Endpoint|PE]] to your PLS)

```bash
# Consumer creates PE pointing to the PLS resource ID
az network private-endpoint create \
  --resource-group consumerRG \
  --name myPEtoService \
  --vnet-name consumerVNet \
  --subnet peSubnet \
  --private-connection-resource-id /subscriptions/.../privateLinkServices/myPLS \
  --connection-name myConnection

# Alias-based connection (cross-tenant — consumer doesn't need resource ID)
az network private-endpoint create \
  --resource-group consumerRG \
  --name myPEtoService \
  --vnet-name consumerVNet \
  --subnet peSubnet \
  --private-connection-resource-id "myPLS.abc123.eastus.azure.privatelinkservice" \
  --connection-name myConnection
```

---

## Cross-Cloud Service Exposure

To expose a service from one cloud to consumers in another:

1. Deploy the service behind a private link / [[PrivateLink|endpoint service]] in the producer cloud.
2. Establish cross-cloud connectivity ([[VPN-Gateway|VPN]], [[ExpressRoute]] + [[Direct-Connect]], [[Cloud-Interconnect|Interconnect]]).
3. Create a [[Private-Endpoint|private endpoint]] in the consumer cloud's VNet/VPC.
4. Configure DNS forwarding so consumers resolve the service FQDN to the private IP.

**Example: Azure PLS consumed from AWS:**
- Producer: Azure PLS behind Standard LB.
- Network: Site-to-site [[VPN-Gateway|VPN]] between Azure VNet and AWS VPC.
- Consumer: route traffic from AWS to the Azure [[Private-Endpoint|PE]] IP via VPN.
- DNS: AWS [[Route-53]] private hosted zone with A record pointing to the PE IP.

---

## Common Service Exposure Mistakes

1. **Using Basic LB** — PLS requires Standard LB. Basic LB is not supported and is being retired.
2. **Forgetting NAT subnet** — PLS needs a dedicated NAT subnet (just like [[Service-Attachment|GCP Service Attachment]]).
3. **No approval workflow for production** — auto-approval is convenient but risky for cross-tenant scenarios. Use manual approval with notification.
4. **Not enabling TCP proxy v2** — without it, the backend sees NAT IPs instead of consumer IPs. Enable if you need consumer identification.
5. **Single-region deployment** — Private Link is regional. For multi-region consumers, deploy the service in multiple regions.

---

## Cross-references

- Cloud equivalents: [[PrivateLink|AWS PrivateLink]] · [[Service-Attachment|GCP Service Attachment]]
- Consumer side: [[Private-Endpoint|Azure Private Endpoint]]
- Pairs with: [[Private-Endpoint-DNS-Integration]] · [[Private-Endpoint-Troubleshooting]]

**Analysis only — verify against vendor documentation before applying.**
