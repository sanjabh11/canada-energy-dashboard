

Why it’s valuable for CEIP

1

NL2SQL (Natural Language to SQL)

Turn user questions into SQL queries on your DB.

Add an “Ask your data” panel on key dashboards (e.g. ‎⁠/forecast-benchmarking⁠, ‎⁠/asset-health⁠, ‎⁠/analytics⁠). Frontend sends user question → backend (FastAPI/Supabase Edge Function) uses an LLM to generate and run SQL on your Postgres/Supabase views, returns table + narrative. Start with a whitelisted set of safe query patterns (time-series, group by region, metric comparisons).

Directly demonstrates Week 2 Day 5 content. Makes CEIP feel like a live example of NL2SQL for energy planners, and creates a powerful demo for consulting/education.

2

Dimensional Modelling (Star/Snowflake Schema)

Fact + dimension tables for analytics.

Formalize your Supabase schema for key areas: ‎⁠fact_grid_event⁠, ‎⁠dim_region⁠, ‎⁠dim_asset⁠, ‎⁠dim_time⁠, ‎⁠fact_forecast_error⁠, ‎⁠fact_asset_health⁠, ‎⁠dim_program⁠ (for Indigenous/ESG). Document these schemas in your internal docs and optionally expose them via ‎⁠/api-docs⁠ with ER diagrams.

Gives you a clean semantic layer under CEIP. Aligns your product to the dbt + dimensional modelling parts of the course and makes NL2SQL, Cortex-like features, and analytics more reliable.

3

dbt (models, tests, sources, exposures)

SQL+YAML framework for warehouse transformations and tests.

Stand up a small dbt project pointing at your Supabase/Postgres. Create models for ‎⁠stg_*⁠, ‎⁠dim_*⁠, ‎⁠fact_*⁠ around: forecasts, grid metrics, ESG metrics, asset health. Add tests for keys, not-null, ranges. Use ‎⁠exposures⁠ to mark CEIP dashboards and ‎⁠/forecast-benchmarking⁠, ‎⁠/asset-health⁠ as downstream consumers. Run dbt via your Netlify CI or GitHub Actions.

Lets you say CEIP has a modern DE backbone. You can then teach dbt in the intern training with CEIP as a real reference environment, not a toy.

4

Great Expectations (Schema Contract Testing)

Automated checks that tables still match expected shape/rules.

Pick 1–2 critical tables, e.g. ‎⁠fact_forecast_error⁠, ‎⁠fact_asset_health⁠. Define expectation suites: required columns; value ranges (e.g. error metrics between sensible bounds, health scores 0–100); no nulls on keys. Run GE as part of a nightly job or CI pipeline that validates data before dashboards refresh.

Demonstrates “schema contract testing” in a live product. In sales/pitch decks you can say CEIP has data quality guardrails, and in training you can show the exact configs.

5

RAG (Retrieval-Augmented Generation)

Use vector search over docs + LLM.

Build a RAG bot for CEIP docs: ingest your 20k+ words of docs (gap analysis, QA checklists, regulatory notes, feature docs) into pgvector/Chroma. Add an “Energy Docs Copilot” at ‎⁠/my-energy-ai⁠ or ‎⁠/features⁠. Question → retrieve top chunks → LLM answer with citations. Start with internal-only, then expose a curated version.

Makes CEIP a living example of RAG over product + policy docs, directly aligned with Week 1 Day 4. Also helps you maintain and explain the system.

6

Vector Database (FAISS / Chroma / pgvector)

Store embeddings for semantic search.

You already mention pgvector in your other platforms; for CEIP, use either Supabase’s pgvector or a small Chroma service to index: docs, regulatory texts, FAQ snippets, maybe asset templates. Wire this into the RAG layer and any “search” features in ‎⁠/regulatory-filing⁠ or ‎⁠/forecast-benchmarking⁠.

Gives a concrete “we use vector search” story in CEIP; backs your training modules on vector DBs with a real, running implementation.

7

Embedding Model Selection

Choosing which embedding model to use for search/RAG.

For CEIP, run a pragmatic comparison: OpenAI embeddings vs a sentence-transformers model (hosted). Use a handful of energy/regulatory questions and measure which returns better document snippets. Encode this choice into your RAG service and document the reasoning (cost, quality, governance).

Lets you talk credibly about “embedding model selection” with a concrete “we tested A vs B on energy scenarios” example. Strong for both training and client architecture discussions.

8

Prompt Templates / Prompt Library

Reusable prompts with variables.

Build a small prompt library for CEIP tasks: forecasting explanation, regulatory summary, ESG narrative, scenario comparison. Store templates in code or config; use LangChain or your own minimal wrapper to fill ‎⁠{metric}⁠, ‎⁠{region}⁠, ‎⁠{horizon}⁠, ‎⁠{policy}⁠ variables.

