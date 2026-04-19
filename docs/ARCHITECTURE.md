# Architecture

```mermaid
flowchart LR
  UI[React UI] --> API[Express API]
  API --> P1[Phase1 Apify]
  API --> P2[Phase2 Minds AI]
  API --> P3[Phase3 OpenAI]
  API --> P4[Phase4 Storyboard]
```
