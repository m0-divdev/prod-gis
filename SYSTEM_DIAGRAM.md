## System Architecture

```mermaid
flowchart TB
    %% Frontend Layer
    subgraph FE[Frontend Layer]
        FE1[React/Next.js]
        FE2[Mapbox GL JS]
    end

    FE -->|REST/GraphQL APIs| BE[Nest.js Application]

    %% Mastra AI Layer
    subgraph BE[Nest.js Application]
        subgraph Mastra[Mastra AI Layer]
            Main[Location Intelligence Agent]
            POI[POI Discovery Agent]
            Traffic[Traffic Intelligence Agent]
            Event[Event Intelligence Agent]
            Weather[Weather Intelligence Agent]
            Supply[Supply Chain Agent]

            ToolsF[Foursquare Tools]
            ToolsT[TomTom Tools]
            ToolsP[PredictHQ Tools]
            ToolsW[OpenWeather Tools]

            Main --> POI
            Main --> Traffic
            Main --> Event
            Main --> Weather
            Main --> Supply

            ToolsF --> POI
            ToolsF --> Supply
            ToolsT --> Traffic
            ToolsT --> Supply
            ToolsP --> Event
            ToolsW --> Weather
        end

        subgraph Service[Service Layer]
            S1[POI Service]
            S2[Weather Service]
            S3[Events Service]
            S4[Traffic Service]
            S5[Intelligence Service]
        end

        subgraph DB[Prisma Database Layer]
        end
    end

    %% Infrastructure
    BE --> Redis[Redis Cache]
    BE --> Postgres[PostgreSQL + PostGIS]
    BE --> APIs[External APIs]