Shows you practice exactly what you teach on Day 2: reusable prompts for DE workflows, not ad‑hoc one-offs. Also makes your LLM features more stable and testable.

9

Tool / Function Calling

Model calling real tools/APIs instead of guessing.

Wrap CEIP APIs (‎⁠/api/v2/ai-datacentres⁠, ‎⁠/api/v2/hydrogen⁠, ‎⁠/api/v2/regulatory⁠, ‎⁠/asset-health⁠ CSV scoring) as tools for Claude/OpenAI. Build an “Energy Copilot” agent that: uses tool calls to query live data, fetch asset scores, retrieve forecast benchmarks, and then summarizes for the user. Guard with rate limits + read-only scope.

Converts CEIP from “dashboard only” into a tool-using AI environment. Great for demoing tool-calling patterns from Week 1 Day 4 and Week 3 agents.

10

CI/CD (GitHub Actions for DE)

Automated build/test/deploy for data + app.

You already have Netlify CI/CD. Extend with GitHub Actions that: run dbt tests, run Great Expectations suites, lint SQL or Python, optionally run a small RAG test harness. Make the status visible in an internal ‎⁠/status⁠ page.

Lets you honestly say CEIP pipelines are CI/CD-backed and that your training on DataOps and CI/CD is grounded in your own product practices.

11

PySpark Pipeline (optional, where data scales)

Distributed data processing in Python.

If/when CEIP ingests larger external datasets (e.g. long time-series from AESO/IESO or scenario sets), add a PySpark batch job stage (even on a small cluster) that pre-aggregates / cleans these feeds before loading to Supabase. Describe it in docs even if initial deployment is modest.

Ensures you can talk about PySpark + DAG from real experience, and positions CEIP as ready to scale to heavier data loads if a utility/partner wants it.

12

DAG Orchestration (Airflow/Prefect/Mage)

Directed Acyclic Graph for pipeline steps.

Define at least one orchestrated pipeline for CEIP ingestion: ‎⁠fetch_raw⁠ → ‎⁠transform (PySpark or SQL)⁠ → ‎⁠load_to_supabase⁠ → ‎⁠dbt build⁠ → ‎⁠GE validation⁠. You can run this via Prefect or Mage and document the DAG.

Gives you a concrete DAG example for interns and clients (“this is how CEIP keeps its data fresh”), tying directly back to Week 2 (pipelines) and Week 3 (self-healing patterns).

13

SLOs & Observability

Targets for reliability and visibility.

Define SLOs for CEIP, e.g. “API p95 latency < 500 ms”, “analytics data less than 24h stale”, “forecast benchmark page loads within 2s”. Instrument Supabase + Netlify using logs and metrics; surface key indicators in an internal “Ops dashboard” or even a public ‎⁠/status⁠ page.

Now you can show interns and clients how SLOs/observability from Week 2 Day 8 really look in a working platform—metrics, not just slides.

14

Great Expectations for Data Quality Rules (beyond schema)

Business rules, not just column presence.

Extend GE beyond schema: e.g. on ‎⁠/forecast-benchmarking⁠, assert “MAE/MAPE/RMSE are not NaN and within reasonable ranges”; on ‎⁠/asset-health⁠, assert “health index between 0 and 100” and “no assets missing critical attributes.”

Makes CEIP a living example of data contracts + business rules. You can tell a story about catching subtle issues before they hit forecast or asset-health analytics.

15

PII Classification & Masking

Detecting and protecting personal data.

CEIP is relatively low-PII, but you likely have emails / logs / employer contact info. Explicitly mark any such columns as PII; ensure they never enter LLM prompts or public exports. Document rules: PII only in auth/user tables, never in analytics tables used by RAG or NL2SQL.

Shows you understand and implement governance in practice. Important for Week 3, and reassuring for any Canadian public-sector or utility client.

16

Lineage & Catalog (DataHub / OpenMetadata-lite)

Map from sources ⇒ models ⇒ dashboards.

Start with a lightweight lineage map: raw APIs (AESO/IESO/NPRI/CER) → staging tables → dbt models → CEIP dashboards and APIs. You can render this via dbt docs or a small diagram page, and later plug into DataHub/OpenMetadata if needed.

Allows you to talk concretely about lineage: “This number on the Alberta Curtailment dashboard comes from these sources and transforms.” Perfect for training and regulatory conversations.

17

Agents / LangGraph or AutoGen-style Workflows

Multi-step, tool-using AI workflows.

Build a small “Energy Ops Copilot” as a LangGraph-like graph: nodes for querying CEIP APIs, for RAG over docs, for summarizing results, and for drafting emails/briefings. Even a simple 3–4 node graph is enough to illustrate agentic flows over CEIP data.

