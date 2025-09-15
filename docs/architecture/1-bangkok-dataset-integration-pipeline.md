# 1. Bangkok Dataset Integration Pipeline

## Dataset Processing Architecture
```
CU-BEMS Dataset/ (Local)
├── 2018_energy_data.csv (215MB) 
├── 2019_energy_data.csv (483MB)
└── metadata/
    ├── sensor_mappings.csv
    ├── floor_layouts.csv
    └── equipment_specifications.csv

Processing Pipeline:
1. CSV Validation & Cleaning (Node.js scripts)
2. PostgreSQL Import via pg_copy
3. Materialized Views for Performance
4. Incremental Processing for Updates
```

## Development Integration
- **Local Development**: Direct CSV access for rapid iteration
- **Staging**: Supabase with processed subset (10% sample)
- **Production**: Full dataset in Supabase PostgreSQL
