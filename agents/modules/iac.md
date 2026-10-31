---
name: iac
owner: security
readers: []
description: Infrastructure-as-code misconfiguration controls (Terraform, Kubernetes, Helm, Dockerfiles, compose). Maps to A02. Loaded when recon iac is true.
---

Inherited contract applies. Read `agents/_contract.md` before emitting findings. Static review only. Do not run `terraform plan`, `kubectl`, `helm template`, or `docker build`.

Owner: security. Findings set `owasp_2025: "A02"` and `control` to the unit below. Distinguish dev and test fixtures from production paths; a permissive policy in `examples/` is `info` at most.

| Control | Look for | Evidence needed |
|---------|----------|-----------------|
| IAC-IAM | Wildcard actions or resources (`"Action": "*"`, `"Resource": "*"`), `AdministratorAccess` on workload roles, `cluster-admin` bindings for app service accounts, trust policies open to any principal, long-lived access keys in config. | The statement or binding, quoted. |
| IAC-NETWORK | `0.0.0.0/0` ingress on admin ports (22, 3389, database ports), public buckets or ACLs, load balancers with no TLS, `hostNetwork: true`, Kubernetes services of type `LoadBalancer` with no source ranges, missing network policies in a namespace that holds tenant data. | The rule and the port or resource it exposes. |
| IAC-CONTAINER | Images on `latest` or an unpinned tag instead of a digest, containers running as root, `privileged: true`, `allowPrivilegeEscalation`, writable root filesystem, hostPath mounts of sensitive paths, Docker socket mounts, missing resource limits. | The manifest or Dockerfile line. Scaffolded or generated defaults count; review them like hand-written files. |
| IAC-SECRETS | Secrets in plain Terraform variables with defaults, in `ConfigMap`, in compose `environment:` literals, or in image build args; state files committed; secret references with no rotation path. Report location and type only. | File and line, never the value. |

Rules:

- A rule that is permissive but gated by a documented upstream control (a private subnet with no route out) is a `hardening-note` citing that control.
- No finding above `medium` from static IaC alone unless the resource is shown to be internet-reachable in the same files.
- Do not claim a cloud account is misconfigured. Only the files in scope are.