Becomes your flagship demo that unites RAG + tools + dashboards. Matches Week 3’s “Agentic AI Foundations” exactly, using your own production dataset.

18

Streamlit / FastAPI Hooks into CEIP

Thin UI/API shells around your data.

For internal/training use, create a Streamlit playground that hits the CEIP APIs and RAG backend; for production, expose a couple of FastAPI endpoints (behind auth) that offer higher-level analytics (e.g. ‎⁠/api/insights/forecast-trust⁠, ‎⁠/api/insights/asset-health⁠).

Lets you teach “API-first, AI-enabled DE apps” with CEIP itself as the lab: interns can see Streamlit prototypes and FastAPI production surfaces over the same data.



How to work through this systematically

If you want a step-by-step execution plan (not YAML or code yet, just strategy), I’d do it in this order:

1. Strengthen the data layer: dimensional models + dbt + Great Expectations (Rows 2, 3, 4, 14).

2. Add smart access to that data: NL2SQL + Cortex-like flows + RAG + vector DB (Rows 1, 5, 6, 7, 8, 9).

3. Wrap it in proper engineering: CI/CD, DAGs, SLOs, basic MLOps hooks (Rows 10, 11, 12, 13).

4. Layer governance and agents: PII, lineage, agents over CEIP (Rows 15–18).
========
I treated the **CEIP README + Top20** as the product source of truth — it is already an **API-first React/Supabase/Netlify platform** with live Canadian energy integrations, proof pages like **`/forecast-benchmarking`**, **`/asset-health`**, **`/regulatory-filing`**, **`/my-energy-ai`**, and an explicit roadmap for **RAG with pgvector**, **multi-model LLMs**, and **energy-specific prompt templates**. I then mapped your extra-features list against the separate implementation memo, which explicitly calls out **NL2SQL, dimensional modelling, dbt, Great Expectations, RAG, vector DBs, embeddings, prompt templates, tool calling, CI/CD, PySpark, DAG orchestration, SLOs/observability, PII masking, lineage/catalog, agents, and Streamlit/FastAPI hooks**.

## What the numbers say

| Bucket                            | Count | Verdict                                                                                       |
| --------------------------------- | ----: | --------------------------------------------------------------------------------------------- |
| Total tool entries in your list   |    28 | All are technically implementable somewhere in CEIP, but not all are equally worth doing now. |
| Primary tools                     |    13 | Strongly aligned with CEIP’s current architecture and roadmap.                                |
| Secondary tools                   |    11 | Useful support layer; some should be implemented now, some later.                             |
| Tertiary tools                    |     4 | Optional, substitute, or cross-cloud choices; lowest priority for this site.                  |
| Best near-term implementation set |    20 | 13 primary + 7 selected secondary.                                                            |
| Defer for later                   |     8 | Mostly overlapping agent frameworks and cloud-portability options.                            |

## 1) Primary tools for CEIP

| Tool                         | Basic facility                                  | How it fits CEIP                                               | Value added                                                 | Worth it now?       |
| ---------------------------- | ----------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- | ------------------- |
| **LangChain**                | Orchestration for prompts, tools, retrieval     | Good backbone for the “Energy Copilot” and RAG flows           | Makes LLM features modular and easier to maintain           | **Yes**             |
| **LlamaIndex**               | Document ingestion and retrieval framework      | Best for `/my-energy-ai`, docs copilot, policy Q&A             | Faster path to RAG over CEIP docs and filings               | **Yes**             |
| **FAISS**                    | Fast vector similarity search                   | Useful for small/medium local embedding search                 | Low-latency semantic lookup with minimal overhead           | **Yes**             |
| **ChromaDB**                 | Lightweight vector database                     | Good for internal prototype RAG and doc search                 | Easy to stand up for semantic search                        | **Yes**             |
| **LangGraph**                | Stateful multi-step agent graphs                | Best fit for multi-step energy assistant flows                 | Gives control, state, and deterministic branching           | **Yes**             |
| **Snowflake Cortex**         | NL analytics / AI inside Snowflake              | Fits if CEIP starts querying Snowflake-backed datasets         | Strong enterprise story for utilities/consulting            | **Conditional yes** |
| **dbt + AI**                 | SQL transformation, tests, docs, semantic layer | Directly supports curated marts for dashboards and RAG         | Improves trust in dashboard metrics and NL2SQL outputs      | **Yes**             |
| **Great Expectations + LLM** | Data quality and schema contract testing        | Fits forecast benchmarking, asset health, and API data checks  | Strong guardrails before dashboard refresh or LLM use       | **Yes**             |
| **FastAPI**                  | Backend API layer                               | Fits tool-calling, secure endpoints, and data services         | Clean production boundary for AI and analytics APIs         | **Yes**             |
| **Streamlit**                | Rapid internal UI / prototype app layer         | Great for demos, analyst workbenches, and internal copilots    | Fastest way to prototype workflows before hardening         | **Yes**             |
| **MCP SDK**                  | Standard tool-calling protocol                  | Lets LLMs call CEIP APIs and services cleanly                  | Makes the site “tool-aware” instead of chat-only            | **Yes**             |
| **DataHub + LLM**            | Metadata catalog and discovery assistant        | Good for lineage, dataset discovery, and docs lookup           | Adds explainability and “where did this come from?” answers | **Yes**             |
| **Microsoft Purview + AI**   | Governance, lineage, sensitive-data discovery   | Strong if CEIP expands into public-sector / utility governance | Helps with trust, PII awareness, and enterprise readiness   | **Conditional yes** |

