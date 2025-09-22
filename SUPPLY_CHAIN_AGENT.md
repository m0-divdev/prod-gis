# Supply Chain & Logistics Agent

## Overview

The Supply Chain Agent is a specialized AI agent designed to optimize logistics operations through strategic location intelligence, distribution network analysis, and supply chain efficiency improvements. It leverages the Foursquare Places API alongside other location services to provide comprehensive supply chain insights.

## Key Features

### 🏭 Logistics Infrastructure Analysis
- **Warehouse & Distribution Centers**: Identify optimal locations for storage and fulfillment
- **Transportation Hubs**: Analyze proximity to ports, airports, rail terminals
- **Last-Mile Delivery**: Plan urban delivery networks and micro-fulfillment centers
- **Cross-Docking Facilities**: Strategic placement for efficient goods transfer

### 🚚 Supply Chain Network Optimization
- **Multi-Modal Transportation**: Route analysis across different transport modes
- **Supplier Proximity**: Assess vendor and manufacturer accessibility
- **Distribution Efficiency**: Evaluate network performance and bottlenecks
- **Risk & Resilience**: Identify vulnerabilities and alternative routes

### 📊 Operational Intelligence
- **Demand Forecasting**: Geographic pattern analysis for inventory planning
- **Capacity Planning**: Seasonal logistics requirements assessment
- **Cost-Benefit Analysis**: Location-based financial modeling
- **Performance Metrics**: KPI tracking and efficiency measurements

## API Integration

### Foursquare Places API (Primary)
The agent uses three main Foursquare API tools:

#### 1. Places Search Tool (`foursquarePlacesSearchTool`)
```typescript
// Search for logistics facilities
{
  query: "warehouse distribution center",
  ll: "40.7128,-74.0060", // NYC coordinates
  radius: 50000, // 50km radius
  categories: "17000,16000", // Business & Industrial categories
  limit: 50
}
```

#### 2. Place Details Tool (`foursquarePlaceDetailsTool`)
```typescript
// Get detailed facility information
{
  fsq_id: "4b123abc456def789",
  fields: "name,location,hours,website,tel,features"
}
```

#### 3. Categories Tool (`foursquareCategoresTool`)
```typescript
// Get all available categories for filtering
{}
```

### Logistics-Specific Categories

The agent focuses on these Foursquare categories:

```typescript
const LOGISTICS_CATEGORIES = {
  AIRPORT: '19014',
  TRAIN_STATION: '19020',
  BUS_STATION: '19010',
  SHIPPING_STORE: '17069',
  TRUCK_SERVICE: '19054',
  WAREHOUSE: '17000',
  INDUSTRIAL: '16000',
  FACTORY: '16001',
  GAS_STATION: '17057',
  STORAGE: '17070',
  MARINA: '19041',
  PORT: '19000',
  CUSTOMS: '12047'
};
```

## Usage Examples

### 1. Warehouse Location Analysis
```typescript
// Query: "Find optimal warehouse locations near major highways in Texas"
const result = await mastra.agent('supplyChainAgent').run({
  message: "Analyze warehouse opportunities in Dallas-Fort Worth area with highway access"
});
```

### 2. Port Connectivity Assessment
```typescript
// Query: "Evaluate supply chain connectivity for Port of Los Angeles"
const result = await mastra.agent('supplyChainAgent').run({
  message: "Analyze transportation infrastructure around Port of Los Angeles for import distribution"
});
```

### 3. Last-Mile Delivery Planning
```typescript
// Query: "Design urban delivery network for Chicago"
const result = await mastra.agent('supplyChainAgent').run({
  message: "Identify micro-fulfillment center locations for same-day delivery in Chicago metropolitan area"
});
```

## Output Format

The agent provides structured analysis including:

### Executive Summary
- Key findings and strategic recommendations
- Performance metrics and efficiency indicators
- Risk assessment and mitigation strategies

### Detailed Analysis
- **Infrastructure Assessment**: Current facilities and capacity
- **Network Optimization**: Route efficiency and connectivity
- **Market Analysis**: Demand patterns and customer proximity
- **Financial Modeling**: Cost-benefit analysis and ROI projections

### Visual Components
- **Map Visualizations**: GeoJSON data for facility locations
- **Network Diagrams**: Transportation corridors and connections
- **Heatmaps**: Demand density and accessibility metrics

### Implementation Roadmap
- **Priority Actions**: Immediate optimization opportunities
- **Timeline**: Phased implementation schedule
- **Resource Requirements**: Budget and staffing needs
- **Success Metrics**: KPIs for measuring improvement

## Integration with Other Agents

The Supply Chain Agent works alongside other specialized agents:

- **Urban Planning Agent**: Infrastructure and zoning considerations
- **Real Estate Agent**: Property costs and availability analysis
- **Retail Agent**: Customer demand and market penetration
- **Energy Utilities Agent**: Power and utility infrastructure

## API Keys Required

Add to your `.env` file:

```bash
# Required for Supply Chain Agent
FOURSQUARE_API_KEY="your_foursquare_api_key_here"

# Supporting APIs
TOMTOM_API_KEY="your_tomtom_api_key_here"
GOOGLE_API_KEY="your_google_places_api_key_here"
OPENAI_API_KEY="your_openai_api_key_here"
```

## Getting Started

1. **Obtain Foursquare API Key**
   - Register at [Foursquare Developer Portal](https://location.foursquare.com/)
   - Generate API key from [Foursquare Studio](https://studio.foursquare.com/workspace/api-keys)

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Add your FOURSQUARE_API_KEY
   ```

3. **Test the Agent**
   ```bash
   # Start the application
   npm run start:dev
   
   # Test via API endpoint
   curl -X POST http://localhost:3000/api/places/unified-chat \
     -H "Content-Type: application/json" \
     -d '{
       "message": "Find distribution centers near Chicago with rail access",
       "sessionId": "test-session",
       "responseType": "auto"
     }'
   ```

## Best Practices

### Query Optimization
- Be specific about location and facility types
- Include relevant constraints (size, accessibility, etc.)
- Specify geographic scope and radius

### Cost Management
- Use appropriate search limits to control API costs
- Cache frequently requested data
- Combine multiple requirements in single queries

### Data Accuracy
- Cross-reference multiple data sources
- Validate facility information with direct contact
- Consider seasonal and operational variations

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Verify FOURSQUARE_API_KEY is set correctly
   - Check API key permissions and quotas

2. **No Results Found**
   - Expand search radius or adjust categories
   - Try alternative search terms
   - Verify location coordinates

3. **Rate Limiting**
   - Implement request throttling
   - Use caching for repeated queries
   - Monitor API usage quotas

### Support Resources
- [Foursquare API Documentation](https://docs.foursquare.com/developer/)
- [Postman Collection](https://www.postman.com/foursquare-places-api/)
- [Category Reference](https://docs.foursquare.com/developer/reference/place-categories)