## 2) Secondary tools worth selecting for CEIP

| Tool                     | Basic facility             | How it fits CEIP                                                | Value added                                               | Worth it now?       |
| ------------------------ | -------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- | ------------------- |
| **Prefect / Mage**       | DAG orchestration          | Good for refresh jobs, ingestion, validation, and report builds | Makes pipelines repeatable and observable                 | **Yes**             |
| **SQLFluff**             | SQL linting / style checks | Fits dbt and query review workflows                             | Keeps SQL readable and reviewable                         | **Yes**             |
| **Soda Core**            | Data quality checks        | Good lightweight companion to Great Expectations                | Adds another guardrail layer for data freshness / quality | **Yes**             |
| **Evidently AI**         | Drift and monitoring       | Useful for forecast performance, model drift, and stability     | Makes the “trust layer” real, not just decorative         | **Yes**             |
| **GitHub Actions AI**    | CI automation              | Fits dbt tests, GE checks, deployment, and validation           | Turns CEIP into a proper DevOps + DataOps system          | **Yes**             |
| **Snowflake MCP Server** | Tool gateway for Snowflake | Useful only if Snowflake becomes a real data plane in CEIP      | Nice enterprise integration, but not required today       | **Conditional yes** |
| **n8n**                  | Low-code automation        | Great for internal notifications, approvals, and workflow glue  | Good for non-engineering automation around the site       | **Conditional yes** |

## 3) Secondary tools to defer unless the roadmap expands

| Tool                | Basic facility                       | Why defer it                                     | Worth it now? |
| ------------------- | ------------------------------------ | ------------------------------------------------ | ------------- |
| **CrewAI**          | Multi-agent collaboration            | Overlaps with LangGraph / other agent stacks     | Later         |
| **AutoGen**         | Multi-agent conversational workflows | Similar overlap; pick one agent framework first  | Later         |
| **Semantic Kernel** | Enterprise agent framework           | Powerful, but duplicative at this stage          | Later         |
| **ZenML**           | ML pipeline/MLOps orchestration      | More relevant if CEIP becomes a full ML platform | Later         |

## 4) Tertiary / substitute cloud options

| Tool                                                      | Basic facility                           | How it fits CEIP                                                                                 | Recommendation                             |
| --------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| **AWS Glue + Bedrock**                                    | AWS data engineering + managed LLM stack | Only if CEIP goes deep into AWS-native pipelines                                                 | Optional substitute, not core              |
| **Azure Data Factory**                                    | Azure ETL orchestration                  | Only if you standardize on Azure as the enterprise data plane                                    | Optional substitute, not core              |
| **Databricks AI**                                         | Lakehouse + AI workflows                 | Useful if CEIP moves into lakehouse-scale workloads                                              | Optional substitute, not core              |
| **Qdrant / Azure AI Search / Pinecone / pgvector family** | Vector search backends                   | CEIP’s own roadmap already points at **pgvector**, so the others are alternatives, not additions | Pick one default, do not stack all of them |

## My practical recommendation

| Priority                | What to do                                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1**             | Implement the **13 primary tools** first.                                                                                                           |
| **Phase 2**             | Add the **7 selected secondary tools** that strengthen operations and trust.                                                                        |
| **Phase 3**             | Keep the **8 deferred tools** as roadmap options, not current scope.                                                                                |
| **Vector store choice** | Use **pgvector** as the default long-term CEIP vector layer; keep FAISS/Chroma as prototyping or local-use options.                                 |
| **Agent choice**        | Pick **LangGraph** as the main agent framework; avoid running CrewAI, AutoGen, and Semantic Kernel together unless you have a very specific reason. |
| **Cloud choice**        | Do not mix AWS Glue, Azure Data Factory, and Databricks unless CEIP is explicitly becoming multi-cloud.                                             |
 